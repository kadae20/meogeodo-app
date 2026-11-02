# 먹어도될까 — MVP 웹서비스

가족 구성원(아이·성인·강아지·고양이)별 식품 기준을 저장하고, 온라인 식품/간식/사료/영양제 상품을 결제 전에 **내 기준으로 검수**하는 SaaS 대시보드형 웹앱.

- 랜딩(`/`)에서 가치 소개 후 로그인·확장프로그램으로 진입. 로그인 뒤에는 프로필 → 기준 → 상품 검수 → 히스토리.
- 결과 상태는 4개만 사용: **내 기준 통과 / 확인 필요 / 내 기준과 충돌 / 정보 부족**
- 최종 상태는 항상 TypeScript Rule Engine이 결정 (`lib/rules/rule-engine.ts`). Claude API는 텍스트 구조화·설명 생성 보조만 하며, 없거나 실패해도 fallback parser로 전체 플로우가 동작합니다.

## 스택

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth/Postgres/RLS) · Claude API · react-hook-form · zod · sonner · lucide-react

## 실행 방법

### 1. Supabase 프로젝트 준비

1. https://supabase.com 에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/001_init.sql` → `002_p2.sql` → `003_p3.sql` → `004_aliases.sql` → `005_label_photos.sql` → `006_multi_label_photos.sql` → `007_label_photos_policy_fix.sql` 순서대로 하나씩 붙여넣고 실행 (001은 기본 9테이블+RLS, 나머지는 가구공유·공유링크·상품별칭·라벨사진 Storage(배열 지원)·보안 정책 정리를 추가)
3. Authentication → Providers → Email 활성화 확인
   - 테스트를 빠르게 하려면 **Confirm email을 끄면** 가입 즉시 로그인됩니다.

### 2. 환경 변수

```bash
cp .env.example .env.local
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=                # Supabase → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=    # 같은 화면의 publishable key (구 anon key)
ANTHROPIC_API_KEY=                       # 선택. 없으면 fallback parser로 동작
GOOGLE_CLIENT_ID=                        # 선택. 구글 간편로그인을 쓸 때만
GOOGLE_CLIENT_SECRET=                    # 선택
```

### 3. 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 랜딩 → 로그인(회원가입) → `/app/onboarding`에서 프로필 + 추천 기준 저장 → `/app/check`에서 샘플 버튼으로 바로 검수 테스트.

### 4. Vercel 배포

1. GitHub에 push 후 Vercel에서 import
2. 환경 변수 3개 등록 (위와 동일)
3. Supabase → Authentication → URL Configuration의 Site URL을 Vercel 도메인으로 설정 (매직링크/가입 메일 리디렉션용)

## 구조 요약

```
app/
  page.tsx                  # 마케팅 랜딩 (히어로·기능·CTA)
  login/                    # 이메일+비밀번호 / 매직링크 로그인
  auth/callback/            # 매직링크 코드 교환
  app/                      # 로그인 후 대시보드 셸 (사이드바+헤더)
    onboarding/             # 프로필 생성 + 타입별 추천 기준 저장
    profiles/, profiles/[id]/  # 프로필·기준 CRUD, 추천 다시 불러오기
    check/                  # 상품 1개 검수 (샘플 3종 버튼 포함)
    cart-check/             # 여러 상품 한 번에 검수 (장바구니 MVP)
    inspections/, [id]/     # 검수 히스토리·상세 (요약카드/프로필별 결과/상세 사유)
    whitelist/              # 프로필별 화이트리스트
  settings/, pricing/       # 계정·플랜 mock (결제 없음)
  api/products/              # 상품 도메인 API (fetch-product, inspect-product, lookup-barcode,
                             #   lookup-public-food, normalize-label, ocr-label)
  api/extension/             # 크롬 확장 전용 API (peek, me, status, zip)
lib/
  rules/rule-engine.ts      # 상태 결정 로직 (우선순위: 충돌 > 정보부족 > 확인필요 > 통과)
  rules/fallback-parser.ts  # Claude 없이 동작하는 파서
  rules/default-templates.ts# 프로필 타입별 추천 기준
  ai/claude.ts, prompts.ts  # 서버 전용 Claude 호출 (실패 시 null → fallback)
supabase/migrations/001_init.sql
```

## 제출 (미션 5)

- GitHub: https://github.com/kadae20/meogeodo-app
- Pull Request: https://github.com/kadae20/meogeodo-app/pull/1 ([박건호]-미션5)
- Vercel: https://meogeodo-app.vercel.app

평가용 랜딩은 배포 URL의 `/` 입니다. 로그인·검수는 Supabase 환경 변수가 Vercel에 있을 때만 동작합니다.

검수 결과는 사용자가 저장한 기준과 상품 표시 정보의 비교 결과이며, 의학적·수의학적 판단이 아닙니다. UI/설명 문구에서 "안전함/위험함/추천" 등의 표현은 사용하지 않습니다.

