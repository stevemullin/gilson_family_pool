import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { getCurrentSeasonWeek } from "@/lib/season";
import { getWeekView } from "@/lib/picks";
import { syncIfStale } from "@/lib/espn";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { n: string } }
) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const current = await getCurrentSeasonWeek();
  const week = Number(params.n) || current.week;

  try {
    await syncIfStale(current.season, week, current.seasonType);
  } catch (err) {
    console.error("[sync] failed, serving cached games", err);
  }

  // getWeekView applies the hidden-until-kickoff rule before anything is serialized.
  const view = await getWeekView(
    current.season,
    week,
    member.id,
    current.seasonType
  );

  return NextResponse.json(view, {
    headers: { "Cache-Control": "no-store" },
  });
}
