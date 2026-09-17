import { loadSeasonData, currentWeekOf } from "./season-data";

const ESPN_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

export interface SeasonWeek {
  season: number;
  week: number;
  seasonType: number;
}

/**
 * Ask ESPN what week it currently is. The parameterless scoreboard response carries
 * the live season/week, which saves us hardcoding a calendar.
 */
export async function fetchCurrentSeasonWeek(): Promise<SeasonWeek> {
  const res = await fetch(ESPN_BASE, { cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN returned ${res.status}`);
  const data = await res.json();
  return {
    season: data?.season?.year ?? new Date().getFullYear(),
    week: data?.week?.number ?? 1,
    seasonType: data?.season?.type ?? 2,
  };
}

/**
 * The week to show by default: the latest week that has already started, or the
 * earliest week not yet finished. Falls back to ESPN when the table is empty.
 */
/**
 * The week to show by default. One implementation, in season-data.ts; this is
 * the convenience form for callers that don't hold the season data already.
 */
export async function getCurrentSeasonWeek(): Promise<SeasonWeek> {
  const data = await loadSeasonData();
  if (data.games.length === 0) return fetchCurrentSeasonWeek();
  return { season: data.season, week: currentWeekOf(data), seasonType: data.seasonType };
}

/**
 * Heading for a group of games sharing a kickoff, e.g. "Sunday 1:00 PM".
 *
 * Derived entirely from the timestamp — there is no hardcoded slot list to get wrong,
 * so a Wednesday opener or a flexed game labels itself correctly.
 */
export function kickoffGroupLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(" at ", " ");
}
