import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jsonError, requireSessionUser, isResponse, type SessionUser } from "@/lib/serverAuth";
import { getResource, type ResourceConfig } from "@/lib/contentResources";

// 문자열 필드 상한. 지식글·공지는 리치텍스트 HTML이라 넉넉히 잡는다.
const MAX_STRING_LENGTH = 100_000;

type Ctx = { params: Promise<{ resource: string }> };

/** 화이트리스트에 있는 키만, 원시값만 통과시킨다. 중첩 객체/배열은 거부. */
function buildPayload(
  body: Record<string, unknown>,
  allowed: readonly string[]
): Record<string, unknown> | string {
  const payload: Record<string, unknown> = {};
  for (const field of allowed) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value === null) { payload[field] = null; continue; }
    if (typeof value === "string") {
      if (value.length > MAX_STRING_LENGTH) return `${field} 값이 너무 깁니다`;
      payload[field] = value;
      continue;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return `${field} 값이 올바르지 않습니다`;
      payload[field] = value;
      continue;
    }
    if (typeof value === "boolean") { payload[field] = value; continue; }
    return `${field} 값의 형식이 올바르지 않습니다`;
  }
  return payload;
}

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** 대상 행의 소유자를 읽어 본인 또는 관리자인지 확인한다. */
async function assertCanMutate(
  config: ResourceConfig,
  id: string,
  user: SessionUser
): Promise<NextResponse | null> {
  if (config.mutateAdminOnly && !user.isAdmin) {
    return jsonError("관리자 권한이 필요합니다", 403);
  }

  const { data, error } = await getAdminClient()
    .from(config.table)
    .select(config.ownerColumn)
    .eq("id", id)
    .maybeSingle();

  if (error) return jsonError("대상을 확인하지 못했습니다", 500);
  if (!data) return jsonError("대상을 찾을 수 없습니다", 404);

  // select 컬럼명이 동적이라 Supabase가 타입 추론을 못 함 → as unknown as 패턴
  const owner = (data as unknown as Record<string, unknown>)[config.ownerColumn];
  if (owner !== user.userId && !user.isAdmin) {
    return jsonError("본인이 작성한 항목만 수정·삭제할 수 있습니다", 403);
  }
  return null;
}

function resolve(resource: string) {
  const config = getResource(resource);
  return config ?? null;
}

/** 생성 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const config = resolve(resource);
  if (!config) return jsonError("알 수 없는 리소스입니다", 404);

  const user = await requireSessionUser(req);
  if (isResponse(user)) return user;

  if (config.createPermission === "admin" && !user.isAdmin) {
    return jsonError("관리자 권한이 필요합니다", 403);
  }
  if (config.createPermission === "member" && !user.isMember) {
    return jsonError("w_lab 회원만 생성할 수 있습니다", 403);
  }

  const body = await readBody(req);
  if (!body) return jsonError("잘못된 요청입니다", 400);

  const built = buildPayload(body, config.createFields);
  if (typeof built === "string") return jsonError(built, 400);

  // 소유자는 항상 세션 값으로 덮어쓴다 — 작성자 위조 불가.
  built[config.ownerColumn] = user.userId;
  if (config.serverFields?.includes("authorName")) {
    built.author_name = user.name || "관리자";
  }

  try {
    const { data, error } = await getAdminClient()
      .from(config.table)
      .insert([built])
      .select(config.returnSelect || "*")
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error(`content create failed (${resource})`, err);
    return jsonError("저장에 실패했습니다", 500);
  }
}

/** 수정 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const config = resolve(resource);
  if (!config) return jsonError("알 수 없는 리소스입니다", 404);

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return jsonError("대상 id가 없습니다", 400);

  const user = await requireSessionUser(req);
  if (isResponse(user)) return user;

  const denied = await assertCanMutate(config, id, user);
  if (denied) return denied;

  const body = await readBody(req);
  if (!body) return jsonError("잘못된 요청입니다", 400);

  const built = buildPayload(body, config.updateFields);
  if (typeof built === "string") return jsonError(built, 400);
  if (Object.keys(built).length === 0) return jsonError("변경할 내용이 없습니다", 400);

  try {
    const { data, error } = await getAdminClient()
      .from(config.table)
      .update(built)
      .eq("id", id)
      .select(config.returnSelect || "*")
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error(`content update failed (${resource})`, err);
    return jsonError("수정에 실패했습니다", 500);
  }
}

/** 삭제 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { resource } = await ctx.params;
  const config = resolve(resource);
  if (!config) return jsonError("알 수 없는 리소스입니다", 404);

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return jsonError("대상 id가 없습니다", 400);

  const user = await requireSessionUser(req);
  if (isResponse(user)) return user;

  const denied = await assertCanMutate(config, id, user);
  if (denied) return denied;

  try {
    const { error } = await getAdminClient().from(config.table).delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`content delete failed (${resource})`, err);
    return jsonError("삭제에 실패했습니다", 500);
  }
}
