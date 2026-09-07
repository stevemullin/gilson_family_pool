"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PickCard from "./PickCard";
import { DAY_LABELS, DAY_ORDER } from "@/lib/season";
import { isCorrect } from "@/lib/scoring";
import type { Game, PoolPick } from "@/lib/types";

interface Props {
  memberName: string;
  season: number;
  week: number;
  seasonType: number;
  games: Game[];
  myPicks: Record<string, string>;
  poolPicks: Record<string, PoolPick[]>;
  seasonRecord: { correct: number; played: number };
  maxWeek: number;
}

/** Kickoff within this window marks unpicked cards urgent (dashed + red "PICK"). */
const URGENT_MS = 6 * 60 * 60 * 1000;

export default function PicksClient(props: Props) {
  const [games, setGames] = useState(props.games);
  const [poolPicks, setPoolPicks] = useState(props.poolPicks);
  const [picks, setPicks] = useState(props.myPicks);
  const [failed, setFailed] = useState<Record<string, string>>({});
  const inflight = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Reset when navigating between weeks.
  useEffect(() => {
    setGames(props.games);
    setPicks(props.myPicks);
    setPoolPicks(props.poolPicks);
  }, [props.games, props.myPicks, props.poolPicks]);

  const anyLive = games.some((g) => g.state === "in");

  // Poll only while something is live; the server throttles the actual ESPN call.
  useEffect(() => {
    if (!anyLive) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/week/${props.week}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setGames(data.games);
      setPoolPicks(data.poolPicks);
    }, 60_000);
    return () => clearInterval(id);
  }, [anyLive, props.week]);

  const weekPoints = useMemo(() => {
    let n = 0;
    for (const game of games) {
      const mine = picks[game.id];
      if (mine && isCorrect(game, mine)) n += 1;
    }
    return n;
  }, [games, picks]);

  const pickedCount = useMemo(
    () => games.filter((g) => picks[g.id]).length,
    [games, picks]
  );

  const onPick = useCallback(
    (gameId: string, team: string) => {
      const previous = picks[gameId];
      setPicks((p) => ({ ...p, [gameId]: team })); // optimistic; no submit button
      setFailed((f) => {
        const { [gameId]: _drop, ...rest } = f;
        return rest;
      });

      clearTimeout(inflight.current[gameId]);
      inflight.current[gameId] = setTimeout(async () => {
        try {
          const res = await fetch("/api/pick", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId, team }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setPicks((p) => {
              const next = { ...p };
              if (previous) next[gameId] = previous;
              else delete next[gameId];
              return next;
            });
            setFailed((f) => ({
              ...f,
              [gameId]: body.message ?? "Couldn't save that pick.",
            }));
          }
        } catch {
          setFailed((f) => ({ ...f, [gameId]: "Offline — pick not saved." }));
        }
      }, 300);
    },
    [picks]
  );

  const grouped = DAY_ORDER.map((key) => ({
    key,
    label: DAY_LABELS[key],
    games: games.filter((g) => (g.day_group ?? "thu") === key),
  })).filter((g) => g.games.length > 0);

  const soonest = games
    .filter((g) => new Date(g.kickoff_at).getTime() > Date.now())
    .sort(
      (a, b) =>
        new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
    )[0];
  const urgentCutoff = soonest
    ? new Date(soonest.kickoff_at).getTime() + URGENT_MS
    : 0;

  const remaining = games.length - pickedCount;
  const empty = pickedCount === 0;

  return (
    <main className="mx-auto max-w-[430px] px-4 pb-24 pt-5">
      <header className="mb-4">
        <p className="overline text-center">Gilson Family Football Pool</p>

        <div className="mt-1 flex items-center justify-center gap-3">
          <WeekArrow
            to={props.week > 1 ? `/?week=${props.week - 1}` : undefined}
            label="Previous week"
          >
            ‹
          </WeekArrow>
          <h1 className="display text-[26px] font-bold">Week {props.week}</h1>
          <WeekArrow
            to={
              props.week < props.maxWeek ? `/?week=${props.week + 1}` : undefined
            }
            label="Next week"
          >
            ›
          </WeekArrow>
        </div>

        <div className="mt-2 flex justify-center gap-2 text-[11px]">
          <span
            className="rounded-full px-[10px] py-[3px] font-bold"
            style={{
              background: "color-mix(in srgb, var(--accent) 12%, var(--bg))",
              color: "var(--accent)",
            }}
          >
            My record {props.seasonRecord.correct}–
            {props.seasonRecord.played - props.seasonRecord.correct}
          </span>
          <span
            className="rounded-full px-[10px] py-[3px] font-bold"
            style={{ background: "var(--desk)", color: "var(--ink-warm)" }}
          >
            {pickedCount} of {games.length} picked
          </span>
        </div>

        <div
          className="mt-2 h-[5px] w-full overflow-hidden rounded-full"
          style={{ background: "var(--desk)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: games.length
                ? `${(pickedCount / games.length) * 100}%`
                : "0%",
              background: "var(--accent)",
            }}
          />
        </div>
      </header>

      {empty && games.length > 0 && (
        <section
          className="mb-4 rounded-[14px] px-4 py-3 text-white"
          style={{ background: "var(--accent)" }}
        >
          <p className="display text-[17px] font-bold">
            Week {props.week} is open, {props.memberName}.
          </p>
          <p className="mt-1 text-[12px] opacity-90">
            Tap a team on each card — picks save as you go, no submit button.
          </p>
        </section>
      )}

      {games.length === 0 && (
        <p className="py-10 text-center text-[13px]" style={{ color: "var(--ink-secondary)" }}>
          No games synced for this week yet.
        </p>
      )}

      {grouped.map((group) => (
        <section key={group.key} className="mb-5">
          <h2
            className="display mb-2 border-b pb-1 text-[13px] font-bold"
            style={{ color: "#6b5d49", borderColor: "var(--day-rule)" }}
          >
            {group.label}
          </h2>
          <div className="flex flex-col gap-2">
            {group.games.map((game) => (
              <div key={game.id}>
                <PickCard
                  game={game}
                  myPick={picks[game.id]}
                  poolPicks={poolPicks[game.id] ?? []}
                  weekPoints={weekPoints}
                  urgent={
                    new Date(game.kickoff_at).getTime() <= urgentCutoff
                  }
                  onPick={(team) => onPick(game.id, team)}
                />
                {failed[game.id] && (
                  <p
                    className="mt-1 px-1 text-[11px] font-bold"
                    style={{ color: "var(--live)" }}
                    role="alert"
                  >
                    {failed[game.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <nav className="mt-6 flex justify-center gap-4 text-[12px]">
        <Link href={`/week/${props.week}`} style={{ color: "var(--accent)" }}>
          Everyone&rsquo;s picks
        </Link>
        <Link href="/standings" style={{ color: "var(--accent)" }}>
          Standings
        </Link>
      </nav>

      {remaining > 0 && games.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center px-4">
          <p
            className="rounded-full px-4 py-2 text-[12px] font-bold text-white shadow-lg"
            style={{ background: "#2a2318" }}
          >
            {pickedCount} of {games.length} picked · {remaining} to go
          </p>
        </div>
      )}
    </main>
  );
}

function WeekArrow({
  to,
  label,
  children,
}: {
  to?: string;
  label: string;
  children: React.ReactNode;
}) {
  const style = {
    borderColor: "var(--card-border)",
    color: "var(--ink)",
  };
  const cls =
    "flex h-[34px] w-[34px] items-center justify-center rounded-full border text-[18px] leading-none";

  if (!to) {
    return (
      <span className={cls} style={{ ...style, opacity: 0.35 }} aria-hidden>
        {children}
      </span>
    );
  }
  return (
    <Link href={to} aria-label={label} className={cls} style={style}>
      {children}
    </Link>
  );
}
