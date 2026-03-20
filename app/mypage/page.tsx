"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { notifyAllUsers } from "@/lib/notifications";
import RichTextEditor from "@/components/RichTextEditor";
import SafeHtml from "@/components/SafeHtml";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  created_at: string;
  avatar_url?: string;
  is_admin?: boolean;
  bio?: string;
  favorite_category?: string;
  favorite_whiskey?: string;
}

interface Bar { id: string; bar_name: string; notes: string; created_at: string; }
interface Review { id: string; rating: number; review_text: string; created_at: string; whiskeys?: { name: string; type: string }; }
interface Article { id: string; title: string; category: string; created_at: string; }
interface Schedule { id: string; name: string; created_at: string; }
interface Whiskey { id: string; name: string; type: string; region: string; created_at: string; }
interface UserComment { id: string; content: string; created_at: string; source: "article" | "review"; target_title?: string; }

interface AllAnnouncement { id: string; title: string; content: string; author_id: string; author_name?: string; created_at: string; }
interface AllArticle { id: string; title: string; content: string; category: string; author_id: string; created_at: string; users?: { name: string }; }
interface AllReview { id: string; rating: number; review_text: string; user_id: string; created_at: string; users?: { name: string }; whiskeys?: { name: string }; }
interface AllBar { id: string; bar_name: string; link: string; notes: string; user_id: string; created_at: string; users?: { name: string }; }
interface AllWhiskey { id: string; name: string; type: string; region: string; age: number; abv: number; created_by: string; created_at: string; }

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
  const [userComments, setUserComments] = useState<UserComment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ bio: "", favorite_category: "", favorite_whiskey: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  // 관리자 전용
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [adminSubTab, setAdminSubTab] = useState("stats");
  const [allArticles, setAllArticles] = useState<AllArticle[]>([]);
  const [allReviews, setAllReviews] = useState<AllReview[]>([]);
  const [allBars, setAllBars] = useState<AllBar[]>([]);
  const [allWhiskeys, setAllWhiskeys] = useState<AllWhiskey[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [editingAdminArticle, setEditingAdminArticle] = useState<AllArticle | null>(null);
  const [editingAdminBar, setEditingAdminBar] = useState<AllBar | null>(null);
  const [editingAdminWhiskey, setEditingAdminWhiskey] = useState<AllWhiskey | null>(null);
  const [allAnnouncements, setAllAnnouncements] = useState<AllAnnouncement[]>([]);
  const [editingAdminAnnouncement, setEditingAdminAnnouncement] = useState<AllAnnouncement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "" });
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (!id) { router.push("/login"); return; }
    setUserId(id);
    fetchAll(id);
  }, []);

  const fetchAll = async (id: string) => {
    const [profileRes, barsRes, reviewsRes, articlesRes, schedulesRes, whiskeysRes, articleCommentsRes, reviewCommentsRes] = await Promise.allSettled([
      supabase.from("users").select("id, name, username, created_at, avatar_url, is_admin, bio, favorite_category, favorite_whiskey").eq("id", id).single(),
      supabase.from("bars").select("id, bar_name, notes, created_at").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("reviews").select("id, rating, review_text, created_at, whiskeys(name, type)").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("articles").select("id, title, category, created_at").eq("author_id", id).order("created_at", { ascending: false }),
      supabase.from("schedules").select("id, name, created_at").eq("created_by", id).order("created_at", { ascending: false }),
      supabase.from("whiskeys").select("id, name, type, region, created_at").eq("created_by", id).order("created_at", { ascending: false }),
      supabase.from("comments").select("id, content, created_at, articles(title)").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("review_comments").select("id, content, created_at").eq("user_id", id).order("created_at", { ascending: false }),
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

    // 댓글 합치기
    // eslint-disable-next-line
    const ac: any[] = articleCommentsRes.status === "fulfilled" ? (articleCommentsRes.value.data || []) : []; // eslint-disable-line
    // eslint-disable-next-line
    const rc: any[] = reviewCommentsRes.status === "fulfilled" ? (reviewCommentsRes.value.data || []) : []; // eslint-disable-line
    const combined: UserComment[] = [
      ...ac.map((c) => ({
        id: c.id, content: c.content, created_at: c.created_at,
        source: "article" as const,
        target_title: Array.isArray(c.articles) ? c.articles[0]?.title : c.articles?.title || "지식글",
      })),
      ...rc.map((c) => ({
        id: c.id, content: c.content, created_at: c.created_at,
        source: "review" as const,
        target_title: "위스키 리뷰",
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setUserComments(combined);

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

  const fetchAdminContent = async (tab: string) => {
    setContentLoading(true);
    try {
      if (tab === "notices") {
        const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
        setAllAnnouncements(data || []);
      } else if (tab === "articles") {
        const { data } = await supabase.from("articles").select("*, users(name)").order("created_at", { ascending: false });
        setAllArticles(data || []);
      } else if (tab === "reviews") {
        const { data } = await supabase.from("reviews").select("*, users(name), whiskeys(name)").order("created_at", { ascending: false });
        setAllReviews((data || []) as unknown as AllReview[]);
      } else if (tab === "bars") {
        const { data } = await supabase.from("bars").select("*, users(name)").order("created_at", { ascending: false });
        setAllBars(data || []);
      } else if (tab === "whiskeys") {
        const { data } = await supabase.from("whiskeys").select("*").order("created_at", { ascending: false });
        setAllWhiskeys(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContentLoading(false);
    }
  };

  const handleAdminSubTab = (tab: string) => {
    setAdminSubTab(tab);
    if (["notices", "articles", "reviews", "bars", "whiskeys"].includes(tab)) fetchAdminContent(tab);
  };

  const handleAdminSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
    setAnnouncementSubmitting(true);
    try {
      const authorName = localStorage.getItem("userName") || "관리자";
      const { error } = await supabase.from("announcements").insert([{
        title: announcementForm.title, content: announcementForm.content,
        author_id: userId, author_name: authorName,
      }]);
      if (error) throw error;
      await notifyAllUsers("announcement", `📢 새 공지: ${announcementForm.title}`, "/notices");
      setAnnouncementForm({ title: "", content: "" });
      setShowAnnouncementForm(false);
      fetchAdminContent("notices");
    } catch (err) { console.error(err); }
    finally { setAnnouncementSubmitting(false); }
  };
  const handleAdminSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdminAnnouncement) return;
    await supabase.from("announcements").update({ title: editingAdminAnnouncement.title, content: editingAdminAnnouncement.content }).eq("id", editingAdminAnnouncement.id);
    setAllAnnouncements((prev) => prev.map((a) => a.id === editingAdminAnnouncement.id ? { ...a, ...editingAdminAnnouncement } : a));
    setEditingAdminAnnouncement(null);
  };
  const handleAdminDeleteAnnouncement = async (id: string) => {
    if (!confirm("이 공지를 삭제할까요?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    setAllAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAdminDeleteArticle = async (id: string) => {
    if (!confirm("이 글을 삭제할까요?")) return;
    await supabase.from("articles").delete().eq("id", id);
    setAllArticles((prev) => prev.filter((a) => a.id !== id));
  };
  const handleAdminSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdminArticle) return;
    await supabase.from("articles").update({ title: editingAdminArticle.title, content: editingAdminArticle.content, category: editingAdminArticle.category }).eq("id", editingAdminArticle.id);
    setAllArticles((prev) => prev.map((a) => a.id === editingAdminArticle.id ? { ...a, ...editingAdminArticle } : a));
    setEditingAdminArticle(null);
  };

  const handleAdminDeleteReview = async (id: string) => {
    if (!confirm("이 리뷰를 삭제할까요?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    setAllReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAdminDeleteBar = async (id: string) => {
    if (!confirm("이 Bar를 삭제할까요?")) return;
    await supabase.from("bars").delete().eq("id", id);
    setAllBars((prev) => prev.filter((b) => b.id !== id));
  };
  const handleAdminSaveBar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdminBar) return;
    await supabase.from("bars").update({ bar_name: editingAdminBar.bar_name, link: editingAdminBar.link, notes: editingAdminBar.notes }).eq("id", editingAdminBar.id);
    setAllBars((prev) => prev.map((b) => b.id === editingAdminBar.id ? { ...b, ...editingAdminBar } : b));
    setEditingAdminBar(null);
  };

  const handleAdminDeleteWhiskey = async (id: string) => {
    if (!confirm("이 위스키를 삭제할까요? 관련 리뷰도 삭제됩니다.")) return;
    await supabase.from("whiskeys").delete().eq("id", id);
    setAllWhiskeys((prev) => prev.filter((w) => w.id !== id));
  };
  const handleAdminSaveWhiskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdminWhiskey) return;
    await supabase.from("whiskeys").update({ name: editingAdminWhiskey.name, type: editingAdminWhiskey.type, region: editingAdminWhiskey.region, age: editingAdminWhiskey.age, abv: editingAdminWhiskey.abv }).eq("id", editingAdminWhiskey.id);
    setAllWhiskeys((prev) => prev.map((w) => w.id === editingAdminWhiskey.id ? { ...w, ...editingAdminWhiskey } : w));
    setEditingAdminWhiskey(null);
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

  const handleSaveProfile = async () => {
    if (!userId) return;
    setProfileSaving(true);
    await supabase.from("users").update({
      bio: profileForm.bio || null,
      favorite_category: profileForm.favorite_category || null,
      favorite_whiskey: profileForm.favorite_whiskey || null,
    }).eq("id", userId);
    setProfile((prev) => prev ? { ...prev, ...profileForm } : prev);
    setEditingProfile(false);
    setProfileSaving(false);
  };

  const tabs = [
    { id: "overview", label: "개요" },
    { id: "reviews", label: `리뷰 (${reviews.length})` },
    { id: "whiskeys", label: `위스키 (${whiskeys.length})` },
    { id: "articles", label: `지식글 (${articles.length})` },
    { id: "bars", label: `Bar (${bars.length})` },
    { id: "schedules", label: `일정 (${schedules.length})` },
    { id: "comments", label: `댓글 (${userComments.length})` },
    ...(profile?.is_admin ? [{ id: "admin", label: "🛡️ 관리자" }] : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* 프로필 카드 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-100 dark:border-gray-800 p-8 mb-8">
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.name}</h1>
                {profile?.is_admin && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">관리자</span>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">@{profile?.username}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                가입일: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ko-KR") : "-"}
              </p>
              <p className="text-xs text-blue-400 mt-1 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>
                프로필 사진 변경
              </p>
            </div>
          </div>

          {/* 한줄소개 / 관심주류 / 최애위스키 */}
          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            {editingProfile ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">한 줄 소개</label>
                  <input
                    type="text"
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    placeholder="나를 한 마디로 소개해보세요"
                    maxLength={80}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">관심 주류 카테고리</label>
                    <select
                      value={profileForm.favorite_category}
                      onChange={(e) => setProfileForm({ ...profileForm, favorite_category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">선택</option>
                      <option>🥃 스카치 위스키</option>
                      <option>🥃 아이리시 위스키</option>
                      <option>🥃 버번/라이 위스키</option>
                      <option>🍺 맥주</option>
                      <option>🍷 와인</option>
                      <option>🍶 사케</option>
                      <option>🍸 칵테일</option>
                      <option>🥂 샴페인</option>
                      <option>🫙 전통주</option>
                      <option>🍹 기타</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">최애 위스키</label>
                    <input
                      type="text"
                      value={profileForm.favorite_whiskey}
                      onChange={(e) => setProfileForm({ ...profileForm, favorite_whiskey: e.target.value })}
                      placeholder="ex) Lagavulin 16"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} disabled={profileSaving}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {profileSaving ? "저장 중..." : "저장"}
                  </button>
                  <button onClick={() => setEditingProfile(false)}
                    className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 text-sm">
                  {profile?.bio && <p className="text-gray-700 dark:text-gray-200 italic border-l-2 border-blue-400 pl-3">{profile.bio}</p>}
                  <div className="flex flex-wrap gap-3 text-gray-500 dark:text-gray-400 text-xs">
                    {profile?.favorite_category && <span>🍹 {profile.favorite_category}</span>}
                    {profile?.favorite_whiskey && <span>🥃 최애: {profile.favorite_whiskey}</span>}
                  </div>
                  {!profile?.bio && !profile?.favorite_category && !profile?.favorite_whiskey && (
                    <p className="text-gray-400 dark:text-gray-600 text-xs">한 줄 소개와 관심 주류를 설정해보세요.</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setProfileForm({
                      bio: profile?.bio || "",
                      favorite_category: profile?.favorite_category || "",
                      favorite_whiskey: profile?.favorite_whiskey || "",
                    });
                    setEditingProfile(true);
                  }}
                  className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0"
                >
                  ✎ 편집
                </button>
              </div>
            )}
          </div>

          {/* 활동 통계 */}
          <div className="grid grid-cols-5 gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            {[
              { label: "리뷰", count: reviews.length },
              { label: "위스키", count: whiskeys.length },
              { label: "지식글", count: articles.length },
              { label: "Bar", count: bars.length },
              { label: "일정", count: schedules.length },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stat.count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 flex-wrap mb-6">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === tab.id ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-300"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 개요 탭 */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">최근 리뷰</h2>
              {reviews.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm">작성한 리뷰가 없습니다.</p> : (
                <div className="space-y-2">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} onClick={() => router.push("/reviews")} className="flex justify-between items-center text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 transition">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{r.whiskeys?.name || "위스키"}</span>
                      <span className="text-blue-500 text-xs ml-2 flex-shrink-0">{STAR[r.rating]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">최근 지식글</h2>
              {articles.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm">작성한 글이 없습니다.</p> : (
                <div className="space-y-2">
                  {articles.slice(0, 3).map((a) => (
                    <div key={a.id} onClick={() => router.push("/articles")} className="text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 transition">
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-2">{a.category}</span>
                      <span className="text-gray-700 dark:text-gray-300">{a.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">추천한 Bar</h2>
              {bars.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm">추천한 바가 없습니다.</p> : (
                <div className="space-y-2">
                  {bars.slice(0, 3).map((b) => (
                    <div key={b.id} onClick={() => router.push("/bars")} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 transition">{b.bar_name}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">만든 일정</h2>
              {schedules.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm">만든 일정이 없습니다.</p> : (
                <div className="space-y-2">
                  {schedules.slice(0, 3).map((s) => (
                    <div key={s.id} onClick={() => router.push("/schedule")} className="flex justify-between items-center text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 transition">
                      <span className="text-gray-700 dark:text-gray-300">{s.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(s.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-3">
            {reviews.length === 0 ? <div className="text-center py-12 text-gray-400 dark:text-gray-500">작성한 리뷰가 없습니다.</div> : (
              reviews.map((r) => (
                <div key={r.id} onClick={() => router.push("/reviews")} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{r.whiskeys?.name || "위스키"}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{r.whiskeys?.type}</span>
                    </div>
                    <span className="text-blue-500">{STAR[r.rating]}</span>
                  </div>
                  {r.review_text && <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{r.review_text}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(r.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "whiskeys" && (
          <div className="grid md:grid-cols-2 gap-3">
            {whiskeys.length === 0 ? <div className="text-center py-12 text-gray-400 dark:text-gray-500 col-span-2">추가한 위스키가 없습니다.</div> : (
              whiskeys.map((w) => (
                <div key={w.id} onClick={() => router.push("/reviews")} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-900 dark:text-white">{w.name}</p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{w.type}</span>
                  </div>
                  {w.region && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">📍 {w.region}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(w.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "articles" && (
          <div className="space-y-3">
            {articles.length === 0 ? <div className="text-center py-12 text-gray-400 dark:text-gray-500">작성한 글이 없습니다.</div> : (
              articles.map((a) => (
                <div key={a.id} onClick={() => router.push("/articles")} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-900 dark:text-white">{a.title}</p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">{a.category}</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(a.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "bars" && (
          <div className="grid md:grid-cols-2 gap-3">
            {bars.length === 0 ? <div className="text-center py-12 text-gray-400 dark:text-gray-500 col-span-2">추천한 바가 없습니다.</div> : (
              bars.map((b) => (
                <div key={b.id} onClick={() => router.push("/bars")} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition">
                  <p className="font-bold text-gray-900 dark:text-white">{b.bar_name}</p>
                  {b.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words whitespace-pre-wrap">{b.notes}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(b.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "schedules" && (
          <div className="space-y-3">
            {schedules.length === 0 ? <div className="text-center py-12 text-gray-400 dark:text-gray-500">만든 일정이 없습니다.</div> : (
              schedules.map((s) => (
                <div key={s.id} onClick={() => router.push("/schedule")} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5 flex justify-between items-center cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition">
                  <p className="font-bold text-gray-900 dark:text-white">{s.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(s.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="space-y-3">
            {userComments.length === 0 ? <div className="text-center py-12 text-gray-400 dark:text-gray-500">작성한 댓글이 없습니다.</div> : (
              userComments.map((c) => (
                <div key={c.id} onClick={() => router.push(c.source === "article" ? "/articles" : "/reviews")} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-5 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.source === "article" ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300" : "bg-blue-100 text-blue-700"
                    }`}>
                      {c.source === "article" ? "지식글" : "리뷰"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.target_title}</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm break-words whitespace-pre-wrap">{c.content}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{new Date(c.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 관리자 패널 */}
        {activeTab === "admin" && profile?.is_admin && (
          <div className="space-y-4">
            {/* 관리자 서브탭 */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "stats", label: "📊 통계" },
                { id: "users", label: "👥 유저 관리" },
                { id: "notices", label: "📢 공지" },
                { id: "articles", label: "📚 지식글" },
                { id: "reviews", label: "⭐ 리뷰" },
                { id: "bars", label: "🍸 Bar" },
                { id: "whiskeys", label: "🥃 위스키" },
              ].map((t) => (
                <button key={t.id} onClick={() => handleAdminSubTab(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    adminSubTab === t.id ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-400"
                  }`}>{t.label}</button>
              ))}
            </div>

            {/* 통계 */}
            {adminSubTab === "stats" && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">사이트 통계</h2>
                {adminLoading ? <p className="text-gray-400 dark:text-gray-500 text-sm">로딩 중...</p> : adminStats ? (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {[
                      { label: "전체 유저", count: adminStats.totalUsers, color: "text-blue-600" },
                      { label: "전체 리뷰", count: adminStats.totalReviews, color: "text-green-600" },
                      { label: "전체 지식글", count: adminStats.totalArticles, color: "text-purple-600" },
                      { label: "전체 Bar", count: adminStats.totalBars, color: "text-orange-500" },
                      { label: "전체 위스키", count: adminStats.totalWhiskeys, color: "text-amber-600" },
                      { label: "전체 일정", count: adminStats.totalSchedules, color: "text-pink-500" },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* 유저 관리 */}
            {adminSubTab === "users" && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">유저 관리</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{adminUsers.length}명</span>
                </div>
                {adminLoading ? <p className="text-gray-400 dark:text-gray-500 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {adminUsers.map((u) => (
                      <div key={u.id} className={`flex items-center justify-between p-4 rounded-lg border ${u.id === userId ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950" : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm overflow-hidden flex-shrink-0">
                            {u.avatar_url ? <img src={u.avatar_url} alt="avatar" className="w-full h-full object-cover" /> : (u.name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white text-sm">{u.name}</span>
                              {u.is_admin && <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">관리자</span>}
                              {u.id === userId && <span className="px-1.5 py-0.5 bg-gray-400 text-white text-xs rounded-full">본인</span>}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">가입: {new Date(u.created_at).toLocaleDateString("ko-KR")} · 리뷰 {u.review_count} · 글 {u.article_count} · Bar {u.bar_count}</p>
                          </div>
                        </div>
                        {u.id !== userId && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                              className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${u.is_admin ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                              {u.is_admin ? "관리자 해제" : "관리자 지정"}
                            </button>
                            <button onClick={() => handleDeleteUser(u.id, u.name)} disabled={deletingUserId === u.id}
                              className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition font-medium disabled:opacity-50">
                              {deletingUserId === u.id ? "삭제 중..." : "회원탈퇴"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 공지 관리 */}
            {adminSubTab === "notices" && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">공지사항 관리</h2>
                  <button onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                    {showAnnouncementForm ? "취소" : "📢 공지 작성"}
                  </button>
                </div>

                {showAnnouncementForm && (
                  <form onSubmit={handleAdminSubmitAnnouncement} className="space-y-3 mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-100 dark:border-blue-900">
                    <input value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      placeholder="공지 제목" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                    <RichTextEditor
                      value={announcementForm.content}
                      onChange={(html) => setAnnouncementForm({ ...announcementForm, content: html })}
                      placeholder="공지 내용"
                      minHeight="120px"
                    />
                    <button type="submit" disabled={announcementSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                      {announcementSubmitting ? "등록 중..." : "등록"}
                    </button>
                  </form>
                )}

                {contentLoading ? <p className="text-gray-400 dark:text-gray-500 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {allAnnouncements.length === 0 ? (
                      <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">등록된 공지가 없습니다.</p>
                    ) : allAnnouncements.map((a) => (
                      <div key={a.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        {editingAdminAnnouncement?.id === a.id ? (
                          <form onSubmit={handleAdminSaveAnnouncement} className="space-y-3">
                            <input value={editingAdminAnnouncement.title}
                              onChange={(e) => setEditingAdminAnnouncement({ ...editingAdminAnnouncement, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                            <RichTextEditor
                              value={editingAdminAnnouncement.content}
                              onChange={(html) => setEditingAdminAnnouncement({ ...editingAdminAnnouncement, content: html })}
                              placeholder="공지 내용"
                              minHeight="120px"
                            />
                            <div className="flex gap-2">
                              <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">저장</button>
                              <button type="button" onClick={() => setEditingAdminAnnouncement(null)} className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition">취소</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{a.title}</p>
                              <SafeHtml html={a.content} className="rich-content text-sm leading-relaxed mt-1 line-clamp-2 text-gray-500 dark:text-gray-400" />
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(a.created_at).toLocaleDateString("ko-KR")}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => setEditingAdminAnnouncement(a)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition">편집</button>
                              <button onClick={() => handleAdminDeleteAnnouncement(a.id)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition">삭제</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 지식글 관리 */}
            {adminSubTab === "articles" && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">지식글 전체 관리</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{allArticles.length}개</span>
                </div>
                {contentLoading ? <p className="text-gray-400 dark:text-gray-500 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {allArticles.map((a) => (
                      <div key={a.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        {editingAdminArticle?.id === a.id ? (
                          <form onSubmit={handleAdminSaveArticle} className="space-y-3">
                            <input value={editingAdminArticle.title} onChange={(e) => setEditingAdminArticle({ ...editingAdminArticle, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                            <select value={editingAdminArticle.category} onChange={(e) => setEditingAdminArticle({ ...editingAdminArticle, category: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500">
                              {["기초 지식","테이스팅","역사","문화","기타"].map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <RichTextEditor
                              value={editingAdminArticle.content}
                              onChange={(html) => setEditingAdminArticle({ ...editingAdminArticle, content: html })}
                              placeholder="글 내용"
                              minHeight="120px"
                            />
                            <div className="flex gap-2">
                              <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">저장</button>
                              <button type="button" onClick={() => setEditingAdminArticle(null)} className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition">취소</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{a.category}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{a.users?.name || "-"}</span>
                              </div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{a.title}</p>
                              <SafeHtml html={a.content} className="rich-content text-sm leading-relaxed mt-1 line-clamp-2 text-gray-500 dark:text-gray-400" />
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(a.created_at).toLocaleDateString("ko-KR")}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => setEditingAdminArticle(a)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition">편집</button>
                              <button onClick={() => handleAdminDeleteArticle(a.id)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition">삭제</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 리뷰 관리 */}
            {adminSubTab === "reviews" && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">리뷰 전체 관리</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{allReviews.length}개</span>
                </div>
                {contentLoading ? <p className="text-gray-400 dark:text-gray-500 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {allReviews.map((r) => (
                      <div key={r.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400 dark:text-gray-500">{r.users?.name || "-"}</span>
                            <span className="text-xs text-blue-500">{"★".repeat(r.rating)}</span>
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{(r.whiskeys as unknown as { name: string } | null)?.name || "위스키"}</p>
                          {r.review_text && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">{r.review_text}</p>}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(r.created_at).toLocaleDateString("ko-KR")}</p>
                        </div>
                        <button onClick={() => handleAdminDeleteReview(r.id)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition flex-shrink-0">삭제</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bar 관리 */}
            {adminSubTab === "bars" && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">Bar 전체 관리</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{allBars.length}개</span>
                </div>
                {contentLoading ? <p className="text-gray-400 dark:text-gray-500 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {allBars.map((b) => (
                      <div key={b.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        {editingAdminBar?.id === b.id ? (
                          <form onSubmit={handleAdminSaveBar} className="space-y-3">
                            <input value={editingAdminBar.bar_name} onChange={(e) => setEditingAdminBar({ ...editingAdminBar, bar_name: e.target.value })}
                              placeholder="Bar 이름" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                            <input value={editingAdminBar.link || ""} onChange={(e) => setEditingAdminBar({ ...editingAdminBar, link: e.target.value })}
                              placeholder="링크" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                            <textarea value={editingAdminBar.notes || ""} rows={2} onChange={(e) => setEditingAdminBar({ ...editingAdminBar, notes: e.target.value })}
                              placeholder="비고" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                            <div className="flex gap-2">
                              <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">저장</button>
                              <button type="button" onClick={() => setEditingAdminBar(null)} className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition">취소</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-400 dark:text-gray-500">{b.users?.name || "-"}</span>
                              </div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{b.bar_name}</p>
                              {b.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">{b.notes}</p>}
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(b.created_at).toLocaleDateString("ko-KR")}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => setEditingAdminBar(b)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition">편집</button>
                              <button onClick={() => handleAdminDeleteBar(b.id)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition">삭제</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 위스키 관리 */}
            {adminSubTab === "whiskeys" && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 dark:text-white text-lg">위스키 전체 관리</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{allWhiskeys.length}개</span>
                </div>
                {contentLoading ? <p className="text-gray-400 dark:text-gray-500 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {allWhiskeys.map((w) => (
                      <div key={w.id} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        {editingAdminWhiskey?.id === w.id ? (
                          <form onSubmit={handleAdminSaveWhiskey} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <input value={editingAdminWhiskey.name} onChange={(e) => setEditingAdminWhiskey({ ...editingAdminWhiskey, name: e.target.value })}
                                placeholder="이름" className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                              <select value={editingAdminWhiskey.type} onChange={(e) => setEditingAdminWhiskey({ ...editingAdminWhiskey, type: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500">
                                {["Scotch","Irish","Bourbon/Rye","Etc"].map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <input value={editingAdminWhiskey.region || ""} onChange={(e) => setEditingAdminWhiskey({ ...editingAdminWhiskey, region: e.target.value })}
                                placeholder="지역" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                              <input type="number" value={editingAdminWhiskey.age || ""} onChange={(e) => setEditingAdminWhiskey({ ...editingAdminWhiskey, age: parseInt(e.target.value) || 0 })}
                                placeholder="숙성년" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                              <input type="number" step="0.1" value={editingAdminWhiskey.abv || ""} onChange={(e) => setEditingAdminWhiskey({ ...editingAdminWhiskey, abv: parseFloat(e.target.value) || 0 })}
                                placeholder="도수%" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                            </div>
                            <div className="flex gap-2">
                              <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">저장</button>
                              <button type="button" onClick={() => setEditingAdminWhiskey(null)} className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition">취소</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{w.type}</span>
                                {w.region && <span className="text-xs text-gray-400 dark:text-gray-500">{w.region}</span>}
                              </div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{w.name}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {w.age ? `${w.age}년 ` : ""}{w.abv ? `${w.abv}% ` : ""}· {new Date(w.created_at).toLocaleDateString("ko-KR")}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => setEditingAdminWhiskey(w)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition">편집</button>
                              <button onClick={() => handleAdminDeleteWhiskey(w.id)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition">삭제</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
