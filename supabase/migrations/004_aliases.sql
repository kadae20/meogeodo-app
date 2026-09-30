-- URL/바코드/쿠팡 SKU → canonical product
create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  kind text not null check (kind in (
    'barcode',
    'coupang_item',
    'coupang_vendor_item',
    'coupang_product',
    'url'
  )),
  value text not null,
  created_at timestamptz default now(),
  unique (kind, value)
);

create index if not exists product_aliases_product_id_idx
  on public.product_aliases (product_id);

alter table public.product_aliases enable row level security;

create policy "product_aliases_select_authenticated" on public.product_aliases
  for select to authenticated using (true);
create policy "product_aliases_insert_authenticated" on public.product_aliases
  for insert to authenticated with check (true);
