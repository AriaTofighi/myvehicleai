-- Storage bucket + policies for mods images

-- Use direct insert for broad compatibility across Storage versions
insert into storage.buckets (id, name, public)
values ('mods', 'mods', false)
on conflict (id) do nothing;

-- Policies on storage.objects (recreate safely)
drop policy if exists "mods_bucket_read" on storage.objects;
create policy "mods_bucket_read"
on storage.objects for select
using (bucket_id = 'mods');

drop policy if exists "mods_bucket_insert_own_path" on storage.objects;
create policy "mods_bucket_insert_own_path"
on storage.objects for insert
with check (
  bucket_id = 'mods'
  and (auth.uid())::text = split_part(name, '/', 1)
);

drop policy if exists "mods_bucket_delete_own" on storage.objects;
create policy "mods_bucket_delete_own"
on storage.objects for delete
using (
  bucket_id = 'mods'
  and (auth.uid())::text = split_part(name, '/', 1)
);
