import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getCurrentSeasonWeek } from "@/lib/season";
import { createServiceClient } from "@/lib/supabase";
import { computeStandings } from "@/lib/scoring";
import type { Game, Pick } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const current = await getCurrentSeasonWeek();
  const supabase = createServiceClient();

  const [{ data: games }, { data: picks }, { data: members }] =
    await Promise.all([
      supabase
        .from("games")
        .select("*")
        .eq("season", current.season)
        .eq("season_type", current.seasonType),
      supabase.from("picks").select("*"),
      supabase.from("members").select("id, name").order("name"),
    ]);

  const gameList = (games ?? []) as Game[];
  const rows = computeStandings(
    (members ?? []) as Array<{ id: string; name: string }>,
    gameList,
    (picks ?? []) as Pick[]
  );

  const lastComplete = gameList
    .filter((g) => g.is_final)
    .reduce((max, g) => Math.max(max, g.week), 0);

  return (
    <main className="mx-auto max-w-[430px] px-4 pb-16 pt-5">
      <p className="overline text-center">Gilson Family Football Pool</p>
      <h1 className="display mt-1 text-center text-[26px] font-bold">Standings</h1>
      <p
        className="mt-1 text-center text-[11px]"
        style={{ color: "var(--ink-secondary)" }}
      >
        Through Week {lastComplete || "—"}
        {current.week > lastComplete ? ` · Week ${current.week} in progress` : ""}
      </p>

      <ol className="mt-5">
        {rows.map((row) => {
          const leader = row.rank === 1;
          return (
            <li
              key={row.memberId}
              className="flex items-center gap-3 px-2 py-[10px]"
              style={{
                borderBottom: "1px solid var(--hairline)",
                background: leader
                  ? "color-mix(in srgb, var(--leader) 6%, var(--bg))"
                  : undefined,
              }}
            >
              <span
                className="display w-[26px] text-[15px] font-bold"
                style={{ color: leader ? "var(--leader)" : "var(--ink-secondary)" }}
              >
                {/* Ties share a rank on purpose — never broken by a secondary sort. */}
                {row.tied ? `T${row.rank}` : row.rank}
              </span>
              <span className="flex-1 text-[15px] font-bold">
                {row.name}
                {row.memberId === member.id && (
                  <span
                    className="ml-2 text-[10px] font-normal"
                    style={{ color: "var(--ink-tertiary)" }}
                  >
                    you
                  </span>
                )}
              </span>
              <span className="display text-[16px] font-bold tabular-nums">
                {row.correct}–{row.played - row.correct}
              </span>
            </li>
          );
        })}
      </ol>

      <nav className="mt-6 flex justify-center gap-4 text-[12px]">
        <Link href="/" style={{ color: "var(--accent)" }}>
          My picks
        </Link>
        <Link href={`/week/${current.week}`} style={{ color: "var(--accent)" }}>
          Week {current.week} grid
        </Link>
      </nav>
    </main>
  );
}
