// NFL team primary colors, used ONLY for pick/state feedback per the design spec —
// never as chrome, navigation, or headers.
//
// The 18 teams that appear in the design canvas use its exact `TC` values verbatim.
// The remaining 14 come from ESPN's team endpoint (`team.color`).
const DESIGN_COLORS: Record<string, string> = {
  PHI: "#004C54", GB: "#203731", BUF: "#00338D", MIA: "#008E97",
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
