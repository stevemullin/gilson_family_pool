import type { Game, Pick, StandingRow } from "./types";

/**
 * A pick scores iff the game is final and the member picked the winner.
 * `winner_abbr` is NULL on an NFL tie, so a tie awards nobody a point.
 */
export function isCorrect(game: Game, pickedAbbr: string): boolean {
  return game.is_final && game.winner_abbr !== null && game.winner_abbr === pickedAbbr;
}

export function pointsFor(
  memberId: string,
  games: Game[],
  picks: Pick[]
): { correct: number; played: number } {
  const byId = new Map(games.map((g) => [g.id, g]));
  let correct = 0;
  let played = 0;

  for (const pick of picks) {
    if (pick.member_id !== memberId) continue;
    const game = byId.get(pick.game_id);
    if (!game?.is_final) continue;
    played += 1;
    if (isCorrect(game, pick.picked_abbr)) correct += 1;
  }

  return { correct, played };
}

/**
 * Season standings, sorted best-first.
 *
 * Ties share a rank and are rendered "T2" / "T4" by the UI. This is intentional
 * product behavior from the design spec — never break a tie with a secondary sort.
 */
export function computeStandings(
  members: Array<{ id: string; name: string }>,
  games: Game[],
  picks: Pick[]
): StandingRow[] {
  const rows = members
    .map((m) => {
      const { correct, played } = pointsFor(m.id, games, picks);
      return { memberId: m.id, name: m.name, correct, played, rank: 0, tied: false };
    })
    .sort((a, b) => b.correct - a.correct || a.name.localeCompare(b.name));

  rows.forEach((row, i) => {
    if (i > 0 && rows[i - 1].correct === row.correct) {
      row.rank = rows[i - 1].rank; // share the rank
    } else {
      row.rank = i + 1; // standard competition ranking: 1, 2, 2, 4
    }
  });

  const counts = new Map<number, number>();
  for (const row of rows) counts.set(row.rank, (counts.get(row.rank) ?? 0) + 1);
  for (const row of rows) row.tied = (counts.get(row.rank) ?? 0) > 1;

  return rows;
}
