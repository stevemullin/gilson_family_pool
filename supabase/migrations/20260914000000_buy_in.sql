-- Optional $10 buy-in. Two flags because they mean different things:
--   bought_in  opted into the money race; drives the 💰 marker next to the name
--   paid       the $10 has actually arrived; admin-only, so the commissioner
--              can see who still owes
alter table members
  add column if not exists bought_in boolean not null default false,
  add column if not exists paid      boolean not null default false;
