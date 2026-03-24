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
- 인증: localStorage (userId, userName, isAdmin)
- 알림: Supabase Realtime (`postgres_changes`) + `lib/notifications.ts`의 `createNotification`
- 글로벌 레이아웃: `components/AppSidebar.tsx` (Navigation 대체)
