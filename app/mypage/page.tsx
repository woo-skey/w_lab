"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  created_at: string;
}

interface Bar {
  id: string;
  bar_name: string;
  notes: string;
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  whiskeys?: { name: string; type: string };
}

interface Article {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

interface Schedule {
  id: string;
  name: string;
  created_at: string;
}

interface Whiskey {
  id: string;
  name: string;
  type: string;
  region: string;
  created_at: string;
}

const STAR = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];

export default function MyPage() {
  const router = useRouter();
  const [, setUserId] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bars, setBars] = useState<Bar[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [whiskeys, setWhiskeys] = useState<Whiskey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (!id) { router.push("/login"); return; }
    setUserId(id);
    fetchAll(id);
  }, []);

  const fetchAll = async (id: string) => {
    const [profileRes, barsRes, reviewsRes, articlesRes, schedulesRes, whiskeysRes] = await Promise.allSettled([
      supabase.from("users").select("id, name, username, created_at").eq("id", id).single(),
      supabase.from("bars").select("id, bar_name, notes, created_at").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("reviews").select("id, rating, review_text, created_at, whiskeys(name, type)").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("articles").select("id, title, category, created_at").eq("author_id", id).order("created_at", { ascending: false }),
      supabase.from("schedules").select("id, name, created_at").eq("created_by", id).order("created_at", { ascending: false }),
      supabase.from("whiskeys").select("id, name, type, region, created_at").eq("created_by", id).order("created_at", { ascending: false }),
    ]);

    if (profileRes.status === "fulfilled" && profileRes.value.data) setProfile(profileRes.value.data);
    if (barsRes.status === "fulfilled" && barsRes.value.data) setBars(barsRes.value.data);
    if (reviewsRes.status === "fulfilled" && reviewsRes.value.data) setReviews(reviewsRes.value.data as unknown as Review[]);
    if (articlesRes.status === "fulfilled" && articlesRes.value.data) setArticles(articlesRes.value.data);
    if (schedulesRes.status === "fulfilled" && schedulesRes.value.data) setSchedules(schedulesRes.value.data);
    if (whiskeysRes.status === "fulfilled" && whiskeysRes.value.data) setWhiskeys(whiskeysRes.value.data);

    setLoading(false);
  };

  const tabs = [
    { id: "overview", label: "개요" },
    { id: "reviews", label: `리뷰 (${reviews.length})` },
    { id: "whiskeys", label: `위스키 (${whiskeys.length})` },
    { id: "articles", label: `지식글 (${articles.length})` },
    { id: "bars", label: `Bar (${bars.length})` },
    { id: "schedules", label: `일정 (${schedules.length})` },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold flex-shrink-0">
              {(profile?.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">@{profile?.username}</p>
              <p className="text-gray-400 text-xs mt-1">
                가입일: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ko-KR") : "-"}
              </p>
            </div>
          </div>

          {/* 활동 통계 */}
          <div className="grid grid-cols-5 gap-4 mt-8 pt-6 border-t border-gray-100">
            {[
              { label: "리뷰", count: reviews.length },
              { label: "위스키", count: whiskeys.length },
              { label: "지식글", count: articles.length },
              { label: "Bar", count: bars.length },
              { label: "일정", count: schedules.length },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stat.count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 flex-wrap mb-6">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === tab.id ? "bg-blue-500 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 개요 탭 */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* 최근 리뷰 */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-3">최근 리뷰</h2>
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-sm">작성한 리뷰가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 truncate">{r.whiskeys?.name || "위스키"}</span>
                      <span className="text-blue-500 text-xs ml-2 flex-shrink-0">{STAR[r.rating]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 최근 지식글 */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-3">최근 지식글</h2>
              {articles.length === 0 ? (
                <p className="text-gray-400 text-sm">작성한 글이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {articles.slice(0, 3).map((a) => (
                    <div key={a.id} className="text-sm">
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-2">{a.category}</span>
                      <span className="text-gray-700">{a.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 추천 Bar */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-3">추천한 Bar</h2>
              {bars.length === 0 ? (
                <p className="text-gray-400 text-sm">추천한 바가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {bars.slice(0, 3).map((b) => (
                    <div key={b.id} className="text-sm text-gray-700">{b.bar_name}</div>
                  ))}
                </div>
              )}
            </div>

            {/* 내 일정 */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-3">만든 일정</h2>
              {schedules.length === 0 ? (
                <p className="text-gray-400 text-sm">만든 일정이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {schedules.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{s.name}</span>
                      <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 리뷰 탭 */}
        {activeTab === "reviews" && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-400">작성한 리뷰가 없습니다.</div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-xl shadow border border-gray-100 p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">{r.whiskeys?.name || "위스키"}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{r.whiskeys?.type}</span>
                    </div>
                    <span className="text-blue-500">{STAR[r.rating]}</span>
                  </div>
                  {r.review_text && <p className="text-gray-600 text-sm mt-2">{r.review_text}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 위스키 탭 */}
        {activeTab === "whiskeys" && (
          <div className="grid md:grid-cols-2 gap-3">
            {whiskeys.length === 0 ? (
              <div className="text-center py-12 text-gray-400 col-span-2">추가한 위스키가 없습니다.</div>
            ) : (
              whiskeys.map((w) => (
                <div key={w.id} className="bg-white rounded-xl shadow border border-gray-100 p-5">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-900">{w.name}</p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{w.type}</span>
                  </div>
                  {w.region && <p className="text-sm text-gray-500 mt-1">📍 {w.region}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(w.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 지식글 탭 */}
        {activeTab === "articles" && (
          <div className="space-y-3">
            {articles.length === 0 ? (
              <div className="text-center py-12 text-gray-400">작성한 글이 없습니다.</div>
            ) : (
              articles.map((a) => (
                <div key={a.id} className="bg-white rounded-xl shadow border border-gray-100 p-5">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-900">{a.title}</p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">{a.category}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{new Date(a.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Bar 탭 */}
        {activeTab === "bars" && (
          <div className="grid md:grid-cols-2 gap-3">
            {bars.length === 0 ? (
              <div className="text-center py-12 text-gray-400 col-span-2">추천한 바가 없습니다.</div>
            ) : (
              bars.map((b) => (
                <div key={b.id} className="bg-white rounded-xl shadow border border-gray-100 p-5">
                  <p className="font-bold text-gray-900">{b.bar_name}</p>
                  {b.notes && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{b.notes}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(b.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 일정 탭 */}
        {activeTab === "schedules" && (
          <div className="space-y-3">
            {schedules.length === 0 ? (
              <div className="text-center py-12 text-gray-400">만든 일정이 없습니다.</div>
            ) : (
              schedules.map((s) => (
                <div key={s.id} className="bg-white rounded-xl shadow border border-gray-100 p-5 flex justify-between items-center">
                  <p className="font-bold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
