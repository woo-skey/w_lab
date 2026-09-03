import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jsonError } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청입니다", 400);
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  // 클라이언트 검증은 우회 가능하므로 서버에서 다시 검증한다.
  if (!username || !name) return jsonError("아이디와 이름을 입력해주세요", 400);
  if (username.length > 30 || name.length > 30) return jsonError("아이디와 이름은 30자 이하여야 합니다", 400);
  if (password.length < 6) return jsonError("비밀번호는 6자 이상이어야 합니다", 400);
  if (password.length > 72) return jsonError("비밀번호는 72자 이하여야 합니다", 400);

  try {
    const admin = getAdminClient();

    const { data: existing, error: lookupError } = await admin
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return jsonError("이미 사용 중인 아이디입니다", 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const { data, error } = await admin
      .from("users")
      .insert([{ username, password_hash: passwordHash, name }])
      .select("id")
      .single();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return jsonError("이미 사용 중인 아이디입니다", 409);
      }
      throw error;
    }

    return NextResponse.json({ userId: data.id });
  } catch (err) {
    console.error("signup failed", err);
    return jsonError("회원가입에 실패했습니다", 500);
  }
}
