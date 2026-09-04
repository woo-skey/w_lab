# 위스키 연구소 — Claude 작업 지침

## 대화 방식
- 모든 응답은 한국어로

## 코드 작업 규칙
- 코드 수정 후 반드시 `npm run build` 빌드 확인 → 통과 시 commit + push
- SQL 변경이 필요하면 코드로 직접 수정하지 말고, 사용자에게 SQL 문을 제공해서 Supabase SQL Editor에서 실행하도록 안내

## UI / 디자인 규칙
- UI 라벨(향, 맛, 피니쉬, 설명, 비고 등)에 이모지 사용 금지 → 인디고 도트(`·`) 사용
  - 예: `<span className="text-indigo-400/70 mr-1">·</span>향`
- 다크 모드 기본값 유지 (첫 방문 포함)
- 라이트/다크 모드 양쪽 지원
  - `globals.css`의 `html:not(.dark)` 오버라이드 방식으로 라이트 모드 처리
  - AppSidebar 인라인 스타일은 CSS 클래스 오버라이드가 안 먹히므로 반드시 `T.*` 테마 변수 사용
- Glass morphism 디자인 시스템(`glass-card`, `glass-input`) 유지

## 에러 표시 규칙
- **`alert()` 사용 금지** → `components/Toast.tsx`의 `useToast()` 사용
  - `toast.error(msg)` / `toast.success(msg)` / `toast.info(msg)`
  - 에러 5초, 성공 2.6초 자동 소멸. 클릭하면 즉시 닫힘
- **catch 블록에서 `console.error`만 하고 끝내지 말 것**
  - 로드 실패가 조용히 빈 목록으로 보이면 버그를 발견할 수 없다
    (리뷰 목록이 PostgREST 300으로 비어 있던 것을 오래 못 잡은 원인)
  - mutation 실패: `toast.error(contentErrorMessage(err, "..."))`
  - 로드 실패: `toast.error("...을 불러오지 못했습니다")`
- 모듈 스코프 함수는 훅을 못 쓰므로 알림 함수를 인자로 받을 것 (`adminMutate` 참고)
- `confirm()`은 유지 — 되돌릴 수 없는 동작을 막는 장치라 토스트로 대체 불가

## 버그 방지 패턴
- **그리드 레이아웃**: 확장 가능한 카드가 있는 그리드는 반드시 `items-start` 추가
  - 안 하면 한쪽 카드 펼칠 때 같은 행 다른 카드 높이도 같이 늘어남
- **페이지네이션**: 필터·검색·정렬 변경 시 반드시 `setPage(1)` 호출
- **확장 카드 데이터 fetch**: `if (!data[id])` 캐시 가드 쓰지 말 것
  - 빈 배열 `[]`이 캐시되면 이후 새 데이터가 와도 재요청 안 함
  - 대신 `useEffect(() => { if (expandedId) fetch(expandedId); }, [expandedId])` 패턴 사용
- **폼 제출 후 로컬 state 즉시 업데이트**: DB re-fetch 결과 기다리지 말고 제출 즉시 관련 state 업데이트
  - 예: 리뷰 제출 후 `setUserReviewedWhiskeys((prev) => new Set([...prev, id]))`

## Supabase / TypeScript 주의사항
- 중첩 select 결과는 TypeScript가 타입 추론 못 함 → `as unknown as T[]` 패턴 사용
- **`reviews`/`articles`/`bars`에서 `users`를 임베드할 때는 FK 힌트 필수**
  - `review_likes`, `article_likes`, `bar_favorites`가 junction 테이블로 인식돼 다대다 관계가
    추가로 잡히기 때문에, 힌트 없이 쓰면 PostgREST가 `300 Multiple Choices`를 반환하고
    `data`가 null이 된다 (에러가 안 보이고 목록이 조용히 비어버림)
  - `reviews` → `users!user_id(name)` / `articles` → `users!author_id(name)` / `bars` → `users!user_id(name)`
  - `comments`, `review_comments`, `bar_comments`, `bar_favorites`, `user_availability`는 관계가
    하나뿐이라 힌트 없이 `users(name)` 그대로 사용 가능
- JSX 내 따옴표 직접 사용 금지 (ESLint 빌드 오류) → `&ldquo;` `&rdquo;` 사용
- userId, userName, isAdmin 은 모두 localStorage 기반 (Supabase JWT 인증 아님)
  - SSR/서버 컴포넌트에서 localStorage 접근 시 `typeof window !== "undefined"` 체크 필요
  - **단, 이 값들은 사용자가 임의로 바꿀 수 있으므로 권한 판단에 쓰지 말 것** (UI 분기용으로만)

## 보안 규칙 (중요)
- `users` 테이블은 anon 롤에게 **INSERT/UPDATE/DELETE 권한이 없고 `password_hash` SELECT도 막혀 있음**
  - 회원가입·로그인·비밀번호 변경·프로필 수정·아바타 업로드·권한 변경·회원 탈퇴는 전부 `app/api/*` Route Handler 경유
  - 클라이언트에서 `supabase.from("users").update(...)` 같은 코드를 새로 추가하지 말 것 → 런타임에 권한 오류
