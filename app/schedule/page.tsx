"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Schedule {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
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

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchSchedules();
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
          .select("schedule_date_id, user_id, users(name)")
          .in("schedule_date_id", dates.map((d) => d.id));
        if (availError) throw availError;

        const map: AvailabilityMap = {};
        dates.forEach((d) => {
          const dateAvail = avail?.filter((a) => a.schedule_date_id === d.id) || [];
          const count = dateAvail.length;
          const isAvailable = dateAvail.some((a) => a.user_id === userId);
          const users = dateAvail.map((a) => (a.users as any)?.name || "알 수 없음");
          map[d.date] = { count, isAvailable, dateId: d.id, users };
        });
        setAvailabilityMap(map);

        // 유저별 날짜 맵 (관리자용)
        const byUser: Record<string, string[]> = {};
        avail?.forEach((a) => {
          const name = (a.users as any)?.name || "알 수 없음";
          const date = dates.find((d) => d.id === a.schedule_date_id)?.date;
          if (!date) return;
          if (!byUser[name]) byUser[name] = [];
          byUser[name].push(date);
        });
        setUserDateMap(
          Object.entries(byUser)
            .map(([name, dates]) => ({ name, dates: dates.sort() }))
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
      // 이미 날짜가 등록된 경우 가능/불가능 토글
      if (existing.isAvailable) {
        await supabase
          .from("user_availability")
          .delete()
          .eq("schedule_date_id", existing.dateId)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_availability")
          .insert([{ schedule_date_id: existing.dateId, user_id: userId, is_available: true }]);
      }
    } else {
      // 새 날짜 생성 후 가능 표시
      const { data: newDate, error } = await supabase
        .from("schedule_dates")
        .insert([{ schedule_id: selectedSchedule.id, date: dateStr }])
        .select()
        .single();
      if (error) { console.error(error); return; }
      await supabase
        .from("user_availability")
        .insert([{ schedule_date_id: newDate.id, user_id: userId, is_available: true }]);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">일정 맞추기</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">달력에서 가능한 날을 클릭해서 멤버들과 일정을 조율하세요.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">새 일정 만들기로 이름을 정하고, 달력에서 참여 가능한 날짜를 클릭하면 됩니다. 여러 명이 같은 일정에 참여해 날짜를 선택하면 최다 가능 날짜가 자동으로 표시됩니다.</p>

        {/* 새 일정 버튼 */}
        {userId ? (
          <>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="mb-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {showCreateForm ? "취소" : "📅 새 일정 만들기"}
            </button>
            {showCreateForm && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 mb-6 border border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">새 일정 만들기</h2>
                <form onSubmit={handleCreateSchedule} className="flex gap-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="일정 이름을 입력하세요"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                  />
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                    생성
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-center">
            <p className="text-blue-800 dark:text-blue-300 mb-2">일정을 만들려면 로그인이 필요합니다.</p>
            <a href="/login" className="text-blue-600 underline font-medium text-sm">로그인하기</a>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* 사이드바: 일정 목록 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-900 dark:text-white">일정 목록</h2>
              </div>

              {loading ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">로딩 중...</p>
              ) : schedules.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">일정이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map((s) => (
                    <div key={s.id} className={`flex items-center rounded-lg text-sm transition ${
                      selectedSchedule?.id === s.id ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    }`}>
                      <button onClick={() => { if (selectedSchedule?.id !== s.id) { setAvailabilityMap({}); setSelectedSchedule(s); } }}
                        className="flex-1 text-left px-3 py-2">
                        <p className="font-medium truncate">{s.name}</p>
                      </button>
                      {(s.created_by === userId || isAdmin) && (
                        <button onClick={() => handleDeleteSchedule(s.id)}
                          className={`px-2 py-1 mr-1 rounded text-xs transition ${
                            selectedSchedule?.id === s.id ? "hover:bg-blue-700 text-blue-100" : "hover:bg-red-50 text-gray-400 dark:text-gray-500 hover:text-red-500"
                          }`}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 추천 날짜 */}
            {bestDates.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-4">
                <h2 className="font-bold text-gray-900 dark:text-white mb-3">🏆 최다 가능 날짜</h2>
                <div className="space-y-2">
                  {bestDates.map(([date, info], idx) => (
                    <div key={date} className={`px-3 py-2 rounded-lg text-sm ${
                      idx === 0 ? "bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-700" : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <p className={`font-medium ${idx === 0 ? "text-blue-900 dark:text-blue-400" : "text-gray-800 dark:text-gray-100"}`}>
                        {new Date(date + "T00:00:00").toLocaleDateString("ko-KR", {
                          month: "long", day: "numeric", weekday: "short"
                        })}
                      </p>
                      <p className={`text-xs ${idx === 0 ? "text-blue-700 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
                        {info.count}명 가능 {idx === 0 ? "👑" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 메인: 달력 */}
          <div className="lg:col-span-3">
            {selectedSchedule ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedSchedule.name}</h2>
                    {userId && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400"
                    >
                      ◀
                    </button>
                    <span className="font-semibold text-gray-900 dark:text-white min-w-[80px] text-center">
                      {viewYear}년 {MONTHS[viewMonth]}
                    </span>
                    <button
                      onClick={() => {
                        const d = new Date(viewYear, viewMonth + 1);
                        setViewYear(d.getFullYear());
                        setViewMonth(d.getMonth());
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS.map((day, i) => (
                    <div key={day} className={`text-center text-sm font-medium py-2 ${
                      i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-600 dark:text-gray-400"
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
                    const isToday =
                      today.getFullYear() === viewYear &&
                      today.getMonth() === viewMonth &&
                      today.getDate() === day;
                    const dayOfWeek = (firstDay + day - 1) % 7;

                    return (
                      <div key={dateStr} className="relative">
                        <button
                          onClick={() => handleToggleDate(dateStr)}
                          onMouseEnter={() => count > 0 && setHoveredDate(dateStr)}
                          onMouseLeave={() => setHoveredDate(null)}
                          disabled={!userId}
                          className={`
                            w-full aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition
                            ${isMyDate ? "bg-blue-500 text-white font-bold shadow" : ""}
                            ${!isMyDate && count > 0 ? "bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800" : ""}
                            ${!isMyDate && count === 0 ? "hover:bg-gray-100 dark:hover:bg-gray-700" : ""}
                            ${isToday && !isMyDate ? "ring-2 ring-blue-400" : ""}
                            ${dayOfWeek === 0 && !isMyDate ? "text-red-400" : ""}
                            ${dayOfWeek === 6 && !isMyDate ? "text-blue-400" : ""}
                            ${!userId ? "cursor-default" : "cursor-pointer"}
                          `}
                        >
                          <span>{day}</span>
                          {count > 0 && (
                            <span className={`text-xs font-bold ${isMyDate ? "text-blue-100" : "text-blue-600"}`}>
                              {count}명
                            </span>
                          )}
                        </button>
                        {hoveredDate === dateStr && info?.users && info.users.length > 0 && (
                          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap pointer-events-none">
                            <p className="font-semibold mb-1 text-white">{new Date(dateStr + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</p>
                            <p className="font-semibold mb-1 text-blue-300">{count}명 가능</p>
                            {info.users.map((name, i) => (
                              <p key={i} className="leading-snug">· {name}</p>
                            ))}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 범례 */}
                <div className="flex gap-4 mt-6 pt-4 border-t dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-blue-500" />
                    <span>내가 가능한 날</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800" />
                    <span>다른 사람이 가능한 날</span>
                  </div>
                  {!userId && (
                    <div className="ml-auto">
                      <a href="/login" className="text-blue-600 underline">로그인하고 참여하기</a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-12 text-center text-gray-500 dark:text-gray-400">
                왼쪽에서 일정을 선택하거나 새 일정을 만들어보세요.
              </div>
            )}
          </div>
        </div>

        {/* 관리자 전용: 계정별 선택 날짜 */}
        {isAdmin && selectedSchedule && userDateMap.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">🔐 관리자 — 계정별 가능 날짜</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">각 유저가 선택한 날짜 목록입니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-semibold w-32">유저</th>
                    <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-semibold">선택 날짜</th>
                    <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-semibold w-16">총</th>
                  </tr>
                </thead>
                <tbody>
                  {userDateMap.map(({ name, dates }) => (
                    <tr key={name} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="py-3 px-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{name}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {dates.map((d) => (
                            <span key={d} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                              {new Date(d + "T00:00:00").toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" })}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-blue-600 dark:text-blue-400">{dates.length}일</td>
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
