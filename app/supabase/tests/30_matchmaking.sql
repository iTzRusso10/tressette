-- Prove del matchmaking: coda, abbinamento, computer dopo 20 secondi nella partita veloce, classificata dal
-- livello 10 con il punteggio vero, risultati verificati. Ogni blocco fallisce con un errore se qualcosa non va.
reset role;

-- Sei giocatori nuovi: Elena, Franco, Gina, Ugo, Iris, Luca.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'elena@x.it', '{"full_name":"Elena"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'franco@x.it', '{"full_name":"Franco"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'gina@x.it', '{"full_name":"Gina"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'ugo@x.it', '{"full_name":"Ugo"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'iris@x.it', '{"full_name":"Iris"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'luca@x.it', '{"full_name":"Luca"}');
update profiles set cups = 300, best_cups = 300 where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1');
update profiles set cups = 2500, best_cups = 2500 where id = '00000000-0000-0000-0000-0000000000a1';

/* ------------------------------------------------------------------ partita veloce in due */

set role authenticated;
select set_config('app.uid', '00000000-0000-0000-0000-0000000000e1', false);
do $$
declare s jsonb;
begin
  s := mm_join('quick', 'scopa', '2', 2, 'Elena');
  assert s ->> 'status' = 'waiting', format('Elena da sola aspetta: %s', s);
end $$;
-- Gina ha troppi trofei di differenza: non finisce al tavolo di Elena.
select set_config('app.uid', '00000000-0000-0000-0000-0000000000a1', false);
do $$
declare s jsonb;
begin
  s := mm_join('quick', 'scopa', '2', 2, 'Gina');
  assert s ->> 'status' = 'waiting', format('Gina (2500 trofei) non va con Elena (300): %s', s);
end $$;
select set_config('app.uid', '00000000-0000-0000-0000-0000000000f1', false);
do $$
declare s jsonb; m jsonb;
begin
  s := mm_join('quick', 'scopa', '2', 2, 'Franco');
  assert s ->> 'status' = 'found', format('Franco trova Elena: %s', s);
  m := s -> 'match';
  assert m ->> 'host' = '00000000-0000-0000-0000-0000000000e1', 'apre la stanza chi aspetta da più tempo';
  assert (m ->> 'cpu')::boolean = false, 'nessun computer';
  assert jsonb_array_length(m -> 'players') = 2, 'due persone';
  assert m -> 'players' -> 1 ->> 'name' = 'Franco' and (m -> 'players' -> 1 ->> 'seat')::integer = 1, 'Franco al posto 1';
  assert m ->> 'code' like 'mm%', 'codice della stanza';
end $$;
select set_config('app.uid', '00000000-0000-0000-0000-0000000000e1', false);
do $$
declare s jsonb;
begin
  s := mm_poll();
  assert s ->> 'status' = 'found', format('Elena vede la partita: %s', s);
  assert s -> 'match' -> 'players' -> 0 ->> 'name' = 'Elena', 'Elena al posto 0';
end $$;

-- Le tabelle non si leggono e mm_report non si chiama da fuori.
do $$
begin
  begin
    perform 1 from mm_tickets;
    assert false, 'mm_tickets leggibile';
  exception when insufficient_privilege then null;
  end;
  begin
    perform mm_report('00000000-0000-0000-0000-0000000000e1', gen_random_uuid(), true, 'x');
    assert false, 'mm_report chiamabile da chi gioca';
  exception when insufficient_privilege then null;
  end;
end $$;

/* ------------------------------------------------------------------ dopo 20 secondi, il computer */

select set_config('app.uid', '00000000-0000-0000-0000-0000000000a1', false);
reset role;
update mm_tickets set created_at = now() - interval '25 seconds' where user_id = '00000000-0000-0000-0000-0000000000a1';
set role authenticated;
select set_config('app.uid', '00000000-0000-0000-0000-0000000000a1', false);
do $$
declare s jsonb;
begin
  s := mm_poll();
  assert s ->> 'status' = 'found', format('dopo 20 secondi Gina gioca: %s', s);
  assert (s -> 'match' ->> 'cpu')::boolean, 'con un computer';
  assert s -> 'match' ->> 'level' = 'difficile', 'forte, nelle arene alte';
  assert jsonb_array_length(s -> 'match' -> 'players') = 1, 'Gina da sola';
end $$;

/* ------------------------------------------------------------------ classificata */

-- Sotto il livello 10 è chiusa.
select set_config('app.uid', '00000000-0000-0000-0000-0000000000b1', false);
do $$
begin
  assert mm_join('ranked', 'briscola', '2', 2, 'Ugo') ->> 'status' = 'locked', 'classificata chiusa sotto il livello 10';
end $$;
reset role;
update profiles set xp = 5000 where id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1');
insert into game_ratings (user_id, game, season_id, rating, games, peak) values
  ('00000000-0000-0000-0000-0000000000b1', 'briscola', rating_season(), 1600, 30, 1600),
  ('00000000-0000-0000-0000-0000000000c1', 'briscola', rating_season(), 1000, 30, 1000),
  ('00000000-0000-0000-0000-0000000000d1', 'briscola', rating_season(), 1550, 30, 1550);
set role authenticated;
select set_config('app.uid', '00000000-0000-0000-0000-0000000000b1', false);
do $$
begin
  assert mm_join('ranked', 'briscola', '2', 2, 'Ugo') ->> 'status' = 'waiting', 'Ugo aspetta';
end $$;
-- Iris (1000) è troppo lontana da Ugo (1600): niente partita, nemmeno dopo 30 secondi, e niente computer.
select set_config('app.uid', '00000000-0000-0000-0000-0000000000c1', false);
do $$
begin
  assert mm_join('ranked', 'briscola', '2', 2, 'Iris') ->> 'status' = 'waiting', 'Iris non va con Ugo';
end $$;
reset role;
update mm_tickets set created_at = now() - interval '30 seconds' where user_id = '00000000-0000-0000-0000-0000000000c1';
set role authenticated;
select set_config('app.uid', '00000000-0000-0000-0000-0000000000c1', false);
do $$
begin
  assert mm_poll() ->> 'status' = 'waiting', 'in classificata niente computer';
end $$;
-- Luca (1550) è vicino a Ugo.
select set_config('app.uid', '00000000-0000-0000-0000-0000000000d1', false);
do $$
declare s jsonb;
begin
  s := mm_join('ranked', 'briscola', '2', 2, 'Luca');
  assert s ->> 'status' = 'found', format('Luca trova Ugo: %s', s);
  assert s -> 'match' -> 'players' -> 0 ->> 'name' = 'Ugo', 'contro Ugo';
  assert (s -> 'match' -> 'players' -> 0 ->> 'score')::integer = 1600, 'con il suo punteggio di Briscola';
end $$;
-- Dopo un minuto di attesa la classificata accetta chiunque: Iris trova finalmente qualcuno.
select set_config('app.uid', '00000000-0000-0000-0000-0000000000e1', false);
reset role;
update profiles set xp = 5000 where id = '00000000-0000-0000-0000-0000000000e1';
insert into game_ratings (user_id, game, season_id, rating, games, peak) values ('00000000-0000-0000-0000-0000000000e1', 'briscola', rating_season(), 1400, 30, 1400);
update mm_tickets set created_at = now() - interval '70 seconds' where user_id = '00000000-0000-0000-0000-0000000000c1';
set role authenticated;
select set_config('app.uid', '00000000-0000-0000-0000-0000000000e1', false);
do $$
declare s jsonb;
begin
  s := mm_join('ranked', 'briscola', '2', 2, 'Elena');
  assert s ->> 'status' = 'waiting', 'Elena entra in coda';
end $$;
select set_config('app.uid', '00000000-0000-0000-0000-0000000000c1', false);
do $$
begin
  assert mm_poll() ->> 'status' = 'found', 'dopo un minuto Iris gioca';
end $$;
-- Uscire dalla coda.
select set_config('app.uid', '00000000-0000-0000-0000-0000000000a1', false);
do $$
begin
  perform mm_cancel();
  assert mm_poll() ->> 'status' = 'none', 'Gina è uscita dalla coda';
end $$;

/* ------------------------------------------------------------------ risultati */

reset role;
do $$
declare
  mid uuid;
  r jsonb;
begin
  select id into mid from mm_matches where kind = 'ranked' and '00000000-0000-0000-0000-0000000000d1' = any (players);
  -- Troppo presto: una partita non finisce in pochi secondi.
  r := mm_report('00000000-0000-0000-0000-0000000000d1', mid, true, 'rec-luca');
  assert r ->> 'reason' = 'tooSoon', format('troppo presto: %s', r);
  update mm_matches set created_at = now() - interval '5 minutes' where id = mid;
  -- Chi non c'era non può riferirla.
  r := mm_report('00000000-0000-0000-0000-0000000000a1', mid, true, 'rec-gina');
  assert r ->> 'reason' = 'notInMatch', format('estranea: %s', r);
  -- Luca vince: accettato, con la forza vera di Ugo.
  r := mm_report('00000000-0000-0000-0000-0000000000d1', mid, true, 'rec-luca');
  assert (r ->> 'ok')::boolean and (r ->> 'opp_rating')::integer = 1600 and r ->> 'kind' = 'ranked', format('Luca: %s', r);
  assert r -> 'opp' ->> 0 = '00000000-0000-0000-0000-0000000000b1', 'avversario Ugo';
  -- La stessa richiesta ripetuta passa; un'altra partita con lo stesso id del matchmaking no.
  r := mm_report('00000000-0000-0000-0000-0000000000d1', mid, true, 'rec-luca');
  assert (r ->> 'ok')::boolean, 'ripetuta';
  r := mm_report('00000000-0000-0000-0000-0000000000d1', mid, true, 'rec-altra');
  assert r ->> 'reason' = 'duplicate', format('doppione: %s', r);
  -- Ugo non può dire di aver vinto anche lui; che ha perso sì.
  r := mm_report('00000000-0000-0000-0000-0000000000b1', mid, true, 'rec-ugo');
  assert r ->> 'reason' = 'conflict', format('due vincitori: %s', r);
  r := mm_report('00000000-0000-0000-0000-0000000000b1', mid, false, 'rec-ugo');
  assert (r ->> 'ok')::boolean and not (r ->> 'won')::boolean, format('Ugo perde: %s', r);
  -- La partita di Gina con il computer: una persona sola, con il computer.
  select id into mid from mm_matches where '00000000-0000-0000-0000-0000000000a1' = any (players);
  update mm_matches set created_at = now() - interval '5 minutes' where id = mid;
  r := mm_report('00000000-0000-0000-0000-0000000000a1', mid, true, 'rec-gina');
  assert (r ->> 'ok')::boolean and (r ->> 'cpu')::boolean and (r ->> 'humans')::integer = 1 and r ->> 'opp_rating' is null, format('Gina: %s', r);
end $$;

select 'matchmaking: tutte le prove passate' as esito;
