"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";

interface Schedule {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  confirmed_date?: string | null;
}

interface AvailabilityMap {
  [date: string]: { count: number; isAvailable: boolean; dateId: string; users: string[] };
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [userDateMap, setUserDateMap] = useState<{ name: string; dates: string[] }[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchSchedules();
    supabase.from("users").select("*", { count: "exact", head: true }).neq("is_admin", true).then(({ count }) => setTotalUsers(count || 0));
  }, []);

  useEffect(() => {
    if (!selectedSchedule) return;
    const scheduleId = selectedSchedule.id;

    const fetch = async () => {
      try {
        const { data: dates, error: datesError } = await supabase
          .from("schedule_dates")
          .select("*")
          .eq("schedule_id", scheduleId);
        if (datesError) throw datesError;
        if (!dates || dates.length === 0) { setAvailabilityMap({}); setUserDateMap([]); return; }

        const { data: avail, error: availError } = await supabase
          .from("user_availability")
          .select("schedule_date_id, user_id, users(name, is_admin)")
          .in("schedule_date_id", dates.map((d) => d.id));
        if (availError) throw availError;

        // 중복 schedule_dates 처리: 같은 date의 모든 rows를 합산
        const dateGroupMap: Record<string, { ids: string[]; avail: typeof avail }> = {};
        dates.forEach((d) => {
          if (!dateGroupMap[d.date]) dateGroupMap[d.date] = { ids: [], avail: [] };
          dateGroupMap[d.date].ids.push(d.id);
        });
        avail?.forEach((a) => {
          const date = dates.find((d) => d.id === a.schedule_date_id)?.date;
          if (date && dateGroupMap[date]) dateGroupMap[date].avail!.push(a);
        });

        const map: AvailabilityMap = {};
        Object.entries(dateGroupMap).forEach(([date, group]) => {
          const dateAvail = group.avail || [];
          // 중복 user 제거 후 count
          const uniqueUsers = [...new Map(dateAvail.map((a) => [a.user_id, a])).values()];
          const count = uniqueUsers.length;
          const isAvailable = uniqueUsers.some((a) => a.user_id === userId);
          const users = uniqueUsers.map((a) => (a.users as any)?.name || "알 수 없음");
          // dateId는 첫 번째 id 사용 (신규 삽입 시)
          map[date] = { count, isAvailable, dateId: group.ids[0], users };
        });
        setAvailabilityMap(map);

        // 유저별 날짜 맵 — 관리자 제외, Set으로 날짜 중복 제거
        const byUser: Record<string, Set<string>> = {};
        avail?.forEach((a) => {
          if ((a.users as any)?.is_admin) return; // 관리자 제외
          const name = (a.users as any)?.name || "알 수 없음";
          const date = dates.find((d) => d.id === a.schedule_date_id)?.date;
          if (!date) return;
          if (!byUser[name]) byUser[name] = new Set();
          byUser[name].add(date);
        });
        setUserDateMap(
          Object.entries(byUser)
            .map(([name, dateSet]) => ({ name, dates: [...dateSet].sort() }))
            .sort((a, b) => b.dates.length - a.dates.length)
        );
      } catch (err) {
        console.error(err);
      }
    };

    fetch();
  }, [selectedSchedule, userId]);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSchedules(data || []);
      if (data && data.length > 0) setSelectedSchedule(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDate = async (dateStr: string) => {
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    if (!selectedSchedule) return;

    const existing = availabilityMap[dateStr];

    if (existing) {
      if (existing.isAvailable) {
        // 이 날짜에 연결된 모든 schedule_dates ID에서 삭제 (중복 행 대응)
        const { data: allDateRows } = await supabase
          .from("schedule_dates")
          .select("id")
          .eq("schedule_id", selectedSchedule.id)
          .eq("date", dateStr);
        if (allDateRows && allDateRows.length > 0) {
          await supabase
            .from("user_availability")
            .delete()
            .in("schedule_date_id", allDateRows.map((d) => d.id))
            .eq("user_id", userId);
        }
      } else {
        await supabase
          .from("user_availability")
          .insert([{ schedule_date_id: existing.dateId, user_id: userId, is_available: true }]);
      }
    } else {
      // schedule_dates 행이 이미 있으면 재사용, 없으면 생성 (중복 방지)
      const { data: existingRow } = await supabase
        .from("schedule_dates")
        .select("id")
        .eq("schedule_id", selectedSchedule.id)
        .eq("date", dateStr)
        .maybeSingle();
      const dateId = existingRow?.id ?? (await (async () => {
        const { data: newDate, error } = await supabase
          .from("schedule_dates")
          .insert([{ schedule_id: selectedSchedule.id, date: dateStr }])
          .select()
          .single();
        if (error) { console.error(error); return null; }
        return newDate.id;
      })());
      if (!dateId) return;
      await supabase
        .from("user_availability")
        .insert([{ schedule_date_id: dateId, user_id: userId, is_available: true }]);
    }

    setSelectedSchedule({ ...selectedSchedule });
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("일정을 삭제할까요?")) return;
    try {
      const { error } = await supabase.from("schedules").delete().eq("id", scheduleId);
      if (error) throw error;
      if (selectedSchedule?.id === scheduleId) { setSelectedSchedule(null); setAvailabilityMap({}); }
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const { data, error } = await supabase
        .from("schedules")
        .insert([{ name: newName, created_by: userId }])
        .select()
        .single();
      if (error) throw error;
      setNewName("");
      setShowCreateForm(false);
      setSchedules((prev) => [data, ...prev]);
      setSelectedSchedule(data);
      setAvailabilityMap({});
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDate = async (dateStr: string) => {
    if (!selectedSchedule) return;
    const newDate = selectedSchedule.confirmed_date === dateStr ? null : dateStr;
    const { error } = await supabase.from("schedules").update({ confirmed_date: newDate }).eq("id", selectedSchedule.id);
    if (error) { console.error(error); return; }
    const updated = { ...selectedSchedule, confirmed_date: newDate };
    setSelectedSchedule(updated);
    setSchedules((prev) => prev.map((s) => s.id === selectedSchedule.id ? updated : s));

    // 날짜 확정 시 투표한 유저들에게 알림
    if (newDate) {
      const formattedDate = new Date(newDate + "T00:00:00").toLocaleDateString("ko-KR", {
        month: "long", day: "numeric", weekday: "short",
      });
      // 이 일정에서 투표한 유니크 유저 ID 수집 (본인 제외)
      const { data: dateRows } = await supabase
        .from("schedule_dates")
        .select("id")
        .eq("schedule_id", selectedSchedule.id);
      if (dateRows && dateRows.length > 0) {
        const { data: voters } = await supabase
          .from("user_availability")
          .select("user_id")
          .in("schedule_date_id", dateRows.map((d) => d.id));
        const uniqueVoterIds = [...new Set((voters || []).map((v) => v.user_id))].filter((id) => id !== userId);
        await Promise.all(
          uniqueVoterIds.map((uid) =>
            createNotification(uid, "schedule", `📌 "${selectedSchedule.name}" 일정이 ${formattedDate}로 확정됐습니다.`, "/schedule")
          )
        );
      }
    }
  };

  // 달력 계산
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  // 가장 인원이 많은 날짜
  const bestDates = Object.entries(availabilityMap)
    .filter(([, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-white mb-2">일정 맞추기</h1>
        <p className="text-white/55 mb-2">달력에서 가능한 날을 클릭해서 멤버들과 일정을 조율하세요.</p>
        <p className="text-xs text-white/30 mb-8">새 일정 만들기로 이름을 정하고, 달력에서 참여 가능한 날짜를 클릭하면 됩니다. 여러 명이 같은 일정에 참여해 날짜를 선택하면 최다 가능 날짜가 자동으로 표시됩니다.</p>

        {/* 새 일정 버튼 */}
        {userId ? (
          <>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="mb-6 px-6 py-2 bg-indigo-500/80 text-white rounded-lg hover:bg-indigo-500 transition"
            >
              {showCreateForm ? "취소" : "📅 새 일정 만들기"}
            </button>
            {showCreateForm && (
              <div className="glass-card rounded-xl p-6 mb-6">
                <h2 className="text-lg font-bold text-white mb-4">새 일정 만들기</h2>
                <form onSubmit={handleCreateSchedule} className="flex gap-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="일정 이름을 입력하세요"
                    className="glass-input flex-1 px-4 py-2 rounded-lg"
                  />
                  <button type="submit" className="px-6 py-2 bg-indigo-500/80 text-white rounded-lg hover:bg-indigo-500 transition font-medium">
                    생성
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="glass-card rounded-lg p-4 mb-6 text-center">
            <p className="text-white/60 mb-2">일정을 만들려면 로그인이 필요합니다.</p>
            <a href="/login" className="text-indigo-400 underline font-medium text-sm">로그인하기</a>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* 사이드바: 일정 목록 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-white">일정 목록</h2>
              </div>

              {loading ? (
                <p className="text-white/40 text-sm">로딩 중...</p>
              ) : schedules.length === 0 ? (
                <p className="text-white/35 text-sm">일정이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map((s) => (
                    <div key={s.id} className={`flex items-center rounded-lg text-sm transition ${
                      selectedSchedule?.id === s.id ? "bg-indigo-500/80 text-white" : "text-white/70"
                    }`} style={selectedSchedule?.id === s.id ? {} : { background: "rgba(255,255,255,0.05)" }}>
                      <button onClick={() => { if (selectedSchedule?.id !== s.id) { setAvailabilityMap({}); setSelectedSchedule(s); } }}
                        className="flex-1 text-left px-3 py-2">
                        <p className="font-medium truncate">{s.name}</p>
                      </button>
                      {(s.created_by === userId || isAdmin) && (
                        <button onClick={() => handleDeleteSchedule(s.id)}
                          className={`px-2 py-1 mr-1 rounded text-xs transition ${
                            selectedSchedule?.id === s.id ? "hover:bg-indigo-600 text-indigo-100" : "text-white/35 hover:text-red-400 hover:bg-red-500/10"
                          }`}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 추천 날짜 */}
            {bestDates.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <h2 className="font-bold text-white mb-3">🏆 최다 가능 날짜</h2>
                <div className="space-y-2">
                  {bestDates.map(([date, info], idx) => {
                    const isConfirmed = selectedSchedule?.confirmed_date === date;
                    const isCreator = selectedSchedule?.created_by === userId;
                    return (
                      <div key={date} className={`px-3 py-2 rounded-lg text-sm ${
                        isConfirmed ? "border border-amber-400/50" : idx === 0 ? "border border-indigo-400/40" : ""
                      }`} style={{ background: isConfirmed ? "rgba(234,179,8,0.15)" : idx === 0 ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)" }}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${isConfirmed ? "text-amber-300" : idx === 0 ? "text-indigo-300" : "text-white/70"}`}>
                              {new Date(date + "T00:00:00").toLocaleDateString("ko-KR", {
                                month: "long", day: "numeric", weekday: "short"
                              })}
                            </p>
                            <p className={`text-xs ${isConfirmed ? "text-amber-400" : idx === 0 ? "text-indigo-400" : "text-white/40"}`}>
                              {isConfirmed ? "📌 확정됨" : `${info.count}명 가능${idx === 0 ? " 👑" : ""}`}
                            </p>
                          </div>
                          {isCreator && (
                            <button
                              onClick={() => handleConfirmDate(date)}
                              className={`flex-shrink-0 text-xs px-2 py-0.5 rounded transition ${
                                isConfirmed
                                  ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                                  : "bg-white/8 text-white/40 hover:text-amber-300 hover:bg-amber-500/15"
                              }`}
                            >
                              {isConfirmed ? "확정됨" : "확정"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 메인: 달력 */}
          <div className="lg:col-span-3">
            {selectedSchedule ? (
              <div className="glass-card rounded-xl p-6">
                {/* 확정 날짜 배너 */}
                {selectedSchedule.confirmed_date && (
                  <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)" }}>
                    <span className="text-amber-300 text-lg">📌</span>
                    <div>
                      <p className="text-amber-300 font-semibold text-sm">확정 날짜</p>
                      <p className="text-amber-200 font-bold">
                        {new Date(selectedSchedule.confirmed_date + "T00:00:00").toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
                      </p>
                    </div>
                    {selectedSchedule.created_by === userId && (
                      <button onClick={() => handleConfirmDate(selectedSchedule.confirmed_date!)}
                        className="ml-auto text-xs text-amber-400/60 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10 transition">
                        확정 취소
                      </button>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedSchedule.name}</h2>
                    {userId && (
                      <p className="text-sm text-white/45 mt-1">
                        가능한 날짜를 클릭해서 체크하세요 ✓
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const d = new Date(viewYear, viewMonth - 1);
                        setViewYear(d.getFullYear());
                        setViewMonth(d.getMonth());
                      }}
                      className="p-2 rounded-lg hover:bg-white/8 transition text-white/55"
                    >
                      ◀
                    </button>
                    <span className="font-semibold text-white min-w-[80px] text-center">
                      {viewYear}년 {MONTHS[viewMonth]}
                    </span>
                    <button
                      onClick={() => {
                        const d = new Date(viewYear, viewMonth + 1);
                        setViewYear(d.getFullYear());
                        setViewMonth(d.getMonth());
                      }}
                      className="p-2 rounded-lg hover:bg-white/8 transition text-white/55"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* 투표 현황 */}
                <div className="mb-4 px-4 py-2.5 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-white/50 text-xs">투표 현황</span>
                      <span className="text-white/70 text-xs font-semibold">
                        {userDateMap.length}명 완료 {totalUsers > 0 && <span className="text-white/35">/ 전체 {totalUsers}명</span>}
                      </span>
                    </div>
                    {totalUsers > 0 && (
                      <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((userDateMap.length / totalUsers) * 100, 100)}%`, background: "rgba(99,102,241,0.8)" }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS.map((day, i) => (
                    <div key={day} className={`text-center text-sm font-medium py-2 ${
                      i === 0 ? "text-red-400" : i === 6 ? "text-indigo-400" : "text-white/45"
                    }`}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* 달력 날짜 */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />;

                    const dateStr = formatDate(viewYear, viewMonth, day);
                    const info = availabilityMap[dateStr];
                    const isMyDate = info?.isAvailable || false;
                    const count = info?.count || 0;
                    const isConfirmed = selectedSchedule.confirmed_date === dateStr;
                    const isToday =
                      today.getFullYear() === viewYear &&
                      today.getMonth() === viewMonth &&
                      today.getDate() === day;
                    const dayOfWeek = (firstDay + day - 1) % 7;

                    return (
                      <div
                        key={dateStr}
                        className={`calendar-cell aspect-square ${hoveredDate === dateStr ? "flipped" : ""}`}
                        onMouseEnter={() => count > 0 && setHoveredDate(dateStr)}
                        onMouseLeave={() => setHoveredDate(null)}
                        onClick={() => userId && handleToggleDate(dateStr)}
                        style={{ cursor: userId ? "pointer" : "default" }}
                      >
                        <div className="calendar-card">
                          {/* 앞면 */}
                          <div className={`calendar-front flex flex-col items-center justify-center text-sm
                            ${isConfirmed ? "font-bold" : ""}
                            ${isMyDate && !isConfirmed ? "bg-indigo-500 text-white font-bold" : ""}
                            ${!isMyDate && count > 0 && !isConfirmed ? "border border-indigo-400/40" : ""}
                            ${!isMyDate && count === 0 && !isConfirmed ? "hover:bg-white/8" : ""}
                            ${isToday && !isMyDate && !isConfirmed ? "ring-2 ring-indigo-400/60" : ""}
                            ${dayOfWeek === 0 && !isMyDate && !isConfirmed ? "text-red-400" : ""}
                            ${dayOfWeek === 6 && !isMyDate && !isConfirmed ? "text-indigo-400" : ""}
                          `}
                          style={
                            isConfirmed
                              ? { background: "rgba(234,179,8,0.25)", border: "2px solid rgba(234,179,8,0.6)" }
                              : !isMyDate && count > 0
                              ? { background: "rgba(99,102,241,0.12)" }
                              : {}
                          }>
                            <span className={isConfirmed ? "text-amber-300" : isMyDate ? "text-white" : "text-white/80"}>{day}</span>
                            {isConfirmed && <span className="text-xs text-amber-400">📌</span>}
                            {!isConfirmed && count > 0 && (
                              <span className={`text-xs font-bold ${isMyDate ? "text-indigo-100" : "text-indigo-300"}`}>
                                {count}명
                              </span>
                            )}
                          </div>

                          {/* 뒷면 */}
                          <div className="calendar-back flex flex-col items-center justify-center px-1 py-1 overflow-hidden" style={{ background: "rgba(18,18,30,0.95)", border: "1px solid rgba(99,102,241,0.3)" }}>
                            <p className="text-xs font-bold text-indigo-300 leading-tight text-center mb-1">
                              {new Date(dateStr + "T00:00:00").toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                            </p>
                            <div className="w-full grid grid-cols-2 gap-x-1 gap-y-0.5 text-center">
                              {info?.users?.slice(0, 6).map((name, i) => (
                                <p key={i} className="text-xs leading-tight truncate text-white/80">{name}</p>
                              ))}
                            </div>
                            {(info?.users?.length || 0) > 6 && (
                              <p className="text-xs text-white/35 mt-0.5">+{(info?.users?.length || 0) - 6}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 범례 */}
                <div className="flex gap-4 mt-6 pt-4 border-t border-white/8 text-xs text-white/40 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-indigo-500" />
                    <span>내가 가능한 날</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded border border-indigo-400/40" style={{ background: "rgba(99,102,241,0.12)" }} />
                    <span>다른 사람이 가능한 날</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ background: "rgba(234,179,8,0.25)", border: "2px solid rgba(234,179,8,0.6)" }} />
                    <span className="text-amber-400/60">확정 날짜</span>
                  </div>
                  {!userId && (
                    <div className="ml-auto">
                      <a href="/login" className="text-indigo-400 underline">로그인하고 참여하기</a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-xl p-12 text-center text-white/40">
                왼쪽에서 일정을 선택하거나 새 일정을 만들어보세요.
              </div>
            )}
          </div>
        </div>

        {/* 관리자 전용: 계정별 선택 날짜 */}
        {isAdmin && selectedSchedule && userDateMap.length > 0 && (
          <div className="mt-8 glass-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-1">🔐 관리자 — 계정별 가능 날짜</h2>
            <p className="text-xs text-white/30 mb-5">각 유저가 선택한 날짜 목록입니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-white/50 font-semibold w-32">유저</th>
                    <th className="text-left py-2 px-3 text-white/50 font-semibold">선택 날짜</th>
                    <th className="text-right py-2 px-3 text-white/50 font-semibold w-16">총</th>
                  </tr>
                </thead>
                <tbody>
                  {userDateMap.map(({ name, dates }) => (
                    <tr key={name} className="border-b border-white/8 hover:bg-white/5 transition">
                      <td className="py-3 px-3 font-medium text-white whitespace-nowrap">{name}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {dates.map((d) => (
                            <span key={d} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium">
                              {new Date(d + "T00:00:00").toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" })}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-indigo-400">{dates.length}일</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
