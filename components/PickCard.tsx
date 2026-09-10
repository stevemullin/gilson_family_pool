"use client";

import { useState } from "react";
import { teamColor, teamLogo } from "@/lib/teams";
import type { Game, PoolPick } from "@/lib/types";

interface Props {
  game: Game;
  myPick?: string;
  poolPicks: PoolPick[];
  /** Points the viewer has banked this week, shown as "YOU +n" on locked cards. */
  weekPoints: number;
  onPick: (team: string) => void;
}

/** First name only — the expanded roster is a comma-separated list. */
function shortName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export default function PickCard({
  game,
  myPick,
  poolPicks,
  weekPoints,
  onPick,
}: Props) {
  // One expand state per card, so tapping "+N" on either side opens both.
  const [expanded, setExpanded] = useState(false);

  const locked = new Date(game.kickoff_at).getTime() <= Date.now();
  const state = game.state;
  const isLive = state === "in";
  const isFinal = state === "post" || game.is_final;

  function half(side: "away" | "home") {
    const abbr = side === "away" ? game.away_abbr : game.home_abbr;
    const record = side === "away" ? game.away_record : game.home_record;
    const score = side === "away" ? game.away_score : game.home_score;
    const color = teamColor(abbr);
    const logo =
      (side === "away" ? game.away_logo : game.home_logo) ?? teamLogo(abbr);

    const picked = myPick === abbr;
    const won = isFinal && game.winner_abbr === abbr;
    const lost = isFinal && game.winner_abbr !== null && !won;
    const correct = isFinal && picked && won;
    const wrong = isFinal && picked && game.winner_abbr !== null && !won;

    // Picked treatment: team wash + 2px inset ring. On a finished game the viewer's
    // own pick recolors green or red instead of keeping the team wash.
    let background = "var(--card)";
    let ring = "none";
    if (picked && !isFinal) {
      background = `color-mix(in srgb, ${color} var(--wash-pct), var(--card))`;
      ring = `inset 0 0 0 2px ${color}`;
    } else if (correct) {
      background = "var(--correct-bg)";
      ring = "inset 0 0 0 2px var(--correct-ink)";
    } else if (wrong) {
      background = "var(--wrong-bg)";
      ring = "inset 0 0 0 2px var(--wrong-ink)";
    }

    // The unpicked half dims to 75% while picking; the loser dims to 55% once final.
    const opacity = lost ? 0.55 : myPick && !picked && !isFinal ? 0.75 : 1;

    const inner = (
      <>
        <img
          src={logo}
          alt=""
          width={30}
          height={30}
          className="h-[30px] w-[30px] shrink-0 object-contain"
        />
        <span className="min-w-0">
          <span className="display block text-[17px] font-bold leading-tight">
            {abbr}
            {correct && <span className="ml-1" style={{ color: "var(--correct-ink)" }}>✓</span>}
            {wrong && <span className="ml-1" style={{ color: "var(--wrong-ink)" }}>✗</span>}
            {picked && !isFinal && (
              <span
                className="ml-1 inline-flex h-[19px] w-[19px] items-center justify-center rounded-full text-[11px] text-white"
                style={{ background: color }}
                aria-label="your pick"
              >
                ✓
              </span>
            )}
          </span>
          {record && (
            <span className="block text-[11px]" style={{ color: "var(--ink-secondary)" }}>
              {record}
            </span>
          )}
        </span>
        {!locked ? null : (
          <span className="display ml-auto text-[23px] font-bold tabular-nums">
            {score ?? 0}
          </span>
        )}
      </>
    );

    const shared =
      "flex min-h-[62px] flex-1 items-center gap-2 px-3 py-2 text-left transition-opacity";

    // The outer corners have to follow the card, or the wash and ring paint a square
    // block inside the rounded card and leave slivers at the corners. 13px = the card's
    // 14px radius less its 1px border.
    const radius =
      side === "away" ? "13px 0 0 13px" : "0 13px 13px 0";

    if (locked) {
      return (
        <div
          className={shared}
          style={{ background, boxShadow: ring, opacity, borderRadius: radius }}
        >
          {inner}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onPick(abbr)}
        aria-pressed={picked}
        aria-label={`Pick ${abbr}`}
        className={`${shared} cursor-pointer`}
        style={{ background, boxShadow: ring, opacity, borderRadius: radius }}
      >
        {inner}
      </button>
    );
  }

  // Center column: navy kickoff time (OPEN) / pulsing red pill (LIVE) / gray chip (FINAL).
  function center() {
    if (isLive) {
      return (
        <>
          <span
            className="flex items-center gap-1 rounded-full px-2 py-[3px] text-[9px] font-bold uppercase tracking-wider text-white"
            style={{ background: "var(--live)" }}
          >
            <span className="live-dot h-[5px] w-[5px] rounded-full bg-white" />
            Live
          </span>
          <span className="display mt-1 text-[11px] font-semibold tabular-nums" style={{ color: "var(--live)" }}>
            {game.period ? `Q${game.period}` : ""} {game.display_clock ?? ""}
          </span>
        </>
      );
    }
    if (isFinal) {
      return (
        <span
          className="rounded-full px-2 py-[3px] text-[9px] font-bold uppercase tracking-wider text-white"
          style={{ background: "var(--final-chip)" }}
        >
          Final
        </span>
      );
    }
    // Kickoff time lives in the group heading, not here — repeating it on
    // every card was noise. Pre-kickoff the column is just a divider.
    return null;
  }

  const centerContent = center();

  const others = poolPicks.filter((p) => p.hasPicked);
  const revealed = others.filter(
    (p): p is Extract<PoolPick, { pickedAbbr: string }> => "pickedAbbr" in p
  );

  // Split bar: one 6px rail under a locked card, its two segments weighted by
  // how many people took each side. It replaced a row of name pills, which
  // couldn't answer the only question the card is really asked once it locks —
  // "am I with the crowd or against it" — without being read one pill at a time.
  const awayPickers = revealed.filter((p) => p.pickedAbbr === game.away_abbr);
  const homePickers = revealed.filter((p) => p.pickedAbbr === game.home_abbr);
  const awayCount = awayPickers.length + (myPick === game.away_abbr ? 1 : 0);
  const homeCount = homePickers.length + (myPick === game.home_abbr ? 1 : 0);

  function segmentColour(side: "away" | "home") {
    const abbr = side === "away" ? game.away_abbr : game.home_abbr;
    if (isFinal && game.winner_abbr !== null) {
      return game.winner_abbr === abbr
        ? "var(--correct-ink)"
        : "var(--wrong-ink)";
    }
    return myPick === abbr ? teamColor(abbr) : "#d8d1c3";
  }

  function segmentLabel(side: "away" | "home") {
    const abbr = side === "away" ? game.away_abbr : game.home_abbr;
    const count = side === "away" ? awayCount : homeCount;
    if (myPick === abbr) {
      const others = count - 1;
      return others > 0 ? `You + ${others} other${others === 1 ? "" : "s"}` : "You";
    }
    return `${count} on ${abbr}`;
  }

  function labelColour(side: "away" | "home") {
    const abbr = side === "away" ? game.away_abbr : game.home_abbr;
    if (isFinal && game.winner_abbr !== null) {
      return game.winner_abbr === abbr ? "var(--correct-ink)" : "var(--wrong-ink)";
    }
    return myPick === abbr ? teamColor(abbr) : "var(--ink-secondary)";
  }

  function roster(side: "away" | "home") {
    const abbr = side === "away" ? game.away_abbr : game.home_abbr;
    const names = (side === "away" ? awayPickers : homePickers).map((p) =>
      shortName(p.memberName)
    );
    if (myPick === abbr) return ["You", ...names];
    return names;
  }

  return (
    <article
      className="overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        borderTop: isLive ? "3px solid var(--live)" : undefined,
        borderRadius: "var(--radius-card)",
      }}
    >
      <div className="flex items-stretch">
        {half("away")}
        {/*
          The centre column only earns its width when it has state to show. Before
          kickoff it collapses to a hairline so the two halves aren't split by an empty
          gutter. Games in a group share a kickoff, so widths stay consistent per group.
        */}
        {centerContent === null ? (
          <div
            className="w-px shrink-0"
            style={{ background: "var(--hairline)" }}
            aria-hidden
          />
        ) : (
          <div
            className="flex w-[58px] shrink-0 flex-col items-center justify-center px-1"
            style={{
              borderLeft: "1px solid var(--hairline)",
              borderRight: "1px solid var(--hairline)",
            }}
          >
            {centerContent}
          </div>
        )}
        {half("home")}
      </div>

      {/*
        Locked games reveal who picked what. Before kickoff the parent only ever hands
        us `hasPicked`, so there is nothing here that could leak a pick.
      */}
      {locked && awayCount + homeCount > 0 && (
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide who picked" : "Show who picked"}
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded(!expanded);
            }
          }}
          className="cursor-pointer"
          style={{
            borderTop: "1px solid var(--hairline)",
            padding: "8px 12px 10px",
          }}
        >
          <div
            className="flex overflow-hidden"
            style={{ height: 6, borderRadius: 99, gap: 2 }}
          >
            <span style={{ flex: awayCount, background: segmentColour("away") }} />
            <span style={{ flex: homeCount, background: segmentColour("home") }} />
          </div>

          <div className="mt-[6px] flex justify-between text-[11px] font-bold">
            <span style={{ color: labelColour("away") }}>{segmentLabel("away")}</span>
            <span style={{ color: labelColour("home") }}>{segmentLabel("home")}</span>
          </div>

          {expanded && (
            <div
              className="mt-[6px] flex justify-between gap-3 text-[11px] leading-[1.5]"
              style={{ color: "var(--ink-warm)" }}
            >
              <span className="flex-1 text-left">
                {roster("away").map((n, i) => (
                  <span key={n + i}>
                    {i > 0 && ", "}
                    <span style={n === "You" ? { color: "var(--accent)", fontWeight: 700 } : undefined}>
                      {n}
                    </span>
                  </span>
                ))}
              </span>
              <span className="flex-1 text-right">
                {roster("home").map((n, i) => (
                  <span key={n + i}>
                    {i > 0 && ", "}
                    <span style={n === "You" ? { color: "var(--accent)", fontWeight: 700 } : undefined}>
                      {n}
                    </span>
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
