# 위스키 연구소 — 기능 명세서

> Claude Code 대화 시작 시 이 파일을 먼저 읽을 것.
> 구현된 기능 전체, 주요 파일 경로, Supabase 테이블 구조, 과거 버그 이력 포함.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 15 App Router |
| DB / BaaS | Supabase (PostgreSQL + Realtime) |
| 스타일 | Tailwind CSS v3, Glass morphism (`glass-card`, `glass-input`) |
| 언어 | TypeScript |
| 인증 | httpOnly 세션 쿠키 + 서버 Route Handler (Supabase JWT 미사용). localStorage는 UI 힌트용 |
| 알림 | Supabase Realtime `postgres_changes` + `lib/notifications.ts` |

---

## 주요 파일 경로

| 파일 | 역할 |
|------|------|
| `components/AppSidebar.tsx` | 전체 레이아웃, 사이드바 네비, 검색, 알림 |
| `lib/auth.ts` | 로그인·회원가입·로그아웃 (서버 API 호출 래퍼, bcrypt 없음) |
| `lib/session.ts` | 세션 토큰 HMAC 서명/검증, 쿠키 set/clear (**서버 전용**) |
| `lib/supabaseAdmin.ts` | service_role Supabase 클라이언트 (**서버 전용**, 지연 초기화) |
| `lib/serverAuth.ts` | `requireUser` / `requireAdmin` 가드, `jsonError` |
| `app/api/auth/*` | login, signup, logout, check-username |
| `app/api/account/*` | password, profile, avatar, heartbeat(last_seen_at) — 본인 것만 수정 가능 |
| `app/api/admin/users` | PATCH=권한 토글, DELETE=회원 탈퇴 (관리자 세션 필수) |
| `app/api/content/[resource]` | 콘텐츠 생성·수정·삭제 단일 라우트 (소유자/관리자 검증) |
| `app/api/schedule/absence` | 일정 참여 불가 표시 POST/DELETE (본인만) |
| `lib/contentResources.ts` | 테이블별 소유자 컬럼·허용 필드·생성 권한 레지스트리 |
| `lib/contentApi.ts` | 콘텐츠 쓰기 클라이언트 헬퍼 |
| `components/Toast.tsx` | 토스트 알림 (`useToast`) — alert 대체 |
| `sql/2026-09-03-auth-hardening.sql` | 권한 회수 + `delete_user_cascade` 마이그레이션 |
| `lib/notifications.ts` | `createNotification`, `notifyAllUsers` |
| `lib/encyclopediaData.ts` | 위스키 백과 정적 데이터 (`ENCYCLOPEDIA_WHISKEYS`) |
| `app/page.tsx` | 대시보드 (최근 리뷰, 상위 위스키, 확정 일정 배너) |
| `app/reviews/page.tsx` | 위스키 리뷰 + 비교 모달 + RatingGauge |
| `app/encyclopedia/page.tsx` | 위스키 백과 (모든 유저 편집 가능) |
| `app/schedule/page.tsx` | 일정 맞추기 (멤버 전용 투표/생성) |
| `app/bars/page.tsx` | Bar 추천 목록 |
| `app/bars/[id]/page.tsx` | Bar 상세 (댓글, 즐겨찾기) |
| `app/mypage/page.tsx` | 마이페이지 (리뷰, 컬렉션, 프로필) |
| `app/admin/page.tsx` | 관리자 — 회원 관리 (is_member 토글) |
| `app/notices/page.tsx` | 공지사항 (관리자 작성) |
| `app/articles/page.tsx` | 지식글 |
| `app/contact/page.tsx` | 문의 |

---

## Supabase 테이블 구조 (주요 컬럼)

### `users`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| username | text | 로그인 아이디 |
| name | text | 표시 이름 |
| password_hash | text | bcrypt 해시 |
| is_admin | boolean | 관리자 여부 |
| is_member | boolean | w_lab 회원 여부 (default false) |
| last_seen_at | timestamptz | 최근 사이트 접속 시각 (10분 간격 갱신, nullable) |
| created_at | timestamptz | |

