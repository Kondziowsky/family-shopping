-- Patch: persist manual item ordering for drag & drop.
-- Run this in Supabase Dashboard > SQL Editor. Folded into schema.sql too.

-- 1) Ordering column. Null = "new item, not yet placed" -> sorts to the top.
alter table public.shopping_items add column if not exists sort_order integer;

-- 2) Order by the saved position; done items still sink to the bottom, and
--    freshly added (null) items appear on top like before.
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
  order by si.is_done asc, si.sort_order asc nulls first, si.created_at desc;
$$;

-- 3) Persist a new order: item_ids is the full list in display order.
create or replace function public.reorder_items_for_invite(invite text, item_ids uuid[])
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

  update public.shopping_items si
  set sort_order = arr.ord
  from unnest(item_ids) with ordinality as arr(item_id, ord)
  where si.id = arr.item_id and si.group_id = gid;
end;
$$;

grant execute on function public.reorder_items_for_invite(text, uuid[]) to anon, authenticated;
