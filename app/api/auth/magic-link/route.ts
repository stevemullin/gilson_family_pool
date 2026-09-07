import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { generateToken } from "@/lib/auth";
import { sendPersonalLink } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Sign in or sign up — the pool is open, so an unrecognised email creates a member
 * rather than being turned away. A name is only needed the first time.
 *
 * Enumeration protection is moot once anyone can create an account, but the response
 * stays uniform anyway so a failed send never tells the caller who is in the pool.
 */
export async function POST(req: Request) {
  const { email, name } = await req.json().catch(() => ({}));

  const address =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!address.includes("@") || address.length < 5) {
    return NextResponse.json({ message: "That doesn't look like an email address." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("members")
    .select("name, email, token")
    .eq("email", address)
    .maybeSingle();

  let member = existing;

  if (!member) {
    const displayName = typeof name === "string" ? name.trim() : "";
    if (!displayName) {
      // Signal the client to ask for a name rather than inventing one from the address.
      return NextResponse.json({ needsName: true }, { status: 200 });
    }

    const { data: created, error } = await supabase
      .from("members")
      .insert({ name: displayName, email: address, token: generateToken() })
      .select("name, email, token")
      .single();

    if (error) {
      console.error("[signup] insert failed", error);
      return NextResponse.json({ ok: true }); // stay uniform
    }
    member = created;
  }

  try {
    await sendPersonalLink(member.email, member.name, member.token);
  } catch (err) {
    console.error("[email] send failed", err);
  }

  return NextResponse.json({ ok: true });
}
