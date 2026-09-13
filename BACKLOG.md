# Backlog

Ideas not yet scoped. Each entry records enough context to pick up cold — what it is,
why it came up, and what it collides with. See [`SPEC.md`](SPEC.md) for how the app
works today.

---

## ~~Navigation design for standings and the weekly picks grid~~ — done

**Done, September 2026** — a fixed bottom tab bar (Picks · Everyone · Standings) with
live subtitles, per `design/SPEC-2026-09-nav-grid.md`. `/admin` deliberately has no
link; the commissioner types the URL.

**What it was:** A real navigation pattern for moving between the three views — picks
(`/`), the week grid (`/week/[n]`), and season standings (`/standings`).

**Why:** Today these are plain text links stacked at the bottom of each page. You have to
scroll past sixteen game cards to reach them, which is the wrong end of the page on a
phone. The design handoff has artboards for every screen but none for navigation, so this
was never designed — the current links are a placeholder I put in to make the pages
reachable, not a considered pattern.

**Worth thinking about:**
- A bottom tab bar is the obvious phone answer and keeps the three views one tap apart,
  but it permanently occupies ~56px of a screen whose whole job is showing game cards.
- It would collide with the existing sticky "N of 16 picked" pill, which floats in the
  same place. One of them has to move, or they merge.
- Week navigation (`‹ Week 3 ›`) already lives in the header and is a separate axis from
  view navigation — worth not conflating them.
- Whatever it becomes should also cover `/admin`, which currently has no link from
  anywhere and is reachable only by typing the URL.

---

## Weekly email report

**What:** A recap email after Monday night — final standings, who won the week, biggest
upset, who's on a streak, who got shut out.

**Why:** The pool's fun is the trash talk, and right now nothing prompts it. The app only
reaches out to nag people about unmade picks; a weekly recap gives everyone a reason to
look at the standings and a thing to argue about.

**Worth thinking about:**
- The Resend + email plumbing already exists (`lib/email.ts`), so this is mostly a new
  cron and a template.
- Vercel Hobby caps cron *frequency* at once per day, not the number of jobs, so a third
  daily cron is fine — have it run daily and return early unless it's Tuesday morning and
  the week's last game is final.
- Needs the same idempotency guard the reminder uses (`sync_state.last_reminder_date`
  pattern) so a retry can't send twice.
- Guard against sending when a Monday game is postponed and the week isn't actually
  complete — check every game `is_final` rather than trusting the calendar.

---

## Child accounts without an email address — WON'T DO this season

**Decision, September 2026:** not this season, revisit for 2027 at the earliest. The
workaround holds: a parent signs the child up on a `+name` alias of their own gmail
(`yourname+jack@gmail.com`), which delivers to the parent and counts as a separate
player.

**What:** Let kids play without having an email address of their own.

**Why:** The whole auth model is a personal link delivered by email, and `members.email`
is `UNIQUE NOT NULL`. Any family member without an inbox currently can't be added at all
without inventing a fake address for them — which then fails on every reminder send.

**Worth thinking about:**
- Two shapes: (a) make `email` nullable and let the commissioner hand the child's link
  over directly, or (b) add a `guardian_id` so a parent receives the child's link and
  reminders alongside their own.
- (b) is nicer but means a parent holds two links and needs a way to switch between
  them — which is a real UI, not a schema tweak.
- The reminder cron currently mails every member with `wants_reminders`; it would need to
  skip emailless members or route to the guardian.
- Privacy still has to hold: a child's picks stay hidden from everyone pre-kickoff,
  including a parent who can open their link. Worth deciding deliberately rather than
  inheriting whatever falls out.
- Keeps the pool honest about scale — this is a ~10 person family pool, so the simplest
  thing that works probably wins.

---

## Wildcard round as the money tiebreaker

**What:** If the buy-in race ends tied, the pool's rule is that tied players keep picking
through the Wildcard round of the playoffs, most correct picks takes the pot.

**Why:** The rule was set when the buy-in was announced. The app can't run it yet — it
only syncs the regular season (`season_type = 2`), and the picks page's week navigation
stops at 18. Wildcard is `season_type = 3`, week 1.

**Worth thinking about:**
- `lib/season.ts` and the cron sync both assume regular season; both need to follow
  ESPN's `season.type` past Week 18 rather than clamping.
- Only tied buy-in players' Wildcard picks count for the pot, but there's no reason to
  stop everyone else picking for fun.
- Needs to be built and tested before the regular season ends — January is a bad time
  to discover it doesn't work.

---

## Buy-in tracking

**What:** A `bought_in` flag on members, a toggle in `/admin`, and a `$` marker next to
those names in standings so the pot race is visible in the same table.

**Why:** The pool has an optional $10 buy-in with its own winner (most correct picks
among buy-in members). Today there's one standings table and the commissioner works the
money race out by hand against a separate list.

**Worth thinking about:**
- Keep it one table. A second "money standings" page splits attention and the family
  will ask which one is real.
- The marker should be quiet — a small `$` after the name — not a colour, which is
  reserved for the leader highlight and the viewer's row.
- Opt-in closed on 2026-09-13; the flag is set once and rarely changes, so no need for
  self-service.
