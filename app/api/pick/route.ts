import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { savePick } from "@/lib/picks";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { gameId, team } = await req.json();
  if (!gameId || !team) {
    return NextResponse.json({ message: "gameId and team required" }, { status: 400 });
  }

  const result = await savePick(member.id, gameId, team);
  if (!result.ok) {
    // 409 once the game has kicked off — a tab left open can't sneak a late pick in.
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