### `whiskeys`
리뷰 대상 위스키 목록. `name`, `type`, `age`, `region` 등.

### `reviews`
| 컬럼 | 설명 |
|------|------|
| whiskey_id | FK → whiskeys |
| user_id | FK → users |
| rating | integer (1~10, 10점 만점) |
| nose / palate / finish / review | text |

### `schedules`
| 컬럼 | 설명 |
|------|------|
| name | 일정 이름 |
| created_by | FK → users |
| confirmed_date | date (확정된 날짜, nullable) |

### `schedule_dates`
| 컬럼 | 설명 |
|------|------|
| schedule_id | FK → schedules |
| date | date |

> 중복 row가 생길 수 있음 (동시 클릭 race condition). 삭제 시 같은 날짜의 모든 row ID 조회 후 일괄 삭제.

### `schedule_absences`
| 컬럼 | 설명 |
|------|------|
| schedule_id | FK → schedules (ON DELETE CASCADE) |
| user_id | FK → users (ON DELETE CASCADE) |
| | `UNIQUE (schedule_id, user_id)` — 참여 불가 표시 |

> 읽기만 anon 허용, 쓰기는 서버 라우트 전용.

### `user_availability`
| 컬럼 | 설명 |
|------|------|
| schedule_date_id | FK → schedule_dates |
| user_id | FK → users |
| is_available | boolean |

### `user_collection`
| 컬럼 | 설명 |
|------|------|
| user_id | FK → users |
| whiskey_name | text |
| whiskey_id | FK → whiskeys (nullable, 백과 연결 시) |
| status | 'tried' \| 'wishlist' |

### `encyclopedia`
정적 데이터(`lib/encyclopediaData.ts`)를 DB에 upsert하는 방식.
| 컬럼 | 설명 |
|------|------|
| id | text (정적 데이터 id와 일치) |
| deleted | boolean (soft delete) |
| difficulty | text (편집 가능 필드) |
| ... | 나머지 컬럼은 NOT NULL — upsert 시 전체 컬럼 포함 필수 |

### `notifications`
| 컬럼 | 설명 |
|------|------|
| user_id | 수신자 |
| type | announcement / review / schedule / ... |
| message | 알림 내용 |
| link | 이동할 경로 (nullable) |
| is_read | boolean (default false) |

### `bars`, `bar_comments`
Bar 추천 목록 및 댓글. `bar_comments`는 bar_id, user_id, content.

### `announcements`
공지사항. author_id FK → users.

---

## 구현된 기능 목록

### 1. 대시보드 (`/`)
- 최근 리뷰 5개
- 평균 평점 상위 위스키 3개
- 확정된 일정 배너
- 빠른 메뉴 그리드

### 2. 위스키 리뷰 (`/reviews`)
- 위스키별 리뷰 카드 (확장 시 상세 보기)
- 위스키 추가: 백과 검색 또는 직접 입력
- 10점 만점 평점 + `RatingGauge` 컴포넌트 (색상 코딩)
  - 1~4: 빨강, 5~7: 노랑, 8~10: 초록
- 리뷰 비교 모달
- 검색 autocomplete (입력 즉시 연관 결과 표시)

### 3. 위스키 백과 (`/encyclopedia`)
- 정적 데이터 기반 + DB 편집 내용 merge
- `블렌디드` 탭: 국가별 기존 분류를 유지하면서 `블렌디드`·`블렌디드몰트` 태그 항목을 한곳에 모아 표시
- 발렌타인 주요 라인업과 클래식·프리미엄·블렌디드 몰트를 포함한 블렌디드 위스키 26종 추가
- 모든 유저가 편집·추가·삭제 가능
- 난이도 편집 저장 (upsert with full columns)
- soft delete (`deleted = true`)

