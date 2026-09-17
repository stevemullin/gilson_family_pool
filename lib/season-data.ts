import { createServiceClient } from "./supabase";
import type { Game, Pick } from "./types";

export interface SeasonMember {
  id: string;
  name: string;
  bought_in: boolean;
}

/** Everything a page needs, fetched once. */
export interface SeasonData {
  season: number;
  seasonType: number;
  games: Game[];
  picks: Pick[];
  members: SeasonMember[];
}

/** How long after kickoff a game still counts as "now". NFL games run ~3h15m. */
export const GAME_WINDOW_MS = 4.5 * 60 * 60 * 1000;

/**
 * One round trip for the whole season.
 *
 * The picks page used to make nine sequential database calls, re-fetching
 * games, picks and members several times over on its way to a render — two
 * to three seconds of nothing but waiting. The entire season is a few hundred
 * rows, so it's cheaper to pull all of it in three parallel queries and let
 * every view derive from the same arrays in memory.
 */
export async function loadSeasonData(): Promise<SeasonData> {
  const supabase = createServiceClient();
  const [{ data: games }, { data: picks }, { data: members }] =
    await Promise.all([
      supabase.from("games").select("*").order("kickoff_at", { ascending: true }),
      supabase.from("picks").select("*"),
      supabase.from("members").select("id, name, bought_in").order("name"),
    ]);

  const gameList = (games ?? []) as Game[];
  // The table only ever holds one season at a time; take the latest if not.
  const season = gameList.reduce((m, g) => Math.max(m, g.season), 0) || new Date().getFullYear();
  const seasonType = gameList.find((g) => g.season === season)?.season_type ?? 2;

  return {
    season,
    seasonType,
    games: gameList.filter((g) => g.season === season && g.season_type === seasonType),
    picks: (picks ?? []) as Pick[],
    members: (members ?? []) as SeasonMember[],
  };
}

/**
 * Which week is "now". A game that kicked off in the last few hours anchors
 * it — the last game of the week most of all. Otherwise the week of the next
 * kickoff, or the latest week we have.
 */
export function currentWeekOf(data: SeasonData, now = Date.now()): number {
  const started = data.games.filter((g) => new Date(g.kickoff_at).getTime() <= now);
  const recent = started[started.length - 1];
  if (recent && now - new Date(recent.kickoff_at).getTime() < GAME_WINDOW_MS) {
    return recent.week;
  }
  const upcoming = data.games.find((g) => new Date(g.kickoff_at).getTime() > now);
  if (upcoming) return upcoming.week;
  return data.games.reduce((m, g) => Math.max(m, g.week), 1);
}

export function maxWeekOf(data: SeasonData, atLeast = 1): number {
  return data.games.reduce((m, g) => Math.max(m, g.week), atLeast);
}

/**
 * Whether anything in this week could have changed at ESPN since we last
 * looked: a game live now, or about to start. If not, there's no reason to
 * spend a round trip and an ESPN call on the request path.
 */
export function weekNeedsRefresh(data: SeasonData, week: number, now = Date.now()): boolean {
  const soon = 15 * 60 * 1000;
  return data.games.some((g) => {
    if (g.week !== week || g.is_final) return false;
    const dt = now - new Date(g.kickoff_at).getTime();
    return dt > -soon && dt < GAME_WINDOW_MS;
  });
}
