"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Schedule {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface ScheduleDate {
  id: string;
  schedule_id: string;
  date: string;
}

interface DateAvailability {
  date: string;
  count: number;
  isAvailable?: boolean;
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [scheduleDates, setScheduleDates] = useState<ScheduleDate[]>([]);
  const [availability, setAvailability] = useState<DateAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userId, setUserId] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    dates: "", // comma-separated dates
  });

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (!id) {
      window.location.href = "/login";
      return;
    }
    setUserId(id);
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (selectedSchedule) {
      const fetchScheduleDetails = async (scheduleId: string) => {
        try {
          // Get schedule dates
          const { data: dates, error: datesError } = await supabase
            .from("schedule_dates")
            .select("*")
            .eq("schedule_id", scheduleId)
            .order("date", { ascending: true });

          if (datesError) throw datesError;
          setScheduleDates(dates || []);

          // Get availability counts
          if (dates && dates.length > 0) {
            const { data: avail, error: availError } = await supabase
              .from("user_availability")
              .select("schedule_date_id, user_id")
              .in(
                "schedule_date_id",
                dates.map((d) => d.id)
              );

            if (availError) throw availError;

            // Calculate counts per date
            const counts: Record<string, number> = {};
            dates.forEach((d) => {
              counts[d.id] = 0;
            });

            avail?.forEach((a) => {
              if (counts.hasOwnProperty(a.schedule_date_id)) {
                counts[a.schedule_date_id]++;
              }
            });

            // Map to availability
            const result = dates.map((d) => ({
              date: d.date,
              count: counts[d.id],
              isAvailable: avail?.some(
                (a) => a.schedule_date_id === d.id && a.user_id === userId
              ),
            }));

            setAvailability(result);
          }
        } catch (err) {
          console.error("Failed to fetch schedule details:", err);
        }
      };

      fetchScheduleDetails(selectedSchedule.id);
    }
  }, [selectedSchedule, userId]);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
      if (data && data.length > 0) {
        setSelectedSchedule(data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.dates.trim()) {
      alert("일정 이름과 날짜를 입력해주세요");
      return;
    }

    const dates = formData.dates
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d);

    try {
      // Create schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("schedules")
        .insert([{ name: formData.name, created_by: userId }])
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Add schedule dates
      const dateRecords = dates.map((date) => ({
        schedule_id: scheduleData.id,
        date,
      }));

      const { error: datesError } = await supabase
        .from("schedule_dates")
        .insert(dateRecords);

      if (datesError) throw datesError;

      setFormData({ name: "", dates: "" });
      setShowCreateForm(false);
      fetchSchedules();
      alert("일정이 생성되었습니다!");
    } catch (err) {
      console.error("Failed to create schedule:", err);
      alert("일정 생성에 실패했습니다");
    }
  };

  const handleToggleAvailability = async (dateId: string, isAvailable: boolean) => {
    try {
      if (isAvailable) {
        // Delete availability
        const { error } = await supabase
          .from("user_availability")
          .delete()
          .eq("schedule_date_id", dateId)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Add availability
        const { error } = await supabase
          .from("user_availability")
          .insert([{ schedule_date_id: dateId, user_id: userId, is_available: true }]);

        if (error) throw error;
      }

      // Refresh availability
      if (selectedSchedule) {
        setSelectedSchedule({ ...selectedSchedule });
      }
    } catch (err) {
      console.error("Failed to toggle availability:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">일정 맞추기</h1>
        <p className="text-gray-600 mb-8">
          친구들과 함께 가능한 날을 찾아보세요.
        </p>

        {/* 생성 버튼 */}
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="mb-8 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
        >
          {showCreateForm ? "취소" : "새 일정 생성"}
        </button>

        {/* 생성 폼 */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">새 일정 생성</h2>
            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  일정 이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="예: 3월 위스키 바투어"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  가능한 날짜 (쉼표로 구분) *
                </label>
                <textarea
                  value={formData.dates}
                  onChange={(e) =>
                    setFormData({ ...formData, dates: e.target.value })
                  }
                  placeholder="예: 2026-03-20, 2026-03-21, 2026-03-22"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition"
              >
                일정 생성
              </button>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-6">
          {/* 일정 목록 */}
          <div className="md:col-span-1">
            <h2 className="text-xl font-bold text-gray-900 mb-4">일정 목록</h2>
            {loading ? (
              <p className="text-gray-600">로딩 중...</p>
            ) : schedules.length === 0 ? (
              <p className="text-gray-600">아직 일정이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <button
                    key={schedule.id}
                    onClick={() => setSelectedSchedule(schedule)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition ${
                      selectedSchedule?.id === schedule.id
                        ? "bg-amber-600 text-white"
                        : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <p className="font-medium truncate">{schedule.name}</p>
                    <p className="text-xs opacity-75">
                      {new Date(schedule.created_at).toLocaleDateString(
                        "ko-KR"
                      )}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 일정 상세 */}
          <div className="md:col-span-3">
            {selectedSchedule ? (
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedSchedule.name}
                </h2>
                <p className="text-gray-600 mb-6">
                  가능한 날을 체크해주세요. 다른 사람들이 선택한 날의 인원을 확인할 수
                  있습니다.
                </p>

                <div className="space-y-3">
                  {availability.length === 0 ? (
                    <p className="text-gray-600">아직 날짜가 없습니다.</p>
                  ) : (
                    availability.map((avail) => (
                      <div
                        key={avail.date}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {new Date(avail.date + "T00:00:00").toLocaleDateString(
                              "ko-KR",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            가능한 인원: {avail.count}명
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            const dateId = scheduleDates.find(
                              (d) => d.date === avail.date
                            )?.id;
                            if (dateId) {
                              handleToggleAvailability(
                                dateId,
                                avail.isAvailable || false
                              );
                            }
                          }}
                          className={`px-6 py-2 rounded-lg font-medium transition ${
                            avail.isAvailable
                              ? "bg-amber-600 text-white hover:bg-amber-700"
                              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                          }`}
                        >
                          {avail.isAvailable ? "✓ 가능" : "불가능"}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* 최적 날짜 제안 */}
                {availability.length > 0 && (
                  <div className="mt-8 pt-8 border-t">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      추천 날짜
                    </h3>
                    {(() => {
                      const bestDate = availability.reduce((prev, current) =>
                        prev.count > current.count ? prev : current
                      );
                      return (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-amber-900 font-medium mb-1">
                            {new Date(bestDate.date + "T00:00:00").toLocaleDateString(
                              "ko-KR",
                              {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                          <p className="text-amber-800 text-sm">
                            {bestDate.count}명이 가능합니다
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
                일정을 선택해주세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
