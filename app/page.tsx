import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { loadSeasonData, currentWeekOf, weekNeedsRefresh } from "@/lib/season-data";
import { weekViewFrom } from "@/lib/picks";
import { navDataFrom } from "@/lib/nav";
import { syncIfStale } from "@/lib/espn";
import { pointsFor } from "@/lib/scoring";
import PicksClient from "@/components/PicksClient";
import TabBar from "@/components/TabBar";

export const dynamic = "force-dynamic";

export default async function PicksPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  // One round trip: the session lookup and the whole season, in parallel.
  const [member, initial] = await Promise.all([getCurrentMember(), loadSeasonData()]);
  if (!member) redirect("/login");

  let data = initial;
  const week = Number(searchParams.week) || currentWeekOf(data);

  // Only go to ESPN when something in this week could actually have changed —
  // a game live now or about to start. Most page loads happen between games
  // and shouldn't pay for a sync they don't need.
  if (weekNeedsRefresh(data, week)) {
    try {
      if (await syncIfStale(data.season, week, data.seasonType)) {
        data = await loadSeasonData();
      }
    } catch (err) {
      console.error("[sync] failed, serving cached games", err);
    }
  }

  const view = weekViewFrom(data, week, member.id);
  const nav = navDataFrom(data, member.id, week);
  const seasonRecord = pointsFor(member.id, data.games, data.picks);

  return (
    <>
      <PicksClient
        memberName={member.name}
        season={data.season}
        week={week}
        seasonType={data.seasonType}
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
