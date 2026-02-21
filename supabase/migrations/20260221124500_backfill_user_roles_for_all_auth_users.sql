insert into public.user_roles (user_id, user_role)
select u.id, 'user'::public.app_role
from auth.users u
left join public.user_roles ur on ur.user_id = u.id
where ur.user_id is null;

create or replace function public.handle_new_auth_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, user_role)
  values (new.id, 'user'::public.app_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_user_role on auth.users;
create trigger on_auth_user_created_user_role
after insert on auth.users
for each row
execute function public.handle_new_auth_user_role();