## 랜딩 인터랙션

- 문제 / 해결 / 기대효과 / 시작 메뉴로 섹션 스크롤 이동
- 모바일 햄버거 메뉴 토글 (lg 이하에서 햄버거 → 메뉴 전환)
- 스크롤에 맞춰 섹션·카드가 올라오며 나타남 (IntersectionObserver, `prefers-reduced-motion`이면 즉시 표시)
- 상품 페이지 미리보기 카드가 살짝 떠 있음 (hover 효과)
- 비로그인 이메일 제출 시 `/login?email=&next=/app`

## 미션 5 요구사항 대응

| 요구사항 | 구현 내용 |
|---|---|
| 랜딩 페이지 기획 | 문제→해결→기대효과→CTA 흐름, 타깃: 장보는 가족(아이·성인·반려동물), CTA: 이메일 제출→로그인→앱 |
| 프로젝트 컨텍스트 | `CLAUDE.md`에 서비스 목적·스택·디자인·작업규칙 정리 |
| Figma 시안 기반 구현 | 히어로·기능소개·기대효과·CTA 섹션을 `components/landing/*` 컴포넌트로 분리 |
| 반응형 레이아웃 | Tailwind 반응형 유틸리티 (`lg:`)로 모바일/데스크톱 대응 |
| JS 인터랙션 | 1) 모바일 메뉴 토글 2) 섹션 스크롤 이동 3) Reveal 스크롤 애니메이션 4) CTA 이메일 폼 처리 |
| 기본 품질 | 이미지 alt·버튼/링크 구분·메타데이터·OG 이미지·lang=ko 설정 완료 |
| GitHub + Vercel | `basic-박건호` 브랜치 → PR `[박건호]-미션5` → Vercel 프로덕션 배포 |

### 심화 요구사항

| 요구사항 | 상태 |
|---|---|
| 오픈그래프 이미지·메타데이터 | `app/opengraph-image.tsx` + `metadataBase` (VERCEL_URL 자동 감지) |
| 스크롤 애니메이션 | `Reveal` 컴포넌트 (IntersectionObserver + prefers-reduced-motion 대응) |

## 미션 6 — CRUD MVP 대응

### 핵심 기능 선정
- **가족 프로필·기준**: Create·Read·Update·Delete 전체 사이클 (`/app/profiles`, `/app/profiles/[id]`)
- **상품 검수**: Create(검수 실행)·Read(목록/상세)·Delete(히스토리 삭제). 검수 결과는 그 시점 표시 정보의 스냅샷이라 "수정"이 아니라 재검수로 새 기록을 남기는 방식을 택했습니다.
- **화이트리스트**: Create·Read·Delete (`/app/whitelist`)

### 테이블 구조 (마이그레이션 순서)
| 파일 | 내용 |
|---|---|
| `001_init.sql` | 기본 9테이블 + RLS — user_profiles, family_profiles, profile_rules, products, normalized_labels, inspections, inspection_products, inspection_results, whitelist_items |
| `002_p2.sql` | 가구(household) 공유 — 초대코드로 가족 프로필을 함께 보기 |
| `003_p3.sql` | 검수 결과 공유 링크 (`/share/[token]`) |
| `004_aliases.sql` | 상품 별칭(바코드/쿠팡 상품 ID 등) — 같은 상품 재인식 캐시 |
| `005_label_photos.sql` | 라벨 사진 Storage 버킷(`label-photos`) + `normalized_labels.label_image_url`(단일, deprecated) |
| `006_multi_label_photos.sql` | **(이번 업그레이드 추가)** `normalized_labels.label_image_urls`(배열) — 라벨 사진 여러 장 지원 |
| `007_label_photos_policy_fix.sql` | **(이번 업그레이드 추가)** public 버킷에 불필요했던 `storage.objects` SELECT(목록조회) 정책 제거 — Supabase 어드바이저 보안 경고 대응 |

### 이번 업그레이드에서 보완한 부분
- **이미지/파일 연동 (여러 장)**: 라벨 사진을 OCR로 읽을 때 Supabase Storage `label-photos` 버킷에 원본도 저장합니다. 원재료·영양정보가 다른 면에 나뉜 경우가 많아 **한 상품당 최대 4장**까지 올릴 수 있고, 사진마다 OCR 결과를 순차적으로 병합합니다(한 장은 원재료, 한 장은 영양정보처럼 서로 다른 정보를 보완). 업로드한 사진은 미리보기 썸네일로 바로 보이고 개별 삭제(Storage에서 실제 파일 삭제 포함)도 가능합니다. 검수 상세 화면에서도 올린 사진 전체를 갤러리로 다시 볼 수 있습니다. 4MB 초과·허용되지 않는 형식은 업로드 전에 막습니다.
- **검색/상태 필터**: `/app/inspections`에서 상품명·제목으로 검색하고(`?q=`), 통과/확인필요/충돌/정보부족 상태별로 필터링할 수 있습니다(`?status=`). 검수 기록이 쌓일수록 필요한 실사용 기능이라 판단해 추가했습니다.
- **페이지네이션**: 검색/필터 결과 기준으로 15건 단위 페이지네이션됩니다 (`?page=` 쿼리 파라미터, 이전/다음 버튼).
- **CRUD 완결**: 검수 히스토리에 삭제 기능을 추가했습니다 (화이트리스트 저장 상품은 영향 없음).
- **공유 결과 OG 메타데이터**: `/share/[token]` 페이지가 검수 제목·통과/충돌 요약을 담은 동적 title·description을 생성합니다. 카카오톡 등으로 링크 공유 시 미리보기가 의미 있는 내용으로 뜹니다.
- 검토 후 일부러 넣지 않은 심화 항목: 무한스크롤/낙관적 업데이트(페이지네이션으로 충분히 빠르다고 판단), 댓글·좋아요(가족 개인용 도구라 불필요).

