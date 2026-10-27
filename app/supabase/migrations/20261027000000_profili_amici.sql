-- Napoletane: profiles, coins, trophies, friends.
-- Coins and trophies are written only by the `progress` edge function (service role):
-- a player can read their own row but cannot change it from the app.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Giocatore',
  avatar text,
  coins integer not null default 1000 check (coins >= 0),
  xp integer not null default 0 check (xp >= 0),
  stats jsonb not null default '{}'::jsonb,
  trophies jsonb not null default '{}'::jsonb,
  bonus jsonb not null default '{"lastDay": null, "streak": 0}'::jsonb,
  friend_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  facebook_id text unique,
  imported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Your own row, in full.
create policy "profilo: lettura propria" on public.profiles for select using (auth.uid() = id);

-- A new account gets a profile, with name, photo and Facebook id from the provider.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar, facebook_id)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Giocatore'), 24),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    case when new.raw_app_meta_data ->> 'provider' = 'facebook' then new.raw_user_meta_data ->> 'provider_id' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Friendships, stored once per pair (a < b).
create table public.friendships (
  a uuid not null references public.profiles (id) on delete cascade,
  b uuid not null references public.profiles (id) on delete cascade,
  via text not null check (via in ('facebook', 'codice')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);

alter table public.friendships enable row level security;
create policy "amicizie: le proprie" on public.friendships for select using (auth.uid() in (a, b));

-- Add a friend with their code: 'ok', 'notfound' or 'self'.
create function public.add_friend(code text) returns text
language plpgsql security definer set search_path = public as $$
declare other uuid;
begin
  select id into other from profiles where friend_code = upper(code);
  if other is null then return 'notfound'; end if;
  if other = auth.uid() then return 'self'; end if;
  insert into friendships (a, b, via) values (least(auth.uid(), other), greatest(auth.uid(), other), 'codice')
  on conflict do nothing;
  return 'ok';
end $$;

-- Facebook says which of your friends use the app (their app-scoped ids): link them.
create function public.link_facebook_friends(fb_ids text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into friendships (a, b, via)
  select least(auth.uid(), p.id), greatest(auth.uid(), p.id), 'facebook'
  from profiles p
  where p.facebook_id = any (fb_ids) and p.id <> auth.uid()
  on conflict do nothing;
end $$;

-- Your friends, with only what a friend may see: name, photo, experience.
create function public.my_friends() returns table (id uuid, name text, avatar text, xp integer, via text)
language sql security definer set search_path = public as $$
  select p.id, p.name, p.avatar, p.xp, f.via
  from friendships f
  join profiles p on p.id = case when f.a = auth.uid() then f.b else f.a end
  where auth.uid() in (f.a, f.b)
  order by p.xp desc;
$$;

revoke all on function public.add_friend(text) from anon;
revoke all on function public.link_facebook_friends(text[]) from anon;
revoke all on function public.my_friends() from anon;
