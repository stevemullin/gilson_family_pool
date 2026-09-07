import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import { COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Exchange a personal link for a session cookie, then redirect to "/" so the secret
 * leaves the address bar immediately and doesn't linger in history or a screenshot.
 */
export default async function JoinPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createServiceClient();
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("token", params.token)
    .maybeSingle();

  if (!member) {
    return (
      <main className="mx-auto max-w-[430px] px-6 py-20 text-center">
        <h1 className="display text-[22px] font-bold">That link doesn&rsquo;t work</h1>
        <p className="mt-2 text-[13px]" style={{ color: "var(--ink-secondary)" }}>
          It may have been replaced. Ask for a new one and it&rsquo;ll arrive by email.
        </p>
        <a
          href="/login"
          className="mt-5 inline-block rounded-[12px] px-4 py-3 text-[14px] font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          Email me my link
        </a>
      </main>
    );
  }

  cookies().set(COOKIE_NAME, params.token, sessionCookieOptions());
  redirect("/");
}
