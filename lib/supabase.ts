import { createClient } from "@supabase/supabase-js";

/**
 * Server client using the service-role key.
 *
 * This is the ONLY way the app touches the database. RLS is enabled with no anon
 * policies, so all reads and writes must run server-side through route handlers and
 * server components — that is the layer that knows the kickoff-time visibility rule.
 * See SPEC.md §5.
 *
 * Both values are intentionally NOT prefixed NEXT_PUBLIC_. Next.js inlines those at
 * BUILD time, while Vercel withholds "Secret"-typed variables until RUNTIME — the two
 * together silently compile to undefined. Server-only names avoid the collision and
 * keep the database URL out of the browser bundle where it never belonged.
 *
 * `cache: "no-store"` on every request is load-bearing. Next.js 14 caches fetch()
 * responses in route handlers that never call cookies() or headers() — which is
 * every cron route — and `dynamic = "force-dynamic"` does not override that. On
 * 2026-09-14 the reminder cron read a day-old `last_reminder_date` from that cache,
 * decided it hadn't run, and re-sent; the backup endpoint returned an empty
 * email_log that had eleven rows in it. A database client that can return stale
 * rows is not a database client.
 */
export function createServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
