import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getCurrentSeasonWeek } from "@/lib/season";
import { getWeekView } from "@/lib/picks";
import { syncIfStale } from "@/lib/espn";
import { createServiceClient } from "@/lib/supabase";
import { pointsFor } from "@/lib/scoring";
import PicksClient from "@/components/PicksClient";
import TabBar from "@/components/TabBar";
import { getNavData } from "@/lib/nav";
import type { Game, Pick } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PicksPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const current = await getCurrentSeasonWeek();
  const week = Number(searchParams.week) || current.week;

  // Refresh from ESPN only if the cache is stale; the throttle lives in syncIfStale.
  try {
    await syncIfStale(current.season, week, current.seasonType);
  } catch (err) {
    console.error("[sync] failed, serving cached games", err);
  }

  const view = await getWeekView(
    current.season,
    week,
    member.id,
    current.seasonType
  );

  // Season record for the header pill.
  const supabase = createServiceClient();
  const [{ data: allGames }, { data: myPicks }] = await Promise.all([
    supabase
      .from("games")
      .select("*")
      .eq("season", current.season)
      .eq("season_type", current.seasonType),
    supabase.from("picks").select("*").eq("member_id", member.id),
  ]);

  const seasonRecord = pointsFor(
    member.id,
    (allGames ?? []) as Game[],
    (myPicks ?? []) as Pick[]
  );

  const nav = await getNavData(member.id, current.season, week, current.seasonType);

  return (
    <>
      <PicksClient
        memberName={member.name}
        season={current.season}
        week={week}
        seasonType={current.seasonType}
        games={view.games}
        myPicks={view.myPicks}
        poolPicks={view.poolPicks}
        seasonRecord={seasonRecord}
        maxWeek={nav.maxWeek}
      />
      <TabBar active="picks" nav={nav} />
    </>
  );
}
