import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { sendPersonalLink } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data: member } = await supabase
    .from("members")
    .select("name, email, token")
    .eq("id", params.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ message: "not found" }, { status: 404 });

  let emailed = false;
  try {
    emailed = await sendPersonalLink(member.email, member.name, member.token);
  } catch (err) {
    console.error("[email] send failed", err);
  }

  return NextResponse.json({
    emailed,
    link: `${process.env.SITE_URL}/join/${member.token}`,
  });
}
