import { NextResponse, type NextRequest } from "next/server";
import { getSessionUserId } from "./session";
import { getAdminClient } from "./supabaseAdmin";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** 세션 쿠키에서 userId를 꺼낸다. 없으면 401 응답을 반환. */
export function requireUser(req: NextRequest): { userId: string } | NextResponse {
  const userId = getSessionUserId(req);
  if (!userId) return jsonError("로그인이 필요합니다", 401);
  return { userId };
}

/**
 * 관리자 여부는 토큰이 아니라 DB에서 매번 확인한다.
 * 권한을 회수당한 유저의 기존 세션이 계속 통과하는 것을 막기 위함.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const session = requireUser(req);
  if (session instanceof NextResponse) return session;

  const { data, error } = await getAdminClient()
    .from("users")
    .select("is_admin")
    .eq("id", session.userId)
    .maybeSingle();

  if (error) return jsonError("권한 확인에 실패했습니다", 500);
  if (!data?.is_admin) return jsonError("관리자 권한이 필요합니다", 403);

  return { userId: session.userId };
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export interface SessionUser {
  userId: string;
  name: string;
  isAdmin: boolean;
  isMember: boolean;
}

/**
 * 세션 유저의 권한 플래그를 DB에서 읽어온다.
 * 토큰에 담아두지 않는 이유는 requireAdmin과 같다 — 권한 회수를 즉시 반영하기 위함.
 */
export async function requireSessionUser(
  req: NextRequest
): Promise<SessionUser | NextResponse> {
  const session = requireUser(req);
  if (session instanceof NextResponse) return session;

  const { data, error } = await getAdminClient()
    .from("users")
    .select("name, is_admin, is_member")
    .eq("id", session.userId)
    .maybeSingle();

  if (error) return jsonError("권한 확인에 실패했습니다", 500);
  if (!data) return jsonError("사용자 정보를 불러올 수 없습니다", 401);

  return {
    userId: session.userId,
    name: data.name || "",
    isAdmin: !!data.is_admin,
    isMember: !!data.is_member,
  };
}
