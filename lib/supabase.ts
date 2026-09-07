import { createClient } from "@supabase/supabase-js";

/**
 * Server client using the service-role key.
 *
 * This is the ONLY way the app touches the database. RLS is enabled with no anon
 * policies, so all reads and writes must run server-side through route handlers and
 * server components — that is the layer that knows the kickoff-time visibility rule.
 * See SPEC.md §5.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
