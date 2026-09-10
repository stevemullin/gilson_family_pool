-- Development seed. Runs automatically on `supabase db reset`.
--
-- Deliberately fictional people: never copy the real pool's members in here.
-- Names are chosen to mirror the real spread of first-name lengths, since the
-- picker pills wrap on name width and a seed of short names would hide layout
-- problems that only show up with "Christina".

insert into members (name, email, token, is_admin) values
  ('Dev Commissioner', 'dev@example.test',  'devdevdevdevdevdevdev1', true),
  ('Amy Reyes',        'amy@example.test',      'seed-amy-000000000001', false),
  ('April Nakamura',   'april@example.test',    'seed-apr-000000000002', false),
  ('Ashley Quinn',     'ashley@example.test',   'seed-ash-000000000003', false),
  ('Brian Sylvestri',  'brian@example.test',    'seed-bri-000000000004', false),
  ('Cason Doyle',      'cason@example.test',    'seed-cas-000000000005', false),
  ('Chantel Ruiz',     'chantel@example.test',  'seed-cha-000000000006', false),
  ('Christina Volkov', 'christina@example.test','seed-chr-000000000007', false),
  ('James Okonkwo',    'james@example.test',    'seed-jam-000000000008', false),
  ('Jamie Bell',       'jamie@example.test',    'seed-jbe-000000000009', false),
  ('Josiah Pratt',     'josiah@example.test',   'seed-jos-000000000010', false),
  ('Kai Lindqvist',    'kai@example.test',      'seed-kai-000000000011', false),
  ('Kayden Marsh',     'kayden@example.test',   'seed-kay-000000000012', false),
  ('Lauren Adeyemi',   'lauren@example.test',   'seed-lau-000000000013', false),
  ('Mark Conway',      'mark@example.test',     'seed-mar-000000000014', false),
  ('Pattie Osei',      'pattie@example.test',   'seed-pat-000000000015', false),
  ('Seneca Whitlock',  'seneca@example.test',   'seed-sen-000000000016', false),
  ('Tom Brennan',      'tom@example.test',      'seed-tom-000000000017', false);

-- Games arrive from ESPN the first time the app renders a week, so there is
-- nothing to pick against at reset time. Call this afterwards to fill the
-- board in:
--   docker exec supabase_db_gilson_family_pool \
--     psql -U postgres -c "select dev_seed_picks();"
-- (via docker rather than psql, which isn't installed on this machine)
create or replace function dev_seed_picks(leave_unpicked int default 2)
returns text language plpgsql as $$
declare
  filled int := 0;
  total_games int;
begin
  select count(*) into total_games from games;
  if total_games = 0 then
    return 'No games yet — load the app once so it syncs a week from ESPN, then run this again.';
  end if;

  delete from picks;

  insert into picks (member_id, game_id, picked_abbr)
  select m.id,
         g.id,
         case when random() < 0.5 then g.home_abbr else g.away_abbr end
  from members m
  cross join games g
  -- Leave a couple of games unpicked per member so the "N to go" states,
  -- the nudge line and the missed-game dash all have something to show.
  where g.id not in (
    select id from games order by random() limit leave_unpicked
  );

  get diagnostics filled = row_count;
  return format('Seeded %s picks across %s games.', filled, total_games);
end;
$$;