- `users`를 `select("*")`로 조회하지 말 것 → `password_hash` 컬럼 권한 때문에 실패. 필요한 컬럼만 명시
- 서버에서 권한이 필요한 작업은 `lib/serverAuth.ts`의 `requireUser` / `requireAdmin` 사용
  - `requireAdmin`은 토큰이 아니라 **DB에서 `is_admin`을 매번 다시 읽음** (권한 회수 즉시 반영)
- **콘텐츠 쓰기(리뷰·지식글·Bar·위스키·일정·공지·댓글)도 anon 권한이 회수됨**
  - 클라이언트에서 `supabase.from("reviews").insert(...)` 같은 코드 새로 추가 금지 → 런타임 권한 오류
  - 대신 `lib/contentApi.ts`의 `createContent` / `updateContent` / `deleteContent` 사용
  - 테이블을 새로 보호하려면 `lib/contentResources.ts` 표에 한 줄 추가 + SQL로 REVOKE
  - 소유자 컬럼(user_id/author_id/created_by)은 서버가 세션에서 채움 → 호출부에서 보내지 말 것
  - 아직 클라이언트 직접 쓰기가 열려 있는 테이블: `review_likes`, `article_likes`,
    `bar_favorites`, `user_collection`, `user_availability`, `schedule_dates`,
    `notifications`, `encyclopedia`
- `lib/supabaseAdmin.ts`(service_role)는 **서버 전용** — 클라이언트 컴포넌트에서 import 금지
- 환경변수: `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (둘 다 `NEXT_PUBLIC_` 접두사 없이 서버 전용)

## 기술 스택
- Next.js 15 App Router, Supabase, Tailwind CSS v3, TypeScript
- 인증: **httpOnly 세션 쿠키(`wlab_session`) + 서버 Route Handler** — Supabase JWT 아님
  - localStorage(`userId`, `userName`, `isAdmin`, `isMember`)는 **UI 표시용 힌트일 뿐** 권한 근거가 아님
- 알림: Supabase Realtime (`postgres_changes`) + `lib/notifications.ts`의 `createNotification`
- 글로벌 레이아웃: `components/AppSidebar.tsx` (Navigation 대체)

## 반드시 먼저 읽을 파일
대화 시작 시 `FEATURES.md`를 반드시 읽을 것.
구현된 기능 전체 목록, 주요 파일 경로, 테이블 구조, 과거 버그 이력이 정리되어 있음.

## 추가된 주요 패턴 및 유의사항

### 인증 localStorage 키
| 키 | 설명 |
|----|------|
| `userId` | Supabase users.id (UUID) |
| `userName` | 표시 이름 |
| `isAdmin` | 관리자 여부 |
| `isMember` | w_lab 회원 여부 (일정 투표·생성 권한) |

로그인 후 재로그인 전까지는 `isMember`가 없을 수 있음 → 새 기능 추가 시 `localStorage.getItem("isMember") === "true"` 패턴 사용.

### 일정(Schedule) 관련
- `is_member = true` 유저만 투표·생성 가능, 관리자는 투표 불가
- 투표 현황 총원: `is_member = true` 유저 수 기준 (`is_admin` 제외 아님)
- 중복 `schedule_dates` 행 버그: 같은 날짜에 여러 행 생성될 수 있음
  - 삭제 시 해당 날짜의 모든 row ID를 조회 후 일괄 삭제
  - 생성 시 기존 row가 있으면 재사용 (`maybeSingle()` 체크)

### 관리자 회원 관리 페이지
- 경로: `/admin`
- `isAdmin !== "true"`이면 즉시 `/`로 redirect
- 사이드바에서 관리자에게만 🔐 회원 관리 링크 표시

### 알림 읽음 처리
- 벨 아이콘 열 때 전체 읽음 처리 안 함
- 개별 알림 클릭 시 `is_read = true` 업데이트 + 해당 페이지 이동
- &ldquo;모두 읽음&rdquo; 버튼으로 일괄 처리

### 평점 시스템
- 10점 만점 (과거 5점에서 변경됨)
- `RatingGauge` 컴포넌트: 1-4 빨강, 5-7 노랑, 8-10 초록 게이지 바
- `app/reviews/page.tsx` 내부에 인라인 정의됨

### Encyclopedia(위스키 백과)
- 정적 데이터: `lib/encyclopediaData.ts`의 `ENCYCLOPEDIA_WHISKEYS`
- DB upsert 시 `deleted: true` 처리는 전체 컬럼 포함해서 upsert해야 함 (NOT NULL 컬럼 때문)
- 모든 유저가 편집·추가·삭제 가능

### 컬렉션
- `user_collection` 테이블 사용
- 위스키 백과 검색으로 추가하거나 직접 입력 가능
- `app/mypage/page.tsx` 내 &ldquo;컬렉션&rdquo; 탭에서 관리
