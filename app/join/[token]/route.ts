import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Exchange a personal link for a session cookie, then redirect to "/" so the secret
 * leaves the address bar immediately and doesn't linger in history or a screenshot.
 *
 * This is a Route Handler, not a page, because Next.js only permits cookies().set()
 * in a Route Handler or Server Action — a Server Component throws at runtime.
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient();
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("token", params.token)
    .maybeSingle();

  if (!member) {
    return NextResponse.redirect(new URL("/login?invalid=1", req.url));
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(COOKIE_NAME, params.token, sessionCookieOptions());
  return res;
}
