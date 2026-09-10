import { createServiceClient } from "./supabase";
import type { Game, Member, Pick, PoolPick } from "./types";

/**
 * A game is revealed purely by the clock: `kickoff_at <= now()`. Not "when it's live",
 * not "when an admin says so". A flexed game that moves later correctly re-hides.
 */
export function isRevealed(
  game: { kickoff_at: string },
  now = new Date()
): boolean {
  return new Date(game.kickoff_at).getTime() <= now.getTime();
}

export interface WeekView {
  games: Game[];
  members: Array<{ id: string; name: string }>;
  /** gameId -> the viewer's own pick. Always complete; you can see your own picks. */
  myPicks: Record<string, string>;
  /** gameId -> what the viewer may know about everyone else. */
  poolPicks: Record<string, PoolPick[]>;
}

/**
 * THE privacy rule, in one place (SPEC.md §5).
 *
 * For a revealed game, other members' `pickedAbbr` is included. For an unrevealed one,
 * only `hasPicked` is — the chosen team is omitted from the object entirely, so it
 * cannot reach the browser through a prop, JSON body, or RSC payload. This filtering
 * MUST happen here, server-side, before anything is serialized. Hiding a pick in the
 * client is not equivalent and is not acceptable.
 */
export async function getWeekView(
  season: number,
  week: number,
  viewerId: string,
  seasonType = 2
): Promise<WeekView> {
  const supabase = createServiceClient();

  const [{ data: games }, { data: members }] = await Promise.all([
    supabase
      .from("games")
      .select("*")
      .eq("season", season)
      .eq("season_type", seasonType)
      .eq("week", week)
      .order("kickoff_at", { ascending: true }),
    supabase.from("members").select("id, name").order("name"),
  ]);

  const gameList = (games ?? []) as Game[];
  const memberList = (members ?? []) as Array<{ id: string; name: string }>;
  const gameIds = gameList.map((g) => g.id);

  let allPicks: Pick[] = [];
  if (gameIds.length > 0) {
    const { data: picks } = await supabase
      .from("picks")
      .select("*")
      .in("game_id", gameIds);
    allPicks = (picks ?? []) as Pick[];
  }
  const now = new Date();

  const myPicks: Record<string, string> = {};
  const poolPicks: Record<string, PoolPick[]> = {};

  for (const game of gameList) {
    const revealed = isRevealed(game, now);
    const forGame = allPicks.filter((p) => p.game_id === game.id);

    const mine = forGame.find((p) => p.member_id === viewerId);
    if (mine) myPicks[game.id] = mine.picked_abbr;

    poolPicks[game.id] = memberList
      .filter((m) => m.id !== viewerId)
      .map((m) => {
        const pick = forGame.find((p) => p.member_id === m.id);
        if (!pick) {
          return { memberId: m.id, memberName: m.name, hasPicked: false };
        }
        if (!revealed) {
          // Deliberately omits pickedAbbr. Do not "helpfully" add it back.
          return { memberId: m.id, memberName: m.name, hasPicked: true };
        }
        return {
          memberId: m.id,
          memberName: m.name,
          hasPicked: true as const,
          pickedAbbr: pick.picked_abbr,
          overridden: pick.overridden_by !== null,
        };
      });
  }

  return { games: gameList, members: memberList, myPicks, poolPicks };
}

export type SavePickResult =
  | { ok: true }
  | { ok: false; status: 404 | 409 | 400; message: string };

/**
 * Save or switch a pick. Rejects with 409 once the game has kicked off, so a tab left
 * open past kickoff cannot submit.
 */
