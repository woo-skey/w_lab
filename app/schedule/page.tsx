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
  [date: string]: { count: number; isAvailable: boolean; dateId: string };
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
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
        if (!dates || dates.length === 0) { setAvailabilityMap({}); return; }

        const { data: avail, error: availError } = await supabase
          .from("user_availability")
          .select("schedule_date_id, user_id")
          .in("schedule_date_id", dates.map((d) => d.id));
        if (availError) throw availError;

        const map: AvailabilityMap = {};
        dates.forEach((d) => {
          const count = avail?.filter((a) => a.schedule_date_id === d.id).length || 0;
          const isAvailable = avail?.some((a) => a.schedule_date_id === d.id && a.user_id === userId) || false;
          map[d.date] = { count, isAvailable, dateId: d.id };
        });
        setAvailabilityMap(map);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">일정 맞추기</h1>
        <p className="text-gray-600 mb-8">
          달력에서 가능한 날을 클릭해서 멤버들과 일정을 조율하세요.
        </p>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* 사이드바: 일정 목록 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-900">일정 목록</h2>
                {userId && (
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    + 새 일정
                  </button>
                )}
              </div>

              {/* 새 일정 생성 */}
              {showCreateForm && (
                <form onSubmit={handleCreateSchedule} className="mb-4">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="일정 이름"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="submit" className="w-full py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                    생성
                  </button>
                </form>
              )}

              {!userId && (
                <p className="text-xs text-gray-500 mb-3">
                  <a href="/login" className="text-blue-600 underline">로그인</a>하면 일정을 만들 수 있어요.
                </p>
              )}

              {loading ? (
                <p className="text-gray-500 text-sm">로딩 중...</p>
              ) : schedules.length === 0 ? (
                <p className="text-gray-500 text-sm">일정이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map((s) => (
                    <div key={s.id} className={`flex items-center rounded-lg text-sm transition ${
                      selectedSchedule?.id === s.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                    }`}>
                      <button onClick={() => { setSelectedSchedule(s); setAvailabilityMap({}); }}
                        className="flex-1 text-left px-3 py-2">
                        <p className="font-medium truncate">{s.name}</p>
                        <p className={`text-xs mt-0.5 ${selectedSchedule?.id === s.id ? "text-blue-100" : "text-gray-500"}`}>
                          {new Date(s.created_at).toLocaleDateString("ko-KR")}
                        </p>
                      </button>
                      {s.created_by === userId && (
                        <button onClick={() => handleDeleteSchedule(s.id)}
                          className={`px-2 py-1 mr-1 rounded text-xs transition ${
                            selectedSchedule?.id === s.id ? "hover:bg-blue-700 text-blue-100" : "hover:bg-red-50 text-gray-400 hover:text-red-500"
                          }`}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 추천 날짜 */}
            {bestDates.length > 0 && (
              <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
                <h2 className="font-bold text-gray-900 mb-3">🏆 최다 가능 날짜</h2>
                <div className="space-y-2">
                  {bestDates.map(([date, info], idx) => (
                    <div key={date} className={`px-3 py-2 rounded-lg text-sm ${
                      idx === 0 ? "bg-blue-100 border border-blue-300" : "bg-gray-100"
                    }`}>
                      <p className={`font-medium ${idx === 0 ? "text-blue-900" : "text-gray-800"}`}>
                        {new Date(date + "T00:00:00").toLocaleDateString("ko-KR", {
                          month: "long", day: "numeric", weekday: "short"
                        })}
                      </p>
                      <p className={`text-xs ${idx === 0 ? "text-blue-700" : "text-gray-500"}`}>
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
              <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedSchedule.name}</h2>
                    {userId && (
                      <p className="text-sm text-gray-500 mt-1">
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
                      className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
                    >
                      ◀
                    </button>
                    <span className="font-semibold text-gray-900 min-w-[80px] text-center">
                      {viewYear}년 {MONTHS[viewMonth]}
                    </span>
                    <button
                      onClick={() => {
                        const d = new Date(viewYear, viewMonth + 1);
                        setViewYear(d.getFullYear());
                        setViewMonth(d.getMonth());
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS.map((day, i) => (
                    <div key={day} className={`text-center text-sm font-medium py-2 ${
                      i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-600"
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
                      <button
                        key={dateStr}
                        onClick={() => handleToggleDate(dateStr)}
                        disabled={!userId}
                        className={`
                          relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition
                          ${isMyDate ? "bg-blue-500 text-white font-bold shadow" : ""}
                          ${!isMyDate && count > 0 ? "bg-blue-50 border-2 border-blue-200" : ""}
                          ${!isMyDate && count === 0 ? "hover:bg-gray-100" : ""}
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
                    );
                  })}
                </div>

                {/* 범례 */}
                <div className="flex gap-4 mt-6 pt-4 border-t text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-blue-500" />
                    <span>내가 가능한 날</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded bg-blue-50 border-2 border-blue-200" />
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
              <div className="bg-white rounded-xl shadow border border-gray-100 p-12 text-center text-gray-500">
                왼쪽에서 일정을 선택하거나 새 일정을 만들어보세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
