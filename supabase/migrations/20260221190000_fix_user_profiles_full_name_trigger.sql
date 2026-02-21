do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'full_name'
  ) then
    execute $sql$
      update public.user_profiles
      set full_name = coalesce(nullif(trim(full_name), ''), nullif(trim(username), ''), 'User'),
          updated_at = now()
      where full_name is null or trim(full_name) = ''
    $sql$;
  end if;
end
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  resolved_username text;
  resolved_contact text;
  resolved_full_name text;
begin
  resolved_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'user_' || substring(md5(random()::text || clock_timestamp()::text || new.id::text) for 10)
  );

  resolved_contact := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'contact'), ''),
    nullif(trim(new.email), ''),
    nullif(trim(new.phone), ''),
    'contact+' || replace(new.id::text, '-', '') || '@local.invalid'
  );

  resolved_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    resolved_username,
    'User'
  );

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'full_name'
  ) then
    insert into public.user_profiles (user_id, full_name, username, contact)
    values (new.id, resolved_full_name, resolved_username, resolved_contact)
    on conflict (user_id) do update
    set
      full_name = excluded.full_name,
      username = excluded.username,
      contact = excluded.contact,
      updated_at = now();
  else
    insert into public.user_profiles (user_id, username, contact)
    values (new.id, resolved_username, resolved_contact)
    on conflict (user_id) do update
    set
      username = excluded.username,
      contact = excluded.contact,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();