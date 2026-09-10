import { createServiceClient } from "./supabase";
import { computeStandings } from "./scoring";
import type { Game, Pick } from "./types";

export interface NavData {
  week: number;
  maxWeek: number;
  picked: number;
  games: number;
  /** "T4" when tied, otherwise "4th". */
  standing: string;
  record: { correct: number; played: number };
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * Everything the tab bar shows, gathered once per page render.
 *
 * The subtitles are live data — how many picks are outstanding, which week
 * the grid is on, where you sit in the table — so the bar doubles as the
 * status line that used to live in the picks header.
 */
export async function getNavData(
  memberId: string,
  season: number,
  week: number,
  seasonType = 2
): Promise<NavData> {
  const supabase = createServiceClient();

  const [{ data: seasonGames }, { data: allPicks }, { data: members }] =
    await Promise.all([
      supabase
        .from("games")
        .select("*")
        .eq("season", season)
        .eq("season_type", seasonType),
      supabase.from("picks").select("*"),
      supabase.from("members").select("id, name").order("name"),
    ]);

  const games = (seasonGames ?? []) as Game[];
  const picks = (allPicks ?? []) as Pick[];
  const weekGameIds = new Set(
    games.filter((g) => g.week === week).map((g) => g.id)
  );

  const rows = computeStandings(
    (members ?? []) as Array<{ id: string; name: string }>,
    games,
    picks
  );
  const me = rows.find((r) => r.memberId === memberId);

  return {
    week,
    maxWeek: Math.max(week, ...games.map((g) => g.week), 1),
    picked: picks.filter(
      (p) => p.member_id === memberId && weekGameIds.has(p.game_id)
    ).length,
    games: weekGameIds.size,
    standing: me
      ? me.tied
        ? `T${me.rank}`
        : ordinal(me.rank)
      : "—",
    record: { correct: me?.correct ?? 0, played: me?.played ?? 0 },
  };
}
