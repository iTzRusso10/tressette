-- Posta: il pagamento cambia updated_at (così la funzione progress non lo sovrascrive) e un piatto
-- rimasto aperto torna a chi l'ha versato.
update profiles set coins = 1000, updated_at = now() - interval '1 day' where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
set role authenticated;
select set_config('app.uid', '00000000-0000-0000-0000-00000000000a', false);
select stake_in('posta2', 100);
select set_config('app.uid', '00000000-0000-0000-0000-00000000000b', false);
select stake_in('posta2', 100);
select stake_report('posta2', array['00000000-0000-0000-0000-00000000000b']::uuid[]);
reset role;
update profiles set updated_at = now() - interval '1 day' where id = '00000000-0000-0000-0000-00000000000b';
set role authenticated;
select set_config('app.uid', '00000000-0000-0000-0000-00000000000a', false);
select stake_report('posta2', array['00000000-0000-0000-0000-00000000000b']::uuid[]);
reset role;
do $$
declare t timestamptz;
begin
  select updated_at into t from profiles where id = '00000000-0000-0000-0000-00000000000b';
  assert t > now() - interval '1 minute', 'il pagamento del piatto deve cambiare updated_at';
end $$;

-- Un piatto aperto da ore, mai chiuso: la posta torna indietro una volta sola.
set role authenticated;
select set_config('app.uid', '00000000-0000-0000-0000-00000000000a', false);
select stake_in('posta3', 100);
reset role;
update pots set created_at = now() - interval '4 hours' where match_id = 'posta3';
do $$
declare before integer; after integer; n integer;
begin
  select coins into before from profiles where id = '00000000-0000-0000-0000-00000000000a';
  n := public.refund_stale_pots();
  perform public.refund_stale_pots();
  select coins into after from profiles where id = '00000000-0000-0000-0000-00000000000a';
  assert n = 1 and after = before + 100, format('rimborso: %s piatti, monete %s → %s', n, before, after);
end $$;

select 'posta: tutte le prove passate' as esito;
