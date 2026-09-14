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

  // Newest first. Non-fatal if the table hasn't been created on this database
  // yet — the page just shows an empty log.
  const { data: emailRows } = await supabase
    .from("email_log")
    .select("at, kind, member_id, to_email, subject, ok, detail")
    .order("at", { ascending: false })
    .limit(30);
  const nameById = new Map(((members ?? []) as Member[]).map((m) => [m.id, m.name]));

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
      adminId={member.id}
      adminName={member.name}
      week={current.week}
      members={((members ?? []) as Member[]).map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        boughtIn: m.bought_in,
        paid: m.paid,
      }))}
      games={weekGames.map((g) => ({
        id: g.id,
        label: `${g.away_abbr} @ ${g.home_abbr}`,
        away: g.away_abbr,
        home: g.home_abbr,
      }))}
      pickCounts={counts}
      lastSync={state?.last_score_sync_at ?? null}
      emailLog={((emailRows ?? []) as Array<{
        at: string; kind: string; member_id: string | null; to_email: string | null;
        subject: string | null; ok: boolean; detail: string | null;
      }>).map((r) => ({
        at: r.at,
        kind: r.kind,
        who: r.member_id ? (nameById.get(r.member_id) ?? r.to_email ?? "") : (r.to_email ?? ""),
        subject: r.subject,
        ok: r.ok,
        detail: r.detail,
      }))}
    />
  );
}
