"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
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

interface BarComment {
  id: string;
  bar_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: { name: string };
}

interface Favorite {
  user_id: string;
  users?: { name: string };
}

export default function BarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bar, setBar] = useState<Bar | null>(null);
  const [comments, setComments] = useState<BarComment[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const uid = localStorage.getItem("userId") || "";
    setUserId(uid);
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchAll(uid);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async (uid: string) => {
    try {
      const [barRes, commentsRes, favRes] = await Promise.all([
        supabase.from("bars").select("*").eq("id", id).single(),
        supabase.from("bar_comments").select("*, users(name)").eq("bar_id", id).order("created_at", { ascending: true }),
        supabase.from("bar_favorites").select("user_id, users(name)").eq("bar_id", id),
      ]);

      if (barRes.data) {
        const { data: userData } = await supabase.from("users").select("name").eq("id", barRes.data.user_id).single();
        setBar({ ...barRes.data, author_name: userData?.name || "알 수 없음" });
      }
      setComments((commentsRes.data || []) as unknown as BarComment[]);
      const favData = (favRes.data || []) as unknown as Favorite[];
      setFavorites(favData);
      setIsFavorited(favData.some((f) => f.user_id === uid));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!userId) { alert("로그인이 필요합니다."); return; }
    if (isFavorited) {
      await supabase.from("bar_favorites").delete().eq("bar_id", id).eq("user_id", userId);
      setIsFavorited(false);
      setFavorites((prev) => prev.filter((f) => f.user_id !== userId));
    } else {
      await supabase.from("bar_favorites").insert([{ bar_id: id, user_id: userId }]);
      setIsFavorited(true);
      setFavorites((prev) => [...prev, { user_id: userId }]);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !userId) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("bar_comments")
      .insert([{ bar_id: id, user_id: userId, content: commentText.trim() }])
      .select("*, users(name)")
      .single();
    if (!error && data) {
      setComments((prev) => [...prev, data as unknown as BarComment]);
      setCommentText("");
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("bar_comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white/40">로딩 중...</div>;
  if (!bar) return <div className="min-h-screen flex items-center justify-center text-white/40">Bar를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <Link href="/bars" className="text-indigo-400 hover:text-indigo-300 text-sm mb-6 inline-block">← Bar 목록으로</Link>

        {/* Bar 정보 */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-white">{bar.bar_name}</h1>
            <button onClick={handleToggleFavorite}
              className={`text-2xl transition ${isFavorited ? "text-red-400" : "text-white/25 hover:text-red-400"}`}>
              {isFavorited ? "❤️" : "🤍"}
            </button>
          </div>

          {bar.link && (
            <a href={bar.link} target="_blank" rel="noopener noreferrer"
              className="text-indigo-400 hover:underline text-sm mb-4 inline-block">
              🔗 웹사이트 방문
            </a>
          )}

          {bar.notes && (
            <SafeHtml html={bar.notes} className="rich-content text-white/65 text-sm leading-relaxed mb-4" />
          )}

          <div className="flex justify-between items-center text-xs text-white/35 pt-4 border-t border-white/8">
            <span className="flex items-center gap-1">
              추천: <UserProfilePopup userId={bar.user_id} displayName={bar.author_name || "알 수 없음"} />
            </span>
            <span>{new Date(bar.created_at).toLocaleDateString("ko-KR")}</span>
          </div>
        </div>

        {/* 즐겨찾기 멤버 */}
        {favorites.length > 0 && (
          <div className="glass-card rounded-2xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-white/60 mb-3">❤️ {favorites.length}명이 즐겨찾기 중</h2>
            <div className="flex flex-wrap gap-2">
              {favorites.map((f, i) => (
                <span key={i} className="px-2 py-0.5 bg-white/5 rounded-full text-xs text-white/50 border border-white/10">
                  {(f.users as any)?.name || "멤버"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 코멘트 */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-white mb-4">방문 후기</h2>

          {comments.length === 0 ? (
            <p className="text-white/30 text-sm mb-4">아직 방문 후기가 없습니다.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 py-3 border-b border-white/8 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <UserProfilePopup userId={c.user_id} displayName={(c.users as any)?.name || "알 수 없음"} />
                      <span className="text-white/25 text-xs">{new Date(c.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                    <p className="text-white/70 text-sm">{c.content}</p>
                  </div>
                  {(c.user_id === userId || isAdmin) && (
                    <button onClick={() => handleDeleteComment(c.id)}
                      className="text-xs text-white/25 hover:text-red-400 transition self-start">삭제</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {userId ? (
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input type="text" value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="방문 후기를 남겨보세요"
                className="glass-input flex-1 px-3 py-2 rounded-lg text-sm" />
              <button type="submit" disabled={submitting || !commentText.trim()}
                className="px-4 py-2 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-40 transition">
                등록
              </button>
            </form>
          ) : (
            <p className="text-white/40 text-sm">
              <Link href="/login" className="text-indigo-400 underline">로그인</Link>하고 후기를 남겨보세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
