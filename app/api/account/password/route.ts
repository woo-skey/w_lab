import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jsonError, requireUser, isResponse } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (isResponse(session)) return session;

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청입니다", 400);
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) return jsonError("모든 필드를 입력해주세요", 400);
  if (newPassword.length < 6) return jsonError("새 비밀번호는 6자 이상이어야 합니다", 400);
  if (newPassword.length > 72) return jsonError("새 비밀번호는 72자 이하여야 합니다", 400);

  try {
    const admin = getAdminClient();

    // 해시는 서버 밖으로 나가지 않는다. 현재 비밀번호 검증도 서버에서만 수행.
    const { data, error } = await admin
      .from("users")
      .select("password_hash")
      .eq("id", session.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return jsonError("사용자 정보를 불러올 수 없습니다", 404);

    const matched = await bcrypt.compare(currentPassword, data.password_hash);
    if (!matched) return jsonError("현재 비밀번호가 올바르지 않습니다", 400);

    const newHash = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await admin
      .from("users")
      .update({ password_hash: newHash })
      .eq("id", session.userId);
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("password change failed", err);
    return jsonError("비밀번호 변경에 실패했습니다", 500);
  }
}
