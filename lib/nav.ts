import { computeStandings } from "./scoring";
import { loadSeasonData, maxWeekOf, type SeasonData } from "./season-data";

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
 * Everything the tab bar shows, derived from data the page already holds.
 *
 * The subtitles are live — picks outstanding, which week the grid is on,
 * where you sit in the table — so the bar doubles as the status line that
 * used to live in the picks header.
 */
export function navDataFrom(data: SeasonData, memberId: string, week: number): NavData {
  const weekGameIds = new Set(data.games.filter((g) => g.week === week).map((g) => g.id));

  const rows = computeStandings(data.members, data.games, data.picks);
  const me = rows.find((r) => r.memberId === memberId);

  return {
    week,
    maxWeek: maxWeekOf(data, week),
    picked: data.picks.filter((p) => p.member_id === memberId && weekGameIds.has(p.game_id)).length,
    games: weekGameIds.size,
    standing: me ? (me.tied ? `T${me.rank}` : ordinal(me.rank)) : "—",
    record: { correct: me?.correct ?? 0, played: me?.played ?? 0 },
  };
}

/** Convenience for callers that don't already hold the season data. */
export async function getNavData(memberId: string, season: number, week: number, seasonType = 2): Promise<NavData> {
  return navDataFrom(await loadSeasonData(), memberId, week);
}
