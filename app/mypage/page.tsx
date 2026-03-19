"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  created_at: string;
  avatar_url?: string;
  is_admin?: boolean;
}

interface Bar { id: string; bar_name: string; notes: string; created_at: string; }
interface Review { id: string; rating: number; review_text: string; created_at: string; whiskeys?: { name: string; type: string }; }
interface Article { id: string; title: string; category: string; created_at: string; }
interface Schedule { id: string; name: string; created_at: string; }
interface Whiskey { id: string; name: string; type: string; region: string; created_at: string; }

interface AdminUser {
  id: string;
  name: string;
  username: string;
  created_at: string;
  is_admin: boolean;
  avatar_url?: string;
  review_count?: number;
  article_count?: number;
  bar_count?: number;
}

interface AdminStats {
  totalUsers: number;
  totalReviews: number;
  totalArticles: number;
  totalBars: number;
  totalWhiskeys: number;
  totalSchedules: number;
}

const STAR = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];

export default function MyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bars, setBars] = useState<Bar[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [whiskeys, setWhiskeys] = useState<Whiskey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 관리자 전용
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (!id) { router.push("/login"); return; }
    setUserId(id);
    fetchAll(id);
  }, []);

  const fetchAll = async (id: string) => {
    const [profileRes, barsRes, reviewsRes, articlesRes, schedulesRes, whiskeysRes] = await Promise.allSettled([
      supabase.from("users").select("id, name, username, created_at, avatar_url, is_admin").eq("id", id).single(),
      supabase.from("bars").select("id, bar_name, notes, created_at").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("reviews").select("id, rating, review_text, created_at, whiskeys(name, type)").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("articles").select("id, title, category, created_at").eq("author_id", id).order("created_at", { ascending: false }),
      supabase.from("schedules").select("id, name, created_at").eq("created_by", id).order("created_at", { ascending: false }),
      supabase.from("whiskeys").select("id, name, type, region, created_at").eq("created_by", id).order("created_at", { ascending: false }),
    ]);

    if (profileRes.status === "fulfilled" && profileRes.value.data) {
      const profileData = profileRes.value.data;
      setProfile(profileData);
      if (profileData.is_admin) fetchAdminData();
    }
    if (barsRes.status === "fulfilled" && barsRes.value.data) setBars(barsRes.value.data);
    if (reviewsRes.status === "fulfilled" && reviewsRes.value.data) setReviews(reviewsRes.value.data as unknown as Review[]);
    if (articlesRes.status === "fulfilled" && articlesRes.value.data) setArticles(articlesRes.value.data);
    if (schedulesRes.status === "fulfilled" && schedulesRes.value.data) setSchedules(schedulesRes.value.data);
    if (whiskeysRes.status === "fulfilled" && whiskeysRes.value.data) setWhiskeys(whiskeysRes.value.data);

    setLoading(false);
  };

  const fetchAdminData = async () => {
    setAdminLoading(true);
    try {
      const [usersRes, reviewsRes, articlesRes, barsRes, whiskeysRes, schedulesRes] = await Promise.allSettled([
        supabase.from("users").select("id, name, username, created_at, is_admin, avatar_url").order("created_at", { ascending: false }),
        supabase.from("reviews").select("id, user_id"),
        supabase.from("articles").select("id, author_id"),
        supabase.from("bars").select("id, user_id"),
        supabase.from("whiskeys").select("id"),
        supabase.from("schedules").select("id"),
      ]);

      const usersData = usersRes.status === "fulfilled" ? (usersRes.value.data || []) : [];
      const reviewsData = reviewsRes.status === "fulfilled" ? (reviewsRes.value.data || []) : [];
      const articlesData = articlesRes.status === "fulfilled" ? (articlesRes.value.data || []) : [];
      const barsData = barsRes.status === "fulfilled" ? (barsRes.value.data || []) : [];

      // 유저별 활동 수 계산
      const reviewCountMap: Record<string, number> = {};
      reviewsData.forEach((r) => { reviewCountMap[r.user_id] = (reviewCountMap[r.user_id] || 0) + 1; });
      const articleCountMap: Record<string, number> = {};
      articlesData.forEach((a) => { articleCountMap[a.author_id] = (articleCountMap[a.author_id] || 0) + 1; });
      const barCountMap: Record<string, number> = {};
      barsData.forEach((b) => { barCountMap[b.user_id] = (barCountMap[b.user_id] || 0) + 1; });

      const enrichedUsers: AdminUser[] = usersData.map((u) => ({
        ...u,
        review_count: reviewCountMap[u.id] || 0,
        article_count: articleCountMap[u.id] || 0,
        bar_count: barCountMap[u.id] || 0,
      }));
      setAdminUsers(enrichedUsers);

      setAdminStats({
        totalUsers: usersData.length,
        totalReviews: reviewsData.length,
        totalArticles: articlesData.length,
        totalBars: barsData.length,
        totalWhiskeys: whiskeysRes.status === "fulfilled" ? (whiskeysRes.value.data?.length || 0) : 0,
        totalSchedules: schedulesRes.status === "fulfilled" ? (schedulesRes.value.data?.length || 0) : 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleToggleAdmin = async (targetId: string, currentAdmin: boolean) => {
    if (targetId === userId) { alert("본인의 관리자 권한은 변경할 수 없습니다."); return; }
    try {
      const { error } = await supabase.from("users").update({ is_admin: !currentAdmin }).eq("id", targetId);
      if (error) throw error;
      setAdminUsers((prev) => prev.map((u) => u.id === targetId ? { ...u, is_admin: !currentAdmin } : u));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (targetId: string, targetName: string) => {
    if (targetId === userId) { alert("본인 계정은 여기서 탈퇴할 수 없습니다."); return; }
    if (!confirm(`"${targetName}" 회원을 탈퇴시킬까요?\n해당 유저의 모든 데이터가 삭제됩니다.`)) return;
    setDeletingUserId(targetId);
    try {
      // 연관 데이터 삭제
      await Promise.allSettled([
        supabase.from("reviews").delete().eq("user_id", targetId),
        supabase.from("articles").delete().eq("author_id", targetId),
        supabase.from("bars").delete().eq("user_id", targetId),
        supabase.from("schedules").delete().eq("created_by", targetId),
        supabase.from("whiskeys").delete().eq("created_by", targetId),
        supabase.from("comments").delete().eq("user_id", targetId),
        supabase.from("review_comments").delete().eq("user_id", targetId),
      ]);
      const { error } = await supabase.from("users").delete().eq("id", targetId);
      if (error) throw error;
      setAdminUsers((prev) => prev.filter((u) => u.id !== targetId));
      if (adminStats) setAdminStats({ ...adminStats, totalUsers: adminStats.totalUsers - 1 });
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했습니다.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = data.publicUrl + `?t=${Date.now()}`;

      await supabase.from("users").update({ avatar_url: avatarUrl }).eq("id", userId);
      setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : prev);
    } catch (err) {
      console.error(err);
      alert("업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "개요" },
    { id: "reviews", label: `리뷰 (${reviews.length})` },
    { id: "whiskeys", label: `위스키 (${whiskeys.length})` },
    { id: "articles", label: `지식글 (${articles.length})` },
    { id: "bars", label: `Bar (${bars.length})` },
    { id: "schedules", label: `일정 (${schedules.length})` },
    ...(profile?.is_admin ? [{ id: "admin", label: "🛡️ 관리자" }] : []),
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
            {/* 아바타 */}
            <div className="relative flex-shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold cursor-pointer overflow-hidden hover:opacity-80 transition"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (profile?.name || "?")[0].toUpperCase()
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>
                {uploading ? "..." : "✎"}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
                {profile?.is_admin && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">관리자</span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">@{profile?.username}</p>
              <p className="text-gray-400 text-xs mt-1">
                가입일: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ko-KR") : "-"}
              </p>
              <p className="text-xs text-blue-400 mt-1 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>
                프로필 사진 변경
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
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-3">최근 리뷰</h2>
              {reviews.length === 0 ? <p className="text-gray-400 text-sm">작성한 리뷰가 없습니다.</p> : (
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
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-3">최근 지식글</h2>
              {articles.length === 0 ? <p className="text-gray-400 text-sm">작성한 글이 없습니다.</p> : (
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
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-3">추천한 Bar</h2>
              {bars.length === 0 ? <p className="text-gray-400 text-sm">추천한 바가 없습니다.</p> : (
                <div className="space-y-2">
                  {bars.slice(0, 3).map((b) => (
                    <div key={b.id} className="text-sm text-gray-700">{b.bar_name}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-3">만든 일정</h2>
              {schedules.length === 0 ? <p className="text-gray-400 text-sm">만든 일정이 없습니다.</p> : (
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

        {activeTab === "reviews" && (
          <div className="space-y-3">
            {reviews.length === 0 ? <div className="text-center py-12 text-gray-400">작성한 리뷰가 없습니다.</div> : (
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

        {activeTab === "whiskeys" && (
          <div className="grid md:grid-cols-2 gap-3">
            {whiskeys.length === 0 ? <div className="text-center py-12 text-gray-400 col-span-2">추가한 위스키가 없습니다.</div> : (
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

        {activeTab === "articles" && (
          <div className="space-y-3">
            {articles.length === 0 ? <div className="text-center py-12 text-gray-400">작성한 글이 없습니다.</div> : (
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

        {activeTab === "bars" && (
          <div className="grid md:grid-cols-2 gap-3">
            {bars.length === 0 ? <div className="text-center py-12 text-gray-400 col-span-2">추천한 바가 없습니다.</div> : (
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

        {activeTab === "schedules" && (
          <div className="space-y-3">
            {schedules.length === 0 ? <div className="text-center py-12 text-gray-400">만든 일정이 없습니다.</div> : (
              schedules.map((s) => (
                <div key={s.id} className="bg-white rounded-xl shadow border border-gray-100 p-5 flex justify-between items-center">
                  <p className="font-bold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 관리자 패널 */}
        {activeTab === "admin" && profile?.is_admin && (
          <div className="space-y-6">
            {/* 사이트 전체 통계 */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4 text-lg">사이트 통계</h2>
              {adminLoading ? (
                <p className="text-gray-400 text-sm">로딩 중...</p>
              ) : adminStats ? (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {[
                    { label: "전체 유저", count: adminStats.totalUsers, color: "text-blue-600" },
                    { label: "전체 리뷰", count: adminStats.totalReviews, color: "text-green-600" },
                    { label: "전체 지식글", count: adminStats.totalArticles, color: "text-purple-600" },
                    { label: "전체 Bar", count: adminStats.totalBars, color: "text-orange-500" },
                    { label: "전체 위스키", count: adminStats.totalWhiskeys, color: "text-amber-600" },
                    { label: "전체 일정", count: adminStats.totalSchedules, color: "text-pink-500" },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* 유저 관리 */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-900 text-lg">유저 관리</h2>
                <span className="text-sm text-gray-500">{adminUsers.length}명</span>
              </div>
              {adminLoading ? (
                <p className="text-gray-400 text-sm">로딩 중...</p>
              ) : (
                <div className="space-y-3">
                  {adminUsers.map((u) => (
                    <div key={u.id} className={`flex items-center justify-between p-4 rounded-lg border ${u.id === userId ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm overflow-hidden flex-shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            (u.name || "?")[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">{u.name}</span>
                            {u.is_admin && <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">관리자</span>}
                            {u.id === userId && <span className="px-1.5 py-0.5 bg-gray-400 text-white text-xs rounded-full">본인</span>}
                          </div>
                          <p className="text-xs text-gray-500">@{u.username}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            가입: {new Date(u.created_at).toLocaleDateString("ko-KR")} · 리뷰 {u.review_count} · 글 {u.article_count} · Bar {u.bar_count}
                          </p>
                        </div>
                      </div>
                      {u.id !== userId && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${
                              u.is_admin
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {u.is_admin ? "관리자 해제" : "관리자 지정"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={deletingUserId === u.id}
                            className="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition font-medium disabled:opacity-50"
                          >
                            {deletingUserId === u.id ? "삭제 중..." : "회원탈퇴"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
