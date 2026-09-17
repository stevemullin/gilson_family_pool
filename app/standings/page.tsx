import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { loadSeasonData, currentWeekOf } from "@/lib/season-data";
import { computeStandings } from "@/lib/scoring";
import { navDataFrom } from "@/lib/nav";
import TabBar from "@/components/TabBar";
import Money from "@/components/Money";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const [member, data] = await Promise.all([getCurrentMember(), loadSeasonData()]);
  if (!member) redirect("/login");

  const week = currentWeekOf(data);
  const gameList = data.games;
  const rows = computeStandings(data.members, gameList, data.picks);
  const nav = navDataFrom(data, member.id, week);

  const lastComplete = gameList
    .filter((g) => g.is_final)
    .reduce((max, g) => Math.max(max, g.week), 0);

  return (
    <>
      <main
        className="mx-auto max-w-[430px] px-4 pt-5"
        style={{ paddingBottom: "calc(59px + env(safe-area-inset-bottom) + 16px)" }}
      >
      <p className="overline text-center">Gilson Family Football Pool</p>
      <h1 className="display mt-1 text-center text-[26px] font-bold">Standings</h1>
      <p
        className="mt-1 text-center text-[11px]"
        style={{ color: "var(--ink-secondary)" }}
      >
        Through Week {lastComplete || "—"}
        {week > lastComplete ? ` · Week ${week} in progress` : ""}
      </p>

      <ol className="mt-5">
        {rows.map((row) => {
          const leader = row.rank === 1;
          const me = row.memberId === member.id;
          // Your own row gets the same accent tint and left bar as the grid,
          // which is louder than the old "you" label and findable at a glance.
          const background = me
            ? "color-mix(in srgb, var(--accent) 18%, var(--bg))"
            : leader
              ? "color-mix(in srgb, var(--leader) 6%, var(--bg))"
              : undefined;
          return (
            <li
              key={row.memberId}
              className="flex items-center gap-3 px-2 py-[10px]"
              style={{
                borderBottom: "1px solid var(--hairline)",
                background,
                boxShadow: me ? "inset 3px 0 0 var(--accent)" : undefined,
              }}
            >
              <span
                className="display w-[26px] text-[15px] font-bold"
                style={{
                  color: me
                    ? "var(--accent)"
                    : leader
                      ? "var(--leader)"
                      : "var(--ink-secondary)",
                }}
              >
                {/* Ties share a rank on purpose — never broken by a secondary sort. */}
                {row.tied ? `T${row.rank}` : row.rank}
              </span>
              <span
                className="flex-1 text-[15px] font-bold"
                style={{ color: me ? "var(--accent)" : undefined }}
              >
                {row.name}
                {row.boughtIn && <Money size={12} />}
              </span>
              <span className="display text-[16px] font-bold tabular-nums">
                {row.correct}–{row.played - row.correct}
              </span>
            </li>
          );
        })}
      </ol>

      </main>
      <TabBar active="standings" nav={nav} />
    </>
  );
}
