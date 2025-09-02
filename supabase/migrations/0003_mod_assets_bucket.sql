-- Create bucket only if missing (use direct insert for compatibility)
insert into storage.buckets (id, name, public)
values ('mod-assets', 'mod-assets', false)
on conflict (id) do nothing;

-- Storage policies limited to user-owned prefix for mod-assets only
drop policy if exists "mod_assets_select_own" on storage.objects;
create policy "mod_assets_select_own" on storage.objects
  for select using (
    bucket_id = 'mod-assets'
    and (auth.uid()::text = split_part(name, '/', 1))
  );

drop policy if exists "mod_assets_insert_own" on storage.objects;
create policy "mod_assets_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'mod-assets'
    and (auth.uid()::text = split_part(name, '/', 1))
  );

drop policy if exists "mod_assets_delete_own" on storage.objects;
create policy "mod_assets_delete_own" on storage.objects
  for delete using (
    bucket_id = 'mod-assets'
    and (auth.uid()::text = split_part(name, '/', 1))
  );

-- Table for meta of overlay assets
create table if not exists public.mod_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  name text not null,
  prompt text not null,
  image_path text not null,
  width int,
  height int,
  created_at timestamptz not null default now()
);

alter table public.mod_assets enable row level security;

drop policy if exists "mod_assets_select_rls" on public.mod_assets;
create policy "mod_assets_select_rls" on public.mod_assets
  for select using (auth.uid() = user_id);

drop policy if exists "mod_assets_insert_rls" on public.mod_assets;
create policy "mod_assets_insert_rls" on public.mod_assets
  for insert with check (auth.uid() = user_id);

drop policy if exists "mod_assets_delete_rls" on public.mod_assets;
create policy "mod_assets_delete_rls" on public.mod_assets
  for delete using (auth.uid() = user_id);

create index if not exists mod_assets_user_id_idx on public.mod_assets(user_id);
create index if not exists mod_assets_user_category_idx on public.mod_assets(user_id, category);
