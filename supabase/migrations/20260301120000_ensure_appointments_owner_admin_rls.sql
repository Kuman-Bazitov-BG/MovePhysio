alter table public.appointments enable row level security;

drop policy if exists "Owners can update appointments" on public.appointments;
create policy "Owners can update appointments"
  on public.appointments
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "Owners can delete appointments" on public.appointments;
create policy "Owners can delete appointments"
  on public.appointments
  for delete
  to authenticated
  using (auth.uid() = created_by);

drop policy if exists "Admins can update appointments" on public.appointments;
create policy "Admins can update appointments"
  on public.appointments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete appointments" on public.appointments;
create policy "Admins can delete appointments"
  on public.appointments
  for delete
  to authenticated
  using (public.is_admin());
