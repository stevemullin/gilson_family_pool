import { NextResponse } from "next/server";
import { getSession, ACTING_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Switch who this session is picking as.
 *
 * Only accepts the account itself or someone they're a guardian of — the
 * allowed set comes from the database on every request, so the cookie can't
 * be edited into somebody else's account.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const target = new URL(req.url).searchParams.get("next") || "/";
  const res = NextResponse.redirect(new URL(target, req.url));

  if (params.id === session.account.id) {
    res.cookies.delete(ACTING_COOKIE);
    return res;
  }

  if (!session.manages.some((m) => m.id === params.id)) {
    // Not yours to pick for. Fail quietly back to your own card.
    res.cookies.delete(ACTING_COOKIE);
    return res;
  }

  const { maxAge, ...options } = sessionCookieOptions();
  res.cookies.set(ACTING_COOKIE, params.id, options);
  return res;
}
