-- Explicit Data API grants.
--
-- From 2026-10-30 Supabase stops auto-granting Data API access to new tables
-- in `public`. Existing production tables keep what they have, but anything
-- created from a migration afterwards — a new project, a preview branch, or a
-- local `supabase db reset` — comes up with no grants and every query fails
-- with "permission denied".
--
-- This app reaches the database only through the service-role key from
-- server-side code (see lib/supabase.ts), so service_role is the only role
-- that needs anything. Revoking anon and authenticated is a tightening, not
-- just compliance: the old auto-grant gave anon full INSERT/UPDATE/DELETE on
-- every table, and the sole thing preventing a public writer was RLS being
-- enabled with no policies. One stray `create policy` would have been a
-- disaster. Now there is nothing to stand on.
do $$
declare t text;
begin
  foreach t in array array['members','games','picks','sync_state','email_log','guardianships']
  loop
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- And so future tables don't have to remember. Applies to tables created by
-- the migration role, which is how every table here is made.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
