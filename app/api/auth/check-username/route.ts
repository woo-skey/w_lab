import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jsonError } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  let body: { username?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청입니다", 400);
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!username) return jsonError("아이디를 입력해주세요", 400);

  try {
    const { data, error } = await getAdminClient()
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ exists: !!data });
  } catch (err) {
    console.error("check-username failed", err);
    return jsonError("확인 중 오류가 발생했습니다", 500);
  }
}
