# Handoff: Gilson Family Football Pool

## Overview
A mobile-first web app for a ~10-person family NFL pick'em pool. No money, no submit buttons: each week (~16 games) every member taps one team per matchup to pick the winner; picks autosave. 1 point per correct pick. Core social mechanic: **picks are private until each game kicks off** — before kickoff you can see only *who has picked*, never *what* they picked; after kickoff that game's picks become visible to everyone.

## About the Design Files
`Gilson Pool Canvas.dc.html` is a **design reference created in HTML** — a design canvas of artboards showing intended look and behavior, not production code. Recreate these designs in your target stack's established patterns (any modern framework works; a small React/Next or SvelteKit app with a Postgres/SQLite backend is a natural fit — no environment exists yet, so choose freely). Open the file in a browser to view the artboards; each carries an id badge (1a, 1c, 1e…).

## Fidelity
**High-fidelity.** Colors, type, spacing, and copy tone are final intent. Recreate pixel-close, substituting your component library where equivalent.

## Design Tokens
Fonts (Google Fonts):
- Display / numerals: `Zilla Slab` 500–700
- Body / UI: `Atkinson Hyperlegible` 400/700

Light palette:
- App background (cream): `#faf6ef` · canvas/desk `#efe9dd`
- Card surface: `#fff` · card border `#e6ddcb` · hairline `#f0e9da` · day-rule `#e2d8c4`
- Ink: `#2a2318` · secondary `#7d6f58` · tertiary/overline `#a3937a` · warm mid `#5b4f3e`
- Accent (heritage navy): `#31527b` (hover `#24405f`)
- Live red: `#c0392b` · Final gray chip: `#8a7d66`
- Correct: ink `#256a3a` on `#e4f0e7` · Wrong: ink `#b03a2e`/`#a03b2c` on `#f9e6e2`
- Leader highlight: `#b5432a` at 6% over cream

Dark palette (artboard 1j):
- Background `#211c15` · card `#2b251c` · border `#453b2c` · hairline `#38301f`
- Ink `#f2ead9` · secondary `#c9bda4` · tertiary `#8a7d66` · navy accent lightened `#9db8d8`
- Live red `#e05d4b` · correct `#8fd0a4` on `rgba(83,155,108,.18)`
- Team-color washes step up to ~22–30% mix against the dark card (vs 8–9% in light)

Team colors: standard NFL primaries keyed by abbreviation (e.g. KC `#E31837`, BUF `#00338D`, SEA uses `#69BE28` wash with `#002244` ring). Used **only** for pick/state feedback — never as chrome. Wash formula: `color-mix(in srgb, <team> 9%, #fff)` + `inset 0 0 0 2px <team>` ring.

Shape & spacing: cards radius 14px, chips/pills radius 99px, buttons radius 10–12px; card padding 11–12px; page gutter 14–16px; tap targets ≥ 44px (team halves are ~62–72px tall, full-half hit area).

Team logos: ESPN PNG CDN — `https://a.espncdn.com/i/teamlogos/nfl/500/{abbr}.png` (lowercase abbr), rendered 26–32px.

## The Pick Card (chosen direction: "Split matchup", artboard 1a)
One horizontal card per game: two tappable team halves flanking a 56–60px center column.
- Half contents: logo (30px), team abbreviation (Zilla Slab 700 16–17px), record (11px secondary).
- Center column: state indicator (see below) separated by hairlines.
- **OPEN, unpicked**: white card. If a pick is still needed near lock, use dashed border `#cdbfa5` and red "PICK" over the kickoff time.
- **OPEN, picked**: picked half gets team wash + 2px inset team-color ring + team-color ✓ badge (19–20px circle); other half drops to 75% opacity. Tapping the other half switches; tap targets stay full-half.
- **LIVE**: card locked (halves not buttons), 3px top border `#c0392b`, center shows red LIVE pill with pulsing 4–5px dot + quarter/clock (e.g. "Q3 5:12"). Scores 22–24px Zilla Slab at inner edge of each half. Your pick keeps its team wash + "YOU +n" (n = your running week points); other side shows pick counts or picker initials chips (16px pills, 8.5px text).
- **FINAL**: center gray FINAL chip. Winner half normal, loser at 55% opacity. Your pick recolors: correct → green ink/wash, "PHI ✓ / YOU +1"; wrong → red ink/wash with ✗.
All three states must be distinguishable at a glance across a room: navy time vs pulsing red pill vs gray chip.

## Screens
### 1c · Picks page (mobile 390)
- Header: overline "GILSON FAMILY FOOTBALL POOL" (10px, letter-spacing .16em, `#a3937a`), centered `‹ Week 3 ›` (Zilla Slab 700 26px, 34px round arrow buttons), two stat pills ("My record 24–9" navy tint, "14 of 16 picked" tan), 5px navy progress bar.
- Games grouped by day with rules: Thursday night / Sunday 1:00 / Sunday 4:05 & 4:25 / Sunday night / Monday night. Group label: Zilla Slab 700 13px `#6b5d49` + 1px rule.
- Cards stack vertically, 8px gap, using the pick card above in all states.

