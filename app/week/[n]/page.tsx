import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getCurrentSeasonWeek } from "@/lib/season";
import { getGridView, type GridCell } from "@/lib/picks";
import { getNavData } from "@/lib/nav";
import TabBar from "@/components/TabBar";
import WeekHeader from "@/components/WeekHeader";

export const dynamic = "force-dynamic";

const NAME_W = 78;
const WEEK_W = 44;
const GAME_W = 44;

/**
 * Seven characters, then an ellipsis. The name column is the only frozen
 * one, and at 78px a long first name would either wrap the row or push the
 * season total off its column. The full name stays in the cell's title.
 */
function trimName(name: string) {
  const first = name.trim().split(/\s+/)[0] || name;
  return first.length > 7 ? first.slice(0, 7) + "…" : first;
}

export default async function WeekGridPage({
  params,
}: {
  params: { n: string };
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const current = await getCurrentSeasonWeek();
  const week = Number(params.n) || current.week;
  const [{ games, rows }, nav] = await Promise.all([
    getGridView(current.season, week, member.id, current.seasonType),
    getNavData(member.id, current.season, week, current.seasonType),
  ]);

  const now = Date.now();

  return (
    <>
      <main
        className="mx-auto max-w-[1000px] pt-1"
        style={{ paddingBottom: "calc(59px + env(safe-area-inset-bottom) + 16px)" }}
      >
        <WeekHeader week={week} maxWeek={nav.maxWeek} basePath="/week">
          <p
            className="mt-1 text-center text-[11px]"
            style={{ color: "var(--ink-secondary)" }}
          >
            Picks stay hidden until each game kicks off.
          </p>
        </WeekHeader>

        {/* The fade sits over the scroller's right edge so a clipped column
            reads as "there's more", rather than as the table simply ending. */}
        <div className="relative mt-[14px]">
          <div className="ml-4 overflow-x-auto">
            <table
              className="border-collapse text-[11px]"
              style={{ width: "max-content" }}
            >
              <thead>
                <tr>
                  <th
                    className="sticky left-0 z-10 px-[6px] pb-[6px] pt-2 text-left align-bottom"
                    style={{
                      width: NAME_W,
                      background: "var(--bg)",
                      boxShadow: "2px 0 3px -2px rgba(0,0,0,.18)",
                    }}
                  >
                    <span
                      className="overline flex justify-between gap-[6px]"
                      style={{ letterSpacing: ".12em" }}
                    >
                      <span>Name</span>
                      <span>Wk {week}</span>
                    </span>
                  </th>
                  <th
                    className="px-1 pb-[6px] pt-2 text-center align-bottom"
                    style={{
                      width: WEEK_W,
                      borderRight: "1px solid var(--day-rule)",
                    }}
                  >
                    <span className="overline" style={{ letterSpacing: ".12em" }}>
                      Ssn
                    </span>
                  </th>
                  {games.map((g) => {
                    const started = new Date(g.kickoff_at).getTime() <= now;
                    return (
                      <th
                        key={g.id}
                        className="px-[2px] pb-[6px] pt-2 text-center align-bottom"
                        style={{ width: GAME_W }}
                      >
                        <span className="display block text-[9px] font-bold leading-[1.15]">
                          {g.away_abbr}
                          <br />
                          {g.home_abbr}
                        </span>
                        <span
                          className="mx-auto mt-1 block h-[6px] w-[6px] rounded-full"
                          style={{
                            background: g.is_final
                              ? "var(--ink)"
                              : g.state === "in"
                                ? "var(--live)"
                                : "transparent",
                            border: started
                              ? "none"
                              : "1px solid var(--ink-tertiary)",
                          }}
                          aria-hidden
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  // The viewer's row overrides the zebra with an accent tint
                  // across the whole row and a bar on the frozen cell's left
                  // edge, so it stays findable however far the grid scrolls.
                  const stripe = row.isViewer
                    ? "color-mix(in srgb, var(--accent) 18%, var(--bg))"
                    : i % 2
                      ? "var(--desk)"
                      : "var(--bg)";
                  return (
                    <tr key={row.memberId} style={{ background: stripe }}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 whitespace-nowrap px-[6px] py-[5px] text-left text-[12px] font-bold"
                        style={{
                          background: stripe,
                          color: row.isViewer ? "var(--accent)" : undefined,
                          boxShadow: row.isViewer
                            ? "inset 3px 0 0 var(--accent), 2px 0 3px -2px rgba(0,0,0,.18)"
                            : "2px 0 3px -2px rgba(0,0,0,.18)",
                        }}
                        title={row.name}
                      >
                        <span className="flex items-baseline justify-between gap-[6px]">
                          <span>{trimName(row.name)}</span>
                          <span className="display min-w-[16px] text-right text-[15px] font-bold tabular-nums">
                            {row.weekPoints}
                          </span>
                        </span>
                      </th>
                      <td
                        className="display px-1 py-[5px] text-center text-[13px] font-normal tabular-nums"
                        style={{
                          color: "var(--ink-secondary)",
                          borderRight: "1px solid var(--day-rule)",
                        }}
                      >
                        {row.seasonPoints}
                      </td>
                      {row.cells.map((cell) => (
                        <td
                          key={cell.gameId}
                          className="px-[2px] py-[5px] text-center"
                        >
                          <Cell cell={cell} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-[36px]"
            style={{
              background:
                "linear-gradient(to right, transparent, var(--bg) 80%)",
            }}
          />
        </div>
      </main>
      <TabBar active="everyone" nav={nav} />
    </>
  );
}

function Cell({ cell }: { cell: GridCell }) {
  // No pick. A dashed outline says "still to come"; once the game has kicked
  // off that's misleading, because the chance is gone.
  if (!cell.hasPicked) {
    if (cell.locked) {
      return (
        <span
          className="mx-auto block text-[11px] font-bold"
          style={{ color: "var(--ink-tertiary)" }}
          title="No pick — game kicked off"
        >
          –
        </span>
      );
    }
    return (
      <span
        className="mx-auto block h-[18px] w-[30px] rounded-full"
        style={{ border: "1px dashed #cdbfa5" }}
        aria-label="no pick yet"
      />
    );
  }

  // Picked but not yet kicked off. The team never reaches the browser.
  if (!cell.pickedAbbr) {
    return (
      <span
        className="mx-auto block h-[8px] w-[8px] rounded-full"
        style={{ background: "var(--ink-tertiary)" }}
        aria-label="picked, hidden until kickoff"
      />
    );
  }

  // Home and away are told apart by weight rather than hue: a solid ink chip
  // versus an outlined one. Team colour is deliberately absent here — it now
  // appears only on a pick card's chosen half and on its split bar.
  const style: React.CSSProperties =
    cell.correct === undefined
      ? cell.side === "home"
        ? { background: "var(--ink-warm)", color: "var(--bg)" }
        : {
            background: "#fff",
            color: "var(--ink-warm)",
            boxShadow: "inset 0 0 0 1px #d8cfbc",
          }
      : cell.correct
        ? { background: "var(--correct-bg)", color: "var(--correct-ink)" }
        : { background: "var(--wrong-bg)", color: "var(--wrong-ink)" };

  return (
    <span
      className="display mx-auto inline-block whitespace-nowrap rounded-full px-[6px] py-[3px] text-[10px] font-bold leading-[1.1]"
      style={style}
    >
      {cell.pickedAbbr}
    </span>
  );
}
