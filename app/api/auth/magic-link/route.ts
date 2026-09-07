import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendPersonalLink } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (typeof email === "string" && email.includes("@")) {
    const supabase = createServiceClient();
    const { data: member } = await supabase
      .from("members")
      .select("name, email, token")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (member) {
      try {
        await sendPersonalLink(member.email, member.name, member.token);
      } catch (err) {
        console.error("[email] send failed", err);
      }
    }
  }

  // Always the same response, whether or not the address is in the pool.
  return NextResponse.json({ ok: true });
}
