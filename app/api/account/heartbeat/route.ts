import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jsonError, requireUser, isResponse } from "@/lib/serverAuth";

/**
 * 최근 접속 시각 갱신.
 * users 테이블은 anon UPDATE 권한이 회수돼 있어 브라우저가 직접 쓸 수 없다.
 * 갱신 대상은 항상 세션의 userId — 남의 접속 기록을 조작할 수 없다.
 * 호출 빈도 제한(10분)은 클라이언트에서 하고, 여기서는 값만 찍는다.
 */
export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (isResponse(session)) return session;

  try {
    const { error } = await getAdminClient()
      .from("users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", session.userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("heartbeat failed", err);
    return jsonError("접속 시각 갱신에 실패했습니다", 500);
  }
}
