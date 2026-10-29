-- Matchmaking: la partita veloce (trofei) e la classificata (punteggio di bravura, leghe).
--
-- Chi cerca una partita mette un biglietto in coda (mm_join) e poi chiede ogni secondo e mezzo come va
-- (mm_poll). Ogni richiesta prova ad abbinare: i biglietti dello stesso gioco, modalità e numero di posti,
-- con un punteggio vicino (trofei nella veloce, punteggio del gioco nella classificata). La distanza
-- accettata cresce con l'attesa. Nella partita veloce, dopo 20 secondi i posti rimasti li prende un
-- computer dichiarato (trofei dimezzati); nella classificata si aspetta una persona.
--
-- Una partita trovata ha un codice di stanza: chi è in coda da più tempo la apre e tiene il tavolo (come
-- nelle stanze con gli amici), gli altri entrano. A fine partita la funzione progress chiede a mm_report se
-- quel risultato si può accettare: la partita esiste, tu c'eri, è durata abbastanza, non l'hai già riferita,
-- e non contraddice quello che hanno già detto gli altri (in due non si vince in due).
--
-- Le tabelle non si leggono direttamente: si passa solo da queste funzioni.

create table public.mm_tickets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kind text not null check (kind in ('quick', 'ranked')),
  game text not null check (game in ('tressette', 'briscola', 'scopa')),
  mode text not null check (mode in ('2', '4', 'perdere')),
  seats integer not null check (seats in (2, 4)),
  score integer not null,
  name text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz not null default now(),
  match_id uuid
);
create index mm_tickets_waiting on public.mm_tickets (kind, game, mode, seats, created_at) where match_id is null;

create table public.mm_matches (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  game text not null,
  mode text not null,
  seats integer not null,
  code text not null unique,
  -- Le persone in ordine di posto (la prima apre la stanza), con nome, posto e punteggio.
  players uuid[] not null,
  names text[] not null,
  seat_of integer[] not null,
  scores integer[] not null,
  -- Qualche posto lo prende un computer, di questo livello.
  cpu boolean not null,
  level text not null,
  created_at timestamptz not null default now()
);

