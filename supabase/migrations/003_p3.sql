-- P3: 검수 결과 공개 공유 토큰
alter table public.inspections
  add column if not exists share_token text unique;

create or replace function public.enable_inspection_share(insp_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  token text;
  owner uuid;
begin
  select user_id, share_token into owner, token
  from public.inspections
  where id = insp_id;
  if owner is null then
    raise exception '검수를 찾을 수 없습니다.';
  end if;
  if owner <> auth.uid() and not public.same_household(owner) then
    raise exception '이 검수를 공유할 권한이 없습니다.';
  end if;
  if token is not null then
    return token;
  end if;
  token := replace(gen_random_uuid()::text, '-', '');
  update public.inspections set share_token = token where id = insp_id;
  return token;
end;
$$;

create or replace function public.get_shared_inspection(token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'title', i.title,
    'created_at', i.created_at,
    'summary', i.summary_json,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'product_name', coalesce(p.product_name, '상품'),
        'profile_name', coalesce(fp.name, '프로필'),
        'status', r.status,
        'explanation', r.explanation
      )), '[]'::jsonb)
      from public.inspection_results r
      left join public.products p on p.id = r.product_id
      left join public.family_profiles fp on fp.id = r.profile_id
      where r.inspection_id = i.id
    )
  )
  from public.inspections i
  where i.share_token = token;
$$;

grant execute on function public.enable_inspection_share(uuid) to authenticated;
grant execute on function public.get_shared_inspection(text) to anon, authenticated;
