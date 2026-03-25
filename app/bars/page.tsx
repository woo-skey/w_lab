"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";
import SafeHtml from "@/components/SafeHtml";
import UserProfilePopup from "@/components/UserProfilePopup";

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
  const router = useRouter();
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ bar_name: "", link: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingBar, setEditingBar] = useState<Bar | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [favoritedBars, setFavoritedBars] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) { setUserId(id); fetchFavorites(id); }
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchBars();
  }, []);

  const fetchFavorites = async (uid: string) => {
    const { data } = await supabase.from("bar_favorites").select("bar_id").eq("user_id", uid);
    setFavoritedBars(new Set((data || []).map((f) => f.bar_id)));
  };

  const handleToggleFavorite = async (barId: string) => {
    if (!userId) { alert("로그인이 필요합니다."); return; }
    if (favoritedBars.has(barId)) {
      await supabase.from("bar_favorites").delete().eq("bar_id", barId).eq("user_id", userId);
      setFavoritedBars((prev) => { const n = new Set(prev); n.delete(barId); return n; });
    } else {
      await supabase.from("bar_favorites").insert([{ bar_id: barId, user_id: userId }]);
      setFavoritedBars((prev) => new Set([...prev, barId]));
    }
  };

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
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* 헤더 */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Bar 추천</h1>
        <p className="text-white/55 mb-2">좋아하는 바를 추천하고 다른 사람들의 추천을 확인해보세요.</p>
        <p className="text-xs text-white/30 mb-8">Bar 추가하기 버튼을 눌러 바 이름, 링크, 메모를 입력하면 목록에 추가됩니다. 본인이 등록한 Bar는 편집·삭제할 수 있습니다.</p>

        <div className="flex gap-3 mb-6 flex-wrap items-center">
          {userId && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2 bg-indigo-500/80 text-white rounded-lg hover:bg-indigo-500 transition flex-shrink-0"
            >
              🍸 Bar 추가하기
            </button>
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="바 이름으로 검색..."
            className="glass-input flex-1 min-w-[160px] px-4 py-2 rounded-lg text-sm"
          />
        </div>
        {!userId && (
          <div className="glass-card rounded-lg p-4 mb-4 text-center">
            <p className="text-white/60 mb-2">바를 추천하려면 로그인이 필요합니다.</p>
            <Link href="/login" className="text-indigo-400 underline font-medium">로그인하기</Link>
          </div>
        )}

        {/* 바 목록 */}
        {loading ? (
          <div className="text-center py-12 text-white/40">로딩 중...</div>
        ) : bars.length === 0 ? (
          <div className="text-center py-12 text-white/40">아직 추천된 바가 없습니다.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {bars.filter((bar) => !searchQuery.trim() || bar.bar_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && searchQuery.trim() ? (
              <div className="col-span-2 text-center py-12 text-white/40">&ldquo;{searchQuery}&rdquo;에 해당하는 바가 없습니다.</div>
            ) : null}
            {bars.filter((bar) => !searchQuery.trim() || bar.bar_name.toLowerCase().includes(searchQuery.toLowerCase())).map((bar) => (
              <div key={bar.id} className="glass-card rounded-xl p-6 hover:bg-white/8 transition cursor-pointer"
                onClick={() => !editingBar && router.push(`/bars/${bar.id}`)}>
                {editingBar?.id === bar.id ? (
                  <form onSubmit={handleEdit} className="space-y-3">
                    <input type="text" value={editingBar.bar_name}
                      onChange={(e) => setEditingBar({ ...editingBar, bar_name: e.target.value })}
                      className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                    <input type="url" value={editingBar.link || ""}
                      onChange={(e) => setEditingBar({ ...editingBar, link: e.target.value })}
                      placeholder="링크"
                      className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                    <RichTextEditor
                      value={editingBar.notes || ""}
                      onChange={(html) => setEditingBar({ ...editingBar, notes: html })}
                      placeholder="비고"
                      minHeight="100px"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="px-4 py-1.5 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 transition">저장</button>
                      <button type="button" onClick={() => setEditingBar(null)} className="px-4 py-1.5 bg-white/8 text-white/70 text-sm rounded-lg hover:bg-white/12 transition">취소</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xl font-bold text-white">{bar.bar_name}</span>
                      <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                        {userId && (
                          <button onClick={() => handleToggleFavorite(bar.id)}
                            className={`text-sm px-2 py-1 rounded transition ${favoritedBars.has(bar.id) ? "text-red-400" : "text-white/30 hover:text-red-400"}`}>
                            {favoritedBars.has(bar.id) ? "❤️" : "🤍"}
                          </button>
                        )}
                        {(bar.user_id === userId || isAdmin) && (
                          <>
                            <button onClick={() => setEditingBar(bar)}
                              className="text-xs text-white/40 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10 transition">편집</button>
                            <button onClick={() => handleDelete(bar.id)}
                              className="text-xs text-white/40 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition">삭제</button>
                          </>
                        )}
                      </div>
                    </div>
                    {bar.link && (
                      <a href={bar.link} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-400 hover:underline text-sm mb-3 block">🔗 웹사이트 방문</a>
                    )}
                    {bar.notes && (
                      <SafeHtml html={bar.notes} className="rich-content text-sm leading-relaxed text-white/65 mb-4" />
                    )}
                    <div className="flex justify-between items-center text-xs text-white/35">
                      <span className="flex items-center gap-1">추천: <UserProfilePopup userId={bar.user_id} displayName={bar.author_name || "알 수 없음"} /></span>
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="glass-card rounded-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Bar 추천하기</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">바 이름 *</label>
                <input type="text" value={formData.bar_name}
                  onChange={(e) => setFormData({ ...formData, bar_name: e.target.value })}
                  placeholder="예: The Macallan Lounge"
                  className="glass-input w-full px-4 py-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">링크</label>
                <input type="url" value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://example.com"
                  className="glass-input w-full px-4 py-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">비고</label>
                <RichTextEditor
                  value={formData.notes}
                  onChange={(html) => setFormData({ ...formData, notes: html })}
                  placeholder="이 바의 특징, 추천 음료, 분위기 등을 적어주세요"
                  minHeight="120px"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full py-2 bg-indigo-500/80 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition">
                {submitting ? "추천 중..." : "Bar 추천하기"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
