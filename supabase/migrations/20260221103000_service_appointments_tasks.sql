create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  service text not null check (service in ('physiotherapy', 'pilates')),
  title text not null,
  notes text,
  appointment_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_tasks (
  id uuid primary key default gen_random_uuid(),
  service text not null check (service in ('physiotherapy', 'pilates')),
  title text not null,
  description text,
  due_date date,
  is_done boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments enable row level security;
alter table public.service_tasks enable row level security;

drop policy if exists "Everyone can read appointments" on public.appointments;
create policy "Everyone can read appointments"
  on public.appointments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can create appointments" on public.appointments;
create policy "Authenticated users can create appointments"
  on public.appointments
  for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "Admins can read tasks" on public.service_tasks;
create policy "Admins can read tasks"
  on public.service_tasks
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can create tasks" on public.service_tasks;
create policy "Admins can create tasks"
  on public.service_tasks
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update tasks" on public.service_tasks;
create policy "Admins can update tasks"
  on public.service_tasks
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete tasks" on public.service_tasks;
create policy "Admins can delete tasks"
  on public.service_tasks
  for delete
  to authenticated
  using (public.is_admin());