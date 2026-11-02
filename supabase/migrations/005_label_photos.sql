-- 라벨 사진 Storage 연동 — normalized_labels에 사진 URL 컬럼 + label-photos 버킷/정책
-- Supabase SQL Editor에서 그대로 실행하세요. (기존 001~004 마이그레이션이 이미 적용돼 있어야 합니다)

alter table public.normalized_labels
  add column if not exists label_image_url text;

-- 버킷: 공개 읽기(결과 화면에서 사진을 바로 보여주기 위함), 업로드는 로그인 사용자만
insert into storage.buckets (id, name, public)
values ('label-photos', 'label-photos', true)
on conflict (id) do nothing;

-- 본인 user_id 폴더(label-photos/{user_id}/...)에만 업로드 가능
create policy "label_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'label-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 누구나 읽기 가능 (검수 결과 공유 페이지에서도 사진을 볼 수 있게)
create policy "label_photos_select_public" on storage.objects
  for select
  using (bucket_id = 'label-photos');

-- 본인이 올린 사진만 삭제 가능
create policy "label_photos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'label-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
