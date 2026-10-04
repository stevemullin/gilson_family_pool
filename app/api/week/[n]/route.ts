import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadSeasonData, currentWeekOf, weekNeedsRefresh } from "@/lib/season-data";
import { weekViewFrom } from "@/lib/picks";
import { syncIfStale } from "@/lib/espn";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { n: string } }
) {
  const [session, initial] = await Promise.all([getSession(), loadSeasonData()]);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const member = session.viewer;

  let data = initial;
  const week = Number(params.n) || currentWeekOf(data);

  if (weekNeedsRefresh(data, week)) {
    try {
      if (await syncIfStale(data.season, week, data.seasonType)) {
        data = await loadSeasonData();
      }
    } catch (err) {
      console.error("[sync] failed, serving cached games", err);
    }
  }

  // weekViewFrom applies the hidden-until-kickoff rule before anything is serialized.
  return NextResponse.json(weekViewFrom(data, week, member.id), {
    headers: { "Cache-Control": "no-store" },
  });
}