### 1d · Picks page, empty state
- Same header; forward week arrow disabled (35% opacity).
- Navy welcome banner card: "Week 3 is open, Mike." + one-line how-to ("Tap a team on each card — picks save as you go, no submit button") + 0-of-16 progress.
- All cards dashed-border unpicked; under the first card a small navy hint pill: "↑ Tap either team to pick — that's it".
- Sticky bottom pill (dark, floating): "0 of 16 picked · 13 to go Sunday".
- Design intent: ripping through 16 taps should take under a minute; the count ticks up in the sticky pill as they go.

### 1e · Week grid (mobile 390)
- Horizontally scrolling grid; **frozen name column** (sticky left, 78px, subtle right shadow, zebra background).
- After the name: **WK3 points** and **SEASON points** columns (Zilla Slab 700), then one 38px column per game. Rows sorted best-to-worst by week points.
- Column headers: stacked away/home abbrs + 6px status dot (open = hollow tan ring, live = red, final = dark).
- Cells: OPEN + picked → neutral tan dot (never the team). OPEN + unpicked → dashed empty chip. LIVE → solid team-color chip with abbr. FINAL → green "ABR ✓" / red "ABR ✗" tinted chips.
- Nudge line above grid: "Waiting on Tom — 4 games unpicked. Nudge him." (red 700).
- Legend row at bottom explaining dot/chip states.

### 1f · Week grid (desktop, ~920px content)
Same data, all columns fit without scroll: name (110px) → WK 3 → SEASON (54px each, season in tertiary color, right hairline) → equal-width game columns. Sorted best-to-worst for the week. Subhead: "Picks stay hidden until each game kicks off."

### 1g · Season standings (mobile 390)
Deliberately minimal: rank + name + record only. Rows: rank (Zilla Slab 700 15px; leader rank in `#b5432a` with 6% wash row), name (15px 700), record right-aligned ("25–7", Zilla Slab 700 16px). **Ties share a rank** rendered as `T2`, `T4` — intentional, never broken by secondary sorts. Caption: "Through Week 2 · Week 3 in progress".

### 1h · Login ("email me my link")
Passwordless; screen only appears when someone loses their personal link. Centered: navy circle monogram "G", app name (Zilla Slab 700 24px, two lines), reassurance copy ("No passwords here… keeps you signed in all season"), centered email input (1.5px `#ddd2bc` border, radius 12), full-width navy button "Email me my link", footnote "Only emails already in the pool get a link. Ask Mike (the commissioner) if yours changed."

### 1i · Admin (desktop, ~1000px)
"Commissioner tools", signed-in note. Two-column grid (1.5fr/1fr):
- Members card: table (name / email / week picks n/9 colored green-complete, red-incomplete / "Resend link" outline button per row), "+ Add member" navy button.
- Scores card: "Auto-refreshes every 60s on game days. Last sync: today 2:47 PM." + "Force refresh now" navy button.
- Override card: member select, game select, two team toggle buttons, gray "Save override" button. Caption: "For 'my phone died before kickoff' emergencies. Logged and visible to everyone."

### 1j · Dark mode
Palette check of the picks page (see dark tokens). Same structure; state language unchanged (ring/wash, red pill, green/red tints), colors lifted for contrast on `#2b251c` cards.

## Interactions & Behavior
- Tap team half → optimistic pick + autosave (debounced PATCH); tapping the other half switches; no confirm, no submit. Show a transient "saved" affordance only on failure/retry.
- Picks lock exactly at kickoff per game (server-enforced; client greys at kickoff too).
- Live scores poll ~60s during game windows; LIVE dot pulses (1.4s opacity keyframe).
- Week arrows navigate weeks 1–18; forward disabled beyond current week.
- Grid pre-kickoff cells never reveal team, even in DOM/API payloads (privacy is server-side: the API must not send others' pick contents before kickoff).
- Nudge line links to grid; optional future: tap to send a reminder email.
- Light/dark via `prefers-color-scheme` with manual override.

## State Management
- `me` (member id from magic link token), `week` (selected), `games[]` (teams, kickoff, status open|live|final, scores, quarter/clock), `myPicks{gameId→teamAbbr}`, `poolPicks` (per game: pre-kickoff → picked booleans only; post-kickoff → member→team), `standings[]`, `members[]` (admin).
- Derived: picked count, my week points, sorted grid rows, tie-aware ranks.

## Data / API sketch
- `GET /api/week/:n` → games + my picks + pool pick-status (privacy-filtered server-side)
- `PUT /api/pick {gameId, team}` → 409 if kicked off
- `GET /api/standings`, `GET /api/grid/:week`
- `POST /api/auth/magic-link {email}`; token in URL, long-lived session cookie
- Admin: `POST /api/members`, `POST /api/members/:id/resend`, `POST /api/scores/refresh`, `PUT /api/admin/pick` (audit-logged)
- Score source: ESPN scoreboard endpoint or similar, cron every 60s during game windows.

## Assets
- Team logos: ESPN CDN PNGs (URL pattern above) — hotlink or cache locally.
- No other imagery; the monogram "G" circle on login is pure CSS.

## Files
- `Gilson Pool Canvas.dc.html` — the design canvas (all artboards 1a–1j). Artboards: 1a pick card states (chosen), 1b alternate ballot card (not chosen, reference only), 1c picks page, 1d empty state, 1e/1f week grid mobile/desktop, 1g standings, 1h login, 1i admin, 1j dark mode.
