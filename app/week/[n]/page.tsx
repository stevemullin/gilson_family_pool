import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getCurrentSeasonWeek } from "@/lib/season";
import { getGridView } from "@/lib/picks";
import { teamColor } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function WeekGridPage({
  params,
}: {
  params: { n: string };
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const current = await getCurrentSeasonWeek();
  const week = Number(params.n) || current.week;
  const { games, rows } = await getGridView(
    current.season,
    week,
    member.id,
    current.seasonType
  );

  const now = Date.now();
  const behind = rows
    .filter((r) => !r.isViewer && r.missing > 0)
    .sort((a, b) => b.missing - a.missing)[0];

  return (
    <main className="mx-auto max-w-[1000px] px-4 pb-16 pt-5">
      <p className="overline text-center">Gilson Family Football Pool</p>
      <h1 className="display mt-1 text-center text-[26px] font-bold">
        Week {week}
      </h1>
      <p
        className="mt-1 text-center text-[11px]"
        style={{ color: "var(--ink-secondary)" }}
      >
        Picks stay hidden until each game kicks off.
      </p>

      {behind && (
        <p
          className="mt-3 text-center text-[12px] font-bold"
          style={{ color: "var(--live)" }}
        >
          Waiting on {behind.name} — {behind.missing} game
          {behind.missing === 1 ? "" : "s"} unpicked. Nudge them.
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="border-collapse text-[11px]">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 w-[78px] px-2 py-2 text-left"
                style={{ background: "var(--bg)" }}
              >
                <span className="overline">Name</span>
              </th>
              <th className="w-[54px] px-1 py-2 text-center">
                <span className="overline">Wk {week}</span>
              </th>
              <th
                className="w-[54px] px-1 py-2 text-center"
                style={{ borderRight: "1px solid var(--day-rule)" }}
              >
                <span className="overline" style={{ color: "var(--ink-tertiary)" }}>
                  Season
                </span>
              </th>
              {games.map((g) => {
                const started = new Date(g.kickoff_at).getTime() <= now;
                const dot = g.is_final
                  ? "var(--ink)"
                  : g.state === "in"
                    ? "var(--live)"
                    : "transparent";
                return (
                  <th key={g.id} className="w-[38px] px-[2px] py-2 align-bottom">
                    <span className="display block text-[9px] font-bold leading-tight">
                      {g.away_abbr}
                      <br />
                      {g.home_abbr}
                    </span>
                    <span
                      className="mx-auto mt-1 block h-[6px] w-[6px] rounded-full"
                      style={{
                        background: dot,
                        border: started ? "none" : "1px solid var(--ink-tertiary)",
                      }}
                      aria-hidden
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.memberId}
                style={{
                  background: i % 2 ? "var(--desk)" : "transparent",
                }}
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-[78px] px-2 py-[6px] text-left text-[12px] font-bold"
                  style={{
                    background: i % 2 ? "var(--desk)" : "var(--bg)",
                    boxShadow: "2px 0 3px -2px rgba(0,0,0,.18)",
                  }}
                >
                  {row.name}
                </th>
                <td className="display px-1 py-[6px] text-center text-[13px] font-bold tabular-nums">
                  {row.weekPoints}
                </td>
                <td
                  className="display px-1 py-[6px] text-center text-[13px] font-bold tabular-nums"
                  style={{
                    color: "var(--ink-tertiary)",
                    borderRight: "1px solid var(--day-rule)",
                  }}
                >
                  {row.seasonPoints}
                </td>
                {row.cells.map((cell) => (
                  <td key={cell.gameId} className="px-[2px] py-[6px] text-center">
                    <Cell cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul
        className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px]"
        style={{ color: "var(--ink-secondary)" }}
      >
        <li>• Tan dot = picked, still hidden</li>
        <li>• Dashed = not picked yet</li>
        <li>• Team chip = live</li>
        <li>• ✓ / ✗ = final</li>
      </ul>

      <nav className="mt-6 flex justify-center gap-4 text-[12px]">
        <Link href="/" style={{ color: "var(--accent)" }}>
          My picks
        </Link>
        <Link href="/standings" style={{ color: "var(--accent)" }}>
          Standings
        </Link>
      </nav>
    </main>
  );
}

function Cell({
  cell,
}: {
  cell: { hasPicked: boolean; pickedAbbr?: string; correct?: boolean };
}) {
  // Not picked yet.
  if (!cell.hasPicked) {
    return (
      <span
        className="mx-auto block h-[18px] w-[30px] rounded-full"
        style={{ border: "1px dashed #cdbfa5" }}
        aria-label="no pick"
      />
    );
  }

  // Picked but the game hasn't kicked off. The team is not in the payload at all —
  // a neutral dot is all there is to render.
  if (!cell.pickedAbbr) {
    return (
      <span
        className="mx-auto block h-[8px] w-[8px] rounded-full"
        style={{ background: "var(--ink-tertiary)" }}
        aria-label="picked, hidden until kickoff"
      />
    );
  }

  if (cell.correct === undefined) {
    return (
      <span
        className="display mx-auto block rounded-full px-1 py-[2px] text-[9px] font-bold"
        style={{
          background: `color-mix(in srgb, ${teamColor(cell.pickedAbbr)} 22%, var(--card))`,
        }}
      >
        {cell.pickedAbbr}
      </span>
    );
  }

  return (
    <span
      className="display mx-auto block rounded-full px-1 py-[2px] text-[9px] font-bold"
      style={{
        background: cell.correct ? "var(--correct-bg)" : "var(--wrong-bg)",
        color: cell.correct ? "var(--correct-ink)" : "var(--wrong-ink)",
      }}
    >
      {cell.pickedAbbr} {cell.correct ? "✓" : "✗"}
    </span>
  );
}
