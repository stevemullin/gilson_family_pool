export type GameState = "pre" | "in" | "post";

export interface Member {
  id: string;
  name: string;
  email: string;
  token: string;
  is_admin: boolean;
  wants_reminders: boolean;
  created_at: string;
}

export interface Game {
  id: string;
  espn_event_id: string;
  season: number;
  season_type: number;
  week: number;
  kickoff_at: string;
  home_abbr: string;
  home_name: string | null;
  home_logo: string | null;
  home_record: string | null;
  home_score: number | null;
  away_abbr: string;
  away_name: string | null;
  away_logo: string | null;
  away_record: string | null;
  away_score: number | null;
  state: GameState;
  period: number | null;
  display_clock: string | null;
  winner_abbr: string | null;
  is_final: boolean;
  updated_at: string;
}

export interface Pick {
  id: string;
  member_id: string;
  game_id: string;
  picked_abbr: string;
  overridden_by: string | null;
  overridden_at: string | null;
  updated_at: string;
}

/**
 * What the client is allowed to know about OTHER members' picks.
 *
 * Before kickoff only `hasPicked` exists — `pickedAbbr` is absent from the object
 * entirely, not null, so a hidden pick cannot be serialized by accident.
 */
export type PoolPick =
  | { memberId: string; memberName: string; hasPicked: boolean }
  | {
      memberId: string;
      memberName: string;
      hasPicked: true;
      pickedAbbr: string;
      overridden: boolean;
    };

export interface StandingRow {
  memberId: string;
  name: string;
  correct: number;
  played: number;
  rank: number;
  tied: boolean;
}
