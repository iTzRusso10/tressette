-- Online stakes: everyone pays into a pot at the start; the pot is paid out once more than half of
-- the people who paid in report the same winners (same rule as src/meta/stakes.ts).

create table public.pots (
  match_id text primary key,
  stake integer not null check (stake > 0),
  payers uuid[] not null default '{}',
  reports jsonb not null default '{}'::jsonb,
  settled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pots enable row level security;
-- No policies: only the functions below touch pots.

-- Pays the stake into the pot of a match. Returns your coins after paying.
create function public.stake_in(p_match text, p_stake integer) returns integer
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  left_coins integer;
  pot_stake integer;
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  if p_stake not in (100, 500, 1000, 5000) then raise exception 'Posta non valida'; end if;
  insert into pots (match_id, stake) values (p_match, p_stake) on conflict (match_id) do nothing;
  select stake into pot_stake from pots where match_id = p_match for update;
  if pot_stake <> p_stake then raise exception 'Posta diversa da quella della stanza'; end if;
  if exists (select 1 from pots where match_id = p_match and me = any (payers)) then
    select coins into left_coins from profiles where id = me;
    return left_coins;
  end if;
  update profiles set coins = coins - p_stake, updated_at = now() where id = me and coins >= p_stake returning coins into left_coins;
  if left_coins is null then raise exception 'Monete insufficienti'; end if;
  update pots set payers = array_append(payers, me) where match_id = p_match;
  return left_coins;
end $$;

-- Reports who won. Pays the pot when most payers agree. Returns your coins.
create function public.stake_report(p_match text, p_winners uuid[]) returns integer
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  pot pots%rowtype;
  key text := array_to_string(array(select unnest(p_winners) order by 1), ',');
  votes integer;
  won uuid[];
  share integer;
  left_coins integer;
begin
  select * into pot from pots where match_id = p_match for update;
  if pot.match_id is null or not (me = any (pot.payers)) then
    select coins into left_coins from profiles where id = me;
    return left_coins;
  end if;
  if not pot.settled then
    update pots set reports = reports || jsonb_build_object(me::text, key) where match_id = p_match returning * into pot;
    select count(*) into votes from jsonb_each_text(pot.reports) where value = key;
    if votes * 2 > cardinality(pot.payers) then
      won := array(select w from unnest(p_winners) w where w = any (pot.payers));
      if cardinality(won) = 0 then
        -- Only computer seats won: stakes back.
        update profiles set coins = coins + pot.stake where id = any (pot.payers);
      else
        share := (pot.stake * cardinality(pot.payers)) / cardinality(won);
        update profiles set coins = coins + share where id = any (won);
      end if;
      update pots set settled = true where match_id = p_match;
    end if;
  end if;
  select coins into left_coins from profiles where id = me;
  return left_coins;
end $$;

revoke all on function public.stake_in(text, integer) from anon;
revoke all on function public.stake_report(text, uuid[]) from anon;
