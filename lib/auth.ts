import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { createServiceClient } from "./supabase";
import type { Member } from "./types";

export const COOKIE_NAME = "gfp_token";
/** Who the account is currently picking as, when that isn't themselves. */
export const ACTING_COOKIE = "gfp_acting";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** 22 URL-safe characters. The whole auth model — see SPEC.md §4. */
export function generateToken(): string {
  return randomBytes(16).toString("base64url");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: ONE_YEAR,
    path: "/",
  };
}

/**
 * Resolve the current member from the session cookie. The cookie *is* the token,
 * verified against the database on every request — no signing secret, no session
 * table. Returns null when signed out or when the token has been revoked.
 */
export async function getCurrentMember(): Promise<Member | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  return (data as Member) ?? null;
}

/** Throws unless the caller is a signed-in commissioner. */
export async function requireAdmin(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member?.is_admin) throw new Error("forbidden");
  return member;
}

export interface Session {
  /** Whose link the cookie belongs to. Admin rights live here, never on viewer. */
  account: Member;
  /** Who the app is acting as — the account itself unless they've switched. */
  viewer: Member;
  /** Everyone the account may act as, excluding themselves. */
  manages: Array<{ id: string; name: string }>;
}

/**
 * Resolve the session, including who the account is picking as.
 *
 * A parent with three kids in the pool was juggling three magic links on one
 * phone. Guardianships let one session act as another member, so the switch
 * is a tap. The acting id is validated against the table on every request —
 * a hand-edited cookie can't make you somebody else.
 */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = createServiceClient();
  const { data: account } = await supabase
    .from("members")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!account) return null;

  const { data: links } = await supabase
    .from("guardianships")
    .select("member_id")
    .eq("guardian_id", account.id);

  const managedIds = ((links ?? []) as Array<{ member_id: string }>).map(
    (l) => l.member_id
  );

  let manages: Array<{ id: string; name: string }> = [];
  if (managedIds.length > 0) {
    const { data: kids } = await supabase
      .from("members")
      .select("id, name")
      .in("id", managedIds)
      .order("name");
    manages = (kids ?? []) as Array<{ id: string; name: string }>;
  }

  const actingId = cookies().get(ACTING_COOKIE)?.value;
  let viewer = account as Member;

  if (actingId && actingId !== account.id && manages.some((m) => m.id === actingId)) {
    const { data: acted } = await supabase
      .from("members")
      .select("*")
      .eq("id", actingId)
      .maybeSingle();
    if (acted) viewer = acted as Member;
  }

  return { account: account as Member, viewer, manages };
}