export async function savePick(
  memberId: string,
  gameId: string,
  team: string
): Promise<SavePickResult> {
  const supabase = createServiceClient();

  const { data: game } = await supabase
    .from("games")
    .select("id, kickoff_at, home_abbr, away_abbr")
    .eq("id", gameId)
    .maybeSingle();

  if (!game) return { ok: false, status: 404, message: "No such game." };

  if (team !== game.home_abbr && team !== game.away_abbr) {
    return { ok: false, status: 400, message: "That team isn't in this game." };
  }

  if (isRevealed(game)) {
    return { ok: false, status: 409, message: "This game has already kicked off." };
  }

  const { error } = await supabase.from("picks").upsert(
    {
      member_id: memberId,
      game_id: gameId,
      picked_abbr: team,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id,game_id" }
  );

  if (error) return { ok: false, status: 400, message: error.message };
  return { ok: true };
}

export interface GridCell {
  gameId: string;
  /** Present only when the game is revealed, or when it's the viewer's own pick. */
  pickedAbbr?: string;
  /** Which side of the matchup that pick was, so the chip can colour itself. */
  side?: "home" | "away";
  hasPicked: boolean;
  /** Kicked off, so an empty cell here is a miss rather than a pending pick. */
  locked: boolean;
  correct?: boolean;
}

export interface GridRow {
  memberId: string;
  name: string;
  isViewer: boolean;
  weekPoints: number;
  seasonPoints: number;
  cells: GridCell[];
  missing: number;
}

/**
 * Week grid data for every member, including the viewer.
 *
 * Same rule as getWeekView: a cell carries `pickedAbbr` only when the game has kicked
 * off, or when the row is the viewer's own. Pre-kickoff cells expose `hasPicked` and
 * nothing else, so the grid cannot leak a pick through the DOM.
 */
export async function getGridView(
  season: number,
  week: number,
  viewerId: string,
  seasonType = 2
): Promise<{ games: Game[]; rows: GridRow[] }> {
  const supabase = createServiceClient();

  const [{ data: weekGames }, { data: seasonGames }, { data: members }] =
    await Promise.all([
      supabase
        .from("games")
        .select("*")
        .eq("season", season)
        .eq("season_type", seasonType)
        .eq("week", week)
        .order("kickoff_at", { ascending: true }),
      supabase
        .from("games")
        .select("*")
        .eq("season", season)
        .eq("season_type", seasonType),
      supabase.from("members").select("id, name").order("name"),
    ]);

  const games = (weekGames ?? []) as Game[];
  const allGames = (seasonGames ?? []) as Game[];
  const memberList = (members ?? []) as Array<{ id: string; name: string }>;

  const { data: picksData } = await supabase.from("picks").select("*");
  const allPicks = (picksData ?? []) as Pick[];

  const now = new Date();
  const gameById = new Map(allGames.map((g) => [g.id, g]));

  const rows: GridRow[] = memberList.map((m) => {
    const mine = allPicks.filter((p) => p.member_id === m.id);
    const isViewer = m.id === viewerId;

    let weekPoints = 0;
    let seasonPoints = 0;
    for (const pick of mine) {
      const game = gameById.get(pick.game_id);
      if (!game?.is_final || game.winner_abbr === null) continue;
      if (game.winner_abbr !== pick.picked_abbr) continue;
      seasonPoints += 1;
      if (game.week === week) weekPoints += 1;
    }

    let missing = 0;
    const cells: GridCell[] = games.map((game) => {
      const locked = isRevealed(game, now);
      const pick = mine.find((p) => p.game_id === game.id);
      if (!pick) {
        // Only count picks someone can still make. A game that already kicked
        // off is missed, not outstanding — counting it would nudge people
        // forever about something they can't act on.
        if (!locked) missing += 1;
        return { gameId: game.id, hasPicked: false, locked };
      }
      const revealed = locked || isViewer;
      if (!revealed) return { gameId: game.id, hasPicked: true, locked };

      return {
        gameId: game.id,
        hasPicked: true,
        locked,
        pickedAbbr: pick.picked_abbr,
        side: pick.picked_abbr === game.home_abbr ? "home" : "away",
        correct:
          game.is_final && game.winner_abbr !== null
            ? game.winner_abbr === pick.picked_abbr
            : undefined,
      };
    });

    return {
      memberId: m.id,
      name: m.name,
      isViewer,
      weekPoints,
      seasonPoints,
      cells,
      missing,
    };
  });

  rows.sort(
    (a, b) => b.weekPoints - a.weekPoints || a.name.localeCompare(b.name)
  );

  return { games, rows };
}
