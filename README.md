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
npm run dev
```

Run `supabase-setup.sql` in the Supabase SQL editor once to create the schema.
