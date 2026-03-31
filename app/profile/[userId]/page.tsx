"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface UserProfile {
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

interface Review {
  id: string;
  rating: number;
  created_at: string;
  whiskeys?: { name: string };
}

interface Article {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

function formatRating(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-/10";
  const clamped = Math.min(10, Math.max(0, n));
  return `${clamped}/10`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    setIsOwnProfile(!!currentUserId && currentUserId === userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    async function fetchProfile() {
      setLoading(true);
      setNotFound(false);

      // Fetch user
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name, username, avatar_url, is_admin, bio, favorite_category, favorite_whiskey, created_at")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setUser(userData);

      // Fetch reviews and articles in parallel
      const [reviewsRes, articlesRes] = await Promise.all([
        supabase
          .from("reviews")
          .select("id, rating, created_at, whiskeys(name)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("articles")
          .select("id, title, category, created_at")
          .eq("author_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      setReviews((reviewsRes.data as unknown as Review[]) ?? []);
      setArticles((articlesRes.data as unknown as Article[]) ?? []);
      setLoading(false);
    }

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60 text-lg animate-pulse">불러오는 중...</div>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-white text-xl font-semibold">사용자를 찾을 수 없습니다</div>
        <button
          onClick={() => router.back()}
          className="text-white/60 hover:text-white text-sm underline underline-offset-4 transition-colors"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const initials = user.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {/* Profile Card */}
      <div className="glass-card p-6 space-y-5">
        {/* Avatar + basic info */}
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center text-white text-3xl font-bold">
                {initials}
              </div>
            )}
          </div>

          {/* Name / username / join date / admin badge */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-xl font-bold truncate">{user.name}</span>
              {isOwnProfile && (
                <button
                  onClick={() => router.push("/mypage")}
                  className="px-2 py-0.5 rounded-full text-xs border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition"
                >
                  ✎ 수정
                </button>
              )}
              {user.is_admin && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  관리자
                </span>
              )}
            </div>
            <div className="text-white/60 text-sm">@{user.username}</div>
            <div className="text-white/40 text-xs">
              가입일 {formatDate(user.created_at)}
            </div>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="border-l-2 border-white/20 pl-4 text-white/60 text-sm leading-relaxed whitespace-pre-line">
            {user.bio}
          </div>
        )}

        {/* Favorite badges */}
        {(user.favorite_category || user.favorite_whiskey) && (
          <div className="flex flex-wrap gap-2">
            {user.favorite_category && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
                <span className="text-white/40 text-xs">선호 카테고리</span>
                <span className="text-white font-medium">{user.favorite_category}</span>
              </div>
            )}
            {user.favorite_whiskey && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
                <span className="text-white/40 text-xs">최애 위스키</span>
                <span className="text-white font-medium">{user.favorite_whiskey}</span>
              </div>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-6 pt-1 border-t border-white/10">
          <div className="text-center">
            <div className="text-white text-xl font-bold">{reviews.length}</div>
            <div className="text-white/40 text-xs mt-0.5">리뷰</div>
          </div>
          <div className="text-center">
            <div className="text-white text-xl font-bold">{articles.length}</div>
            <div className="text-white/40 text-xs mt-0.5">지식글</div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-white font-semibold text-base">작성한 리뷰</h2>
        {reviews.length === 0 ? (
          <div className="text-white/40 text-sm py-4 text-center">작성한 리뷰가 없습니다.</div>
        ) : (
          <ul className="divide-y divide-white/10">
            {reviews.map((review) => (
              <li key={review.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">
                    {review.whiskeys?.name ?? "알 수 없는 위스키"}
                  </div>
                  <div className="text-white/40 text-xs mt-0.5">{formatDate(review.created_at)}</div>
                </div>
                <div className="text-amber-400 text-sm font-medium flex-shrink-0">
                  {formatRating(review.rating)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Articles Section */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-white font-semibold text-base">작성한 지식글</h2>
        {articles.length === 0 ? (
          <div className="text-white/40 text-sm py-4 text-center">작성한 지식글이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-white/10">
            {articles.map((article) => (
              <li key={article.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{article.title}</div>
                  <div className="text-white/40 text-xs mt-0.5">{formatDate(article.created_at)}</div>
                </div>
                {article.category && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/60">
                    {article.category}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
