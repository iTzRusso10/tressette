-- Napoletane: progressione lunga (30 arene, livelli e prestigio, achievement, titoli, missioni, set,
-- stagioni). Le regole sono in src/meta (ledger.ts) e le applica solo la funzione `progress`.
--
-- Cosa cambia:
--  * profiles.meta: arena raggiunta, ricompense già pagate, missioni, stagione in corso e storia,
--    set completati, titolo scelto, ultime partite (contro i doppioni). Le righe vecchie (senza meta,
--    con gli id del vecchio negozio) le converte la funzione alla prima chiamata, senza perdere niente.
--  * seasons: il calendario delle stagioni (lo stesso di src/meta/seasons.ts: 60 giorni dal 2 novembre 2026).
--  * season_scores: i punti di ognuno nella stagione in corso (li scrive la funzione dopo ogni partita).
--  * season_results: la classifica finale di ogni stagione chiusa (la scrive close_seasons()).
-- Trofei, oggetti e titoli non si toccano mai alla fine di una stagione.

alter table public.profiles
  add column meta jsonb not null default '{}'::jsonb,
  add constraint profiles_meta_object check (jsonb_typeof(meta) = 'object');

-- Gli oggetti di partenza ora hanno il loro posto nella chiave: tavolino, panno, dorso.
alter table public.profiles
  alter column owned set default '["table:vetro", "felt:verde-smeraldo", "back:classico"]'::jsonb,
  alter column equipped set default '{"table": "vetro", "felt": "verde-smeraldo", "back": "classico"}'::jsonb;

/* ------------------------------------------------------------------ stagioni */

create table public.seasons (
  id text primary key,
  n integer not null unique,
  name text not null,
  starts date not null,
  ends date not null,
  closed_at timestamptz,
  check (ends >= starts)
);

-- Deve restare uguale a SEASONS in src/meta/seasons.ts (per una stagione nuova: una riga qui e una là).
insert into public.seasons (id, n, name, starts, ends) values
  ('stagione-dei-re', 1, 'La Stagione dei Re', '2026-11-02', '2026-12-31'),
  ('trionfo-degli-assi', 2, 'Il Trionfo degli Assi', '2027-01-01', '2027-03-01'),
  ('corona-d-oro', 3, 'La Corona d’Oro', '2027-03-02', '2027-04-30'),
  ('regno-dei-maestri', 4, 'Il Regno dei Maestri', '2027-05-01', '2027-06-29'),
  ('notte-degli-immortali', 5, 'La Notte degli Immortali', '2027-06-30', '2027-08-28'),
  ('sfida-delle-tre-carte', 6, 'La Sfida delle Tre Carte', '2027-08-29', '2027-10-27');

alter table public.seasons enable row level security;
create policy "stagioni: lettura per tutti" on public.seasons for select using (true);

