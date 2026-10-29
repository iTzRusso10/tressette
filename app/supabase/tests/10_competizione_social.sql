-- Prove delle classifiche per gioco, dei premi del server, degli amici, degli inviti e delle sfide.
-- Ogni blocco fallisce con un errore se il risultato non è quello atteso.

-- Quattro giocatori: Anna, Bruno, Carla, Dario. Il trigger crea i profili.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@x.it', '{"full_name":"Anna"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@x.it', '{"full_name":"Bruno"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carla@x.it', '{"full_name":"Carla"}'),
  ('00000000-0000-0000-0000-00000000000d', 'dario@x.it', '{"full_name":"Dario"}');

-- Punteggi come li scrive la funzione progress (service role): Scopa, stagione in corso.
insert into game_ratings (user_id, game, season_id, rating, games, peak) values
  ('00000000-0000-0000-0000-00000000000a', 'scopa', rating_season(), 1420, 30, 1450),
  ('00000000-0000-0000-0000-00000000000b', 'scopa', rating_season(), 1250, 12, 1260),
  ('00000000-0000-0000-0000-00000000000c', 'scopa', rating_season(), 1600, 9, 1600),  -- in calibrazione: non compare
  ('00000000-0000-0000-0000-00000000000d', 'scopa', rating_season(), 980, 40, 1100);
insert into weekly_scores (user_id, game, week, perf, games, wins) values
  ('00000000-0000-0000-0000-00000000000a', 'scopa', iso_week((now() at time zone 'Europe/Rome')::date), 1500, 8, 6),
  ('00000000-0000-0000-0000-00000000000b', 'scopa', iso_week((now() at time zone 'Europe/Rome')::date), 1350, 4, 3),  -- poche partite
  ('00000000-0000-0000-0000-00000000000d', 'scopa', iso_week((now() at time zone 'Europe/Rome')::date), 1200, 6, 2),
  ('00000000-0000-0000-0000-00000000000a', 'scopa', iso_week(((now() at time zone 'Europe/Rome')::date - 7)), 1400, 9, 6),
  ('00000000-0000-0000-0000-00000000000d', 'scopa', iso_week(((now() at time zone 'Europe/Rome')::date - 7)), 1300, 9, 5);

set role authenticated;
select set_config('app.uid', '00000000-0000-0000-0000-00000000000b', false);

do $$
declare n integer; r record;
begin
  -- Classifica della stagione: tre giocatori (Carla è ancora in calibrazione), Anna prima.
  select count(*) into n from leaderboard_game('scopa', 'stagione', 'mondo');
  assert n = 3, format('stagione mondo: %s righe', n);
  select * into r from leaderboard_game('scopa', 'stagione', 'mondo') order by rank limit 1;
  assert r.name = 'Anna' and r.score = 1420, format('primo: %s %s', r.name, r.score);
  -- La mia posizione: Bruno secondo su tre.
  select * into r from my_game_rank('scopa', 'stagione');
  assert r.rank = 2 and r.total = 3, format('mia posizione: %s su %s', r.rank, r.total);
  -- Vicini: tutti e tre stanno entro 5 posizioni.
  select count(*) into n from leaderboard_game('scopa', 'stagione', 'vicini');
  assert n = 3, format('vicini: %s', n);
  -- Settimana: Bruno ha giocato solo 4 partite, quindi non compare e non ha posizione.
  select count(*) into n from leaderboard_game('scopa', 'settimana', 'mondo');
  assert n = 2, format('settimana: %s', n);
  select count(*) into n from my_game_rank('scopa', 'settimana');
  assert n = 0, 'Bruno non dovrebbe essere in classifica settimanale';
  -- Amici: nessuno ancora, solo Bruno stesso.
  select count(*) into n from leaderboard_game('scopa', 'stagione', 'amici');
  assert n = 1, format('amici: %s', n);
  -- Un gioco sconosciuto è un errore.
  begin
    perform leaderboard_game('poker', 'stagione', 'mondo');
    assert false, 'poker accettato';
  exception when raise_exception then null;
  end;
end $$;

-- Direttamente le tabelle no: si passa solo dalle funzioni.
do $$
begin
  begin
    perform 1 from game_ratings;
    assert false, 'lettura diretta di game_ratings permessa';
  exception when insufficient_privilege then null;
  end;
  begin
    perform close_weeks();
    assert false, 'close_weeks permessa a un giocatore';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Amici: Bruno cerca Anna per nome e le chiede l'amicizia.
do $$
declare r record; n integer; t text;
begin
  select count(*) into n from search_players('an');
  assert n = 0, 'la ricerca deve chiedere almeno 3 lettere';
  select * into r from search_players('ann');
  assert r.name = 'Anna' and not r.friend, 'ricerca di Anna';
  t := send_friend_request('00000000-0000-0000-0000-00000000000a');
  assert t = 'sent', t;
  t := send_friend_request('00000000-0000-0000-0000-00000000000b');
  assert t = 'self', t;
end $$;

select set_config('app.uid', '00000000-0000-0000-0000-00000000000a', false);
do $$
declare n integer; t text;
begin
  select count(*) into n from my_friend_requests();
  assert n = 1, format('richieste di Anna: %s', n);
  t := respond_friend_request('00000000-0000-0000-0000-00000000000b', true);
  assert t = 'friends', t;
  select count(*) into n from my_friends();
  assert n = 1, format('amici di Anna: %s', n);
  -- Una seconda risposta non trova più niente.
  t := respond_friend_request('00000000-0000-0000-0000-00000000000b', true);
  assert t = 'notfound', t;
  -- Ora Bruno compare nella classifica amici di Anna.
  select count(*) into n from leaderboard_game('scopa', 'stagione', 'amici');
  assert n = 2, format('classifica amici di Anna: %s', n);
  perform ping();
end $$;

-- Inviti: Anna invita Bruno (amico) e Dario (non amico).
do $$
declare t text;
begin
  t := send_invite('00000000-0000-0000-0000-00000000000b', '4821', 'scopa', '2');
  assert t = 'sent', t;
  t := send_invite('00000000-0000-0000-0000-00000000000d', '4821', 'scopa', '2');
  assert t = 'notfriend', t;
end $$;

select set_config('app.uid', '00000000-0000-0000-0000-00000000000b', false);
do $$
declare r record; t text;
begin
  select * into r from my_invites();
  assert r.code = '4821' and r.name = 'Anna', 'invito ricevuto da Bruno';
  t := respond_invite(r.id, true);
  assert t = '4821', t;
  t := respond_invite(r.id, true);
  assert t = 'expired', 'un invito si accetta una volta sola';
  -- Anna vede Bruno online? Bruno vede Anna (ha fatto ping) perché amici.
  select * into r from public_profile('00000000-0000-0000-0000-00000000000a');
  assert r.friend and r.last_seen is not null, 'stato online di un amico';
  select * into r from public_profile('00000000-0000-0000-0000-00000000000d');
  assert not r.friend and r.last_seen is null, 'lo stato di chi non è amico non si vede';
end $$;

-- Sfide: Anna e Bruno giocano; la sfida conta quando la maggioranza conferma lo stesso risultato.
do $$
declare ok boolean;
begin
  ok := report_duel('m1', 'scopa', array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b']::uuid[], array['00000000-0000-0000-0000-00000000000b']::uuid[]);
  assert not ok, 'un solo voto su due non basta';
end $$;
select set_config('app.uid', '00000000-0000-0000-0000-00000000000d', false);
do $$
declare ok boolean;
begin
  -- Dario non c'era: il suo voto non conta.
  ok := report_duel('m1', 'scopa', array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d']::uuid[], array['00000000-0000-0000-0000-00000000000d']::uuid[]);
  assert not ok, 'chi non era nella sfida non può votare';
end $$;
select set_config('app.uid', '00000000-0000-0000-0000-00000000000a', false);
do $$
declare ok boolean; r record;
begin
  -- Anna dice di aver vinto lei: non c'è maggioranza (1 a 1).
  ok := report_duel('m1', 'scopa', array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b']::uuid[], array['00000000-0000-0000-0000-00000000000a']::uuid[]);
  assert not ok, 'risultati diversi: niente maggioranza';
  -- Anna corregge e conferma la vittoria di Bruno: ora sono d'accordo in due su due.
  ok := report_duel('m1', 'scopa', array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b']::uuid[], array['00000000-0000-0000-0000-00000000000b']::uuid[]);
  assert ok, 'due voti uguali su due: la sfida conta';
  select * into r from my_rivals();
  assert r.name = 'Bruno' and r.games = 1 and r.their_wins = 1 and r.my_wins = 0, format('rivalità: %s %s-%s', r.name, r.my_wins, r.their_wins);
  select * into r from public_profile('00000000-0000-0000-0000-00000000000b');
  assert r.my_wins = 0 and r.their_wins = 1, 'storico nel profilo';
end $$;

reset role;

-- Premi del podio della settimana scorsa: Anna prima, Dario secondo, una volta sola anche lanciando due volte.
do $$
declare n integer;
begin
  perform close_weeks();
  perform close_weeks();
  select count(*) into n from reward_grants where id like 'podio:%';
  assert n = 2, format('premi del podio: %s', n);
  select count(*) into n from reward_grants where user_id = '00000000-0000-0000-0000-00000000000a' and coins = 1000;
  assert n = 1, 'Anna prima';
end $$;

-- Fine stagione: una stagione finita con i punteggi diventa storico e premi di posizione.
do $$
declare n integer;
begin
  insert into seasons (id, n, name, starts, ends) values ('prova', 0, 'Stagione di prova', '2026-01-01', '2026-02-01');
  insert into game_ratings (user_id, game, season_id, rating, games, peak) values
    ('00000000-0000-0000-0000-00000000000a', 'briscola', 'prova', 1300, 15, 1300),
    ('00000000-0000-0000-0000-00000000000b', 'briscola', 'prova', 1350, 11, 1360),
    ('00000000-0000-0000-0000-00000000000c', 'briscola', 'prova', 1500, 3, 1500);
  perform close_seasons();
  perform close_seasons();
  select count(*) into n from season_game_results where season_id = 'prova';
  assert n = 2, format('storico: %s', n);
  select rank into n from season_game_results where season_id = 'prova' and user_id = '00000000-0000-0000-0000-00000000000b';
  assert n = 1, 'Bruno primo a Briscola';
  select count(*) into n from reward_grants where id like 'stagione:prova:%';
  assert n = 2, format('premi di stagione: %s', n);
  select rank into n from season_results where season_id = 'prova' and user_id = '00000000-0000-0000-0000-00000000000a';
  assert n = 2, 'posizione migliore di Anna';
end $$;

-- Posta online: Anna e Bruno puntano 100 a testa, Bruno vince, il piatto va a lui una volta sola.
update profiles set coins = 1000 where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
set role authenticated;
select set_config('app.uid', '00000000-0000-0000-0000-00000000000a', false);
select stake_in('posta1', 100);
select set_config('app.uid', '00000000-0000-0000-0000-00000000000b', false);
select stake_in('posta1', 100);
select stake_report('posta1', array['00000000-0000-0000-0000-00000000000b']::uuid[]);
select set_config('app.uid', '00000000-0000-0000-0000-00000000000a', false);
select stake_report('posta1', array['00000000-0000-0000-0000-00000000000b']::uuid[]);
select stake_report('posta1', array['00000000-0000-0000-0000-00000000000b']::uuid[]);
reset role;
do $$
declare a integer; b integer;
begin
  select coins into a from profiles where id = '00000000-0000-0000-0000-00000000000a';
  select coins into b from profiles where id = '00000000-0000-0000-0000-00000000000b';
  assert a = 900 and b = 1100, format('posta: Anna %s, Bruno %s', a, b);
end $$;

select 'competizione e social: tutte le prove passate' as esito;
