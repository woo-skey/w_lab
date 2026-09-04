// 콘텐츠 쓰기 권한 레지스트리.
// app/api/content/[resource] 라우트가 이 표만 보고 동작하므로,
// 테이블을 추가할 때 여기에 한 줄만 넣으면 된다.
//
// 원칙:
//  - 소유자 컬럼 값은 항상 세션 userId로 서버가 채운다 (클라이언트가 보낸 값은 무시)
//  - createFields / updateFields 화이트리스트 밖의 키는 전부 버린다
//  - 수정·삭제는 소유자 본인 또는 관리자만

export type CreatePermission = "user" | "member" | "admin";

export interface ResourceConfig {
  /** 실제 테이블명 */
  table: string;
  /** 작성자를 가리키는 컬럼 */
  ownerColumn: string;
  /** INSERT 시 클라이언트가 채울 수 있는 컬럼 */
  createFields: readonly string[];
  /** UPDATE 시 클라이언트가 바꿀 수 있는 컬럼 */
  updateFields: readonly string[];
  /** 생성에 필요한 최소 권한 */
  createPermission: CreatePermission;
  /** 수정·삭제를 관리자만 하도록 제한할지 (기본: 소유자 또는 관리자) */
  mutateAdminOnly?: boolean;
  /** INSERT/UPDATE 후 돌려줄 select 구문 */
  returnSelect?: string;
  /** 서버가 세션 정보로 채워 넣는 컬럼 (예: 작성자 표시명) */
  serverFields?: readonly ("authorName")[];
}

export const CONTENT_RESOURCES: Record<string, ResourceConfig> = {
  reviews: {
    table: "reviews",
    ownerColumn: "user_id",
    createFields: ["whiskey_id", "rating", "review_text", "taste_profile", "nose", "palate", "finish_note", "remarks"],
    updateFields: ["rating", "review_text", "taste_profile", "nose", "palate", "finish_note", "remarks"],
    createPermission: "user",
  },
  "review-comments": {
    table: "review_comments",
    ownerColumn: "user_id",
    createFields: ["review_id", "content"],
    updateFields: ["content"],
    createPermission: "user",
    returnSelect: "*, users(name)",
  },
  articles: {
    table: "articles",
    ownerColumn: "author_id",
    createFields: ["title", "content", "category", "image_url"],
    updateFields: ["title", "content", "category", "image_url"],
    createPermission: "user",
  },
  comments: {
    table: "comments",
    ownerColumn: "user_id",
    createFields: ["article_id", "content"],
    updateFields: ["content"],
    createPermission: "user",
    returnSelect: "*, users(name)",
  },
  bars: {
    table: "bars",
    ownerColumn: "user_id",
    createFields: ["bar_name", "link", "notes"],
    updateFields: ["bar_name", "link", "notes"],
    createPermission: "user",
  },
  "bar-comments": {
    table: "bar_comments",
    ownerColumn: "user_id",
    createFields: ["bar_id", "content"],
    updateFields: ["content"],
    createPermission: "user",
    returnSelect: "*, users(name)",
  },
  whiskeys: {
    table: "whiskeys",
    ownerColumn: "created_by",
    createFields: ["name", "type", "region", "age", "abv", "nose", "palate", "finish_note", "tasting_notes", "price"],
    updateFields: ["name", "type", "region", "age", "abv", "nose", "palate", "finish_note", "tasting_notes", "price"],
    createPermission: "user",
  },
  schedules: {
    // 일정 생성은 w_lab 회원만 (FEATURES.md의 기존 규칙)
    table: "schedules",
    ownerColumn: "created_by",
    createFields: ["name"],
    updateFields: ["name", "confirmed_date"],
    createPermission: "member",
  },
  announcements: {
    // 공지는 관리자 전용. author_name은 클라이언트가 보낸 값을 쓰지 않고 서버가 채운다.
    table: "announcements",
    ownerColumn: "author_id",
    createFields: ["title", "content"],
    updateFields: ["title", "content"],
    createPermission: "admin",
    mutateAdminOnly: true,
    serverFields: ["authorName"],
  },
};

export function getResource(name: string): ResourceConfig | null {
  return Object.prototype.hasOwnProperty.call(CONTENT_RESOURCES, name)
    ? CONTENT_RESOURCES[name]
    : null;
}