### QA 체크리스트
| 시나리오 | 확인 방법 / 결과 |
|---|---|
| 빈 값 또는 잘못된 형식 제출 | zod로 필수값·URL 형식을 검증하고 toast로 사유를 보여줍니다 |
| 등록 후 목록·상세 반영 | 검수·프로필·기준 생성 즉시 목록/상세에 반영됩니다 (재조회 또는 `router.refresh()`) |
| 새로고침 후 데이터 유지 | 전부 Supabase에 저장 — localStorage나 mock data를 최종 저장소로 쓰지 않습니다 |
| 수정·삭제 후 화면 반영 | 프로필/기준은 수정·삭제 즉시 반영됩니다. 검수 히스토리는 삭제 즉시 목록에서 제거됩니다 |
| 존재하지 않는 상세 주소 접근 | `/app/inspections/[id]`는 없는 id면 `notFound()`로 404 안내 화면을 보여줍니다 |
| 파일이 없거나 업로드에 실패한 경우 | 4MB·형식 제한을 미리 안내하고, 사진 업로드가 실패해도 OCR로 읽은 표시 정보는 그대로 검수에 쓸 수 있습니다 |

## 미션 7 — 고도화 기능 대응

**선택한 고도화 기능: AI(LLM) API 활용 기능.** 단, OpenAI API 대신 **Claude API**를 사용합니다 (결제 기능은 이번 범위에서 제외).

- **왜 Claude인가**: 전체 프로덕트가 이미 Claude 기반 구조화 레이어(`lib/ai/claude.ts`, `lib/ai/prompts.ts`)로 설계돼 있고, 한국어 식품 표시사항(원재료명·영양정보·알레르기)을 읽는 품질이 검증돼 있어 별도 LLM 공급자를 추가하는 것보다 구조가 단순하고 일관됩니다. 메시지/시스템 프롬프트/JSON 강제 방식이 OpenAI와 거의 동일한 구조라 향후 공급자를 바꾸더라도 이 레이어만 교체하면 됩니다.
- **기존 MVP 한계 보완**: 원래 MVP는 사용자가 원재료명을 직접 타이핑해야만 검수가 가능했습니다. 지금은 상품 URL 본문이나 라벨 사진을 넣으면 Claude가 표시사항(원재료·영양정보·알레르기·원산지)을 구조화해서 채워줍니다. **판단 책임은 분리**되어 있어, Claude는 구조화·설명 생성만 담당하고 최종 통과/확인필요/충돌/정보부족 판정은 항상 `lib/rules/rule-engine.ts`가 결정합니다.
- **사용 시나리오**: (1) 쿠팡 등 상품 URL 붙여넣기 → 본문에서 표시사항 추출, (2) 라벨 사진 올리기 → OCR로 표시사항 추출 + 사진 Storage 저장, (3) Rule Engine 결과를 사람이 읽기 쉬운 문장으로 설명 생성. 성공 시 표시사항이 채워지고, 실패 시 "표시 정보를 읽지 못했습니다. 텍스트를 붙여넣어 주세요" 같은 구체적 안내로 fallback parser·직접 입력으로 이어집니다.
- **환경·보안**: `ANTHROPIC_API_KEY`는 서버 전용 환경 변수로만 쓰이고(Route Handler 내부), 클라이언트에 노출되지 않습니다. 이미지 업로드는 4MB·형식 검증을 거칩니다.
- **실패 처리**: API 키 미설정 / 크레딧 부족 / 레이트리밋을 각각 다른 안내 문구로 보여주고, 구조화 자체는 Claude 없이도 fallback parser로 자동 대체되어 서비스가 멈추지 않습니다.
- **확장 가능성**: Claude 호출이 `lib/ai/claude.ts` 한 곳에 모여 있어 OpenAI로 교체하거나 두 공급자를 병행하는 구조 변경이 어렵지 않습니다. 결제 기능은 이번에 제외했지만 `/pricing`에 플랜 틀은 이미 있어 추후 붙이기 쉽습니다.
