-- Correzioni alla posta online (30 ottobre 2026).
--
--  * stake_report pagava il piatto senza toccare updated_at: una richiesta `progress` partita nello
--    stesso momento (la fine della partita) leggeva la riga prima e la riscriveva con le monete vecchie,
--    e il piatto spariva. Ora ogni pagamento cambia updated_at e la funzione progress riprova.
--  * Un piatto mai chiuso (chi ha creato la stanza è uscito a metà, l'app si è chiusa) teneva le monete
--    per sempre. Dopo tre ore la posta torna a chi l'ha versata.

create or replace function public.stake_report(p_match text, p_winners uuid[]) returns integer
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  pot pots%rowtype;
  vkey text := array_to_string(array(select unnest(p_winners) order by 1), ',');
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
    update pots set reports = reports || jsonb_build_object(me::text, vkey) where match_id = p_match returning * into pot;
    select count(*) into votes from jsonb_each_text(pot.reports) where value = vkey;
    if votes * 2 > cardinality(pot.payers) then
      won := array(select w from unnest(p_winners) w where w = any (pot.payers));
      if cardinality(won) = 0 then
        -- Solo posti del computer hanno vinto: la posta torna indietro.
        update profiles set coins = coins + pot.stake, updated_at = now() where id = any (pot.payers);
      else
        share := (pot.stake * cardinality(pot.payers)) / cardinality(won);
        update profiles set coins = coins + share, updated_at = now() where id = any (won);
      end if;
      update pots set settled = true where match_id = p_match;
    end if;
  end if;
  select coins into left_coins from profiles where id = me;
  return left_coins;
end $$;

-- I piatti aperti da più di tre ore: la posta torna a chi l'ha versata.
create or replace function public.refund_stale_pots() returns integer
language plpgsql security definer set search_path = public as $$
declare
  pot pots%rowtype;
  n integer := 0;
begin
  for pot in select * from pots where not settled and created_at < now() - interval '3 hours' for update skip locked loop
    update profiles set coins = coins + pot.stake, updated_at = now() where id = any (pot.payers);
    update pots set settled = true where match_id = pot.match_id;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.stake_report(text, uuid[]) from public, anon;
grant execute on function public.stake_report(text, uuid[]) to authenticated;
revoke all on function public.refund_stale_pots() from public, anon, authenticated;

-- Ogni ora, se pg_cron c'è.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('napoletane-rimborsa-posta', '10 * * * *', 'select public.refund_stale_pots()');
exception when others then
  raise notice 'pg_cron non disponibile: lancia select public.refund_stale_pots() ogni tanto';
end $$;
