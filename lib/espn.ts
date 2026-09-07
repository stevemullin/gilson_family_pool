import { createServiceClient } from "./supabase";
import type { GameState } from "./types";

const ESPN_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

/** Minimum seconds between ESPN fetches. The design asks for ~60s refresh on game days. */
const THROTTLE_SECONDS = 55;

interface ESPNCompetitor {
  homeAway: "home" | "away";
  score?: string;
  winner?: boolean;
  team: {
    abbreviation: string;
    displayName?: string;
    logo?: string;
    color?: string;
  };
  records?: Array<{ type?: string; summary?: string }>;
}

interface ESPNEvent {
  id: string;
  date: string;
  competitions: Array<{
    competitors: ESPNCompetitor[];
    status: {
      period?: number;
      displayClock?: string;
      type: { state: GameState; completed: boolean };
    };
  }>;
}

function recordOf(c: ESPNCompetitor): string | null {
  const summary = c.records?.find((r) => r.type === "total")?.summary;
  // Week 1 comes back as "0-0" for everyone; the design's record line reads better
  // empty than as a row of zeroes.
  if (!summary || summary === "0-0") return null;
  return summary;
}

function scoreOf(c: ESPNCompetitor, state: GameState): number | null {
  // ESPN reports "0" for both sides before kickoff; don't persist a fake 0-0.
  if (state === "pre") return null;
  const n = Number(c.score);
  return Number.isFinite(n) ? n : null;
}

/** Fetch and normalize one week. Returns rows shaped for the `games` table. */
export async function fetchWeek(season: number, week: number, seasonType = 2) {
  const url = `${ESPN_BASE}?dates=${season}&seasontype=${seasonType}&week=${week}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN returned ${res.status}`);

  const data = (await res.json()) as { events?: ESPNEvent[] };

  return (data.events ?? []).map((event) => {
    const comp = event.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === "home")!;
    const away = comp.competitors.find((c) => c.homeAway === "away")!;
    const state = comp.status.type.state;

    // A tie leaves `winner` false on both sides. Leave winner_abbr NULL and let
    // scoring award nobody the point — never fall back to comparing scores.
    const winner = comp.competitors.find((c) => c.winner === true);

    return {
      espn_event_id: event.id,
      season,
      season_type: seasonType,
      week,
      kickoff_at: event.date,
      home_abbr: home.team.abbreviation,
      home_name: home.team.displayName ?? null,
      home_logo: home.team.logo ?? null,
      home_record: recordOf(home),
      home_score: scoreOf(home, state),
      away_abbr: away.team.abbreviation,
      away_name: away.team.displayName ?? null,
      away_logo: away.team.logo ?? null,
      away_record: recordOf(away),
      away_score: scoreOf(away, state),
      state,
      period: comp.status.period ?? null,
      display_clock: comp.status.displayClock ?? null,
      winner_abbr: winner?.team.abbreviation ?? null,
      is_final: comp.status.type.completed === true,
      updated_at: new Date().toISOString(),
    };
  });
}

/**
 * Sync one week into the database. Upserts on `espn_event_id`, so flex-scheduling
 * changes correct `kickoff_at` in place rather than duplicating rows.
 */
export async function syncWeek(season: number, week: number, seasonType = 2) {
  const rows = await fetchWeek(season, week, seasonType);
  if (rows.length === 0) return 0;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("games")
    .upsert(rows, { onConflict: "espn_event_id" });
  if (error) throw new Error(`games upsert failed: ${error.message}`);

  await supabase
    .from("sync_state")
    .update({ last_score_sync_at: new Date().toISOString() })
    .eq("id", 1);

  return rows.length;
}

/**
 * Sync only if the cached data is stale. Ten family members refreshing at once
 * produce one ESPN call per minute, not ten.
 */
export async function syncIfStale(season: number, week: number, seasonType = 2) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sync_state")
    .select("last_score_sync_at")
    .eq("id", 1)
    .single();

  const last = data?.last_score_sync_at
    ? new Date(data.last_score_sync_at).getTime()
    : 0;
  if (Date.now() - last < THROTTLE_SECONDS * 1000) return false;

  await syncWeek(season, week, seasonType);
  return true;
}
