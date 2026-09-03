import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { setSessionCookie } from "@/lib/session";
import { jsonError } from "@/lib/serverAuth";

// 존재하지 않는 아이디일 때도 동일한 시간을 쓰기 위한 더미 해시
// (응답 속도 차이로 아이디 존재 여부를 알아내는 것 방지)
// 형식이 유효해야 bcrypt가 실제 연산을 수행하므로 임의 문자열로 정상 생성한 값을 쓴다.
const DUMMY_HASH = "$2b$10$R9XqGumAk8s.rNCqfPgRSerOCIH2oskFPHtV4Rgo8AmE1V6jBZesa";
const INVALID = "아이디 또는 비밀번호가 잘못되었습니다";

export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청입니다", 400);
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) return jsonError(INVALID, 401);

  try {
    const { data, error } = await getAdminClient()
      .from("users")
      .select("id, password_hash, name, is_admin, is_member")
      .eq("username", username)
      .maybeSingle();

    if (error) throw error;

    // 유저가 없어도 비교를 수행해 응답 시간을 맞춘다.
    const hash = data?.password_hash || DUMMY_HASH;
    const matched = await bcrypt.compare(password, hash);
    if (!data || !matched) return jsonError(INVALID, 401);

    // password_hash는 응답에 절대 포함하지 않는다.
    const res = NextResponse.json({
      userId: data.id,
      name: data.name,
      isAdmin: !!data.is_admin,
      isMember: !!data.is_member,
    });
    setSessionCookie(res, data.id);
    return res;
  } catch (err) {
    console.error("login failed", err);
    return jsonError("로그인에 실패했습니다", 500);
  }
}
