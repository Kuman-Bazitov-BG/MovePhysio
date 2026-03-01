insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'movephysio-media',
  'movephysio-media',
  true,
  209715200,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read MovePhysio media objects" on storage.objects;
create policy "Public can read MovePhysio media objects"
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'movephysio-media'
  );

drop policy if exists "Admins can upload MovePhysio media objects" on storage.objects;
create policy "Admins can upload MovePhysio media objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'movephysio-media'
    and (storage.foldername(name))[1] in ('Pictures', 'Videos')
    and (storage.foldername(name))[2] in ('Pilates', 'Physiotherapy', 'Movephysio')
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.user_role = 'admin'
    )
  );

drop policy if exists "Admins can update MovePhysio media objects" on storage.objects;
create policy "Admins can update MovePhysio media objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'movephysio-media'
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.user_role = 'admin'
    )
  )
  with check (
    bucket_id = 'movephysio-media'
    and (storage.foldername(name))[1] in ('Pictures', 'Videos')
    and (storage.foldername(name))[2] in ('Pilates', 'Physiotherapy', 'Movephysio')
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.user_role = 'admin'
    )
  );

drop policy if exists "Admins can delete MovePhysio media objects" on storage.objects;
create policy "Admins can delete MovePhysio media objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'movephysio-media'
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.user_role = 'admin'
    )
  );
