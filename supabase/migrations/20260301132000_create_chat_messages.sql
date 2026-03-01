create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  sender_contact text not null check (char_length(trim(sender_contact)) between 1 and 320),
  body text not null check (char_length(trim(body)) between 1 and 1200),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at desc);

create index if not exists chat_messages_sender_created_idx
  on public.chat_messages (sender_user_id, created_at desc);

create index if not exists chat_messages_recipient_created_idx
  on public.chat_messages (recipient_user_id, created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "Participants and admins can read chat messages" on public.chat_messages;
create policy "Participants and admins can read chat messages"
  on public.chat_messages
  for select
  to authenticated
  using (
    public.is_admin()
    or auth.uid() = sender_user_id
    or auth.uid() = recipient_user_id
  );

drop policy if exists "Users and admins can insert chat messages" on public.chat_messages;
create policy "Users and admins can insert chat messages"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_user_id
    and (
      (not public.is_admin() and recipient_user_id is null)
      or (public.is_admin() and recipient_user_id is not null)
    )
  );

drop policy if exists "Admins can update chat messages" on public.chat_messages;
create policy "Admins can update chat messages"
  on public.chat_messages
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on table public.chat_messages to authenticated;
grant usage, select on sequence public.chat_messages_id_seq to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then
    null;
end;
$$;
