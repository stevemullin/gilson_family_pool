# Gilson Family Football Pool

A mobile-first NFL pick'em pool for ~10 family members. Tap a team per game, picks
autosave, 1 point per correct pick, season leaderboard by total wins. No money, no
submit buttons.

**Picks stay private until each game kicks off.** Before kickoff you can see only who has
picked, never what they picked.

## Docs

- [`SPEC.md`](SPEC.md) — the technical spec: stack, schema, ESPN field mapping, auth,
  privacy rules, routes, hosting and DNS runbook.
- [`design/README.md`](design/README.md) — the UX spec: design tokens, screens, states.
- [`design/Gilson Pool Canvas.dc.html`](design/Gilson%20Pool%20Canvas.dc.html) — the design
  canvas, artboards 1a–1j. Open it in a browser; where it disagrees with SPEC.md on
  anything visual, the canvas wins.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase Postgres · Vercel · Resend ·
ESPN's public NFL scoreboard API.

## Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase, Resend, CRON_SECRET
# note: all vars are server-only — do not add a NEXT_PUBLIC_ prefix to any of them
npm run dev
```

Run `supabase-setup.sql` in the Supabase SQL editor once to create the schema.

## Local development database

Development runs against a Supabase stack in Docker, never the live pool.
Production credentials live only in Vercel.

```bash
supabase start          # first run pulls ~2GB of images
supabase db reset       # applies the schema and seeds 18 fictional members
npm run dev
```

Sign in as the seeded commissioner — this also triggers the first ESPN sync,
which populates that week's games:

    http://localhost:3000/join/devdevdevdevdevdevdev1

Then fill the board in with random picks so the grid and standings have
something to show:

```bash
docker exec supabase_db_gilson_family_pool psql -U postgres -c "select dev_seed_picks();"
```

Useful local URLs: the app on :3000, Supabase Studio on
http://127.0.0.1:54323, and captured outbound email on http://127.0.0.1:54324.

Every page shows a banner naming which database it's talking to. Green means
local and safe; red means you are one tap away from changing a real family
member's pick. `RESEND_API_KEY` is intentionally empty locally, so email is
logged rather than sent.

To point local development at production temporarily, `npx vercel env pull`
— and expect the red banner.
