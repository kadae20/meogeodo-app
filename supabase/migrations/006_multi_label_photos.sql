-- 라벨 사진 여러 장 지원 — normalized_labels에 배열 컬럼 추가
-- 기존 label_image_url(단일, 005에서 추가) 컬럼은 더 이상 애플리케이션에서 쓰지 않지만
-- 과거 값 보존을 위해 그대로 둔다.

alter table public.normalized_labels
  add column if not exists label_image_urls text[] default '{}';