### 4. 일정 맞추기 (`/schedule`)
- 달력 클릭으로 가능 날짜 투표
- **w_lab 회원(`is_member = true`)만** 투표·생성 가능
- 관리자는 투표 불가 (열람·삭제만)
- 투표 현황 프로그레스 바 (총원 = `is_member` 유저 수)
- 최다 가능 날짜 추천 (상위 3개)
- 실제 투표가 있는 날짜 중 마지막 날이 지나면 좌측 `이전 일정`으로 자동 분류
- 첫 진입 시 진행 중인 일정을 우선 선택하고, 없으면 이전 일정을 열지 않은 빈 캘린더 표시
- 일정 생성자가 날짜 확정 기능
- 확정 시 투표한 유저들에게 알림 발송
- **참여 불가 표시**: 이번 일정에 참석 못 하는 멤버가 직접 표시 (`이번엔 참여 불가` 버튼)
  - 표시하면 날짜 선택이 잠기고, 이미 체크한 날짜는 함께 삭제됨 (모순 데이터 방지)
  - 투표 현황이 `N명 응답 (불가 M) / 전체 K명` 으로 표시되어 누굴 더 기다려야 하는지 알 수 있음
  - 달력 아래 참여 불가 명단 패널 (전체 공개)
  - 투표와 동일 규칙: `is_member`만 가능, 관리자 제외, 확정된 일정은 잠금
  - 쓰기는 `/api/schedule/absence` 경유 (대상은 항상 세션 userId)
- 관리자: 계정별 선택 날짜 테이블 열람

### 5. Bar 추천 (`/bars`, `/bars/[id]`)
- Bar 카드 전체 클릭 → 상세 페이지 이동
- 상세: 댓글, 즐겨찾기

### 6. 마이페이지 (`/mypage`)
- 내 리뷰 목록
- 컬렉션 탭: 시도한 위스키 / 위시리스트 관리
  - 백과 검색 추가 또는 직접 입력
- 프로필 편집

### 7. 알림 (`components/AppSidebar.tsx`)
- Supabase Realtime 구독
- 벨 아이콘: 미읽음 수 뱃지
- 개별 클릭 시 읽음 처리 + 해당 페이지 이동
- "모두 읽음" 버튼

### 8. 관리자 (`/admin` → `/mypage?tab=admin`)
- `/admin`은 `/mypage?tab=admin&sub=users`로 redirect (실제 UI는 마이페이지 `🛡️ 관리자` 탭)
- `isAdmin !== "true"` 이면 자동 redirect
- 서브탭: 통계 / 유저 / 공지 / 리뷰 / 지식글 / Bar / 위스키 / 일정
- 유저 관리: 관리자에게만 각 계정의 최근 사이트 접속 날짜·시간 표시
- **통계 탭 = 운영 대시보드**:
  - 처리 필요 패널: 미답변 문의 수(→ `/contact`), 미확정 일정 수(→ `/schedule`)
  - 이번 주 활동: 신규 가입/리뷰/지식글 (최근 7일, 지난주 대비 증감)
  - 전체 현황 6개 카운터 + 활동 많은 유저 Top 5 + 회원 구성(회원/비회원/관리자) 비율 바
  - 데이터는 `fetchAdminData()`에서 일괄 집계 (inquiries.status, schedules.confirmed_date 포함)
- **유저 탭**: 이름/아이디 검색, 회원/비회원/관리자 필터, 가입순/활동순 정렬
  - `is_member` 토글(관리자 계정은 불가), `is_admin` 토글, 회원탈퇴(본인 제외)
- 콘텐츠 탭(공지/리뷰/지식글/Bar/위스키/일정): 검색·정렬, 편집·삭제 모더레이션

### 9. 공지사항 (`/notices`)
- 관리자만 작성 (Rich Text Editor)
- 전체 유저에게 알림 발송

### 10. 지식글 (`/articles`), 문의 (`/contact`)
- 일반 CRUD, 댓글 기능 포함

---

## 과거 버그 이력 및 해결 패턴

### schedule_dates 중복 row
- **원인**: 두 유저가 동시에 같은 날 클릭 → `schedule_dates`에 동일 날짜 row 2개 생성
- **해결**: 투표 삭제 시 해당 날짜의 모든 row ID 조회 후 `user_availability` 일괄 삭제; 투표 추가 시 `maybeSingle()`로 기존 row 재사용

