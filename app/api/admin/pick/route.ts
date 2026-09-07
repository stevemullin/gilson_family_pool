import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Commissioner override, for "my phone died before kickoff" emergencies. Unlike a
 * normal pick this is allowed after kickoff — but it's stamped with who did it and
 * when, and the UI shows that marker to everyone.
 */
export async function PUT(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { memberId, gameId, team } = await req.json();
  if (!memberId || !gameId || !team) {
    return NextResponse.json(
      { message: "memberId, gameId and team required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data: game } = await supabase
    .from("games")
    .select("home_abbr, away_abbr")
    .eq("id", gameId)
    .maybeSingle();

  if (!game) return NextResponse.json({ message: "no such game" }, { status: 404 });
  if (team !== game.home_abbr && team !== game.away_abbr) {
    return NextResponse.json(
      { message: "that team isn't in this game" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("picks").upsert(
    {
      member_id: memberId,
      game_id: gameId,
      picked_abbr: team,
      overridden_by: admin.id,
      overridden_at: now,
      updated_at: now,
    },
    { onConflict: "member_id,game_id" }
  );

  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
