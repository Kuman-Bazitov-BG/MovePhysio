drop policy if exists "Participants and admins can read chat messages" on public.chat_messages;
create policy "Participants and admins can read chat messages"
  on public.chat_messages
  for select
  to authenticated
  using (
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and (
      public.is_admin()
      or auth.uid() = sender_user_id
      or auth.uid() = recipient_user_id
    )
  );

drop policy if exists "Users and admins can insert chat messages" on public.chat_messages;
create policy "Users and admins can insert chat messages"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and (
      (
        not public.is_admin()
        and recipient_user_id is null
      )
      or (
        public.is_admin()
        and recipient_user_id is not null
        and exists (
          select 1
          from public.user_roles ur
          where ur.user_id = recipient_user_id
            and ur.user_role = 'user'
        )
      )
    )
  );

drop policy if exists "Admins can update chat messages" on public.chat_messages;
create policy "Admins can update chat messages"
  on public.chat_messages
  for update
  to authenticated
  using (
    public.is_admin()
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  )
  with check (
    public.is_admin()
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );
