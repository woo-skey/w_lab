"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Bar {
  id: string;
  bar_name: string;
  link: string;
  notes: string;
  user_id: string;
  created_at: string;
  author_name?: string;
}

export default function BarsPage() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ bar_name: "", link: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
    fetchBars();
  }, []);

  const fetchBars = async () => {
    try {
      const { data: barsData, error } = await supabase
        .from("bars")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 작성자 이름 가져오기
      const userIds = [...new Set((barsData || []).map((b) => b.user_id))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);

        const userMap = Object.fromEntries((usersData || []).map((u) => [u.id, u.name]));
        setBars((barsData || []).map((b) => ({ ...b, author_name: userMap[b.user_id] || "알 수 없음" })));
      } else {
        setBars(barsData || []);
      }
    } catch (err) {
      console.error(err);
      setError("바 목록을 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!formData.bar_name.trim()) {
      setError("바 이름을 입력해주세요");
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from("bars").insert([{
        user_id: userId,
        bar_name: formData.bar_name,
        link: formData.link || null,
        notes: formData.notes || null,
      }]);

      if (error) throw error;

      setFormData({ bar_name: "", link: "", notes: "" });
      fetchBars();
    } catch (err) {
      console.error(err);
      setError("바를 추가할 수 없습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">바 추천</h1>
        <p className="text-gray-600 mb-8">
          좋아하는 바를 추천하고 다른 사람들의 추천을 확인해보세요.
        </p>

        {/* 추천 폼 - 로그인 시에만 표시 */}
        {userId ? (
          <div className="bg-white rounded-lg shadow-md p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">바 추천하기</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">바 이름 *</label>
                <input
                  type="text"
                  value={formData.bar_name}
                  onChange={(e) => setFormData({ ...formData, bar_name: e.target.value })}
                  placeholder="예: The Macallan Lounge"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">링크</label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비고</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="이 바의 특징, 추천 음료, 분위기 등을 적어주세요"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition"
              >
                {submitting ? "추천 중..." : "바 추천하기"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-12 text-center">
            <p className="text-amber-800 mb-3">바를 추천하려면 로그인이 필요합니다.</p>
            <Link href="/login" className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">
              로그인하기
            </Link>
          </div>
        )}

        {/* 바 목록 - 누구나 볼 수 있음 */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">추천된 바</h2>
          {loading ? (
            <div className="text-center py-12 text-gray-600">로딩 중...</div>
          ) : bars.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              아직 추천된 바가 없습니다. 첫 번째로 추천해보세요!
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {bars.map((bar) => (
                <div key={bar.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{bar.bar_name}</h3>
                  {bar.link && (
                    <a href={bar.link} target="_blank" rel="noopener noreferrer"
                      className="text-amber-600 hover:underline text-sm mb-3 block">
                      🔗 웹사이트 방문
                    </a>
                  )}
                  {bar.notes && (
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">{bar.notes}</p>
                  )}
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>추천: {bar.author_name}</span>
                    <span>{new Date(bar.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
