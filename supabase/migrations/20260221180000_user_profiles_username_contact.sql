create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles
  add column if not exists username text,
  add column if not exists contact text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

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
      set username = nullif(trim(full_name), '')
      where (username is null or trim(username) = '')
        and full_name is not null
    $sql$;
  end if;
end
$$;

update public.user_profiles p
set username = coalesce(
  nullif(trim(p.username), ''),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'username'), ''), nullif(trim(u.raw_user_meta_data ->> 'full_name'), '')),
  'user_' || substring(md5(random()::text || clock_timestamp()::text || p.user_id::text) for 10)
)
from auth.users u
where u.id = p.user_id;

update public.user_profiles p
set contact = coalesce(
  nullif(trim(p.contact), ''),
  nullif(trim(u.raw_user_meta_data ->> 'contact'), ''),
  nullif(trim(u.email), ''),
  nullif(trim(u.phone), ''),
  'contact+' || replace(p.user_id::text, '-', '') || '@local.invalid'
)
from auth.users u
where u.id = p.user_id;

insert into public.user_profiles (user_id, username, contact)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'username'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    'user_' || substring(md5(random()::text || clock_timestamp()::text || u.id::text) for 10)
  ) as username,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'contact'), ''),
    nullif(trim(u.email), ''),
    nullif(trim(u.phone), ''),
    'contact+' || replace(u.id::text, '-', '') || '@local.invalid'
  ) as contact
from auth.users u
where not exists (
  select 1
  from public.user_profiles p
  where p.user_id = u.id
);

alter table public.user_profiles
  alter column username set not null,
  alter column contact set not null;

create unique index if not exists user_profiles_contact_key
  on public.user_profiles (lower(contact));

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  resolved_username text;
  resolved_contact text;
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

  insert into public.user_profiles (user_id, username, contact)
  values (new.id, resolved_username, resolved_contact)
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
  for each row execute procedure public.handle_new_user_profile();
