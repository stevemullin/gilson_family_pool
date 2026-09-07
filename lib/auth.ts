import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { createServiceClient } from "./supabase";
import type { Member } from "./types";

export const COOKIE_NAME = "gfp_token";
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
