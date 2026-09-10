import Link from "next/link";

/**
 * Shared header for Picks and Everyone. Week is one axis across both pages,
 * so the arrows move you through weeks without changing which view you're in —
 * that's the tab bar's job.
 */
export default function WeekHeader({
  week,
  maxWeek,
  basePath,
  children,
}: {
  week: number;
  maxWeek: number;
  /** "/" for the picks page (uses ?week=), "/week" for the grid. */
  basePath: "/" | "/week";
  children?: React.ReactNode;
}) {
  const href = (n: number) => (basePath === "/" ? `/?week=${n}` : `/week/${n}`);

  return (
    <header className="px-4 pt-4">
      <p className="overline text-center">Gilson Family Football Pool</p>
      <div className="mt-1 flex items-center justify-center gap-3">
        <Arrow to={week > 1 ? href(week - 1) : undefined} label="Previous week">
          ‹
        </Arrow>
        <h1 className="display text-[26px] font-bold">Week {week}</h1>
        <Arrow to={week < maxWeek ? href(week + 1) : undefined} label="Next week">
          ›
        </Arrow>
      </div>
      {children}
    </header>
  );
}

function Arrow({
  to,
  label,
  children,
}: {
  to?: string;
  label: string;
  children: React.ReactNode;
}) {
  const cls =
    "flex h-[34px] w-[34px] items-center justify-center rounded-full border text-[18px] leading-none";
  const style = { borderColor: "var(--card-border)", color: "var(--ink)" };

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
