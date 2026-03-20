"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserInfo {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
  is_admin?: boolean;
  bio?: string;
  favorite_category?: string;
  favorite_whiskey?: string;
  created_at: string;
}

interface UserProfilePopupProps {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export default function UserProfilePopup({ userId, displayName, avatarUrl }: UserProfilePopupProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [articleCount, setArticleCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((v) => !v);
    if (user) return;
    setLoading(true);
    const [userRes, reviewRes, articleRes] = await Promise.all([
      supabase.from("users").select("id, name, username, avatar_url, is_admin, bio, favorite_category, favorite_whiskey, created_at").eq("id", userId).single(),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("author_id", userId),
    ]);
    if (userRes.data) setUser(userRes.data);
    setReviewCount(reviewRes.count || 0);
    setArticleCount(articleRes.count || 0);
    setLoading(false);
  };

  return (
    <div ref={ref} className="relative inline-flex items-center">
      {/* 트리거 */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 hover:opacity-80 transition"
      >
        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-xs font-bold overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            (displayName || "?")[0].toUpperCase()
          )}
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</span>
      </button>

      {/* 팝업 */}
      {open && (
        <div className="absolute left-0 top-8 z-50 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-5">
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-4">불러오는 중...</p>
          ) : user ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-2xl font-bold overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    (user.name || "?")[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
                    {user.is_admin && (
                      <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">관리자</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">@{user.username}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    가입 {new Date(user.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "short" })}
                  </p>
                </div>
              </div>

              {user.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 border-l-2 border-blue-400 pl-3">{user.bio}</p>
              )}

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
                {user.favorite_category && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-400 dark:text-gray-500 mb-0.5">관심 주류</p>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{user.favorite_category}</p>
                  </div>
                )}
                {user.favorite_whiskey && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-400 dark:text-gray-500 mb-0.5">최애 위스키</p>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{user.favorite_whiskey}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
                <div className="flex-1">
                  <p className="text-lg font-bold text-blue-600">{reviewCount}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">리뷰</p>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-blue-600">{articleCount}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">지식글</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">정보를 불러올 수 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
