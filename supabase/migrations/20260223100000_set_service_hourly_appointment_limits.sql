insert into public.appointment_configurations (service, max_appointments_per_slot)
values
  ('physiotherapy', 1),
  ('pilates', 3)
on conflict (service)
do update
set
  max_appointments_per_slot = excluded.max_appointments_per_slot,
  updated_at = now();
