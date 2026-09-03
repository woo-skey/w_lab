import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jsonError, requireUser, isResponse } from "@/lib/serverAuth";

const MAX_LENGTHS: Record<string, number> = {
  name: 30,
  bio: 300,
  favorite_category: 50,
  favorite_whiskey: 100,
};

export async function PATCH(req: NextRequest) {
  const session = requireUser(req);
  if (isResponse(session)) return session;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청입니다", 400);
  }

  // 화이트리스트 밖의 컬럼(is_admin, is_member, password_hash 등)은 절대 받지 않는다.
  const payload: Record<string, string | null> = {};
  for (const field of Object.keys(MAX_LENGTHS)) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (raw !== null && typeof raw !== "string") {
      return jsonError(`${field} 값이 올바르지 않습니다`, 400);
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value.length > MAX_LENGTHS[field]) {
      return jsonError(`${field}는 ${MAX_LENGTHS[field]}자 이하여야 합니다`, 400);
    }
    payload[field] = value || null;
  }

  if (Object.keys(payload).length === 0) return jsonError("변경할 내용이 없습니다", 400);

  try {
    // 항상 세션의 userId로만 수정 — 클라이언트가 보낸 id는 쓰지 않는다.
    const { error } = await getAdminClient()
      .from("users")
      .update(payload)
      .eq("id", session.userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("profile update failed", err);
    return jsonError("프로필 저장에 실패했습니다", 500);
  }
}
