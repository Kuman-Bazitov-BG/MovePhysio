alter table public.service_tasks
add column if not exists source_appointment_id uuid references public.appointments(id) on delete set null;

create unique index if not exists service_tasks_source_appointment_id_key
  on public.service_tasks(source_appointment_id)
  where source_appointment_id is not null;

create or replace function public.create_task_for_new_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.service_tasks (
    service,
    title,
    description,
    due_date,
    is_done,
    created_by,
    source_appointment_id
  )
  values (
    new.service,
    format('[Appointment] %s', new.title),
    trim(
      both ' '
      from concat(
        'Calendar appointment at ', to_char(new.appointment_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI'), ' UTC',
        case when new.notes is not null and btrim(new.notes) <> '' then concat(' · Notes: ', new.notes) else '' end
      )
    ),
    null,
    false,
    new.created_by,
    new.id
  );

  return new;
end;
$$;

drop trigger if exists appointments_create_task on public.appointments;
create trigger appointments_create_task
after insert on public.appointments
for each row
execute function public.create_task_for_new_appointment();

insert into public.service_tasks (
  service,
  title,
  description,
  due_date,
  is_done,
  created_by,
  source_appointment_id
)
select
  a.service,
  format('[Appointment] %s', a.title),
  trim(
    both ' '
    from concat(
      'Calendar appointment at ', to_char(a.appointment_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI'), ' UTC',
      case when a.notes is not null and btrim(a.notes) <> '' then concat(' · Notes: ', a.notes) else '' end
    )
  ),
  null,
  false,
  a.created_by,
  a.id
from public.appointments a
where not exists (
  select 1
  from public.service_tasks t
  where t.source_appointment_id = a.id
);
