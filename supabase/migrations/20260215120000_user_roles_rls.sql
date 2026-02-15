do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin');
  end if;
end $$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "Everyone can read user_roles" on public.user_roles;
create policy "Everyone can read user_roles"
  on public.user_roles
  for select
  using (true);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.user_role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

drop policy if exists "Admins can insert user_roles" on public.user_roles;
create policy "Admins can insert user_roles"
  on public.user_roles
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update user_roles" on public.user_roles;
create policy "Admins can update user_roles"
  on public.user_roles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete user_roles" on public.user_roles;
create policy "Admins can delete user_roles"
  on public.user_roles
  for delete
  to authenticated
  using (public.is_admin());

create or replace function public.is_owner_or_admin(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = owner_id or public.is_admin();
$$;

revoke all on function public.is_owner_or_admin(uuid) from public;
grant execute on function public.is_owner_or_admin(uuid) to authenticated, anon;

do $$
declare
  table_name text;
begin
  for table_name in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'owner_id'
      and c.udt_name = 'uuid'
      and c.table_name <> 'user_roles'
  loop
    execute format('alter table public.%I enable row level security', table_name);

    execute format('drop policy if exists "Owners and admins can insert" on public.%I', table_name);
    execute format(
      'create policy "Owners and admins can insert" on public.%I for insert to authenticated with check (public.is_owner_or_admin(owner_id))',
      table_name
    );

    execute format('drop policy if exists "Owners and admins can update" on public.%I', table_name);
    execute format(
      'create policy "Owners and admins can update" on public.%I for update to authenticated using (public.is_owner_or_admin(owner_id)) with check (public.is_owner_or_admin(owner_id))',
      table_name
    );

    execute format('drop policy if exists "Owners and admins can delete" on public.%I', table_name);
    execute format(
      'create policy "Owners and admins can delete" on public.%I for delete to authenticated using (public.is_owner_or_admin(owner_id))',
      table_name
    );
  end loop;
end $$;
