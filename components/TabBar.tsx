import Link from "next/link";
import type { NavData } from "@/lib/nav";

type Tab = "picks" | "everyone" | "standings";

/**
 * Fixed bottom navigation, shared by all three routes.
 *
 * It replaced the text links that used to sit below sixteen game cards, and
 * absorbed the floating "N of 16 picked" pill — the count now lives in the
 * Picks tab's subtitle, and the active tab's top rule doubles as the progress
 * track. Deliberately text-only: three destinations don't need icons, and
 * labels survive translation and squinting better than glyphs.
 */
export default function TabBar({
  active,
  nav,
}: {
  active: Tab;
  nav: NavData;
}) {
  const remaining = nav.games - nav.picked;

  const picksSubtitle =
    active === "picks"
      ? `${nav.picked} of ${nav.games}`
      : remaining > 0
        ? `${remaining} to go`
        : "All in";

  const standingsSubtitle =
    active === "standings"
      ? `${nav.standing} · ${nav.record.correct}–${nav.record.played - nav.record.correct}`
      : `You're ${nav.standing}`;

  const tabs: Array<{
    key: Tab;
    href: string;
    label: string;
    subtitle: string;
    urgent?: boolean;
  }> = [
    {
      key: "picks",
      href: `/?week=${nav.week}`,
      label: "Picks",
      subtitle: picksSubtitle,
      urgent: active !== "picks" && remaining > 0,
    },
    {
      key: "everyone",
      href: `/week/${nav.week}`,
      label: "Everyone",
      subtitle: `Week ${nav.week} grid`,
    },
    {
      key: "standings",
      href: "/standings",
      label: "Standings",
      subtitle: standingsSubtitle,
    },
  ];

  return (
    <nav
      aria-label="Sections"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        height: 59,
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "var(--card)",
        borderTop: "1px solid var(--card-border)",
        zIndex: 20,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const tone = isActive ? "var(--accent)" : "var(--ink-secondary)";
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            style={{
              position: "relative",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              textDecoration: "none",
            }}
          >
            {isActive && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background:
                    tab.key === "picks" ? "var(--desk)" : "var(--accent)",
                }}
              >
                {tab.key === "picks" && (
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      background: "var(--accent)",
                      width: nav.games
                        ? `${(nav.picked / nav.games) * 100}%`
                        : "0%",
                    }}
                  />
                )}
              </span>
            )}
            <span
              className="display"
              style={{ fontSize: 13, fontWeight: 700, color: tone }}
            >
              {tab.label}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: tab.urgent ? "var(--live)" : tone,
              }}
            >
              {tab.subtitle}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
