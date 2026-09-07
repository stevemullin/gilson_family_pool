import { NextResponse } from "next/server";
import { fetchCurrentSeasonWeek } from "@/lib/season";
import { syncWeek } from "@/lib/espn";

export const dynamic = "force-dynamic";

/**
 * Daily schedule + score sync. Covers this week and the next so flex-scheduling
 * changes land before anyone opens the app.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  const authHeader = req.headers.get("authorization");
  const fromVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (key !== process.env.CRON_SECRET && !fromVercelCron) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const current = await fetchCurrentSeasonWeek();
  const results: Record<string, number> = {};

  for (const week of [current.week, current.week + 1]) {
    if (week < 1 || week > 18) continue;
    try {
      results[`week${week}`] = await syncWeek(
        current.season,
        week,
        current.seasonType
      );
    } catch (err) {
      console.error(`[cron/sync] week ${week} failed`, err);
      results[`week${week}`] = -1;
    }
  }

  return NextResponse.json({ ok: true, season: current.season, results });
}
