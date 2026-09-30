-- 먹어도될까 MVP — initial schema + RLS
-- Supabase SQL Editor 또는 supabase db push로 실행

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. user_profiles
-- ============================================================
create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. family_profiles
-- ============================================================
create table public.family_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  profile_type text not null check (profile_type in ('child','adult','dog','cat','other')),
  relation_label text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index family_profiles_user_id_idx on public.family_profiles(user_id);

create trigger family_profiles_updated_at
  before update on public.family_profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. profile_rules
-- ============================================================
create table public.profile_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  rule_type text not null check (rule_type in ('check_allergen','avoid_ingredient','check_additive','check_nutrient','check_origin','info_required')),
  target text not null,
  target_label text,
  operator text check (operator in ('<=','>=','contains','not_contains','exists')),
  threshold_value numeric,
  unit text,
  severity text default 'medium' check (severity in ('low','medium','high')),
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index profile_rules_profile_id_idx on public.profile_rules(profile_id);
create index profile_rules_user_id_idx on public.profile_rules(user_id);

create trigger profile_rules_updated_at
  before update on public.profile_rules
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. products
-- ============================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  country_code text default 'KR',
  retailer text,
  product_url text,
  product_name text not null,
  brand_name text,
  category text,
  image_url text,
  current_normalized_label_id uuid,
  last_scanned_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. normalized_labels
-- ============================================================
create table public.normalized_labels (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  country_code text default 'KR',
  language text default 'ko',
  raw_ingredients_text text,
  raw_nutrition_text text,
  raw_allergen_text text,
  raw_origin_text text,
  nutrition_json jsonb default '{}'::jsonb,
  ingredients_json jsonb default '[]'::jsonb,
  allergens_json jsonb default '[]'::jsonb,
  origins_json jsonb default '[]'::jsonb,
  label_quality_json jsonb default '{}'::jsonb,
  confidence_score numeric default 0,
  created_at timestamptz default now()
);

create index normalized_labels_product_id_idx on public.normalized_labels(product_id);

-- ============================================================
-- 6. inspections
-- ============================================================
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  inspection_type text not null check (inspection_type in ('single_product','cart_manual')),
  title text,
  total_products int default 0,
  summary_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index inspections_user_id_idx on public.inspections(user_id);
create index inspections_created_at_idx on public.inspections(created_at desc);

-- ============================================================
-- 7. inspection_products
-- ============================================================
create table public.inspection_products (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  normalized_label_id uuid references public.normalized_labels(id) on delete set null,
  created_at timestamptz default now()
);

create index inspection_products_inspection_id_idx on public.inspection_products(inspection_id);

-- ============================================================
-- 8. inspection_results
-- ============================================================
create table public.inspection_results (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  inspection_product_id uuid not null references public.inspection_products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  profile_id uuid references public.family_profiles(id) on delete set null,
  status text not null check (status in ('내 기준 통과','확인 필요','내 기준과 충돌','정보 부족')),
  matched_rules_json jsonb default '[]'::jsonb,
  warning_rules_json jsonb default '[]'::jsonb,
  conflict_rules_json jsonb default '[]'::jsonb,
  missing_info_json jsonb default '[]'::jsonb,
  explanation text,
  confidence_score numeric default 0,
  created_at timestamptz default now()
);

create index inspection_results_inspection_id_idx on public.inspection_results(inspection_id);
create index inspection_results_user_id_idx on public.inspection_results(user_id);
create index inspection_results_profile_id_idx on public.inspection_results(profile_id);

-- ============================================================
-- 9. whitelist_items
-- ============================================================
create table public.whitelist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.family_profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  note text,
  created_at timestamptz default now(),
  unique (profile_id, product_id)
);

