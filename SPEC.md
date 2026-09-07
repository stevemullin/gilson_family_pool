# Gilson Family Football Pool — Technical Specification

A mobile-first web app for a ~10-person family NFL pick'em pool. Each week every member
taps one team per matchup to pick the winner; picks autosave; 1 point per correct pick; a
season leaderboard ranks by total correct picks. No money, no submit buttons.

**The core social mechanic:** picks are private until each game kicks off. Before kickoff
you can see only *who* has picked, never *what* they picked. After kickoff, that game's
picks are visible to everyone.

This document is complete enough to build from cold. The companion UX spec is
[`design/README.md`](design/README.md) plus the design canvas
[`design/Gilson Pool Canvas.dc.html`](design/Gilson%20Pool%20Canvas.dc.html) — open the
canvas in a browser and build artboard by artboard. Where this spec and the canvas
disagree on anything visual, **the canvas wins**.

---

## 1. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Full-stack React, route handlers, SSR, free on Vercel |
| Database | **Supabase (PostgreSQL)** | Free hosted DB with a dashboard for eyeballing data |
| Hosting | **Vercel (Hobby / free)** | Zero-config deploy from GitHub, free custom domain + SSL |
| Email | **Resend (free tier)** | Personal-link delivery and pick reminders |
| DNS | **Cloudflare (free)** | Domain already registered there |
| Styling | **Tailwind CSS v4** | Mobile-first utilities |
| Language | **TypeScript** | Type safety across scoring and API shapes |

This mirrors the stack of the existing Golf Scoreboard app
(`Projects/pga_app/pga-pool/`) deliberately — that app is the reference implementation for
project layout, the Supabase client split, the ESPN sync pattern, and the admin console.

### Environment Variables

