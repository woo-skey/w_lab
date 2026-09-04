import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jsonError, requireSessionUser, isResponse } from "@/lib/serverAuth";

/**
 * 일정 "참여 불가" 표시.
 * 대상은 항상 세션 userId — 남의 참석 여부를 대신 바꿀 수 없다.
 * 투표와 같은 규칙으로 w_lab 회원만 가능하고 관리자는 제외한다.
 */

async function loadSchedule(scheduleId: string) {
  return getAdminClient()
    .from("schedules")
    .select("id, confirmed_date")
    .eq("id", scheduleId)
    .maybeSingle();
}

/** 참여 불가로 표시. 이미 찍어둔 날짜 투표는 의미가 없어지므로 함께 지운다. */
export async function POST(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (isResponse(user)) return user;
  if (!user.isMember || user.isAdmin) {
    return jsonError("w_lab 회원만 참여 여부를 표시할 수 있습니다", 403);
  }

  let body: { scheduleId?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("잘못된 요청입니다", 400);
  }
  const scheduleId = typeof body.scheduleId === "string" ? body.scheduleId : "";
  if (!scheduleId) return jsonError("일정이 지정되지 않았습니다", 400);

  try {
    const admin = getAdminClient();

    const { data: schedule, error: lookupError } = await loadSchedule(scheduleId);
    if (lookupError) throw lookupError;
    if (!schedule) return jsonError("존재하지 않는 일정입니다", 404);
    if (schedule.confirmed_date) {
      return jsonError("확정된 일정은 변경할 수 없습니다", 409);
    }

    const { error: upsertError } = await admin
      .from("schedule_absences")
      .upsert([{ schedule_id: scheduleId, user_id: user.userId }], {
        onConflict: "schedule_id,user_id",
      });
    if (upsertError) throw upsertError;

    // 이 일정의 내 날짜 투표 제거 (참석 못 하는데 가능 날짜가 남아 있으면 집계가 어긋난다)
    const { data: dateRows, error: datesError } = await admin
      .from("schedule_dates")
      .select("id")
      .eq("schedule_id", scheduleId);
    if (datesError) throw datesError;

    if (dateRows && dateRows.length > 0) {
      const { error: clearError } = await admin
        .from("user_availability")
        .delete()
        .in("schedule_date_id", dateRows.map((d) => d.id))
        .eq("user_id", user.userId);
      if (clearError) throw clearError;
    }

    return NextResponse.json({ ok: true, absent: true });
  } catch (err) {
    console.error("schedule absence set failed", err);
    return jsonError("참여 불가 표시에 실패했습니다", 500);
  }
}

/** 참여 불가 해제 — 다시 날짜를 고를 수 있는 상태로 되돌린다. */
export async function DELETE(req: NextRequest) {
  const user = await requireSessionUser(req);
  if (isResponse(user)) return user;
  if (!user.isMember || user.isAdmin) {
    return jsonError("w_lab 회원만 참여 여부를 표시할 수 있습니다", 403);
  }

  const scheduleId = req.nextUrl.searchParams.get("scheduleId") || "";
  if (!scheduleId) return jsonError("일정이 지정되지 않았습니다", 400);

  try {
    const { data: schedule, error: lookupError } = await loadSchedule(scheduleId);
    if (lookupError) throw lookupError;
    if (!schedule) return jsonError("존재하지 않는 일정입니다", 404);
    if (schedule.confirmed_date) {
      return jsonError("확정된 일정은 변경할 수 없습니다", 409);
    }

    const { error } = await getAdminClient()
      .from("schedule_absences")
      .delete()
      .eq("schedule_id", scheduleId)
      .eq("user_id", user.userId);
    if (error) throw error;

    return NextResponse.json({ ok: true, absent: false });
  } catch (err) {
    console.error("schedule absence clear failed", err);
    return jsonError("참여 불가 해제에 실패했습니다", 500);
  }
}
