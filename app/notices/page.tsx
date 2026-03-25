"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { notifyAllUsers } from "@/lib/notifications";
import RichTextEditor from "@/components/RichTextEditor";
import UserProfilePopup from "@/components/UserProfilePopup";
import SafeHtml from "@/components/SafeHtml";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  author_name?: string;
  users?: { name: string };
}

export default function NoticesPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", content: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("userId") || "";
    setUserId(id);
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) { alert("제목과 내용을 입력해주세요"); return; }
    setSubmitting(true);
    try {
      const authorName = localStorage.getItem("userName") || "관리자";
      const { error } = await supabase.from("announcements").insert([{
        title: formData.title,
        content: formData.content,
        author_id: userId,
        author_name: authorName,
      }]);
      if (error) throw error;

      // 전체 유저에게 알림
      await notifyAllUsers("announcement", `📢 새 공지: ${formData.title}`, "/notices");

      setFormData({ title: "", content: "" });
      setShowForm(false);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      alert("공지 등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("공지를 삭제할까요?")) return;
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      if (expandedId === id) setExpandedId(null);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">공지사항</h1>
        <p className="text-white/55 mb-2">운영진이 전달하는 공지 및 소식을 확인하세요.</p>
        <p className="text-xs text-white/30 mb-8">새로운 공지가 올라오면 알림으로 안내됩니다. 제목을 클릭하면 내용이 펼쳐집니다.</p>

        {/* 관리자만 글쓰기 */}
        {isAdmin ? (
          <>
            <button
              onClick={() => setShowForm(!showForm)}
              className="mb-6 px-6 py-2 bg-indigo-500/80 text-white rounded-lg hover:bg-indigo-500 transition"
            >
              {showForm ? "취소" : "📢 공지 작성"}
            </button>
            {showForm && (
              <div className="glass-card rounded-xl p-8 mb-8">
                <h2 className="text-xl font-bold text-white mb-6">공지 작성</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">제목 *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="공지 제목을 입력하세요"
                      className="glass-input w-full px-4 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">내용 *</label>
                    <RichTextEditor value={formData.content} onChange={(html) => setFormData({ ...formData, content: html })} placeholder="내용을 입력하세요" minHeight="200px" />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 bg-indigo-500/80 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition"
                  >
                    {submitting ? "등록 중..." : "공지 등록"}
                  </button>
                </form>
              </div>
            )}
          </>
        ) : userId ? null : (
          <div className="glass-card rounded-lg p-4 mb-6 text-center">
            <p className="text-white/60 mb-2">로그인하면 공지를 확인할 수 있습니다.</p>
            <a href="/login" className="text-indigo-400 underline font-medium text-sm">로그인하기</a>
          </div>
        )}

        {/* 공지 목록 */}
        {loading ? (
          <div className="text-center py-12 text-white/40">로딩 중...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-white/30">등록된 공지사항이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="glass-card rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                  className="w-full text-left px-6 py-4 hover:bg-white/5 transition"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-indigo-500/80 text-white px-2 py-0.5 rounded-full font-medium">공지</span>
                      <span className="font-semibold text-white">{a.title}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-xs text-white/35">{new Date(a.created_at).toLocaleDateString("ko-KR")}</span>
                      <span className="text-white/35 text-sm">{expandedId === a.id ? "▲" : "▼"}</span>
                    </div>
                  </div>
                </button>

                {expandedId === a.id && (
                  <div className="px-6 pb-5 border-t border-white/8">
                    <SafeHtml html={a.content} className="rich-content text-sm leading-relaxed text-white/75 mt-4" />
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/8">
                      <UserProfilePopup userId={a.author_id} displayName={a.author_name || a.users?.name || "관리자"} />
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
