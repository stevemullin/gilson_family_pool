# Gilson Family Football Pool — design update, September 2026

Navigation, the week grid on a phone, and what sits under a locked pick card.
Canvas: `design/Gilson Pool Canvas.dc.html`, turn 9 (final), turns 2–8 (decisions).
Where this file and the canvas disagree on anything visual, the canvas wins.

## 1. Tab bar (new shared component)

Replaces the text links at the bottom of every page and the sticky "N of 16 picked" pill.

- Fixed to the bottom of the viewport on all three routes: `/`, `/week/[n]`, `/standings`. Height 59px + `env(safe-area-inset-bottom)`. Background `--card` (#fff), top border 1px `--card-border`.
- Three equal tabs, text only, no icons. Each tab is a column: label (Zilla Slab 700 13px) over a subtitle (Atkinson 700 10px). Active: label + subtitle `--accent` (#31527b) and a 3px `--accent` rule along the tab's top edge. Inactive: label + subtitle `--ink-secondary` (#7d6f58).
- Labels: **Picks · Everyone · Standings**.
- Subtitles are live data:
  - Picks: `"{picked} of {games}"`. When active, the 3px top rule becomes a progress track: `--desk` (#efe9dd) full width, `--accent` fill at `picked/games`. When inactive and picks are outstanding, subtitle reads `"{remaining} to go"` in `--live` (#c0392b); when all in, `"All in"`.
  - Everyone: `"Week {n} grid"`.
  - Standings: `"You’re {ordinal}"` (ties: `"You’re T2"`); when active, `"{ordinal} · {W}–{L}"`.
- Tab links carry the current week: `/?week=n` and `/week/n`. Standings has no week.
- Remove: the fixed bottom pill in `PicksClient.tsx`; the "N of 16 picked" header pill and the 5px progress bar under it (keep the "My record" pill); the `<nav>` text links on all three pages.
- Keep ✓ Saved: on a successful write, show a transient toast (`--correct-ink` ground, white 11.5px 700, pill, shadow) centred 11px above the tab bar for 1.8s. It is the only save feedback.
- Page bottom padding: 59px + safe area + 16px.
- `/admin`: no link anywhere. Commissioner types the URL.

## 2. Week is one axis across Picks and Everyone

- Both pages read `?week=n` (`/week/[n]` may also keep the path param; the tab bar links to `/week/n`).
- The header block — overline, `‹ Week n ›` arrows, subtitle — is one component used by both pages. Arrows are 34px circles, `--card-border` 1px, disabled at 0.35 opacity at weeks 1 and maxWeek.
- Grid page subtitle: "Picks stay hidden until each game kicks off." Remove the "Waiting on X — nudge them" line and the five-item legend.

## 3. Pick card (`PickCard.tsx`)

- **Remove `+n` from the YOU pill in every state.** The picker row is replaced entirely (below), so the YOU pill no longer exists on the card. The picked half (wash + ring + ✓ disc, or green/red once final) is the only "you" indicator.
- **Remove the urgent state**: no dashed border, no red PICK, delete `URGENT_MS` and `urgentCutoff`. Reminders are email's job.
- **Replace the picker pill rows with a split bar** once the game is locked (`kickoff_at <= now`):
  - Region below the halves, above a 1px `--hairline` top border, padding 8px 12px 10px.
  - Bar: 6px tall, radius 99px, two segments with a 2px gap, flex-grow = number of pickers on each side (away left, home right). Include the viewer in the counts.
  - Segment colour, pre-final: the side the viewer picked = that team's `teamColor()`; the other side = #d8d1c3. If the viewer didn't pick: both #d8d1c3.
  - Segment colour, final: winning side `--correct-ink` (#256a3a), losing side `--wrong-ink` (#b03a2e).
  - Labels, one line under the bar, 11px 700, space-between. Viewer's side: `"You + {n} others"` (`"You"` if alone). Other side: `"{n} on {ABBR}"`. No pick: `"{n} on {AWAY}"` / `"{n} on {HOME}"`. Label colour matches its segment; the neutral side uses `--ink-secondary`.
  - Tap anywhere on the region to expand: a second line, two columns (away left-aligned, home right-aligned), first names comma-separated, 11px/1.5 `--ink-warm` (#5b4f3e), viewer listed first as **You** in `--accent`. Tap again to collapse. Collapsed by default, one state per card. Overridden picks: no marker in the list (drop the "·").
  - Pre-kickoff: nothing below the halves (as today).

## 4. Everyone grid (`app/week/[n]/page.tsx`)

Layout on phone (≤ 430px content):
- Frozen left block, 140px total: **Name** column (96px) with the season total as a second line (`"Season {n}"`, 9.5px 400 `--ink-secondary`), then **Wk n** column (44px, Zilla 700 15px) with a 1px `--day-rule` right border and the existing 2px shadow. The standalone Season column is removed.
- Game columns 44px, scroll horizontally. A 36px right-edge fade (`transparent → --bg` at 80%) sits over the scroller so the clipped column reads as "more". No legend.
- Column header: away over home, Zilla 700 9px, then a 6px status dot — `--ink` final, `--live` in progress, 1px `--ink-tertiary` outline open.
- Zebra rows stay: odd rows `--desk`.
- Sort: `weekPoints desc, seasonPoints desc, name asc` (currently falls to name after week points — add season points).

Cell states (10px Zilla 700 pills, padding 3px 6px, radius 99px, `white-space: nowrap`):
- Not picked, game open: 30×18 dashed pill, `#cdbfa5` (unchanged).
- Not picked, game locked: "–" in `--ink-tertiary` (unchanged).
- Picked, hidden (pre-kickoff): 8px dot `--ink-tertiary` (unchanged).
- **In progress, home pick**: ground `--ink-warm` (#5b4f3e), text `--bg` (#faf6ef). Abbreviation only.
- **In progress, away pick**: ground #fff, text `--ink-warm`, `box-shadow: inset 0 0 0 1px #d8cfbc`. Abbreviation only.
- **Final, correct**: ground `--correct-bg`, text `--correct-ink`. Abbreviation only — no ✓.
- **Final, wrong**: ground `--wrong-bg`, text `--wrong-ink`. Abbreviation only — no ✗.

Desktop (≥ 1000px) keeps the same table; the fade is unnecessary when all columns fit.

## 5. Retire the picker pill palette

- Delete `pickerPill()`, `teamAlt()`, `TEAM_ALT`, `HOME_BACKGROUND`, `AWAY_BG`, `AWAY_INK` and the contrast helpers from `lib/teams.ts`. Keep `teamColor()`, `teamLogo()`, `teamWash()`.
- Delete `design/pill-palette.html` and its `/pill-palette.html` route.
- New token in `globals.css`: `--away-bg` is no longer needed; remove it.
- Team colour now appears in exactly two places: the picked half of a pick card (wash + ring + disc) and the viewer's segment of the split bar.

## 6. Standings

Unchanged apart from the tab bar and the removal of the bottom text links.

## 7. Backlog

- Navigation: done by this spec.
- Child accounts without email: **WONT DO** until at least next season.
