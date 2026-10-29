-- Napoletane: competizione e socialità.
--
--  * Classifiche per gioco (Tressette, Briscola, Scopa) sul punteggio di bravura (src/meta/rating.ts):
--    della stagione, della settimana, i giocatori vicini a te, gli amici. Il punteggio lo calcola la
--    funzione `progress` con le regole del telefono e lo scrive qui; dall'app si legge soltanto.
--  * Premi del server (podio della settimana, posizione di fine stagione): righe in reward_grants che la
--    funzione `progress` porta tra le ricompense da riscuotere del giocatore, una volta sola.
--  * Profilo pubblico (profiles.public: avatar, cornice, titolo, vetrina, statistiche per gioco),
--    visibile a chi ha fatto l'accesso; stato online (last_seen).
--  * Amici: ricerca per nome, richieste di amicizia (il codice amico resta e aggiunge subito), inviti a
--    una stanza privata, sfide tra persone registrate solo quando la maggioranza conferma il risultato
--    (rivalità e storico).
-- I trofei permanenti non cambiano; la fine di una stagione non tocca niente di permanente.

/* ================================================================== profili */

alter table public.profiles
  add column public jsonb not null default '{}'::jsonb,
  add column last_seen timestamptz,
  add constraint profiles_public_object check (jsonb_typeof(public) = 'object');

create index profiles_nome on public.profiles (lower(name) text_pattern_ops);

/* ================================================================== punteggi per gioco */

create table public.game_ratings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('tressette', 'briscola', 'scopa')),
  season_id text not null,
  rating integer not null check (rating between 0 and 4000),
  games integer not null default 0 check (games >= 0),
  peak integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, game, season_id)
);
alter table public.game_ratings enable row level security;
create index game_ratings_classifica on public.game_ratings (season_id, game, rating desc, updated_at asc, user_id) where games >= 10;

create table public.weekly_scores (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('tressette', 'briscola', 'scopa')),
  week text not null,
  perf integer not null,
  games integer not null default 0,
  wins integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, game, week)
);
alter table public.weekly_scores enable row level security;
create index weekly_scores_classifica on public.weekly_scores (week, game, perf desc, updated_at asc, user_id) where games >= 5;

-- Risultati finali per gioco di ogni stagione chiusa (lo storico).
create table public.season_game_results (
  season_id text not null references public.seasons (id),
  game text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rank integer not null,
  rating integer not null,
  primary key (season_id, game, user_id)
);
alter table public.season_game_results enable row level security;
create policy "storico di stagione: lettura per chi ha fatto l'accesso" on public.season_game_results for select to authenticated using (true);

