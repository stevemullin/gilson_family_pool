-- Every email the app tries to send, and every time the reminder cron decides
-- not to. Resend's dashboard shows delivery; this shows intent, including the
-- skips Resend never sees.
create table email_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  kind text not null,          -- 'personal_link' | 'reminder' | 'cron'
  member_id uuid references members(id) on delete set null,
  to_email text,
  subject text,
  ok boolean not null,
  resend_id text,              -- set when Resend accepted it
  detail text                  -- error message, or the cron's reason
);
create index email_log_at_idx on email_log(at desc);
alter table email_log enable row level security;
