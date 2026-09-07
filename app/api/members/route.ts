import { NextResponse } from "next/server";
import { generateToken, requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { sendPersonalLink } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("members")
    .select("id, name, email, is_admin, wants_reminders")
    .order("name");

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { name, email } = await req.json();
  if (!name || !email) {
    return NextResponse.json({ message: "name and email required" }, { status: 400 });
  }

  const token = generateToken();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("members")
    .insert({ name, email: String(email).trim().toLowerCase(), token })
    .select("id, name, email, token")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  let emailed = false;
  try {
    emailed = await sendPersonalLink(data.email, data.name, data.token);
  } catch (err) {
    console.error("[email] send failed", err);
  }

  // The link is returned so the commissioner can hand it over by text when Resend
  // isn't configured yet.
  return NextResponse.json({
    id: data.id,
    name: data.name,
    emailed,
    link: `${process.env.NEXT_PUBLIC_SITE_URL}/join/${data.token}`,
  });
}
