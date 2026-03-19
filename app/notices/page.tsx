"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { notifyAllUsers } from "@/lib/notifications";
import RichTextEditor from "@/components/RichTextEditor";

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">공지사항</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">운영진이 전달하는 공지 및 소식을 확인하세요.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">새로운 공지가 올라오면 알림으로 안내됩니다. 제목을 클릭하면 내용이 펼쳐집니다.</p>

        {/* 관리자만 글쓰기 */}
        {isAdmin ? (
          <>
            <button
              onClick={() => setShowForm(!showForm)}
              className="mb-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {showForm ? "취소" : "📢 공지 작성"}
            </button>
            {showForm && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-8 mb-8 border border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">공지 작성</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">제목 *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="공지 제목을 입력하세요"
                      className="w-full px-4 py-2 border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">내용 *</label>
                    <RichTextEditor value={formData.content} onChange={(html) => setFormData({ ...formData, content: html })} placeholder="내용을 입력하세요" minHeight="200px" />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {submitting ? "등록 중..." : "공지 등록"}
                  </button>
                </form>
              </div>
            )}
          </>
        ) : userId ? null : (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-center">
            <p className="text-blue-800 dark:text-blue-300 mb-2">로그인하면 공지를 확인할 수 있습니다.</p>
            <a href="/login" className="text-blue-600 underline font-medium text-sm">로그인하기</a>
          </div>
        )}

        {/* 공지 목록 */}
        {loading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">로딩 중...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">등록된 공지사항이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">공지</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{a.title}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(a.created_at).toLocaleDateString("ko-KR")}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-sm">{expandedId === a.id ? "▲" : "▼"}</span>
                    </div>
                  </div>
                </button>

                {expandedId === a.id && (
                  <div className="px-6 pb-5 border-t border-gray-100 dark:border-gray-800">
                    <div dangerouslySetInnerHTML={{ __html: a.content }} className="text-sm leading-relaxed" />
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-xs text-gray-400 dark:text-gray-500">작성: {a.author_name || a.users?.name || "관리자"}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition"
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
