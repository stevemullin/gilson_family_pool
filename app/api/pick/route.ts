import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { savePick } from "@/lib/picks";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  // The pick belongs to whoever the session is acting as, which getSession()
  // has already validated against the guardianships table.
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const member = session.viewer;

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
