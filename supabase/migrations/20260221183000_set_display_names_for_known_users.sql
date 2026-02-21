do $$
begin
  -- Keep Auth metadata in sync
  update auth.users
  set raw_user_meta_data = jsonb_set(
    jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{username}', to_jsonb(v.display_name), true),
    '{full_name}', to_jsonb(v.display_name), true
  )
  from (
    values
      ('kiki@abv.bg'::text, 'Kiki'::text),
      ('kumanbazitov@gmail.com'::text, 'Kuman'::text),
      ('maria@abv.bg'::text, 'Maria'::text)
  ) as v(email, display_name)
  where auth.users.email = v.email;

  -- Sync user_profiles.username
  update public.user_profiles p
  set username = v.display_name,
      updated_at = now()
  from auth.users u,
       (
         values
           ('kiki@abv.bg'::text, 'Kiki'::text),
           ('kumanbazitov@gmail.com'::text, 'Kuman'::text),
           ('maria@abv.bg'::text, 'Maria'::text)
       ) as v(email, display_name)
  where p.user_id = u.id
    and u.email = v.email;

  -- If full_name column exists, sync it too
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'full_name'
  ) then
    execute $sql$
      update public.user_profiles p
      set full_name = v.display_name,
          updated_at = now()
      from auth.users u,
           (
             values
               ('kiki@abv.bg'::text, 'Kiki'::text),
               ('kumanbazitov@gmail.com'::text, 'Kuman'::text),
               ('maria@abv.bg'::text, 'Maria'::text)
           ) as v(email, display_name)
      where p.user_id = u.id
        and u.email = v.email
    $sql$;
  end if;
end
$$;