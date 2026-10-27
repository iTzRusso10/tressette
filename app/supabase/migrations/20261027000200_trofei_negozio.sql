-- Napoletane: trofei della strada delle arene, negozio (oggetti posseduti e in uso) e classifiche.
-- Come monete e medaglie, anche trofei e oggetti li scrive solo la funzione `progress` (service role),
-- con le stesse regole di src/meta/arenas.ts e src/meta/shop.ts. Dall'app si leggono solo la propria
-- riga (policy esistente) e le classifiche qui sotto, che mostrano soltanto dati pubblici.

-- I vecchi `trophies` restano le medaglie (traguardi); i trofei delle arene sono `cups`.
alter table public.profiles
  add column cups integer not null default 0 check (cups >= 0),
  -- Il massimo mai avuto: fissa il pavimento dell'arena raggiunta (non si scende sotto il suo primo trofeo).
  add column best_cups integer not null default 0,
  -- Quando si è arrivati al numero di trofei attuale: a parità di trofei in classifica viene prima chi ci è arrivato prima.
  add column cups_at timestamptz not null default now(),
  -- Id degli oggetti posseduti (vedi ITEMS in shop.ts); quelli di partenza ci sono sempre.
  add column owned jsonb not null default '["smeraldo", "nessuno", "classico"]'::jsonb,
  -- Oggetti in uso per ogni posto: panno, decoro, dorso.
  add column equipped jsonb not null default '{"felt": "smeraldo", "pattern": "nessuno", "back": "classico"}'::jsonb,
  add constraint profiles_best_cups check (best_cups >= cups),
  add constraint profiles_owned_array check (jsonb_typeof(owned) = 'array'),
  add constraint profiles_equipped_object check (jsonb_typeof(equipped) = 'object');

-- Ogni volta che i trofei cambiano si segna l'ora (serve per lo spareggio in classifica).
create function public.touch_cups_at() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.cups is distinct from old.cups then
    new.cups_at := now();
  end if;
  return new;
end $$;

create trigger profiles_cups_at before update of cups on public.profiles
for each row execute function public.touch_cups_at();

-- L'ordine della classifica: trofei, poi chi ci è arrivato prima, poi esperienza.
create index profiles_classifica on public.profiles (cups desc, cups_at asc, xp desc, id);
-- Le amicizie si cercano anche dal secondo della coppia (la chiave primaria copre solo (a, b)).
create index friendships_b on public.friendships (b);

-- Classifica: le prime 100 posizioni per trofei. scope 'mondo' = tutti; 'amici' = tu e i tuoi amici
-- (la posizione è quella dentro il gruppo). Solo dati pubblici: id, nome, foto, trofei, esperienza, posizione.
create function public.leaderboard(scope text)
returns table (id uuid, name text, avatar text, cups integer, xp integer, rank integer)
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  if scope = 'mondo' then
    -- Due query separate invece di un OR: così il mondo legge solo le prime 100 righe dell'indice.
    return query
      select p.id, p.name, p.avatar, p.cups, p.xp,
        (row_number() over (order by p.cups desc, p.cups_at asc, p.xp desc, p.id))::integer
      from profiles p
      order by p.cups desc, p.cups_at asc, p.xp desc, p.id
      limit 100;
  elsif scope = 'amici' then
    return query
      select p.id, p.name, p.avatar, p.cups, p.xp,
        (row_number() over (order by p.cups desc, p.cups_at asc, p.xp desc, p.id))::integer
      from profiles p
      where p.id = me
        or p.id in (
          select case when f.a = me then f.b else f.a end from friendships f where me in (f.a, f.b)
        )
      order by p.cups desc, p.cups_at asc, p.xp desc, p.id
      limit 100;
  else
    raise exception 'Classifica sconosciuta: %', scope;
  end if;
end $$;

-- La tua posizione nella classifica del mondo, anche fuori dai primi 100 (stesso ordine di leaderboard).
-- Conta chi ha più trofei, più chi ne ha quanti te ma ti precede: entrambe le parti usano l'indice.
create function public.my_rank()
returns table (id uuid, name text, avatar text, cups integer, xp integer, rank integer)
language sql stable security definer set search_path = public as $$
  select m.id, m.name, m.avatar, m.cups, m.xp,
    (1
      + (select count(*) from profiles p where p.cups > m.cups)
      + (select count(*) from profiles p
         where p.cups = m.cups
           and (p.cups_at < m.cups_at
             or (p.cups_at = m.cups_at and (p.xp > m.xp or (p.xp = m.xp and p.id < m.id)))))
    )::integer
  from profiles m
  where m.id = auth.uid();
$$;

-- I tuoi amici, ora anche con i trofei. Cambia il tipo restituito: va tolta e ricreata
-- (create or replace non può cambiare le colonne di una funzione che restituisce una tabella).
drop function public.my_friends();
create function public.my_friends() returns table (id uuid, name text, avatar text, xp integer, cups integer, via text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar, p.xp, p.cups, f.via
  from friendships f
  join profiles p on p.id = case when f.a = auth.uid() then f.b else f.a end
  where auth.uid() in (f.a, f.b)
  order by p.cups desc, p.xp desc;
$$;

-- Permessi. Postgres dà EXECUTE a PUBLIC su ogni funzione nuova, e anon ne fa parte: togliere il permesso
-- solo ad anon non basta. Si toglie a PUBLIC e ad anon e lo si dà solo a chi ha fatto l'accesso.
revoke execute on function public.leaderboard(text) from public, anon;
revoke execute on function public.my_rank() from public, anon;
revoke execute on function public.my_friends() from public, anon;
grant execute on function public.leaderboard(text) to authenticated;
grant execute on function public.my_rank() to authenticated;
grant execute on function public.my_friends() to authenticated;

-- Lo stesso per le funzioni delle migrazioni precedenti, che toglievano il permesso solo ad anon.
revoke execute on function public.add_friend(text) from public, anon;
revoke execute on function public.link_facebook_friends(text[]) from public, anon;
revoke execute on function public.stake_in(text, integer) from public, anon;
revoke execute on function public.stake_report(text, uuid[]) from public, anon;
grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.link_facebook_friends(text[]) to authenticated;
grant execute on function public.stake_in(text, integer) to authenticated;
grant execute on function public.stake_report(text, uuid[]) to authenticated;
