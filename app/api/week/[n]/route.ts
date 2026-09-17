import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { loadSeasonData, currentWeekOf, weekNeedsRefresh } from "@/lib/season-data";
import { weekViewFrom } from "@/lib/picks";
import { syncIfStale } from "@/lib/espn";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { n: string } }
) {
  const [member, initial] = await Promise.all([getCurrentMember(), loadSeasonData()]);
  if (!member) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
