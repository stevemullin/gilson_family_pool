import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getCurrentSeasonWeek } from "@/lib/season";
import { sendReminder } from "@/lib/email";
import type { Game, Member, Pick } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Only remind when the next kickoff is inside this window. */
const WINDOW_HOURS = 30;

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
    return NextResponse.json({ ok: true, skipped: "no upcoming games" });
  }

  const hoursOut =
    (new Date(upcoming.kickoff_at).getTime() - Date.now()) / 3_600_000;
  if (hoursOut > WINDOW_HOURS) {
    return NextResponse.json({ ok: true, skipped: "kickoff still far out" });
  }

  // Claim the day BEFORE sending, so a mid-loop failure can't double-send on retry.
  await supabase
    .from("sync_state")
    .update({ last_reminder_date: today })
    .eq("id", 1);

  const [{ data: members }, { data: picks }] = await Promise.all([
    supabase.from("members").select("*").eq("wants_reminders", true),
    supabase
      .from("picks")
      .select("*")
      .in("game_id", weekGames.map((g) => g.id)),
  ]);

  const allPicks = (picks ?? []) as Pick[];
  const sent: string[] = [];

  // Only games that can still be picked. Counting every game in the week would nag
  // someone forever about a game that kicked off before they got to it — they'd have
  // an unfixable "missing" pick for the rest of the week.
  const openGames = weekGames.filter(
    (g) => new Date(g.kickoff_at).getTime() > Date.now()
  );

  for (const member of (members ?? []) as Member[]) {
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
        new Date(upcoming.kickoff_at)
      );
      sent.push(member.name);
    } catch (err) {
      console.error(`[cron/remind] ${member.email} failed`, err);
    }
  }

  return NextResponse.json({ ok: true, week: current.week, sent });
}
