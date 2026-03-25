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
- JSX 내 따옴표 직접 사용 금지 (ESLint 빌드 오류) → `&ldquo;` `&rdquo;` 사용
- userId, userName, isAdmin 은 모두 localStorage 기반 (Supabase JWT 인증 아님)
  - SSR/서버 컴포넌트에서 localStorage 접근 시 `typeof window !== "undefined"` 체크 필요

## 기술 스택
- Next.js 15 App Router, Supabase, Tailwind CSS v3, TypeScript
- 인증: localStorage (`userId`, `userName`, `isAdmin`, `isMember`) — Supabase JWT 아님
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
