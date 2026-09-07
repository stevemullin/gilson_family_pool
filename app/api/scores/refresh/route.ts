import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCurrentSeasonWeek } from "@/lib/season";
import { syncWeek } from "@/lib/espn";

export const dynamic = "force-dynamic";

/** "Force refresh now" — bypasses the staleness throttle. */
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const current = await getCurrentSeasonWeek();
  try {
    const count = await syncWeek(current.season, current.week, current.seasonType);
    return NextResponse.json({ ok: true, week: current.week, games: count });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 502 });
  }
}