### encyclopedia upsert 400 에러
- **원인**: `{id, deleted: true}`만 넘기면 NOT NULL 컬럼 위반
- **해결**: upsert 시 정적 데이터 전체 컬럼 포함해서 전송

### 확장 카드 빈 배열 캐시
- **원인**: `if (!data[id])` 가드 → 빈 배열이 캐시되면 재요청 안 함
- **해결**: `useEffect(() => { if (expandedId) fetch(expandedId); }, [expandedId])` 패턴 사용

### 인증 구조 취약점 (2026-09-03 수정)
- **원인**: `login()`이 브라우저에서 `password_hash`를 SELECT → anon 롤에 해시 읽기 권한이 열려 있어야 동작
  → 로그인 안 한 사람도 REST API로 전 회원 bcrypt 해시 취득 가능. 세션 토큰이 없어
  `localStorage.setItem("isAdmin","true")` 만으로 관리자 UI 진입, 콘솔에서 DB 직접 변조도 가능
- **해결**: 로그인·비밀번호 검증을 서버 Route Handler로 이동(해시가 브라우저로 내려오지 않음),
  HMAC 서명된 httpOnly 세션 쿠키 도입, `users` 테이블의 anon INSERT/UPDATE/DELETE 및
  `password_hash` SELECT 권한 회수. 권한 판단은 항상 서버가 DB에서 재확인
- **주의**: `users`를 `select("*")`로 조회하면 컬럼 권한 때문에 실패 → 필요한 컬럼만 명시할 것

### 일정 유저별 날짜표 동명이인 병합 (2026-09-03 수정)
- **원인**: `byUser[name]`으로 그룹핑 → 이름이 같은 두 회원의 투표가 한 사람으로 합쳐져
  "N명 완료" 인원이 실제보다 적게 표시됨
- **해결**: `user_id`로 그룹핑하고 이름은 표시용으로만 사용

### 회원 탈퇴 반쪽 삭제 (2026-09-03 수정)
- **원인**: 클라이언트가 테이블별 개별 delete를 `Promise.allSettled`로 날리고 결과를 무시 →
  일부 실패 시 리뷰·지식글만 사라지고 계정은 남음. `notifications`, `user_collection`,
  `bar_favorites` 등 참조 테이블도 다수 누락돼 FK 위반 가능
- **해결**: `delete_user_cascade(uuid)` plpgsql 함수로 한 트랜잭션 처리 (전부 성공 or 전부 롤백)

### 아바타 확장자 오류 (2026-09-03 수정)
- **원인**: `file.name.split(".").pop()` → 확장자 없는 파일이면 파일명 전체가 확장자가 됨.
  업로드 경로도 localStorage의 userId 기반이라 남의 아바타 덮어쓰기 가능
- **해결**: 서버에서 MIME 타입으로 확장자 결정 + 경로는 세션 userId로 강제,
  타입/용량(2MB) 검증, 확장자 변경 시 이전 파일 정리

### 콘텐츠 쓰기 권한 취약점 (2026-09-04 수정)
- **원인**: anon 롤이 reviews/articles/bars/whiskeys/schedules/announcements/댓글 테이블에
  직접 INSERT·UPDATE·DELETE 가능 → 콘솔에서 남의 글 삭제, user_id 바꿔치기로 작성자 위조 가능
- **해결**: 모든 쓰기를 `app/api/content/[resource]` 경유로 이동. 소유자 컬럼은 서버가
  세션에서 채우고, 수정·삭제는 소유자 본인 또는 관리자만. 필드는 화이트리스트로 제한.
  9개 테이블의 anon 쓰기 권한 회수(`sql/2026-09-04-content-hardening.sql`)
- **주의**: 관리자 모더레이션은 `adminMutate` 래퍼로 감쌀 것. 서버가 거부했는데
  로컬 state만 지우면 화면에서만 사라지고 실제로는 남는다

### isMember localStorage 미설정
- **원인**: 기존 로그인 유저는 `isMember` 키가 없음
- **해결**: 재로그인 시 자동 설정. `localStorage.getItem("isMember") === "true"` 패턴 사용 (null-safe)
