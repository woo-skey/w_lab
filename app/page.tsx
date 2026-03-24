"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface RecentReview {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  users?: { name: string };
  whiskeys?: { name: string };
}

interface TopWhiskey {
  id: string;
  name: string;
  type: string;
  avgRating: number;
  reviewCount: number;
}

interface ConfirmedSchedule {
  id: string;
  name: string;
  confirmed_date: string;
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [topWhiskeys, setTopWhiskeys] = useState<TopWhiskey[]>([]);
  const [confirmedSchedule, setConfirmedSchedule] = useState<ConfirmedSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    const name = localStorage.getItem("userName");
    setLoggedIn(!!id);
    if (name) setUserName(name);
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [reviewsRes, schedulesRes, whiskeyRatingsRes] = await Promise.all([
        supabase
          .from("reviews")
          .select("id, rating, review_text, created_at, users(name), whiskeys(name)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("schedules")
          .select("id, name, confirmed_date")
          .not("confirmed_date", "is", null)
          .gte("confirmed_date", new Date().toISOString().slice(0, 10))
          .order("confirmed_date", { ascending: true })
          .limit(1),
        supabase
          .from("reviews")
          .select("whiskey_id, rating, whiskeys(id, name, type)"),
      ]);

      setRecentReviews((reviewsRes.data || []) as unknown as RecentReview[]);

      if (schedulesRes.data && schedulesRes.data.length > 0) {
        setConfirmedSchedule(schedulesRes.data[0] as ConfirmedSchedule);
      }

      // 평균 평점 상위 위스키 계산
      const ratingData = (whiskeyRatingsRes.data || []) as unknown as { whiskey_id: string; rating: number; whiskeys: { id: string; name: string; type: string } | null }[];
      const byWhiskey: Record<string, { name: string; type: string; ratings: number[] }> = {};
      ratingData.forEach((r) => {
        if (!r.whiskeys) return;
        const id = r.whiskey_id;
        if (!byWhiskey[id]) byWhiskey[id] = { name: r.whiskeys.name, type: r.whiskeys.type, ratings: [] };
        byWhiskey[id].ratings.push(r.rating);
      });
      const top = Object.entries(byWhiskey)
        .filter(([, v]) => v.ratings.length >= 1)
        .map(([id, v]) => ({
          id,
          name: v.name,
          type: v.type,
          avgRating: v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length,
          reviewCount: v.ratings.length,
        }))
        .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
        .slice(0, 3);
      setTopWhiskeys(top);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* 히어로 */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ textShadow: "0 0 40px rgba(99,102,241,0.4)" }}>
          {loggedIn ? `안녕하세요, ${userName || "멤버"}님` : "위스키 연구소"}
        </h1>
        <p className="text-white/50 mb-6 text-lg">
          {loggedIn ? "오늘도 좋은 위스키 한 잔 하셨나요?" : "위스키를 탐구하는 작은 공간입니다."}
        </p>
        {!loggedIn && (
          <Link href="/signup" className="px-7 py-2.5 border border-indigo-400/60 text-indigo-300 rounded-xl hover:bg-indigo-500/10 transition font-medium text-sm">
            가입하기
          </Link>
        )}
      </section>

      <div className="max-w-5xl mx-auto px-4 pb-16 space-y-8">
        {/* 확정 일정 배너 */}
        {confirmedSchedule && (
          <Link href="/schedule" className="block glass-card rounded-2xl px-6 py-4 flex items-center gap-4 hover:bg-white/8 transition" style={{ border: "1px solid rgba(234,179,8,0.3)" }}>
            <span className="text-2xl">📌</span>
            <div>
              <p className="text-amber-300 font-semibold">{confirmedSchedule.name}</p>
              <p className="text-amber-200/70 text-sm">
                {new Date(confirmedSchedule.confirmed_date + "T00:00:00").toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
              </p>
            </div>
            <span className="ml-auto text-white/30 text-sm">일정 보기 →</span>
          </Link>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* 최근 리뷰 */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-white">최근 리뷰</h2>
              <Link href="/reviews" className="text-xs text-indigo-400 hover:text-indigo-300 transition">전체 보기 →</Link>
            </div>
            {loading ? (
              <div className="glass-card rounded-2xl p-6 text-center text-white/30 text-sm">로딩 중...</div>
            ) : recentReviews.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center text-white/30 text-sm">아직 리뷰가 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {recentReviews.map((r) => (
                  <Link key={r.id} href="/reviews" className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/8 transition block">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{(r.whiskeys as any)?.name || "알 수 없음"}</p>
                      <p className="text-white/40 text-xs truncate">{(r.users as any)?.name || "알 수 없음"}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-indigo-300 font-bold text-sm">{r.rating}/10</p>
                      <p className="text-white/25 text-xs">{new Date(r.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 평점 TOP 3 */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-white">평점 TOP 위스키</h2>
              <Link href="/reviews" className="text-xs text-indigo-400 hover:text-indigo-300 transition">전체 보기 →</Link>
            </div>
            {loading ? (
              <div className="glass-card rounded-2xl p-6 text-center text-white/30 text-sm">로딩 중...</div>
            ) : topWhiskeys.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center text-white/30 text-sm">아직 평점 데이터가 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {topWhiskeys.map((w, i) => (
                  <Link key={w.id} href="/reviews" className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/8 transition block">
                    <span className="text-white/30 font-bold text-lg w-6 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{w.name}</p>
                      <p className="text-white/40 text-xs">{w.type} · 리뷰 {w.reviewCount}개</p>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-amber-300 font-bold text-sm">{w.avgRating.toFixed(1)}/10</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/reviews", icon: "🥃", label: "위스키 리뷰" },
            { href: "/encyclopedia", icon: "📖", label: "위스키 백과" },
            { href: "/bars", icon: "🍸", label: "Bar 추천" },
            { href: "/schedule", icon: "📅", label: "일정 맞추기" },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="glass-card rounded-2xl p-5 text-center hover:bg-white/10 transition group">
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="text-white/70 text-sm font-medium group-hover:text-white transition">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
