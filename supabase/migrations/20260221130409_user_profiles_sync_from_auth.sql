create or replace function public.sync_user_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.user_profiles (user_id, username, contact)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      'user_' || substring(md5(random()::text || clock_timestamp()::text || new.id::text) for 10)
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'contact'), ''),
      nullif(trim(new.email), ''),
      nullif(trim(new.phone), ''),
      'contact+' || replace(new.id::text, '-', '') || '@local.invalid'
    )
  )
  on conflict (user_id) do update
  set
    username = excluded.username,
    contact = excluded.contact,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.sync_user_profile_from_auth();
