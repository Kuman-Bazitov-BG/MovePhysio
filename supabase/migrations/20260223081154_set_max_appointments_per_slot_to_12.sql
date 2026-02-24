update public.appointment_configurations
set
  max_appointments_per_slot = 12,
  updated_at = now();