create table public.mm_reports (
  match_id uuid not null references public.mm_matches (id) on delete cascade,
  user_id uuid not null,
  won boolean not null,
  -- L'id della partita sul telefono: la stessa richiesta ripetuta (rete caduta) si riconosce.
  record text not null,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.mm_tickets enable row level security;
alter table public.mm_matches enable row level security;
alter table public.mm_reports enable row level security;

/* ================================================================== numeri */

-- Gli stessi di src/meta/balance.ts (un test li confronta): esperienza del livello 10, secondi prima del computer.
create function public.mm_ranked_xp() returns integer language sql immutable as $$ select 1980 $$;
create function public.mm_cpu_after() returns integer language sql immutable as $$ select 20 $$;

/** La squadra di un posto: in quattro a coppie i posti 0 e 2 contro 1 e 3; altrimenti ognuno per sé. */
create function public.mm_team(p_mode text, p_seat integer) returns integer
language sql immutable as $$ select case when p_mode = '4' then p_seat % 2 else p_seat end $$;

/* ================================================================== abbinamento */

/** Prova ad abbinare il biglietto di p_user. Restituisce la partita creata, o null. */
create function public.mm_try(p_user uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  t mm_tickets%rowtype;
  waited numeric;
  win integer;
  others uuid[];
  everyone uuid[];
  n integer;
  mid uuid;
  avg_score numeric;
begin
  -- Il mio biglietto, se non è già preso da un'altra richiesta che lo sta abbinando.
  select * into t from mm_tickets where user_id = p_user and match_id is null for update skip locked;
  if t.user_id is null then return null; end if;
  waited := extract(epoch from now() - t.created_at);
  win := case
    when t.kind = 'quick' then (150 + 25 * waited)::integer
    when waited >= 60 then 100000
    else least(400, (100 + 10 * waited)::integer)
  end;
  select array_agg(x.user_id order by x.created_at) into others from (
    select c.user_id, c.created_at from mm_tickets c
    where c.match_id is null and c.user_id <> t.user_id
      and c.kind = t.kind and c.game = t.game and c.mode = t.mode and c.seats = t.seats
      and c.seen_at > now() - interval '12 seconds'
      and abs(c.score - t.score) <= win
    order by c.created_at
    limit t.seats - 1
    for update skip locked
  ) x;
  n := 1 + coalesce(cardinality(others), 0);
  if n < t.seats and not (t.kind = 'quick' and waited >= mm_cpu_after()) then return null; end if;

  -- In ordine di arrivo: chi aspetta da più tempo apre la stanza e siede al posto 0.
  select array_agg(user_id order by created_at) into everyone from mm_tickets where user_id = t.user_id or user_id = any (coalesce(others, '{}'));
  select avg(score) into avg_score from mm_tickets where user_id = any (everyone);
  mid := gen_random_uuid();
  insert into mm_matches (id, kind, game, mode, seats, code, players, names, seat_of, scores, cpu, level)
  select mid, t.kind, t.game, t.mode, t.seats, 'mm' || substr(replace(mid::text, '-', ''), 1, 12),
    everyone,
    array(select k.name from unnest(everyone) with ordinality u(id, i) join mm_tickets k on k.user_id = u.id order by u.i),
    array(select (i - 1)::integer from generate_series(1, cardinality(everyone)) i),
    array(select k.score from unnest(everyone) with ordinality u(id, i) join mm_tickets k on k.user_id = u.id order by u.i),
    n < t.seats,
    -- Il computer che prende i posti liberi: più forte nelle arene più alte.
    case when avg_score < 600 then 'facile' when avg_score < 1500 then 'medio' else 'difficile' end;
  update mm_tickets set match_id = mid where user_id = any (everyone);
  return mid;
end $$;

/** Come va la ricerca di p_user: la partita trovata, o da quanto aspetta. */
create function public.mm_state(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  t mm_tickets%rowtype;
  m mm_matches%rowtype;
begin
  select * into t from mm_tickets where user_id = p_user;
  if t.user_id is null then return jsonb_build_object('status', 'none'); end if;
  if t.match_id is null then
    return jsonb_build_object('status', 'waiting', 'waited', floor(extract(epoch from now() - t.created_at)));
  end if;
  select * into m from mm_matches where id = t.match_id;
  return jsonb_build_object(
    'status', 'found',
    'match', jsonb_build_object(
      'id', m.id, 'code', m.code, 'kind', m.kind, 'game', m.game, 'mode', m.mode, 'seats', m.seats,
      'cpu', m.cpu, 'level', m.level, 'host', m.players[1],
      'players', (
        select jsonb_agg(jsonb_build_object('id', m.players[i], 'name', m.names[i], 'seat', m.seat_of[i], 'score', m.scores[i]) order by i)
        from generate_series(1, cardinality(m.players)) i
      )
    )
  );
end $$;

/** Entra in coda. Un biglietto per persona: uno nuovo sostituisce quello di prima. */
create function public.mm_join(p_kind text, p_game text, p_mode text, p_seats integer, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  sc integer;
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  if p_kind not in ('quick', 'ranked') or p_game not in ('tressette', 'briscola', 'scopa') or p_mode not in ('2', '4', 'perdere') then
    raise exception 'Partita non valida';
  end if;
  -- A perdere si gioca solo a Tressette; in due o in quattro secondo la modalità.
  if (p_mode = 'perdere' and p_game <> 'tressette') or (p_mode = '2' and p_seats <> 2) or (p_mode = '4' and p_seats <> 4) or p_seats not in (2, 4) then
    raise exception 'Partita non valida';
  end if;
  if p_kind = 'ranked' and coalesce((select xp from profiles where id = me), 0) < mm_ranked_xp() then
    return jsonb_build_object('status', 'locked');
  end if;
  sc := case
    when p_kind = 'quick' then coalesce((select cups from profiles where id = me), 0)
    else coalesce((select rating from game_ratings where user_id = me and game = p_game and season_id = rating_season()), 1000)
  end;
  -- Pulizia: biglietti abbandonati, e partite trovate da un pezzo.
  delete from mm_tickets where (match_id is null and seen_at < now() - interval '2 minutes') or created_at < now() - interval '30 minutes';
  delete from mm_tickets where user_id = me;
  insert into mm_tickets (user_id, kind, game, mode, seats, score, name)
  values (me, p_kind, p_game, p_mode, p_seats, sc, left(coalesce(nullif(trim(p_name), ''), 'Giocatore'), 16));
  perform mm_try(me);
  return mm_state(me);
end $$;

/** A che punto è la ricerca (e intanto si riprova ad abbinare). */
create function public.mm_poll() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  update mm_tickets set seen_at = now() where user_id = me;
  perform mm_try(me);
  return mm_state(me);
end $$;

/** Esce dalla coda. */
create function public.mm_cancel() returns void
language sql security definer set search_path = public as $$
  delete from mm_tickets where user_id = auth.uid();
$$;

/* ================================================================== risultato */

/**
 * Chiamata dalla funzione progress (service role) quando arriva una partita veloce o classificata.
 * Restituisce se si può accettare e, in quel caso, i dati veri della partita: gli avversari e la loro
 * forza media, se c'era un computer, quante persone. La stessa richiesta ripetuta (stesso record) passa
 * di nuovo; un'altra partita riferita con lo stesso id del matchmaking no.
 */
create function public.mm_report(p_user uuid, p_match uuid, p_won boolean, p_record text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  m mm_matches%rowtype;
  r mm_reports%rowtype;
  idx integer;
  mine integer;
  won boolean := p_won;
  opp uuid[];
  opp_score numeric;
begin
  select * into m from mm_matches where id = p_match;
  if m.id is null then return jsonb_build_object('ok', false, 'reason', 'unknown'); end if;
  idx := array_position(m.players, p_user);
  if idx is null then return jsonb_build_object('ok', false, 'reason', 'notInMatch'); end if;
  if now() - m.created_at < interval '40 seconds' then return jsonb_build_object('ok', false, 'reason', 'tooSoon'); end if;
  if now() - m.created_at > interval '6 hours' then return jsonb_build_object('ok', false, 'reason', 'tooLate'); end if;
  mine := mm_team(m.mode, m.seat_of[idx]);

  select * into r from mm_reports where match_id = p_match and user_id = p_user;
  if r.match_id is not null then
    if r.record <> left(p_record, 40) then return jsonb_build_object('ok', false, 'reason', 'duplicate'); end if;
    won := r.won;
  else
    if p_won then
      -- Non si vince contro chi ha già detto di aver vinto (salvo a perdere in quattro, dove possono
      -- vincere in più), né contro il compagno che ha detto di aver perso.
      if (m.mode <> 'perdere' or m.seats = 2) and exists (
        select 1 from mm_reports x
        where x.match_id = p_match and x.won and mm_team(m.mode, m.seat_of[array_position(m.players, x.user_id)]) <> mine
      ) then
        return jsonb_build_object('ok', false, 'reason', 'conflict');
      end if;
      if exists (
        select 1 from mm_reports x
        where x.match_id = p_match and not x.won and x.user_id <> p_user and mm_team(m.mode, m.seat_of[array_position(m.players, x.user_id)]) = mine
      ) then
        return jsonb_build_object('ok', false, 'reason', 'conflict');
      end if;
    end if;
    insert into mm_reports (match_id, user_id, won, record) values (p_match, p_user, p_won, left(p_record, 40));
  end if;

  select array_agg(m.players[i]), avg(m.scores[i]) into opp, opp_score
  from generate_series(1, cardinality(m.players)) i
  where mm_team(m.mode, m.seat_of[i]) <> mine;
  return jsonb_build_object(
    'ok', true, 'kind', m.kind, 'game', m.game, 'mode', m.mode, 'won', won, 'cpu', m.cpu,
    'humans', cardinality(m.players), 'opp', coalesce(to_jsonb(opp), '[]'::jsonb),
    'opp_rating', case when opp_score is null then null else round(opp_score) end
  );
end $$;

/* ================================================================== permessi */

do $$
declare f text;
begin
  foreach f in array array['public.mm_join(text, text, text, integer, text)', 'public.mm_poll()', 'public.mm_cancel()'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array['public.mm_try(uuid)', 'public.mm_state(uuid)', 'public.mm_report(uuid, uuid, boolean, text)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- Ogni notte si tolgono le partite trovate più vecchie di due giorni (con i loro risultati), se pg_cron c'è.
do $$
begin
  perform cron.schedule('napoletane-pulizia-matchmaking', '15 3 * * *', $c$delete from public.mm_matches where created_at < now() - interval '2 days'$c$);
exception when others then
  raise notice 'pg_cron non disponibile: le partite del matchmaking vecchie restano (si possono togliere a mano)';
end $$;
