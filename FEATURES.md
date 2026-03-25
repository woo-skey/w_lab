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
| 인증 | localStorage 기반 (Supabase JWT 미사용) |
| 알림 | Supabase Realtime `postgres_changes` + `lib/notifications.ts` |

---

## 주요 파일 경로

| 파일 | 역할 |
|------|------|
| `components/AppSidebar.tsx` | 전체 레이아웃, 사이드바 네비, 검색, 알림 |
| `lib/auth.ts` | 로그인·회원가입 함수 |
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
- 모든 유저가 편집·추가·삭제 가능
- 난이도 편집 저장 (upsert with full columns)
- soft delete (`deleted = true`)

### 4. 일정 맞추기 (`/schedule`)
- 달력 클릭으로 가능 날짜 투표
- **w_lab 회원(`is_member = true`)만** 투표·생성 가능
- 관리자는 투표 불가 (열람·삭제만)
- 투표 현황 프로그레스 바 (총원 = `is_member` 유저 수)
- 최다 가능 날짜 추천 (상위 3개)
- 일정 생성자가 날짜 확정 기능
- 확정 시 투표한 유저들에게 알림 발송
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

### 8. 관리자 (`/admin`)
- 유저 목록 조회
- `is_member` 토글 (관리자 계정은 토글 불가)
- `isAdmin !== "true"` 이면 자동 redirect

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

### isMember localStorage 미설정
- **원인**: 기존 로그인 유저는 `isMember` 키가 없음
- **해결**: 재로그인 시 자동 설정. `localStorage.getItem("isMember") === "true"` 패턴 사용 (null-safe)
