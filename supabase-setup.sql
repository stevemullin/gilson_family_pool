-- Gilson Family Football Pool — Supabase schema
-- Paste into the Supabase SQL Editor and run once.
-- See SPEC.md §2 for column-by-column notes.

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,            -- 22-char URL-safe secret; the personal link
  is_admin BOOLEAN DEFAULT FALSE,        -- "commissioner"
  wants_reminders BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  espn_event_id TEXT UNIQUE NOT NULL,
  season INTEGER NOT NULL,
  season_type INTEGER NOT NULL DEFAULT 2, -- 2 = regular season, 3 = postseason
  week INTEGER NOT NULL,
  kickoff_at TIMESTAMPTZ NOT NULL,        -- THE lock/reveal boundary
  day_group TEXT,                         -- 'thu'|'sun_early'|'sun_late'|'snf'|'mnf'
  home_abbr TEXT NOT NULL,
  home_name TEXT,
  home_logo TEXT,
  home_record TEXT,
  home_score INTEGER,
  away_abbr TEXT NOT NULL,
  away_name TEXT,
  away_logo TEXT,
  away_record TEXT,
  away_score INTEGER,
  state TEXT NOT NULL DEFAULT 'pre',      -- 'pre' | 'in' | 'post'
  period INTEGER,
  display_clock TEXT,
  winner_abbr TEXT,                       -- NULL while unplayed AND on a tie
  is_final BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX games_week_idx ON games(season, season_type, week);
CREATE INDEX games_kickoff_idx ON games(kickoff_at);

CREATE TABLE picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  picked_abbr TEXT NOT NULL,
  overridden_by UUID REFERENCES members(id),  -- commissioner override; shown to everyone
  overridden_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, game_id)
);
CREATE INDEX picks_game_idx ON picks(game_id);

CREATE TABLE sync_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_score_sync_at TIMESTAMPTZ,
  last_reminder_date DATE,
  CHECK (id = 1)
);
INSERT INTO sync_state (id) VALUES (1);

-- Row Level Security: enabled with NO anon policies, on purpose.
-- Every read and write goes through a Next.js route handler using the service-role key,
-- because that server layer is the only place that knows the kickoff-time visibility
-- rule. A public read policy on `picks` would defeat the privacy model no matter what
-- the UI does. This differs deliberately from the golf pool app.
ALTER TABLE members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE games      ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;
