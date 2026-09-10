"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PickCard from "./PickCard";
import WeekHeader from "./WeekHeader";
import { kickoffGroupLabel } from "@/lib/season";
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

export default function PicksClient(props: Props) {
  const [games, setGames] = useState(props.games);
  const [poolPicks, setPoolPicks] = useState(props.poolPicks);
  const [picks, setPicks] = useState(props.myPicks);
  const [failed, setFailed] = useState<Record<string, string>>({});
  const [justSaved, setJustSaved] = useState(false);
  const inflight = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

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
            return;
          }
          // Confirm the write landed. The design called for feedback only on
          // failure, but a first real user tapped through the week unsure
          // whether anything was being kept, and went looking for a submit
          // button. Silence is not reassuring.
          clearTimeout(savedTimer.current);
          setJustSaved(true);
          savedTimer.current = setTimeout(() => setJustSaved(false), 1800);
        } catch {
          setFailed((f) => ({ ...f, [gameId]: "Offline — pick not saved." }));
        }
      }, 300);
    },
    [picks]
  );

  // Group by exact kickoff, in chronological order. The label comes from the timestamp,
  // so there is no slot list to fall out of date and a Wednesday opener heads its own
  // group correctly.
  const grouped = Array.from(
    games.reduce((acc, game) => {
      const key = game.kickoff_at;
      (acc.get(key) ?? acc.set(key, []).get(key)!).push(game);
      return acc;
    }, new Map<string, Game[]>())
  )
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([key, gs]) => ({ key, label: kickoffGroupLabel(key), games: gs }));

  const empty = games.every((g) => !picks[g.id]);

  return (
    <main
      className="mx-auto max-w-[430px] px-4 pt-5"
      style={{ paddingBottom: "calc(59px + env(safe-area-inset-bottom) + 16px)" }}
    >
      <WeekHeader week={props.week} maxWeek={props.maxWeek} basePath="/">
        <div className="mt-2 flex justify-center text-[11px]">
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
        </div>

        {/* Standing reassurance. The empty-state banner says this too, but it
            disappears after the first pick — which is exactly when someone
            starts wondering whether their taps are being kept. */}
        {games.length > 0 && (
          <p className="mt-[6px] text-center text-[10px]" style={{ color: "var(--ink-tertiary)" }}>
            Picks save the moment you tap — there&rsquo;s nothing to submit.
          </p>
        )}
      </WeekHeader>

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

      {/* Transient confirmation, sitting just above the tab bar. With the
          standing counter gone from the page, this is the only per-pick
          feedback — so it fires on the response, never on the optimistic
          update, and never claims a save that failed. */}
      {justSaved && (
        <div
          className="pointer-events-none fixed inset-x-0 flex justify-center"
          style={{ bottom: "calc(70px + env(safe-area-inset-bottom))", zIndex: 30 }}
          aria-live="polite"
        >
          <span
            className="rounded-full px-[14px] py-[6px] text-[11.5px] font-bold text-white"
            style={{
              background: "var(--correct-ink)",
              boxShadow: "0 4px 12px rgba(42,35,24,.2)",
            }}
          >
            ✓ Saved
          </span>
        </div>
      )}
    </main>
  );
}
