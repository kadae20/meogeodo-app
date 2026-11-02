-- label-photos 버킷은 이미 public=true라 직접 URL 접근 시 RLS를 거치지 않는다.
-- 005에서 추가한 별도 SELECT 정책은 불필요하게 storage.objects 전체 목록 조회(list)까지
-- 허용해 Supabase 어드바이저가 보안 경고를 띄웠다 — 제거한다.
drop policy if exists "label_photos_select_public" on storage.objects;
