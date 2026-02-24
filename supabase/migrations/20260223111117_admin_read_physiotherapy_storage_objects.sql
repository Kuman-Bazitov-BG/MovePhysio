drop policy if exists "Admins can read physiotherapy appointment file objects" on storage.objects;
create policy "Admins can read physiotherapy appointment file objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'physiotherapy-appointment-files'
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.user_role = 'admin'
    )
  );
