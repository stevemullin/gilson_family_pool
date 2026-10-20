import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getCurrentSeasonWeek } from "@/lib/season";
import { fetchAll, loadSeasonData } from "@/lib/season-data";
import { computeStandings } from "@/lib/scoring";
import { sendReminder, logEmail } from "@/lib/email";
import type { Game, Member, Pick } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Only remind when the next kickoff is inside this window. */
const WINDOW_HOURS = 30;

/**
 * Nobody placed this high is ever skipped, however quiet they've gone — if
 * you're in contention you get nudged.
 *
 * Place, not rank. Ranks are shared on a tie, which is right for the
 * standings but useless as a cutoff: ten dormant members tied on zero
 * correct picks all rank 19th, so "rank > 19" never fires and the filter
 * does nothing.
 */
const ALWAYS_REMIND_PLACE = 19;

/**
 * A member counts as active if they've picked in the current week or the one
 * before. Rank alone is the wrong test: a late joiner sits near the bottom on
 * total correct picks while playing every week, and would be silenced for
 * being new rather than for being gone.
 */
const ACTIVE_WEEKS = 2;

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  const authHeader = req.headers.get("authorization");
  const fromVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (key !== process.env.CRON_SECRET && !fromVercelCron) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: state } = await supabase
    .from("sync_state")
    .select("last_reminder_date")
    .eq("id", 1)
    .single();

  if (state?.last_reminder_date === today) {
    await logEmail({ kind: "cron", ok: false, detail: "skipped: already sent today" });
    return NextResponse.json({ ok: true, skipped: "already sent today" });
  }

  const current = await getCurrentSeasonWeek();
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("season", current.season)
    .eq("season_type", current.seasonType)
    .eq("week", current.week);

  const weekGames = (games ?? []) as Game[];
  const upcoming = weekGames
    .filter((g) => new Date(g.kickoff_at).getTime() > Date.now())
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
    )[0];

  if (!upcoming) {
    await logEmail({ kind: "cron", ok: false, detail: `skipped: no upcoming games in week ${current.week}` });
    return NextResponse.json({ ok: true, skipped: "no upcoming games" });
  }

  const hoursOut =
    (new Date(upcoming.kickoff_at).getTime() - Date.now()) / 3_600_000;
  if (hoursOut > WINDOW_HOURS) {
    await logEmail({ kind: "cron", ok: false, detail: `skipped: next kickoff ${hoursOut.toFixed(1)}h out (window ${WINDOW_HOURS}h)` });
    return NextResponse.json({ ok: true, skipped: "kickoff still far out" });
  }

  // Claim the day BEFORE sending, so a mid-loop failure can't double-send on retry.
  await supabase
    .from("sync_state")
    .update({ last_reminder_date: today })
    .eq("id", 1);

  // Picks is paged: games x members crosses PostgREST's 1000-row ceiling as
  // the pool grows, and a short read here would mail people who had already
  // picked. Members is small and filtered, so a plain select is fine.
  const [{ data: members }, allPicks, seasonData] = await Promise.all([
    supabase.from("members").select("*").eq("wants_reminders", true),
    fetchAll<Pick>("picks"),
    loadSeasonData(),
  ]);

  // Who's in contention, and who's still playing.
  const standings = computeStandings(
    seasonData.members,
    seasonData.games,
    seasonData.picks
  );
  const placeById = new Map(standings.map((r, i) => [r.memberId, i + 1]));

  const recentWeeks = new Set(
    Array.from({ length: ACTIVE_WEEKS }, (_, i) => current.week - i)
  );
  const recentGameIds = new Set(
    seasonData.games.filter((g) => recentWeeks.has(g.week)).map((g) => g.id)
  );
  const activeIds = new Set(
    seasonData.picks
      .filter((p) => recentGameIds.has(p.game_id))
      .map((p) => p.member_id)
  );
  const sent: string[] = [];

  // Only games that can still be picked. Counting every game in the week would nag
  // someone forever about a game that kicked off before they got to it — they'd have
  // an unfixable "missing" pick for the rest of the week.
  const openGames = weekGames.filter(
    (g) => new Date(g.kickoff_at).getTime() > Date.now()
  );

  const skipped: string[] = [];

  for (const member of (members ?? []) as Member[]) {
    // Stop nagging people who have left: outside contention AND not playing.
    // Either alone is a bad test — a contender who misses a week still wants
    // the nudge, and a late joiner near the bottom is still in the game.
    const place = placeById.get(member.id) ?? Number.MAX_SAFE_INTEGER;
    if (place > ALWAYS_REMIND_PLACE && !activeIds.has(member.id)) {
      skipped.push(member.name.split(" ")[0]);
      continue;
    }

    const picked = new Set(
      allPicks.filter((p) => p.member_id === member.id).map((p) => p.game_id)
    );
    const missing = openGames.filter((g) => !picked.has(g.id)).length;
    if (missing <= 0) continue;

    try {
      await sendReminder(
        member.email,
        member.name,
        member.token,
        missing,
        new Date(upcoming.kickoff_at),
        member.id
      );
      sent.push(member.name);
    } catch (err) {
      console.error(`[cron/remind] ${member.email} failed`, err);
    }
  }

  await logEmail({
    kind: "cron",
    ok: true,
    detail:
      `ran: week ${current.week}, ${sent.length} reminder${sent.length === 1 ? "" : "s"} ` +
      `for ${upcoming.away_abbr}@${upcoming.home_abbr} in ${hoursOut.toFixed(1)}h` +
      (skipped.length ? `; dormant, not mailed: ${skipped.join(", ")}` : ""),
  });

  return NextResponse.json({ ok: true, week: current.week, sent });
}
