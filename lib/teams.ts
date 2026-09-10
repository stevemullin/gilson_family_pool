// NFL team primary colors, used ONLY for pick/state feedback per the design spec —
// never as chrome, navigation, or headers.
//
// The 18 teams that appear in the design canvas use its exact `TC` values verbatim.
// The remaining 14 come from ESPN's team endpoint (`team.color`).
const DESIGN_COLORS: Record<string, string> = {
  // PHI is a brighter green than the canvas's midnight #004C54, by request.
  PHI: "#076B3B", GB: "#203731", BUF: "#00338D", MIA: "#008E97",
  DET: "#0076B6", CHI: "#C83803", CIN: "#FB4F14", CLE: "#311D00",
  KC: "#E31837", LAC: "#0080C6", SF: "#AA0000", SEA: "#002244",
  MIN: "#4F2683", PIT: "#101820", DAL: "#041E42", BAL: "#241773",
  NYJ: "#125740", DEN: "#FB4F14",
};

const ESPN_COLORS: Record<string, string> = {
  ARI: "#A40227", ATL: "#A71930", CAR: "#0085CA", HOU: "#021018",
  IND: "#003B75", JAX: "#007487", LAR: "#003594", LV: "#000000",
  NE: "#002A5C", NYG: "#003C7F", TB: "#BD1C36", TEN: "#4495D2",
  WSH: "#5A1414",
  // New Orleans' ESPN primary is gold (#D3BC8D), which fails contrast as a 2px ring
  // on the cream card. Using Saints black instead, the same call the design made for
  // PIT. Swap to "#D3BC8D" if the gold is preferred.
  NO: "#101820",
};

const TEAM_COLORS: Record<string, string> = { ...ESPN_COLORS, ...DESIGN_COLORS };

const FALLBACK = "#5b4f3e"; // warm mid ink; never leave a team uncolored

export function teamColor(abbr: string): string {
  return TEAM_COLORS[abbr?.toUpperCase()] ?? FALLBACK;
}

export function teamLogo(abbr: string): string {
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr.toLowerCase()}.png`;
}

/** Picked-half background. 9% mix on light, stepped up on dark (see globals.css). */
export function teamWash(abbr: string): string {
  return `color-mix(in srgb, ${teamColor(abbr)} var(--wash-pct), var(--card))`;
}

// ── Picker pills ────────────────────────────────────────────────────────────
// Every team's alternate colour, from ESPN's team endpoint.
const TEAM_ALT: Record<string, string> = {
  ARI: "#FFFFFF", ATL: "#000000", BAL: "#000000", BUF: "#D50A0A",
  CAR: "#000000", CHI: "#E64100", CIN: "#000000", CLE: "#FF3C00",
  DAL: "#B0B7BC", DEN: "#FC4C02", DET: "#BBBBBB", GB: "#FFB612",
  HOU: "#EB0028", IND: "#FFFFFF", JAX: "#D7A22A", KC: "#FFB612",
  LAC: "#FFC20E", LAR: "#FFD100", LV: "#A5ACAF", MIA: "#FC4C02",
  MIN: "#FFC62F", NE: "#C60C30", NO: "#000000", NYG: "#C9243F",
  NYJ: "#FFFFFF", PHI: "#000000", PIT: "#FFB612", SEA: "#69BE28",
  SF: "#B3995D", TB: "#3E3A35", TEN: "#001532", WSH: "#FFB612",
};

export function teamAlt(abbr: string): string {
  return TEAM_ALT[abbr?.toUpperCase()] ?? "#FFFFFF";
}

function srgbToLinear(c: number) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
  );
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Teams whose home pill uses something other than their primary. Both of these
 * read better in what ESPN calls their alternate: Pittsburgh is the gold, and
 * Chicago the brighter orange.
 */
const HOME_BACKGROUND: Record<string, string> = {
  PIT: "#FFB612",
  CHI: "#E64100",
};

/** Quiet neutral the away pill sits on. Warm, to stay in the cream palette. */
const AWAY_BG = "#e9e4da";
const AWAY_INK = "#2a2318";

/**
 * Colours for a picker pill, keyed off which side of the matchup it sits on.
 *
 * Home is loud and away is quiet: the home side wears a full team colour, the
 * away side a warm greyscale with the team colour carried in the text or, when
 * that won't read, in a hairline ring. Two navy teams can't collide because
 * only one of them is ever coloured.
 *
 * An earlier version put the team's alternate on the away side. It broke on
 * palette: half the league's alternates are white, black or mid-grey, so "every
 * other pair" came out as plain white-vs-black and the table read as noise.
 */
export function pickerPill(abbr: string, side: "home" | "away") {
  const primary = teamColor(abbr);

  if (side === "away") {
    // Colour the text with the team's primary when it carries enough contrast
    // on the neutral; otherwise go near-black and put the team colour in a ring
    // so there's still a trace of the team on the pill.
    const legible = contrast(primary, AWAY_BG) >= 4.5;
    return {
      background: AWAY_BG,
      color: legible ? primary : AWAY_INK,
      boxShadow: legible ? "none" : `inset 0 0 0 1.5px ${primary}`,
    };
  }

  const background = HOME_BACKGROUND[abbr?.toUpperCase()] ?? primary;
  const alt = teamAlt(abbr);
  // Prefer the team's other colour for text — that's what keeps Pittsburgh
  // black-on-gold and Kansas City gold-on-red — but only when it reads.
  const other = background === primary ? alt : primary;
  const readable = contrast(other, background) >= 4.5;
  const fallback =
    contrast("#FFFFFF", background) >= contrast("#1a1a1a", background)
      ? "#FFFFFF"
      : "#1a1a1a";

  return {
    background,
    color: readable ? other : fallback,
    boxShadow: "none",
  };
}
