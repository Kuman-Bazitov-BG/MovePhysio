alter table public.appointments
add column if not exists attachment_files jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'physiotherapy-appointment-files',
  'physiotherapy-appointment-files',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload own physiotherapy appointment files" on storage.objects;
create policy "Authenticated users can upload own physiotherapy appointment files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'physiotherapy-appointment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated users can update own physiotherapy appointment files" on storage.objects;
create policy "Authenticated users can update own physiotherapy appointment files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'physiotherapy-appointment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'physiotherapy-appointment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated users can delete own physiotherapy appointment files" on storage.objects;
create policy "Authenticated users can delete own physiotherapy appointment files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'physiotherapy-appointment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );