-- Remove legacy 'mods' storage bucket and policies safely

-- Drop policies created in 0002 for the 'mods' bucket
drop policy if exists "mods_bucket_read" on storage.objects;
drop policy if exists "mods_bucket_insert_own_path" on storage.objects;
drop policy if exists "mods_bucket_delete_own" on storage.objects;

-- Ensure the bucket is empty before deletion to prevent data loss
do $$
declare
  cnt bigint;
begin
  select count(*) into cnt from storage.objects where bucket_id = 'mods';
  if cnt > 0 then
    raise exception 'Cannot drop bucket mods: % objects still present', cnt;
  end if;
end $$;

-- Remove the bucket row if present
delete from storage.buckets where id = 'mods';

