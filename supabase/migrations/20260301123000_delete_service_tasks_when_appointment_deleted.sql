create or replace function public.delete_tasks_for_removed_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.service_tasks
  where source_appointment_id = old.id;

  return old;
end;
$$;

drop trigger if exists appointments_delete_related_tasks on public.appointments;
create trigger appointments_delete_related_tasks
before delete on public.appointments
for each row
execute function public.delete_tasks_for_removed_appointment();
