import { createClient } from "@supabase/supabase-js";

/**
 * Server client using the service-role key.
 *
 * Both values are intentionally NOT prefixed NEXT_PUBLIC_. Next.js inlines those at
 * BUILD time, while Vercel withholds "Secret"-typed variables until RUNTIME — the two
 * together silently compile to undefined. Server-only names avoid the collision and
 * keep the database URL out of the browser bundle where it never belonged.
 *
 * This is the ONLY way the app touches the database. RLS is enabled with no anon
 * policies, so all reads and writes must run server-side through route handlers and
 * server components — that is the layer that knows the kickoff-time visibility rule.
 * See SPEC.md §5.
 */
export function createServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