create index whitelist_items_user_id_idx on public.whitelist_items(user_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.user_profiles enable row level security;
alter table public.family_profiles enable row level security;
alter table public.profile_rules enable row level security;
alter table public.products enable row level security;
alter table public.normalized_labels enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_products enable row level security;
alter table public.inspection_results enable row level security;
alter table public.whitelist_items enable row level security;

-- user_profiles: 본인 것만
create policy "user_profiles_select_own" on public.user_profiles
  for select using (auth.uid() = user_id);
create policy "user_profiles_insert_own" on public.user_profiles
  for insert with check (auth.uid() = user_id);
create policy "user_profiles_update_own" on public.user_profiles
  for update using (auth.uid() = user_id);
create policy "user_profiles_delete_own" on public.user_profiles
  for delete using (auth.uid() = user_id);

-- family_profiles: 본인 것만
create policy "family_profiles_select_own" on public.family_profiles
  for select using (auth.uid() = user_id);
create policy "family_profiles_insert_own" on public.family_profiles
  for insert with check (auth.uid() = user_id);
create policy "family_profiles_update_own" on public.family_profiles
  for update using (auth.uid() = user_id);
create policy "family_profiles_delete_own" on public.family_profiles
  for delete using (auth.uid() = user_id);

-- profile_rules: 본인 것만
create policy "profile_rules_select_own" on public.profile_rules
  for select using (auth.uid() = user_id);
create policy "profile_rules_insert_own" on public.profile_rules
  for insert with check (auth.uid() = user_id);
create policy "profile_rules_update_own" on public.profile_rules
  for update using (auth.uid() = user_id);
create policy "profile_rules_delete_own" on public.profile_rules
  for delete using (auth.uid() = user_id);

-- products: authenticated 사용자 select/insert/update 가능, delete 불가
create policy "products_select_authenticated" on public.products
  for select to authenticated using (true);
create policy "products_insert_authenticated" on public.products
  for insert to authenticated with check (true);
create policy "products_update_authenticated" on public.products
  for update to authenticated using (true);

-- normalized_labels: authenticated select/insert 가능
create policy "normalized_labels_select_authenticated" on public.normalized_labels
  for select to authenticated using (true);
create policy "normalized_labels_insert_authenticated" on public.normalized_labels
  for insert to authenticated with check (true);

-- inspections: 본인 것만
create policy "inspections_select_own" on public.inspections
  for select using (auth.uid() = user_id);
create policy "inspections_insert_own" on public.inspections
  for insert with check (auth.uid() = user_id);
create policy "inspections_update_own" on public.inspections
  for update using (auth.uid() = user_id);
create policy "inspections_delete_own" on public.inspections
  for delete using (auth.uid() = user_id);

-- inspection_products: 소유한 inspection에 속한 것만
create policy "inspection_products_select_own" on public.inspection_products
  for select using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id and i.user_id = auth.uid()
    )
  );
create policy "inspection_products_insert_own" on public.inspection_products
  for insert with check (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id and i.user_id = auth.uid()
    )
  );
create policy "inspection_products_delete_own" on public.inspection_products
  for delete using (
    exists (
      select 1 from public.inspections i
      where i.id = inspection_id and i.user_id = auth.uid()
    )
  );

-- inspection_results: 본인 것만
create policy "inspection_results_select_own" on public.inspection_results
  for select using (auth.uid() = user_id);
create policy "inspection_results_insert_own" on public.inspection_results
  for insert with check (auth.uid() = user_id);
create policy "inspection_results_delete_own" on public.inspection_results
  for delete using (auth.uid() = user_id);

-- whitelist_items: 본인 것만
create policy "whitelist_items_select_own" on public.whitelist_items
  for select using (auth.uid() = user_id);
create policy "whitelist_items_insert_own" on public.whitelist_items
  for insert with check (auth.uid() = user_id);
create policy "whitelist_items_update_own" on public.whitelist_items
  for update using (auth.uid() = user_id);
create policy "whitelist_items_delete_own" on public.whitelist_items
  for delete using (auth.uid() = user_id);
