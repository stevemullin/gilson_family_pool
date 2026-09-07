import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Remove a member. Their picks go with them via ON DELETE CASCADE.
 *
 * A commissioner can't remove themselves — doing so would lock the last admin out of
 * /admin with no way back in short of editing the database by hand.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (admin.id === params.id) {
    return NextResponse.json(
      { message: "You can't remove yourself." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("members").delete().eq("id", params.id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
