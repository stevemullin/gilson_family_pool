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
- **Name** column (78px) is the only frozen column (`position: sticky; left: 0`, row background, 2px right shadow). First name left-aligned, season total right-aligned in the same cell (Zilla 400 11px `--ink-secondary`, tabular, min-width 16px) so the numbers form a column; header has "Name" left and "Ssn" right. Names longer than 7 characters are trimmed to 7 with an ellipsis (`Christina` → `Christi…`); full name in `title`.
- **Wk n** column (44px, Zilla 700 15px, 1px `--day-rule` right border) sits first in the scrolling region, not frozen. The standalone Season column is removed.
- Rows are single-line, 5px vertical padding, so 18 rows fit a phone screen without vertical scrolling.
- Game columns 44px, scroll horizontally. A 36px right-edge fade (`transparent → --bg` at 80%) sits over the scroller so the clipped column reads as "more". No legend.
- Column header: away over home, Zilla 700 9px, then a 6px status dot — `--ink` final, `--live` in progress, 1px `--ink-tertiary` outline open.
- Zebra rows stay: odd rows `--desk`. The viewer's row overrides the zebra with `color-mix(in srgb, var(--accent) 18%, var(--bg))` across the full row (frozen cell included), a 3px `--accent` bar on the left edge of the frozen name cell (`box-shadow: inset 3px 0 0`), and the name in `--accent`; drop the "you" text label.
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

- Viewer's row: same treatment as the grid — `color-mix(in srgb, var(--accent) 18%, var(--bg))` background, 3px `--accent` bar on the left edge, rank and name in `--accent`. Remove the "you" label.
- Otherwise unchanged apart from the tab bar and the removal of the bottom text links.

## 6a. Paid marker

- New column `members.paid boolean not null default false`, toggled on `/admin` (a checkbox per member; no other UI writes it).
- Where `paid` is true, render ` 💰` immediately after the member's name: the emoji at 11px (grid) / 12px (standings), `vertical-align: -1px`, no colour styling. Shown wherever a member name appears: grid name cell (inside the 7-char-trimmed name span, not counted toward the trim), standings row, and the expanded names list under a locked pick card.
- Initial data: set `paid = true` for Steve, Amy, Ashley, Kai, Cason, Jamie, Brian, Chantel, Seneca, John, April, Pattie, Kate, Jess, Christina, KHazz, Kayden, Josiah, Mark.

## 7. Backlog

- Navigation: done by this spec.
- Weekly email report: unchanged, still open.
- Child accounts without email: **WONT DO** until at least next season. Record this in `BACKLOG.md`.

## 8. Build order and acceptance

Suggested commits, each shippable on its own:

1. **Tab bar + remove old nav/pill** (§1, §6). Accept: all three routes show the bar; picks page has no bottom pill; tapping a team still flashes ✓ Saved above the bar; Picks tab subtitle and progress track update on tap without reload; `/admin` still works by URL.
2. **Week axis** (§2). Accept: arrows on `/week/[n]`; switching week on either page and tapping the other tab lands on the same week; Standings tab has no week param.
3. **Pick card** (§3). Accept: no dashed/PICK state anywhere; no `+n` anywhere; locked cards show the bar with counts that sum to the number of pickers; tap toggles names; final cards colour the bar by result.
4. **Grid** (§4). Accept on a 390px viewport: name column stays put on horizontal scroll, Wk scrolls; 18 rows fit without vertical scroll; viewer row tinted with left bar; sort verified with a manufactured tie on week points.
5. **Palette retirement** (§5). Accept: `grep pickerPill` returns nothing; `/pill-palette.html` 404s.

Files in this handoff:
- `design/SPEC-2026-09-nav-grid.md` — this file
- `design/Gilson Pool Canvas.dc.html` + `design/support.js` — updated canvas; turn 9 is the target state, turns 2–8 show the options considered and why each was rejected