Set in `.env.local` for development and in Vercel project settings for production. **Never
committed** — the GitHub repo is public.

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
RESEND_API_KEY=<resend key>
MAIL_FROM=pool@<yourdomain>
CRON_SECRET=<random string guarding /api/cron/*>
SITE_URL=https://pool.<yourdomain>
```

**Every variable here is server-only, and none may be renamed to `NEXT_PUBLIC_*`.** Next.js
inlines `NEXT_PUBLIC_` values at *build* time, while Vercel injects "Secret"-typed
variables only at *runtime*; a variable that is both compiles to `undefined` and no
redeploy can fix it. Nothing in this app needs a Supabase credential in the browser
anyway — all database access is server-side (§5).

---

## 2. Database Schema

One file, `supabase-setup.sql`, pasted into the Supabase SQL editor.

### Table: `members`

```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                   -- display name, e.g. "Mike"
  email TEXT UNIQUE NOT NULL,           -- used for reminders and link recovery
  token TEXT UNIQUE NOT NULL,           -- 22-char URL-safe secret; the personal link
  is_admin BOOLEAN DEFAULT FALSE,       -- "commissioner"; gates /admin
  wants_reminders BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `games`

One row per NFL game, keyed on ESPN's stable event id so flex-schedule moves update in
place rather than duplicating.

```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  espn_event_id TEXT UNIQUE NOT NULL,   -- e.g. "401872656"
  season INTEGER NOT NULL,              -- 2026
  season_type INTEGER NOT NULL DEFAULT 2, -- 2 = regular season, 3 = postseason
  week INTEGER NOT NULL,                -- 1-18
  kickoff_at TIMESTAMPTZ NOT NULL,      -- THE lock/reveal boundary
  day_group TEXT,                       -- 'thu'|'sun_early'|'sun_late'|'snf'|'mnf'
  home_abbr TEXT NOT NULL,              -- "SEA"
  home_name TEXT,                       -- "Seattle Seahawks"
  home_logo TEXT,                       -- ESPN CDN URL
  home_record TEXT,                     -- "8-2" (design shows this under the abbr)
  home_score INTEGER,
  away_abbr TEXT NOT NULL,
  away_name TEXT,
  away_logo TEXT,
  away_record TEXT,
  away_score INTEGER,
  state TEXT NOT NULL DEFAULT 'pre',    -- 'pre' | 'in' | 'post'
  period INTEGER,                       -- quarter, for the LIVE chip
  display_clock TEXT,                   -- "5:12", for the LIVE chip
  winner_abbr TEXT,                     -- NULL while unplayed AND on a tie
  is_final BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX games_week_idx ON games(season, season_type, week);
CREATE INDEX games_kickoff_idx ON games(kickoff_at);
```

`day_group` is derived at sync time from `kickoff_at` converted to America/New_York. It
drives the picks page's day rules (Thursday night / Sunday 1:00 / Sunday 4:05 & 4:25 /
Sunday night / Monday night). Rules:

| Condition (ET) | `day_group` |
|---|---|
| Not Sunday or Monday | `thu` (covers Thu, and the occasional Wed/Fri/Sat opener) |
| Sunday, hour < 15 | `sun_early` |
| Sunday, 15 ≤ hour < 19 | `sun_late` |
| Sunday, hour ≥ 19 | `snf` |
| Monday | `mnf` |

### Table: `picks`

```sql
CREATE TABLE picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  picked_abbr TEXT NOT NULL,            -- must equal games.home_abbr or games.away_abbr
  overridden_by UUID REFERENCES members(id),  -- set when a commissioner edits a pick
  overridden_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, game_id)
);
CREATE INDEX picks_game_idx ON picks(game_id);
```

An override is deliberately **not** hidden: the design states overrides are "Logged and
visible to everyone", so the UI surfaces an override marker on affected picks.

### Table: `sync_state`

Single-row table, the same idea as the golf app's `api_cache`.

```sql
CREATE TABLE sync_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_score_sync_at TIMESTAMPTZ,       -- throttles ESPN fetches
  last_reminder_date DATE,              -- makes the reminder cron idempotent
  CHECK (id = 1)
);
INSERT INTO sync_state (id) VALUES (1);
```

### No standings table

~10 members × 272 games is under 3,000 pick rows for a whole season. Standings and grid
point totals are computed on read in `lib/scoring.ts`. Nothing to invalidate, nothing to
drift.

### Row Level Security

```sql
ALTER TABLE members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE games      ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;
```

**Create no anon policies on any table.** Every read and write goes through a Next.js route
handler holding the service-role key, because that server layer is the only place that
knows the kickoff-time visibility rule. This differs on purpose from the golf app, which
grants `USING (true)` public reads — here, a public read policy on `picks` would defeat the
entire privacy model regardless of what the UI does.

---

## 3. Data Source: ESPN NFL Scoreboard API

Same undocumented API family the golf app already uses. Free, no key, no auth.

```
https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
  ?dates=<season>&seasontype=<2|3>&week=<n>
```

Verified live against 2026 Week 1 (16 events returned) and a completed 2025 Week 10 game.

### Field mapping

| Column | ESPN path |
|---|---|
| `espn_event_id` | `events[].id` |
| `kickoff_at` | `events[].date` (ISO 8601, UTC — e.g. `2026-09-10T00:20Z`) |
| `season`, `week` | `season.year`, `week.number` (also echoed per event) |
| `home_*` / `away_*` | `competitions[0].competitors[]` split on `homeAway` |
| `*_abbr` | `competitor.team.abbreviation` |
| `*_name` | `competitor.team.displayName` |
| `*_logo` | `competitor.team.logo` |
| `*_record` | `competitor.records[]` where `type === 'total'` → `.summary` (e.g. `"8-2"`) |
| `*_score` | `competitor.score` (string; coerce to int) |
| `state` | `competitions[0].status.type.state` → `pre` \| `in` \| `post` |
| `period` | `competitions[0].status.period` |
| `display_clock` | `competitions[0].status.displayClock` |
| `is_final` | `competitions[0].status.type.completed` |
| `winner_abbr` | abbr of the competitor with `winner === true`; **NULL if neither is** |

### Behaviors to handle

- **Ties.** `winner` is `false`/`null` on both competitors. `winner_abbr` stays NULL and
  nobody scores a point. Rare but real; do not fall back to comparing scores.
- **Pre-game.** Scores come back as `"0"` before kickoff. Only display scores when
  `state !== 'pre'`.
- **No `records` array** on some preseason/early responses — treat `*_record` as nullable
  and render the record line as empty rather than "0-0".
- **Flex scheduling** moves Sunday games to SNF and shifts kickoff times. Because sync
  upserts on `espn_event_id`, both `kickoff_at` and `day_group` correct themselves. A game
  that moves *later* can un-lock picks it had locked; that is correct and intended.
- **Rate limits** are unpublished. Throttle via `sync_state.last_score_sync_at` (§7).

---

## 4. Auth: personal links, no passwords

No accounts, no passwords, no third-party auth. The design calls this a magic link; it is a
long-lived personal link.

1. A commissioner adds a member (name + email). Generate `token` as 22 URL-safe random
   characters (`crypto.randomBytes(16).toString('base64url')`).
2. The member is emailed `${SITE_URL}/join/<token>`.
3. `app/join/[token]/page.tsx` resolves the token to a member, sets a cookie, and
   **redirects to `/`** so the secret leaves the address bar immediately and does not
   persist in history, screenshots, or a shared screen.

   ```
   name:     gfp_token
   value:    <token>
   httpOnly: true
   secure:   true          (in production)
   sameSite: 'lax'
   maxAge:   60 * 60 * 24 * 365
   path:     '/'
   ```

4. `lib/auth.ts → getCurrentMember()` reads the cookie and looks the member up on every
   request. The cookie *is* the token, verified against the DB each time — no signing
   secret, no session table, no expiry bookkeeping. Revoking someone is one column update.
5. **Lost link** (`/login`, artboard 1h): email in → `POST /api/auth/magic-link` → re-send
   the same `/join/<token>`. Always respond with the same "check your email" message
   whether or not the address exists.
6. **Admin** is `members.is_admin`. `/admin` and every `/api/admin/*` handler check
   `getCurrentMember()?.is_admin` server-side.

### Threat model

Explicitly modest — this is a family pool, not a bank. Anyone holding a member's link is
that member. What the design *does* require is that one member cannot see another's picks
before kickoff, and §5 is what guarantees that.

---

## 5. Privacy: hidden until kickoff

The single most important behavior in the app, and the one that is invisible when broken.

**One rule, one place:** `lib/picks.ts → getVisiblePicks(week, viewerId)`.

- A game is **revealed** when `game.kickoff_at <= now()`. Not "when it's live", not "when
  the admin says so" — purely the timestamp.
- For a revealed game, other members' `picked_abbr` is returned.
- For an unrevealed game, only `{ memberId, hasPicked: boolean }` is returned. The chosen
  team is **never** included.
- The viewer always sees their own picks, revealed or not.

### Non-negotiables

- Filtering happens **server-side, before serialization**. A hidden pick must not appear in
  any prop, JSON body, RSC payload, or `__NEXT_DATA__` blob. Hiding via CSS, a client-side
  `if`, or "we just don't render it" is not acceptable — the data must not be sent.
- `PUT /api/pick` returns **409** when `kickoff_at <= now()`. A stale tab left open past
  kickoff cannot submit.
- No anon RLS policy on `picks` (§2) means there is no direct-to-Supabase side channel.
- The week grid renders a neutral tan dot for "picked" on unrevealed columns — never the
  team, and never a team-colored dot that would leak the pick through CSS.

Verification for this rule is in §11 and is a source-inspection check, not a visual one.

---

## 6. Routes

Route names follow the design handoff's API sketch so the contract matches the UX spec.

### Pages

| Path | Artboard | Notes |
|---|---|---|
| `/` | 1c / 1d | This week's picks; 1d is the zero-picks empty state |
| `/week/[n]` | 1e / 1f | Week grid, mobile and desktop layouts |
| `/standings` | 1g | Season leaderboard |
| `/login` | 1h | "Email me my link" |
| `/join/[token]` | — | Sets cookie, redirects to `/` |
| `/admin` | 1i | Commissioner tools; `is_admin` only |

### API

| Method + path | Purpose |
|---|---|
| `GET /api/week/:n` | Games + my picks + privacy-filtered pool pick status |
| `PUT /api/pick` | `{gameId, team}` → save/switch. **409** if kicked off |
| `GET /api/grid/:week` | Grid rows: member, week points, season points, per-game cells |
| `GET /api/standings` | Tie-aware ranks, name, record |
| `POST /api/auth/magic-link` | `{email}` → re-send personal link |
| `POST /api/members` | Admin: add member (generates token, sends link) |
| `POST /api/members/:id/resend` | Admin: re-send that member's link |
| `POST /api/scores/refresh` | Admin: "Force refresh now", bypasses the throttle |
| `PUT /api/admin/pick` | Admin override; writes `overridden_by` / `overridden_at` |
| `GET /api/cron/sync` | Schedule + score sync. Requires `?key=$CRON_SECRET` |
| `GET /api/cron/remind` | Reminder pass. Requires `?key=$CRON_SECRET` |

---

## 7. Score freshness

The design specifies "Auto-refreshes every 60s on game days." Vercel's Hobby plan rejects
any cron expression that fires more than once per day, so the 60s cadence is delivered
client-side instead — the same approach the golf app uses with `api_cache`.

1. **Client poll.** While any game in the current week has `state === 'in'`, the picks page
   re-requests `GET /api/week/:n` every 60s. When nothing is live, it does not poll.
2. **Server throttle.** That handler re-fetches ESPN only if
   `now() - sync_state.last_score_sync_at > 55s`; otherwise it serves cached `games` rows.
   Ten family members refreshing at once produce one ESPN call per minute, not ten.
3. **Daily Vercel cron, 6:00am ET → `/api/cron/sync`.** Re-syncs the current and next week
   to catch flex-schedule changes, and finalizes games that ended after everyone closed
   their tabs.
4. **Optional escalation.** If the board needs to be current with nobody watching, add a
   GitHub Actions scheduled workflow hitting `/api/cron/sync?key=$CRON_SECRET` every 10
   minutes on game days. Free. Not needed at launch.

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/sync",   "schedule": "0 10 * * *" },
    { "path": "/api/cron/remind", "schedule": "0 14 * * *" }
  ]
}
```

Vercel crons run in UTC; `0 10` and `0 14` are 6:00am and 10:00am ET during EDT. Both fire
once daily, within Hobby limits.

---

## 8. Email

**Resend free tier:** 3,000 emails/month, 100/day, 1 verified domain. A 10-person pool
sends roughly 20/week, so this stays free indefinitely.

Two transactional emails, both plain and short:

- **Your link** — sent on member creation and on `/login` recovery. Contains the
  `/join/<token>` URL and one line explaining it keeps them signed in all season.
- **Pick reminder** — sent by the daily cron, deep-linking to `/`.

### Reminder logic (`GET /api/cron/remind`)

1. Reject unless `?key` matches `CRON_SECRET`.
2. If `sync_state.last_reminder_date === today`, exit — makes retries safe.
3. Find the earliest `kickoff_at` in the current week that is still in the future. If it is
   more than ~30 hours away, exit.
4. Write `last_reminder_date = today` **before** sending, so a mid-loop failure cannot
   double-send on retry.
5. Email each member with `wants_reminders = true` who has fewer picks than the week has
   games, naming how many they're missing.

### Domain verification

Add the DKIM and SPF records Resend supplies to Cloudflare DNS, left **DNS-only** (grey
cloud). Until the domain verifies, hand personal links out by text — the app is fully
usable without email.

---

## 9. Design implementation notes

`design/README.md` is the authoritative UX spec and carries the full token sets. Points
that specifically affect implementation:

- **Fonts.** Zilla Slab 500–700 (display, all numerals) and Atkinson Hyperlegible 400/700
  (body/UI), both from Google Fonts. Load via `next/font/google` with `display: swap`.
- **Team colors.** The canvas defines a partial map (`TC`) covering only the 18 teams that
  appear in artboards: PHI `#004C54`, GB `#203731`, BUF `#00338D`, MIA `#008E97`, DET
  `#0076B6`, CHI `#C83803`, CIN `#FB4F14`, CLE `#311D00`, KC `#E31837`, LAC `#0080C6`, SF
  `#AA0000`, SEA `#002244`, MIN `#4F2683`, PIT `#101820`, DAL `#041E42`, BAL `#241773`,
  NYJ `#125740`, DEN `#FB4F14`. Seed `lib/teams.ts` with these exact values and fill the
  remaining 14 from ESPN's `competitor.team.color`, which sync already fetches. Never let a
  team render without a color.
- **Pick wash formula.** `color-mix(in srgb, <team> 9%, #fff)` plus
  `inset 0 0 0 2px <team>` on light; the mix steps to 22–30% against `#2b251c` on dark.
- **Team colors are feedback only** — never chrome, never navigation, never headers.
- **Logos.** `https://a.espncdn.com/i/teamlogos/nfl/500/{abbr.toLowerCase()}.png`, rendered
  26–32px. Hotlink; add the host to `next.config.js` `images.remotePatterns` if using
  `next/image`.
- **Three states must be distinguishable across a room:** navy kickoff time (OPEN) vs
  pulsing red LIVE pill (LIVE) vs gray FINAL chip (FINAL).
- **No submit button anywhere.** Optimistic local update + debounced `PUT /api/pick`. A
  "saved" affordance appears only on failure/retry.
- **Tap targets ≥ 44px**; team halves are full-height hit areas 62–72px tall.
- **Ties share a rank**, rendered `T2` / `T4`, and are never broken by a secondary sort.
  This is intentional product behavior, not a gap.
- **Artboard 1b is the rejected alternate** ballot card. Reference only — do not build it.
- **Dark mode** via `prefers-color-scheme` plus a manual override toggle.

---

## 10. Hosting & Domain

**Vercel Hobby.** Free, no card, custom domains with automatic SSL. Non-commercial use
only, which a no-buy-in family pool satisfies. Import the GitHub repo; pushes to `main`
deploy automatically. Set all §1 env vars in project settings.

**Supabase free.** Note the free plan allows **2 active projects**, and the Golf Scoreboard
app already occupies one. Either use the second slot for this app (recommended — cleaner,
independently resettable), or reuse the golf project with `nfl_`-prefixed table names. Free
projects also pause after roughly a week of inactivity; irrelevant in-season, expect a
one-click un-pause next preseason.

**Cloudflare DNS → Vercel.** Use a subdomain and leave the apex free:

1. Vercel → Settings → Domains → add `pool.<yourdomain>`, or
   `vercel domains add pool.<yourdomain> <project>`. Then run
   `vercel domains verify pool.<yourdomain>` to get the record — Vercel issues a
   **project-specific** CNAME target (e.g. `587b78a3b0de7bfb.vercel-dns-017.com`), not
   the generic `cname.vercel-dns.com` most guides quote. Use the one it hands you.
2. Cloudflare → DNS → add that `CNAME` on the `pool` name.
3. **Set the record to "DNS only" (grey cloud), not "Proxied" (orange).** This is the one
   real gotcha: proxying Cloudflare in front of Vercel causes SSL handshake failures and
   redirect loops. Vercel issues its own certificate once the CNAME resolves.
4. To use the apex instead, Vercel supplies an A record (`76.76.21.21`) — same grey-cloud
   rule applies.

---

## 11. Verification

1. **ESPN sync.** `GET /api/cron/sync?key=…` locally, then confirm 16 Week 1 rows in
   Supabase with correct `kickoff_at`, `day_group`, abbreviations, records, and logo URLs.
2. **Privacy — the check that matters.** Sign in as member A and make picks. In a private
   window, sign in as B. On B's `/`, View Source and search for A's picked team
   abbreviations: they must not appear in the HTML or any embedded payload for a
   pre-kickoff game. Then `curl` `/api/week/3` and `/api/grid/3` with B's cookie and grep
   the JSON. A visual check does not prove this.
3. **Lock enforcement.** Set one game's `kickoff_at` into the past in Supabase, then try to
   change that pick from an already-open tab — must 409, and that game's picks must become
   visible to everyone.
4. **Scoring and ties.** Mark a game final with a `winner_abbr` and confirm only correct
   pickers increment. Set `winner_abbr = NULL` (an NFL tie) and confirm nobody scores.
   Force two members to equal records and confirm standings render `T2` rather than an
   arbitrary order.
5. **Auth round-trip.** Open `/join/<token>`; confirm the redirect lands on `/`, the token
   is gone from the URL bar, and the cookie is flagged `HttpOnly`. Then use `/login` with
   that email and confirm the same link arrives.
6. **Reminders.** `GET /api/cron/remind?key=…`; confirm only members with missing picks are
   mailed and that an immediate second call sends nothing.
7. **Design fidelity.** Open `design/Gilson Pool Canvas.dc.html` beside the running app at
   390px wide and compare artboard by artboard: pick card in all three states, day
   grouping, header stat pills and progress bar, empty-state sticky pill, grid frozen name
   column, standings tie rendering. Then toggle `prefers-color-scheme: dark` and compare
   against 1j.
8. **Production.** Load `https://pool.<yourdomain>` on a phone: valid certificate,
   one-handed pick flow, 44px tap targets, sixteen picks in under a minute.

---

## 12. Build order

**Phase 1 — live before Week 1**
Scaffold Next 14 + TS + Tailwind from the golf app's configs; wire fonts and the light/dark
token sets. Run `supabase-setup.sql`; seed members via `/admin`. Build `lib/espn.ts`,
`lib/auth.ts`, `lib/picks.ts`, `lib/scoring.ts`, `lib/teams.ts`. Build the pick card (1a) in
all three states, then `/` (1c + 1d), `/standings` (1g), `/join/[token]`, and a minimal
`/admin` (1i). Deploy to Vercel and wire the Cloudflare CNAME. Hand out links by text if
Resend has not verified yet.

**Phase 2 — during Week 1**
Resend domain verification, `/login` (1h), the reminder cron, the week grid mobile and
desktop (1e / 1f) with frozen name column and nudge line, and the dark mode pass (1j).

**Phase 3 — later**
Nudge-to-email from the grid, postseason weeks (`season_type = 3`), override audit display,
and the optional GitHub Actions frequent sync.
