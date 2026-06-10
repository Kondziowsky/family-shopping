-- Family Shopping MVP schema for Supabase
-- Run this file in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete set null,
  invite_code text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  quantity text,
  note text,
  is_done boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shopping_items_touch_updated_at on public.shopping_items;
create trigger shopping_items_touch_updated_at
before update on public.shopping_items
for each row execute function public.touch_updated_at();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.shopping_items enable row level security;

-- Basic authenticated read policies. Guests use RPC functions below.
drop policy if exists "members can read groups" on public.groups;
create policy "members can read groups" on public.groups
for select to authenticated
using (exists (select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid()));

drop policy if exists "members can read memberships" on public.group_members;
create policy "members can read memberships" on public.group_members
for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid()));

drop policy if exists "members can read items" on public.shopping_items;
create policy "members can read items" on public.shopping_items
for select to authenticated
using (exists (select 1 from public.group_members gm where gm.group_id = shopping_items.group_id and gm.user_id = auth.uid()));

-- RPC: owner creates group. SECURITY DEFINER is used so inserts work with RLS enabled.
create or replace function public.create_group_for_current_user(group_name text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  insert into public.groups(name, owner_id)
  values (coalesce(nullif(trim(group_name), ''), 'Rodzinka'), auth.uid())
  returning * into new_group;

  insert into public.group_members(group_id, user_id, role)
  values (new_group.id, auth.uid(), 'owner');

  return new_group;
end;
$$;

create or replace function public.get_my_groups()
returns setof public.groups
language sql
security definer
set search_path = public
as $$
  select g.*
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where gm.user_id = auth.uid()
  order by g.created_at desc;
$$;

-- Invite-based guest functions. Anyone with the invite code can use the group's list.
-- This is intentional for MVP family sharing. Rotate invite_code later if a link leaks.
create or replace function public.get_group_by_invite(invite text)
returns table(id uuid, name text, invite_code text)
language sql
security definer
set search_path = public
as $$
  select g.id, g.name, g.invite_code
  from public.groups g
  where g.invite_code = invite
  limit 1;
$$;

create or replace function public.list_items_for_invite(invite text)
returns setof public.shopping_items
language sql
security definer
set search_path = public
as $$
  select si.*
  from public.shopping_items si
  join public.groups g on g.id = si.group_id
  where g.invite_code = invite
  order by si.is_done asc, si.created_at desc;
$$;

create or replace function public.add_item_for_invite(invite text, item_name text, item_quantity text default null, item_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
  new_id uuid;
begin
  select id into gid from public.groups where invite_code = invite;
  if gid is null then raise exception 'Invalid invite code'; end if;
  if nullif(trim(item_name), '') is null then raise exception 'Item name required'; end if;

  insert into public.shopping_items(group_id, name, quantity, note, created_by)
  values (gid, trim(item_name), nullif(trim(coalesce(item_quantity, '')), ''), nullif(trim(coalesce(item_note, '')), ''), auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.update_item_for_invite(invite text, item_id uuid, item_name text default null, item_quantity text default null, item_note text default null, item_is_done boolean default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  select id into gid from public.groups where invite_code = invite;
  if gid is null then raise exception 'Invalid invite code'; end if;

  update public.shopping_items
  set
    name = coalesce(nullif(trim(coalesce(item_name, '')), ''), name),
    quantity = case when item_quantity is null then quantity else nullif(trim(item_quantity), '') end,
    note = case when item_note is null then note else nullif(trim(item_note), '') end,
    is_done = coalesce(item_is_done, is_done)
  where id = item_id and group_id = gid;
end;
$$;

create or replace function public.delete_item_for_invite(invite text, item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  select id into gid from public.groups where invite_code = invite;
  if gid is null then raise exception 'Invalid invite code'; end if;
  delete from public.shopping_items where id = item_id and group_id = gid;
end;
$$;

grant execute on function public.create_group_for_current_user(text) to authenticated;
grant execute on function public.get_my_groups() to authenticated;
grant execute on function public.get_group_by_invite(text) to anon, authenticated;
grant execute on function public.list_items_for_invite(text) to anon, authenticated;
grant execute on function public.add_item_for_invite(text, text, text, text) to anon, authenticated;
grant execute on function public.update_item_for_invite(text, uuid, text, text, text, boolean) to anon, authenticated;
grant execute on function public.delete_item_for_invite(text, uuid) to anon, authenticated;

-- Realtime: after creating tables, also enable Realtime in Dashboard:
-- Database > Replication > publication supabase_realtime > enable shopping_items.
