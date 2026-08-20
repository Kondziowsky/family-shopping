-- Patch: real multi-group membership + group deletion
-- Run this in Supabase Dashboard > SQL Editor (safe to run on the existing DB).
-- Also folded into schema.sql for fresh installs.

-- 1) Joining an invite link must create a real membership row, otherwise the
--    invited user never shows up in get_my_groups() and can only ever "be in"
--    the single invite code stored in their browser.
create or replace function public.join_group_by_invite(invite text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groups;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select * into g from public.groups where invite_code = invite;
  if g.id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.group_members(group_id, user_id, role)
  values (g.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return g;
end;
$$;

-- 2) get_my_groups now also returns the caller's role, so the UI can show the
--    "Usuń" (delete) button only to the owner. Return type changes, so drop first.
drop function if exists public.get_my_groups();
create or replace function public.get_my_groups()
returns table(id uuid, name text, invite_code text, role text)
language sql
security definer
set search_path = public
as $$
  select g.id, g.name, g.invite_code, gm.role
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where gm.user_id = auth.uid()
  order by g.created_at desc;
$$;

-- 3) Owner-only group deletion. Cascades remove group_members + shopping_items,
--    so every joined user loses their connection.
create or replace function public.delete_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  if not exists (
    select 1 from public.groups
    where id = target_group_id and owner_id = auth.uid()
  ) then
    raise exception 'Only the group owner can delete the group';
  end if;

  delete from public.groups where id = target_group_id;
end;
$$;

grant execute on function public.join_group_by_invite(text) to authenticated;
grant execute on function public.get_my_groups() to authenticated;
grant execute on function public.delete_group(uuid) to authenticated;