create table public.season_scores (
  season_id text not null references public.seasons (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  matches integer not null default 0 check (matches >= 0),
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);
alter table public.season_scores enable row level security;
-- Nessuna policy: si legge solo con le funzioni qui sotto, si scrive solo dalla funzione `progress`.

-- L'ordine della classifica di stagione: punti, poi chi ci è arrivato prima.
create index season_scores_classifica on public.season_scores (season_id, points desc, updated_at asc, user_id);

create table public.season_results (
  season_id text not null references public.seasons (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rank integer not null check (rank >= 1),
  points integer not null,
  matches integer not null,
  primary key (season_id, user_id)
);
alter table public.season_results enable row level security;
create policy "risultati di stagione: lettura propria" on public.season_results for select using (auth.uid() = user_id);

/** La stagione in corso oggi (giorno di Roma), se c'è. */
create function public.current_season() returns text
language sql stable set search_path = public as $$
  select id from seasons
  where (now() at time zone 'Europe/Rome')::date between starts and ends
  limit 1;
$$;

-- Classifica della stagione in corso: prime 100 posizioni. scope 'mondo' o 'amici' come leaderboard().
create function public.leaderboard_season(scope text)
returns table (id uuid, name text, avatar text, points integer, matches integer, rank integer)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s text := current_season();
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  if s is null then return; end if;
  if scope = 'mondo' then
    return query
      select p.id, p.name, p.avatar, sc.points, sc.matches,
        (row_number() over (order by sc.points desc, sc.updated_at asc, sc.user_id))::integer
      from season_scores sc join profiles p on p.id = sc.user_id
      where sc.season_id = s
      order by sc.points desc, sc.updated_at asc, sc.user_id
      limit 100;
  elsif scope = 'amici' then
    return query
      select p.id, p.name, p.avatar, sc.points, sc.matches,
        (row_number() over (order by sc.points desc, sc.updated_at asc, sc.user_id))::integer
      from season_scores sc join profiles p on p.id = sc.user_id
      where sc.season_id = s
        and (sc.user_id = me or sc.user_id in (
          select case when f.a = me then f.b else f.a end from friendships f where me in (f.a, f.b)
        ))
      order by sc.points desc, sc.updated_at asc, sc.user_id
      limit 100;
  else
    raise exception 'Classifica sconosciuta: %', scope;
  end if;
end $$;

-- La tua posizione nella stagione in corso, anche fuori dai primi 100.
create function public.my_season_rank()
returns table (points integer, matches integer, rank integer)
language sql stable security definer set search_path = public as $$
  select m.points, m.matches,
    (1 + (select count(*) from season_scores o
          where o.season_id = m.season_id
            and (o.points > m.points or (o.points = m.points and (o.updated_at < m.updated_at or (o.updated_at = m.updated_at and o.user_id < m.user_id))))))::integer
  from season_scores m
  where m.season_id = current_season() and m.user_id = auth.uid();
$$;

/**
 * Chiude le stagioni finite: scrive la classifica finale (solo chi ha giocato almeno 10 partite, come
 * BALANCE.seasons.minMatchesToRank) e segna la stagione come chiusa. Si può lanciare più volte.
 */
create function public.close_seasons() returns integer
language plpgsql security definer set search_path = public as $$
declare
  s record;
  closed integer := 0;
begin
  for s in select id from seasons where closed_at is null and ends < (now() at time zone 'Europe/Rome')::date order by n loop
    insert into season_results (season_id, user_id, rank, points, matches)
    select sc.season_id, sc.user_id,
      (row_number() over (order by sc.points desc, sc.updated_at asc, sc.user_id))::integer,
      sc.points, sc.matches
    from season_scores sc
    where sc.season_id = s.id and sc.matches >= 10
    on conflict (season_id, user_id) do nothing;
    update seasons set closed_at = now() where id = s.id;
    closed := closed + 1;
  end loop;
  return closed;
end $$;

-- Permessi: a PUBLIC e anon niente, a chi ha fatto l'accesso le letture, close_seasons solo al server.
revoke execute on function public.current_season() from public, anon;
revoke execute on function public.leaderboard_season(text) from public, anon;
revoke execute on function public.my_season_rank() from public, anon;
revoke execute on function public.close_seasons() from public, anon, authenticated;
grant execute on function public.current_season() to authenticated;
grant execute on function public.leaderboard_season(text) to authenticated;
grant execute on function public.my_season_rank() to authenticated;

-- Ogni notte (alle 23:20 UTC, dopo la mezzanotte di Roma) si chiudono le stagioni finite. pg_cron va attivato in Database → Extensions;
-- se non c'è, la migrazione va avanti lo stesso e close_seasons() si può lanciare a mano.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('napoletane-chiudi-stagioni', '20 23 * * *', 'select public.close_seasons()');
exception when others then
  raise notice 'pg_cron non disponibile: lancia select public.close_seasons() dopo la fine di ogni stagione';
end $$;
