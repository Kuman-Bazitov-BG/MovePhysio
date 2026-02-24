create table if not exists public.appointment_configurations (
  service text primary key check (service in ('physiotherapy', 'pilates')),
  slot_minutes integer not null default 60 check (slot_minutes in (15, 30, 45, 60, 90, 120)),
  work_start_hour integer not null default 8 check (work_start_hour between 0 and 23),
  work_end_hour integer not null default 20 check (work_end_hour between 1 and 24),
  allow_weekends boolean not null default false,
  max_appointments_per_slot integer not null default 1 check (max_appointments_per_slot between 1 and 20),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint appointment_hours_valid check (work_start_hour < work_end_hour)
);

insert into public.appointment_configurations (service)
values ('physiotherapy'), ('pilates')
on conflict (service) do nothing;

alter table public.appointment_configurations enable row level security;

drop policy if exists "Everyone can read appointment configurations" on public.appointment_configurations;
create policy "Everyone can read appointment configurations"
  on public.appointment_configurations
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert appointment configurations" on public.appointment_configurations;
create policy "Admins can insert appointment configurations"
  on public.appointment_configurations
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update appointment configurations" on public.appointment_configurations;
create policy "Admins can update appointment configurations"
  on public.appointment_configurations
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete appointment configurations" on public.appointment_configurations;
create policy "Admins can delete appointment configurations"
  on public.appointment_configurations
  for delete
  to authenticated
  using (public.is_admin());

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

create or replace function public.enforce_appointment_configuration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.appointment_configurations%rowtype;
  local_ts timestamp;
  minute_part integer;
  hour_part integer;
  existing_count integer;
begin
  select *
  into cfg
  from public.appointment_configurations
  where service = new.service;

  if not found then
    return new;
  end if;

  local_ts := new.appointment_at at time zone 'UTC';
  minute_part := extract(minute from local_ts)::integer;
  hour_part := extract(hour from local_ts)::integer;

  if not cfg.allow_weekends and extract(isodow from local_ts) in (6, 7) then
    raise exception 'Weekend appointments are disabled for %', new.service;
  end if;

  if hour_part < cfg.work_start_hour or hour_part >= cfg.work_end_hour then
    raise exception 'Appointment time must be between %:00 and %:00', cfg.work_start_hour, cfg.work_end_hour;
  end if;

  if (hour_part * 60 + minute_part) % cfg.slot_minutes <> 0 then
    raise exception 'Appointment must align to % minute slot boundaries', cfg.slot_minutes;
  end if;

  select count(*)
  into existing_count
  from public.appointments a
  where a.service = new.service
    and a.appointment_at = new.appointment_at
    and a.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if existing_count >= cfg.max_appointments_per_slot then
    raise exception 'Max appointments reached for this slot';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_enforce_configuration on public.appointments;
create trigger appointments_enforce_configuration
before insert or update on public.appointments
for each row
execute function public.enforce_appointment_configuration();