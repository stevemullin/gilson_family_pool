import { createServiceClient } from "./supabase";

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
export async function getCurrentSeasonWeek(): Promise<SeasonWeek> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // The week containing the next kickoff is the one people need to pick.
  const { data: upcoming } = await supabase
    .from("games")
    .select("season, season_type, week")
    .gt("kickoff_at", now)
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (upcoming) {
    return {
      season: upcoming.season,
      week: upcoming.week,
      seasonType: upcoming.season_type,
    };
  }

  // Season over (or nothing synced yet): fall back to the most recent week we have.
  const { data: latest } = await supabase
    .from("games")
    .select("season, season_type, week")
    .order("kickoff_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    return {
      season: latest.season,
      week: latest.week,
      seasonType: latest.season_type,
    };
  }

  return fetchCurrentSeasonWeek();
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
