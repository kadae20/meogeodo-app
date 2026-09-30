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
2. SQL Editor에서 `supabase/migrations/001_init.sql` 전체를 붙여넣고 실행 (테이블 9개 + RLS 정책)
3. Authentication → Providers → Email 활성화 확인
   - 테스트를 빠르게 하려면 **Confirm email을 끄면** 가입 즉시 로그인됩니다.

### 2. 환경 변수

```bash
cp .env.example .env.local
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # 같은 화면의 anon public key
ANTHROPIC_API_KEY=              # 선택. 없으면 fallback parser로 동작
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
  api/normalize-label/      # 표시 텍스트 구조화 (Claude → fallback)
  api/inspect-product/      # 검수 실행: normalize → rule engine → 결과 저장
lib/
  rules/rule-engine.ts      # 상태 결정 로직 (우선순위: 충돌 > 정보부족 > 확인필요 > 통과)
  rules/fallback-parser.ts  # Claude 없이 동작하는 파서
  rules/default-templates.ts# 프로필 타입별 추천 기준
  ai/claude.ts, prompts.ts  # 서버 전용 Claude 호출 (실패 시 null → fallback)
supabase/migrations/001_init.sql
```

## 제출 (미션 5)

- GitHub: https://github.com/kadae20/meogeodo-app
- Pull Request: https://github.com/kadae20/meogeodo-app/pull/1
- Vercel: https://meogeodo-app.vercel.app

평가용 랜딩은 배포 URL의 `/` 입니다. 로그인·검수는 Supabase 환경 변수가 Vercel에 있을 때만 동작합니다.

검수 결과는 사용자가 저장한 기준과 상품 표시 정보의 비교 결과이며, 의학적·수의학적 판단이 아닙니다. UI/설명 문구에서 "안전함/위험함/추천" 등의 표현은 사용하지 않습니다.

## 랜딩 인터랙션

- 문제 / 해결 / 기대효과 / 시작 메뉴로 섹션 스크롤
- 모바일 햄버거 메뉴
- 스크롤에 맞춰 섹션·카드가 올라오며 나타남 (`prefers-reduced-motion`이면 끔)
- 상품 페이지 미리보기 카드가 살짝 떠 있음
- 비로그인 이메일 제출 시 `/login?email=&next=/app`
