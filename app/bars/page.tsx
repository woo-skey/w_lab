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
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingBar, setEditingBar] = useState<Bar | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchBars();
  }, []);

  const fetchBars = async () => {
    try {
      const { data: barsData, error } = await supabase
        .from("bars").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((barsData || []).map((b) => b.user_id))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from("users").select("id, name").in("id", userIds);
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
    if (!formData.bar_name.trim()) { setError("바 이름을 입력해주세요"); setSubmitting(false); return; }
    try {
      const { error } = await supabase.from("bars").insert([{
        user_id: userId, bar_name: formData.bar_name,
        link: formData.link || null, notes: formData.notes || null,
      }]);
      if (error) throw error;
      setFormData({ bar_name: "", link: "", notes: "" });
      setShowModal(false);
      fetchBars();
    } catch (err) {
      console.error(err);
      setError("바를 추가할 수 없습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 바를 삭제할까요?")) return;
    try {
      const { error } = await supabase.from("bars").delete().eq("id", id);
      if (error) throw error;
      fetchBars();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBar) return;
    try {
      const { error } = await supabase.from("bars").update({
        bar_name: editingBar.bar_name,
        link: editingBar.link || null,
        notes: editingBar.notes || null,
      }).eq("id", editingBar.id);
      if (error) throw error;
      setEditingBar(null);
      fetchBars();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-1">Bar 추천</h1>
            <p className="text-gray-600">좋아하는 바를 추천하고 다른 사람들의 추천을 확인해보세요.</p>
          </div>
          {userId ? (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-md hover:shadow-lg"
            >
              <span className="text-lg">+</span> Bar 추가하기
            </button>
          ) : (
            <Link href="/login"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-md">
              로그인하고 추천하기
            </Link>
          )}
        </div>

        {/* 바 목록 */}
        {loading ? (
          <div className="text-center py-12 text-gray-600">로딩 중...</div>
        ) : bars.length === 0 ? (
          <div className="text-center py-12 text-gray-600">아직 추천된 바가 없습니다.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {bars.map((bar) => (
              <div key={bar.id} className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 border border-gray-100">
                {editingBar?.id === bar.id ? (
                  <form onSubmit={handleEdit} className="space-y-3">
                    <input type="text" value={editingBar.bar_name}
                      onChange={(e) => setEditingBar({ ...editingBar, bar_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="url" value={editingBar.link || ""}
                      onChange={(e) => setEditingBar({ ...editingBar, link: e.target.value })}
                      placeholder="링크"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <textarea value={editingBar.notes || ""}
                      onChange={(e) => setEditingBar({ ...editingBar, notes: e.target.value })}
                      rows={3} placeholder="비고"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-2">
                      <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">저장</button>
                      <button type="button" onClick={() => setEditingBar(null)} className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition">취소</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{bar.bar_name}</h3>
                      {(bar.user_id === userId || isAdmin) && (
                        <div className="flex gap-1">
                          <button onClick={() => setEditingBar(bar)}
                            className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition">편집</button>
                          <button onClick={() => handleDelete(bar.id)}
                            className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition">삭제</button>
                        </div>
                      )}
                    </div>
                    {bar.link && (
                      <a href={bar.link} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm mb-3 block">🔗 웹사이트 방문</a>
                    )}
                    {bar.notes && <p className="text-gray-700 mb-4 whitespace-pre-wrap text-sm">{bar.notes}</p>}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>추천: {bar.author_name}</span>
                      <span>{new Date(bar.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 추가 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Bar 추천하기</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">바 이름 *</label>
                <input type="text" value={formData.bar_name}
                  onChange={(e) => setFormData({ ...formData, bar_name: e.target.value })}
                  placeholder="예: The Macallan Lounge"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">링크</label>
                <input type="url" value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="이 바의 특징, 추천 음료, 분위기 등을 적어주세요"
                  rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition">
                {submitting ? "추천 중..." : "Bar 추천하기"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
