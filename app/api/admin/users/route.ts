import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jsonError, requireAdmin, isResponse } from "@/lib/serverAuth";

/** 회원 권한 변경 — 관리자 세션에서만 가능. */
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (isResponse(session)) return session;

  let body: { targetId?: unknown; is_admin?: unknown; is_member?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청입니다", 400);
  }

  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  if (!targetId) return jsonError("대상 회원이 지정되지 않았습니다", 400);

  const patch: Record<string, boolean> = {};
  if ("is_admin" in body) {
    if (typeof body.is_admin !== "boolean") return jsonError("is_admin 값이 올바르지 않습니다", 400);
    if (targetId === session.userId) return jsonError("본인의 관리자 권한은 변경할 수 없습니다", 400);
    patch.is_admin = body.is_admin;
  }
  if ("is_member" in body) {
    if (typeof body.is_member !== "boolean") return jsonError("is_member 값이 올바르지 않습니다", 400);
    patch.is_member = body.is_member;
  }
  if (Object.keys(patch).length === 0) return jsonError("변경할 내용이 없습니다", 400);

  try {
    const admin = getAdminClient();

    const { data: target, error: lookupError } = await admin
      .from("users")
      .select("id, is_admin")
      .eq("id", targetId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!target) return jsonError("존재하지 않는 회원입니다", 404);

    if ("is_member" in patch && target.is_admin) {
      return jsonError("관리자 계정은 w_lab 회원 토글이 불가합니다", 400);
    }

    const { error } = await admin.from("users").update(patch).eq("id", targetId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin user update failed", err);
    return jsonError("회원 상태 변경에 실패했습니다", 500);
  }
}

/**
 * 회원 탈퇴 — 연관 데이터를 포함해 한 트랜잭션에서 삭제한다.
 * 기존에는 클라이언트가 테이블별로 개별 delete를 날려서, 중간에 실패하면
 * 리뷰·지식글만 지워지고 계정은 남는 반쪽 삭제가 발생했다.
 */
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (isResponse(session)) return session;

  const targetId = req.nextUrl.searchParams.get("id") || "";
  if (!targetId) return jsonError("대상 회원이 지정되지 않았습니다", 400);
  if (targetId === session.userId) return jsonError("본인 계정은 여기서 탈퇴할 수 없습니다", 400);

  try {
    const { error } = await getAdminClient().rpc("delete_user_cascade", { p_user_id: targetId });
    if (error) {
      // 마이그레이션 SQL을 아직 실행하지 않은 경우를 구분해서 안내
      const code = (error as { code?: string }).code;
      if (code === "PGRST202" || code === "42883") {
        return jsonError(
          "delete_user_cascade 함수가 DB에 없습니다. 마이그레이션 SQL을 먼저 실행해주세요.",
          501
        );
      }
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("user delete failed", err);
    return jsonError("삭제에 실패했습니다", 500);
  }
}
