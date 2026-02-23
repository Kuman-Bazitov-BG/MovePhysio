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
  pilates_time text;
begin
  select *
  into cfg
  from public.appointment_configurations
  where service = new.service;

  if not found then
    return new;
  end if;

  local_ts := new.appointment_at at time zone 'Europe/Sofia';
  minute_part := extract(minute from local_ts)::integer;
  hour_part := extract(hour from local_ts)::integer;

  if new.service = 'pilates' then
    if extract(isodow from local_ts)::integer not in (1, 2, 4, 5) then
      raise exception 'Pilates appointments are available only on Monday, Tuesday, Thursday and Friday';
    end if;

    pilates_time := to_char(local_ts, 'HH24:MI');
    if pilates_time not in (
      '07:15', '08:15', '09:15', '09:30', '10:15', '10:30',
      '12:00', '13:00', '15:40', '16:40', '17:40', '18:40'
    ) then
      raise exception 'Pilates appointment time must match the fixed class schedule';
    end if;
  else
    if not cfg.allow_weekends and extract(isodow from local_ts) in (6, 7) then
      raise exception 'Weekend appointments are disabled for %', new.service;
    end if;

    if hour_part < cfg.work_start_hour or hour_part >= cfg.work_end_hour then
      raise exception 'Appointment time must be between %:00 and %:00', cfg.work_start_hour, cfg.work_end_hour;
    end if;

    if (hour_part * 60 + minute_part) % cfg.slot_minutes <> 0 then
      raise exception 'Appointment must align to % minute slot boundaries', cfg.slot_minutes;
    end if;
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