-- Premi assegnati dal server. Si riscuotono dal telefono una volta sola (vedi addGrants in ledger.ts).
create table public.reward_grants (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  why text not null,
  coins integer not null default 0 check (coins >= 0),
  items text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.reward_grants enable row level security;
create index reward_grants_utente on public.reward_grants (user_id, created_at);

/** La settimana ISO di un giorno, come in src/meta/missions.ts (weekOf): «2026-W44». */
create function public.iso_week(d date) returns text
language sql immutable as $$
  select to_char(d, 'IYYY') || '-W' || to_char(d, 'IW')
$$;

/** La stagione per il punteggio di oggi: quella in corso, o l'ultima cominciata (fra due stagioni). */
create function public.rating_season() returns text
language sql stable set search_path = public as $$
  select coalesce(
    current_season(),
    (select id from seasons where starts <= (now() at time zone 'Europe/Rome')::date order by n desc limit 1),
    'preseason'
  )
$$;

/** La classifica completa di un gioco per un periodo, con le posizioni (base delle funzioni sotto). */
create function public.game_board(p_game text, p_period text)
returns table (id uuid, score integer, games integer, at timestamptz, rank integer)
language sql stable security definer set search_path = public as $$
  with board as (
    select g.user_id as id, g.rating as score, g.games, g.updated_at as at
    from game_ratings g
    where p_period = 'stagione' and g.season_id = rating_season() and g.game = p_game and g.games >= 10
    union all
    select w.user_id, w.perf, w.games, w.updated_at
    from weekly_scores w
    where p_period = 'settimana' and w.week = iso_week((now() at time zone 'Europe/Rome')::date) and w.game = p_game and w.games >= 5
  )
  select b.id, b.score, b.games, b.at, (row_number() over (order by b.score desc, b.at asc, b.id))::integer
  from board b
$$;

/*
 * Classifica di un gioco. period: 'stagione' (punteggio della stagione, chi ha giocato almeno 10
 * partite) o 'settimana' (prestazione della settimana, almeno 5 partite). scope: 'mondo' (i primi 100),
 * 'amici' (tu e i tuoi amici), 'vicini' (i 5 sopra e i 5 sotto di te).
 */
create function public.leaderboard_game(p_game text, p_period text, p_scope text)
returns table (id uuid, name text, avatar text, pub jsonb, score integer, games integer, rank integer)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_rank integer;
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  if p_game not in ('tressette', 'briscola', 'scopa') then raise exception 'Gioco sconosciuto'; end if;
  if p_period not in ('stagione', 'settimana') then raise exception 'Periodo sconosciuto'; end if;
  if p_scope = 'mondo' then
    return query select b.id, p.name, p.avatar, p.public, b.score, b.games, b.rank
      from game_board(p_game, p_period) b join profiles p on p.id = b.id where b.rank <= 100 order by b.rank;
  elsif p_scope = 'amici' then
    return query select b.id, p.name, p.avatar, p.public, b.score, b.games, b.rank
      from game_board(p_game, p_period) b join profiles p on p.id = b.id
      where b.id = me or b.id in (select case when f.a = me then f.b else f.a end from friendships f where me in (f.a, f.b))
      order by b.rank limit 100;
  elsif p_scope = 'vicini' then
    select b.rank into my_rank from game_board(p_game, p_period) b where b.id = me;
    if my_rank is null then return; end if;
    return query select b.id, p.name, p.avatar, p.public, b.score, b.games, b.rank
      from game_board(p_game, p_period) b join profiles p on p.id = b.id where b.rank between my_rank - 5 and my_rank + 5 order by b.rank;
  else
    raise exception 'Classifica sconosciuta: %', p_scope;
  end if;
end $$;

/** La tua posizione in una classifica di gioco (anche oltre i primi 100), o niente se non ci sei ancora. */
create function public.my_game_rank(p_game text, p_period text)
returns table (score integer, games integer, rank integer, total integer)
language sql stable security definer set search_path = public as $$
  select b.score, b.games, b.rank, (select count(*) from game_board(p_game, p_period))::integer
  from game_board(p_game, p_period) b
  where b.id = auth.uid();
$$;

/** Le tue posizioni finali nelle stagioni chiuse, per gioco. */
create function public.my_season_history()
returns table (season_id text, season_name text, game text, rank integer, rating integer, players integer)
language sql stable security definer set search_path = public as $$
  select r.season_id, s.name, r.game, r.rank, r.rating,
    (select count(*) from season_game_results x where x.season_id = r.season_id and x.game = r.game)::integer
  from season_game_results r join seasons s on s.id = r.season_id
  where r.user_id = auth.uid()
  order by s.n desc, r.game;
$$;

/*
 * Chiude le settimane finite: per ogni gioco, i primi tre (almeno 5 partite) ricevono un premio da
 * riscuotere. Si può lanciare più volte: un premio ha un id fisso e non si duplica.
 */
create function public.close_weeks() returns integer
language plpgsql security definer set search_path = public as $$
declare
  last_week text := iso_week(((now() at time zone 'Europe/Rome')::date - 7));
  given integer := 0;
  r record;
begin
  for r in
    select x.user_id, x.game, x.rk from (
      select w.user_id, w.game, row_number() over (partition by w.game order by w.perf desc, w.updated_at asc, w.user_id) as rk
      from weekly_scores w where w.week = last_week and w.games >= 5
    ) x where x.rk <= 3
  loop
    insert into reward_grants (id, user_id, why, coins, items)
    values (
      'podio:' || last_week || ':' || r.game || ':' || r.user_id,
      r.user_id,
      case r.rk when 1 then 'Primo' when 2 then 'Secondo' else 'Terzo' end || ' nella classifica settimanale di '
        || initcap(r.game) || ' (' || last_week || ')',
      case r.rk when 1 then 1000 when 2 then 600 else 400 end,
      array['frame:podio-settimana']
    )
    on conflict (id) do nothing;
    given := given + 1;
  end loop;
  return given;
end $$;

-- close_seasons() ora scrive anche le classifiche finali per gioco e i premi di posizione; la posizione
-- che serve ai titoli di stagione (Primo di Stagione, Campione Stagionale, Finalista) è la migliore tra i giochi.
create or replace function public.close_seasons() returns integer
language plpgsql security definer set search_path = public as $$
declare
  s record;
  closed integer := 0;
begin
  for s in select id, name from seasons where closed_at is null and ends < (now() at time zone 'Europe/Rome')::date order by n loop
    insert into season_game_results (season_id, game, user_id, rank, rating)
    select g.season_id, g.game, g.user_id,
      (row_number() over (partition by g.game order by g.rating desc, g.updated_at asc, g.user_id))::integer, g.rating
    from game_ratings g where g.season_id = s.id and g.games >= 10
    on conflict do nothing;
    insert into season_results (season_id, user_id, rank, points, matches)
    select r.season_id, r.user_id, min(r.rank), 0, 0 from season_game_results r where r.season_id = s.id group by r.season_id, r.user_id
    on conflict (season_id, user_id) do nothing;
    insert into reward_grants (id, user_id, why, coins, items)
    select 'stagione:' || r.season_id || ':' || r.game || ':' || r.user_id, r.user_id,
      case when r.rank = 1 then 'Primo' when r.rank <= 10 then 'Tra i primi 10' else 'Tra i primi 100' end
        || ' a ' || initcap(r.game) || ' in ' || s.name,
      case when r.rank = 1 then 3000 when r.rank <= 10 then 1500 else 500 end,
      '{}'
    from season_game_results r where r.season_id = s.id and r.rank <= 100
    on conflict (id) do nothing;
    update seasons set closed_at = now() where id = s.id;
    closed := closed + 1;
  end loop;
  return closed;
end $$;

/* ================================================================== sfide tra persone (tabella) */

-- Una partita online tra persone registrate. Ognuno riferisce chi ha vinto; la sfida conta (rivalità,
-- storico) solo quando la maggioranza dei giocatori riferisce lo stesso risultato. Chi non c'era non
-- può riferire, e lo stesso giocatore non può riferire due volte.
create table public.duels (
  match_id text primary key,
  game text not null check (game in ('tressette', 'briscola', 'scopa')),
  players uuid[] not null,
  reports jsonb not null default '{}'::jsonb,
  winners uuid[] not null default '{}',
  settled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.duels enable row level security;
create index duels_giocatori on public.duels using gin (players);

/* ================================================================== profili pubblici */

/** Il profilo che vedono gli altri: solo dati pubblici, più lo storico delle sfide con te. */
create function public.public_profile(p_id uuid)
returns table (id uuid, name text, avatar text, pub jsonb, cups integer, xp integer, last_seen timestamptz, friend boolean, my_wins integer, their_wins integer)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar, p.public, p.cups, p.xp,
    case when exists (select 1 from friendships f where (f.a, f.b) = (least(auth.uid(), p.id), greatest(auth.uid(), p.id))) then p.last_seen end,
    exists (select 1 from friendships f where (f.a, f.b) = (least(auth.uid(), p.id), greatest(auth.uid(), p.id))),
    (select count(*) from duels d where d.settled and auth.uid() = any (d.players) and p.id = any (d.players) and auth.uid() = any (d.winners) and not (p.id = any (d.winners)))::integer,
    (select count(*) from duels d where d.settled and auth.uid() = any (d.players) and p.id = any (d.players) and p.id = any (d.winners) and not (auth.uid() = any (d.winners)))::integer
  from profiles p
  where p.id = p_id and auth.uid() is not null;
$$;

/** Cerca giocatori per nome (almeno 3 lettere). */
create function public.search_players(q text)
returns table (id uuid, name text, avatar text, pub jsonb, cups integer, friend boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar, p.public, p.cups,
    exists (select 1 from friendships f where (f.a, f.b) = (least(auth.uid(), p.id), greatest(auth.uid(), p.id)))
  from profiles p
  where auth.uid() is not null and length(trim(q)) >= 3 and p.id <> auth.uid()
    and lower(p.name) like lower(replace(replace(trim(q), '%', ''), '_', '')) || '%'
  order by p.cups desc
  limit 20;
$$;

/* ================================================================== amici */

-- Richieste di amicizia (cercando per nome). Il codice amico continua ad aggiungere subito: chi lo
-- condivide ha già scelto.
create table public.friend_requests (
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
alter table public.friend_requests enable row level security;

create function public.send_friend_request(p_to uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  if p_to = me then return 'self'; end if;
  if not exists (select 1 from profiles where id = p_to) then return 'notfound'; end if;
  if exists (select 1 from friendships where (a, b) = (least(me, p_to), greatest(me, p_to))) then return 'already'; end if;
  -- Se l'altro ti aveva già chiesto l'amicizia, diventate amici subito.
  if exists (select 1 from friend_requests where from_id = p_to and to_id = me) then
    insert into friendships (a, b, via) values (least(me, p_to), greatest(me, p_to), 'codice') on conflict do nothing;
    delete from friend_requests where (from_id, to_id) in ((p_to, me), (me, p_to));
    return 'friends';
  end if;
  -- Al massimo 30 richieste in attesa, contro lo spam.
  if (select count(*) from friend_requests where from_id = me) >= 30 then return 'limit'; end if;
  insert into friend_requests (from_id, to_id) values (me, p_to) on conflict do nothing;
  return 'sent';
end $$;

create function public.respond_friend_request(p_from uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  delete from friend_requests where from_id = p_from and to_id = me;
  if not found then return 'notfound'; end if;
  if p_accept then
    insert into friendships (a, b, via) values (least(me, p_from), greatest(me, p_from), 'codice') on conflict do nothing;
    return 'friends';
  end if;
  return 'declined';
end $$;

create function public.remove_friend(p_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from friendships where (a, b) = (least(auth.uid(), p_id), greatest(auth.uid(), p_id));
$$;

/** Le richieste che hai ricevuto. */
create function public.my_friend_requests() returns table (id uuid, name text, avatar text, pub jsonb, cups integer, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar, p.public, p.cups, r.created_at
  from friend_requests r join profiles p on p.id = r.from_id
  where r.to_id = auth.uid()
  order by r.created_at desc;
$$;

-- Gli amici con lo stato (ultima volta visti) e il profilo pubblico. Cambia il tipo restituito: va ricreata.
drop function public.my_friends();
create function public.my_friends() returns table (id uuid, name text, avatar text, xp integer, cups integer, via text, pub jsonb, last_seen timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar, p.xp, p.cups, f.via, p.public, p.last_seen
  from friendships f
  join profiles p on p.id = case when f.a = auth.uid() then f.b else f.a end
  where auth.uid() in (f.a, f.b)
  order by p.last_seen desc nulls last, p.cups desc;
$$;

/** «Sono qui»: lo chiama l'app ogni tanto mentre è aperta (stato online per gli amici). */
create function public.ping() returns void
language sql security definer set search_path = public as $$
  update profiles set last_seen = now() where id = auth.uid();
$$;

/* ================================================================== inviti */

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  code text not null check (code ~ '^[0-9]{4}$'),
  game text not null check (game in ('tressette', 'briscola', 'scopa')),
  mode text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
alter table public.invites enable row level security;
create index invites_destinatario on public.invites (to_id, created_at desc);

/** Invita un amico nella tua stanza. Solo amici; un invito vale 10 minuti. */
create function public.send_invite(p_to uuid, p_code text, p_game text, p_mode text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  if not exists (select 1 from friendships where (a, b) = (least(me, p_to), greatest(me, p_to))) then return 'notfriend'; end if;
  -- Un invito alla volta per persona e stanza; al massimo 20 all'ora.
  if (select count(*) from invites where from_id = me and created_at > now() - interval '1 hour') >= 20 then return 'limit'; end if;
  delete from invites where from_id = me and to_id = p_to and status = 'pending';
  insert into invites (from_id, to_id, code, game, mode) values (me, p_to, p_code, p_game, p_mode);
  return 'sent';
end $$;

/** Gli inviti ricevuti negli ultimi 10 minuti e ancora da rispondere. */
create function public.my_invites() returns table (id uuid, from_id uuid, name text, avatar text, pub jsonb, code text, game text, mode text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, i.from_id, p.name, p.avatar, p.public, i.code, i.game, i.mode, i.created_at
  from invites i join profiles p on p.id = i.from_id
  where i.to_id = auth.uid() and i.status = 'pending' and i.created_at > now() - interval '10 minutes'
  order by i.created_at desc;
$$;

create function public.respond_invite(p_id uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  update invites set status = case when p_accept then 'accepted' else 'declined' end
  where id = p_id and to_id = auth.uid() and status = 'pending' and created_at > now() - interval '10 minutes'
  returning code into c;
  return coalesce(c, 'expired');
end $$;

/* ================================================================== sfide tra persone */

create function public.report_duel(p_match text, p_game text, p_players uuid[], p_winners uuid[]) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d duels%rowtype;
  vkey text := array_to_string(array(select unnest(p_winners) order by 1), ',');
  votes integer;
begin
  if me is null or not (me = any (p_players)) then return false; end if;
  if cardinality(p_players) < 2 or cardinality(p_players) > 4 then return false; end if;
  insert into duels (match_id, game, players) values (p_match, p_game, array(select distinct unnest(p_players) order by 1))
  on conflict (match_id) do nothing;
  select * into d from duels where match_id = p_match for update;
  -- I giocatori della sfida sono quelli del primo che l'ha riferita: gli altri devono essere d'accordo.
  if not (me = any (d.players)) or d.settled then return d.settled; end if;
  if not (p_winners <@ d.players) then return false; end if;
  update duels set reports = reports || jsonb_build_object(me::text, vkey) where match_id = p_match returning * into d;
  select count(*) into votes from jsonb_each_text(d.reports) where value = vkey;
  if votes * 2 > cardinality(d.players) then
    update duels set winners = p_winners, settled = true where match_id = p_match;
    return true;
  end if;
  return false;
end $$;

/** Le tue rivalità: le persone che hai sfidato di più, con le vittorie di ognuno. */
create function public.my_rivals() returns table (id uuid, name text, avatar text, pub jsonb, games integer, my_wins integer, their_wins integer, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  with mine as (
    select d.*, o.other from duels d, unnest(d.players) as o(other)
    where d.settled and auth.uid() = any (d.players) and o.other <> auth.uid()
  )
  select p.id, p.name, p.avatar, p.public,
    count(*)::integer,
    count(*) filter (where auth.uid() = any (m.winners) and not (m.other = any (m.winners)))::integer,
    count(*) filter (where m.other = any (m.winners) and not (auth.uid() = any (m.winners)))::integer,
    max(m.created_at)
  from mine m join profiles p on p.id = m.other
  group by p.id, p.name, p.avatar, p.public
  order by count(*) desc
  limit 30;
$$;

/** Le ultime sfide contro una persona. */
create function public.duels_with(p_id uuid) returns table (match_id text, game text, won boolean, lost boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.match_id, d.game,
    auth.uid() = any (d.winners) and not (p_id = any (d.winners)),
    p_id = any (d.winners) and not (auth.uid() = any (d.winners)),
    d.created_at
  from duels d
  where d.settled and auth.uid() = any (d.players) and p_id = any (d.players)
  order by d.created_at desc
  limit 30;
$$;

/* ================================================================== posta online (correzione) */

-- In stake_report la variabile «key» si confondeva con la colonna «key» di jsonb_each_text e la funzione
-- andava in errore al primo risultato riferito: la posta non veniva mai pagata. Stessa funzione, variabile rinominata.
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

/* ================================================================== permessi */

-- Niente a PUBLIC e anon; le letture e le azioni social a chi ha fatto l'accesso; le chiusure solo al server.
do $$
declare f text;
begin
  foreach f in array array[
    'public.leaderboard_game(text, text, text)', 'public.my_game_rank(text, text)', 'public.my_season_history()',
    'public.public_profile(uuid)', 'public.search_players(text)', 'public.send_friend_request(uuid)',
    'public.respond_friend_request(uuid, boolean)', 'public.remove_friend(uuid)', 'public.my_friend_requests()',
    'public.my_friends()', 'public.ping()', 'public.send_invite(uuid, text, text, text)', 'public.my_invites()',
    'public.respond_invite(uuid, boolean)', 'public.report_duel(text, text, uuid[], uuid[])', 'public.my_rivals()',
    'public.duels_with(uuid)', 'public.rating_season()', 'public.iso_week(date)', 'public.game_board(text, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke execute on function public.close_weeks() from public, anon, authenticated;
revoke execute on function public.close_seasons() from public, anon, authenticated;

-- Ogni lunedì (00:30 di Roma) si premiano i podi della settimana finita, se pg_cron c'è.
do $$
begin
  perform cron.schedule('napoletane-chiudi-settimane', '30 23 * * 0', 'select public.close_weeks()');
exception when others then
  raise notice 'pg_cron non disponibile: lancia select public.close_weeks() ogni lunedì';
end $$;
