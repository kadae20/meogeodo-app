-- P2: barcode + household sharing
-- SQL Editor에서 실행

alter table public.products
  add column if not exists barcode text;

create unique index if not exists products_barcode_uidx
  on public.products (barcode)
  where barcode is not null;

-- ============================================================
-- households
-- ============================================================
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리 집',
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_id_idx
  on public.household_members (user_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create or replace function public.my_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.household_members where user_id = auth.uid();
$$;

create or replace function public.same_household(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members a
    join public.household_members b on a.household_id = b.household_id
    where a.user_id = owner and b.user_id = auth.uid()
  );
$$;

create or replace function public.create_household(house_name text default '우리 집')
returns table (id uuid, invite_code text, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  code text;
begin
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception '이미 가구에 속해 있습니다.';
  end if;
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.households (name, invite_code, created_by)
  values (coalesce(nullif(trim(house_name), ''), '우리 집'), code, auth.uid())
  returning households.id into hid;
  insert into public.household_members (household_id, user_id, role)
  values (hid, auth.uid(), 'owner');
  return query select hid, code, coalesce(nullif(trim(house_name), ''), '우리 집');
end;
$$;

create or replace function public.join_household(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception '이미 가구에 속해 있습니다.';
  end if;
  select h.id into hid
  from public.households h
  where h.invite_code = upper(trim(code));
  if hid is null then
    raise exception '초대 코드를 찾을 수 없습니다.';
  end if;
  insert into public.household_members (household_id, user_id, role)
  values (hid, auth.uid(), 'member');
  return hid;
end;
$$;

create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  leftover int;
begin
  select household_id into hid
  from public.household_members
  where user_id = auth.uid();
  if hid is null then
    return;
  end if;
  delete from public.household_members where user_id = auth.uid();
  select count(*) into leftover from public.household_members where household_id = hid;
  if leftover = 0 then
    delete from public.households where id = hid;
  end if;
end;
$$;

grant execute on function public.my_household_ids() to authenticated;
grant execute on function public.same_household(uuid) to authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.leave_household() to authenticated;

drop policy if exists "households_select_member" on public.households;
create policy "households_select_member" on public.households
  for select using (id in (select public.my_household_ids()));

drop policy if exists "household_members_select" on public.household_members;
create policy "household_members_select" on public.household_members
  for select using (household_id in (select public.my_household_ids()));

-- 가구 구성원은 서로의 프로필·기준·검수·화이트리스트를 볼 수 있음 (수정은 본인만)
drop policy if exists "family_profiles_select_own" on public.family_profiles;
create policy "family_profiles_select_own" on public.family_profiles
  for select using (auth.uid() = user_id or public.same_household(user_id));

drop policy if exists "profile_rules_select_own" on public.profile_rules;
create policy "profile_rules_select_own" on public.profile_rules
  for select using (auth.uid() = user_id or public.same_household(user_id));

drop policy if exists "inspections_select_own" on public.inspections;
create policy "inspections_select_own" on public.inspections
  for select using (auth.uid() = user_id or public.same_household(user_id));

drop policy if exists "inspection_products_select_own" on public.inspection_products;
create policy "inspection_products_select_own" on public.inspection_products
  for select using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id
        and (i.user_id = auth.uid() or public.same_household(i.user_id))
    )
  );

drop policy if exists "inspection_results_select_own" on public.inspection_results;
create policy "inspection_results_select_own" on public.inspection_results
  for select using (auth.uid() = user_id or public.same_household(user_id));

drop policy if exists "whitelist_items_select_own" on public.whitelist_items;
create policy "whitelist_items_select_own" on public.whitelist_items
  for select using (auth.uid() = user_id or public.same_household(user_id));
