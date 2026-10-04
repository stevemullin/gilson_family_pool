-- Who may pick on whose behalf.
--
-- Many-to-many on purpose: Kayden and Josiah are managed by both Kevin and
-- Christina, Cason and Kai by both Amy and Ashley. A single managed_by column
-- would have forced one parent to own each kid.
create table guardianships (
  guardian_id uuid not null references members(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (guardian_id, member_id),
  constraint guardianship_not_self check (guardian_id <> member_id)
);
create index guardianships_guardian_idx on guardianships(guardian_id);
alter table guardianships enable row level security;
