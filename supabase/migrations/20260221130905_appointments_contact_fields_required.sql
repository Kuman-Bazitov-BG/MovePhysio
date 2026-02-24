alter table public.appointments
  add column if not exists name text,
  add column if not exists telephone text,
  add column if not exists email text;

update public.appointments
set
  name = coalesce(nullif(trim(name), ''), title, 'Client'),
  telephone = coalesce(nullif(trim(telephone), ''), 'N/A')
where name is null
   or trim(name) = ''
   or telephone is null
   or trim(telephone) = '';

alter table public.appointments
  alter column name set not null,
  alter column telephone set not null;

create unique index if not exists appointments_email_key
  on public.appointments (lower(email))
  where email is not null and trim(email) <> '';

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
