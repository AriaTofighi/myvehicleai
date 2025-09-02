-- Core schema: profiles + mods with RLS and trigger
-- Requires: pgcrypto

create extension if not exists pgcrypto;

-- Public profiles, 1:1 with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'free',
  images_generated integer not null default 0,
  bytes_used bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Recreate policies idempotently (no IF NOT EXISTS supported for policies)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Insert rows via trigger; disallow direct client inserts
drop policy if exists "profiles_no_client_insert" on public.profiles;
create policy "profiles_no_client_insert"
on public.profiles for insert
with check (false);

-- Trigger to auto-create profile on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Mods metadata table
create table if not exists public.mods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  prompt text not null,
  image_path text not null,
  width int,
  height int,
  created_at timestamptz not null default now()
);

alter table public.mods enable row level security;

drop policy if exists "mods_select_own" on public.mods;
create policy "mods_select_own"
on public.mods for select
using (auth.uid() = user_id);

drop policy if exists "mods_insert_own" on public.mods;
create policy "mods_insert_own"
on public.mods for insert
with check (auth.uid() = user_id);

drop policy if exists "mods_delete_own" on public.mods;
create policy "mods_delete_own"
on public.mods for delete
using (auth.uid() = user_id);
