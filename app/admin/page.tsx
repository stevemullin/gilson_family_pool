import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getCurrentSeasonWeek } from "@/lib/season";
import { createServiceClient } from "@/lib/supabase";
import AdminClient from "@/components/AdminClient";
import type { Game, Member, Pick } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (!member.is_admin) redirect("/");

  const current = await getCurrentSeasonWeek();
  const supabase = createServiceClient();

  const [{ data: members }, { data: games }, { data: state }] =
    await Promise.all([
      supabase.from("members").select("*").order("name"),
      supabase
        .from("games")
        .select("*")
        .eq("season", current.season)
        .eq("season_type", current.seasonType)
        .eq("week", current.week)
        .order("kickoff_at"),
      supabase.from("sync_state").select("last_score_sync_at").eq("id", 1).single(),
    ]);

  const weekGames = (games ?? []) as Game[];
  let weekPicks: Pick[] = [];
  if (weekGames.length > 0) {
    const { data: picks } = await supabase
      .from("picks")
      .select("*")
      .in(
        "game_id",
        weekGames.map((g) => g.id)
      );
    weekPicks = (picks ?? []) as Pick[];
  }

  const counts: Record<string, number> = {};
  for (const pick of weekPicks) {
    counts[pick.member_id] = (counts[pick.member_id] ?? 0) + 1;
  }

  return (
    <AdminClient
      adminName={member.name}
      week={current.week}
      members={((members ?? []) as Member[]).map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
      }))}
      games={weekGames.map((g) => ({
        id: g.id,
        label: `${g.away_abbr} @ ${g.home_abbr}`,
        away: g.away_abbr,
        home: g.home_abbr,
      }))}
      pickCounts={counts}
      lastSync={state?.last_score_sync_at ?? null}
    />
  );
}
