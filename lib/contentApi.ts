// 콘텐츠 쓰기는 전부 서버 라우트를 경유한다.
// 소유자 검증(본인 또는 관리자)과 작성자 컬럼 채우기는 서버가 하므로,
// 호출부에서 user_id / author_id / created_by 를 보낼 필요가 없다.

export type ContentResource =
  | "reviews"
  | "review-comments"
  | "articles"
  | "comments"
  | "bars"
  | "bar-comments"
  | "whiskeys"
  | "schedules"
  | "announcements";

export class ContentApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ContentApiError";
    this.status = status;
  }
}

async function toError(res: Response, fallback: string): Promise<ContentApiError> {
  let message = fallback;
  try {
    const body = await res.json();
    if (typeof body?.error === "string") message = body.error;
  } catch {
    // 본문이 JSON이 아니면 fallback 사용
  }
  return new ContentApiError(message, res.status);
}

/** 생성. 성공 시 삽입된 행을 돌려준다. */
export async function createContent<T = unknown>(
  resource: ContentResource,
  data: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`/api/content/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await toError(res, "저장에 실패했습니다");
  return (await res.json()).data as T;
}

/** 수정. 본인 것이 아니고 관리자도 아니면 403. */
export async function updateContent<T = unknown>(
  resource: ContentResource,
  id: string,
  data: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`/api/content/${resource}?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await toError(res, "수정에 실패했습니다");
  return (await res.json()).data as T;
}

/** 삭제. 본인 것이 아니고 관리자도 아니면 403. */
export async function deleteContent(resource: ContentResource, id: string): Promise<void> {
  const res = await fetch(`/api/content/${resource}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw await toError(res, "삭제에 실패했습니다");
}

/** 에러 메시지 추출 — catch 블록에서 alert 용도로 사용. */
export function contentErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
