"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { notifyAllUsers } from "@/lib/notifications";
import { ENCYCLOPEDIA_WHISKEYS } from "@/lib/encyclopediaData";
import RichTextEditor from "@/components/RichTextEditor";
import SafeHtml from "@/components/SafeHtml";
import { passthroughImageLoader } from "@/lib/imageLoader";

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
interface AllArticle { id: string; title: string; content: string; category: string; author_id: string; created_at: string; author_name?: string; users?: { name: string }; }
interface AllReview { id: string; rating: number; review_text: string; user_id: string; created_at: string; users?: { name: string }; whiskeys?: { name: string }; }
interface AllBar { id: string; bar_name: string; link: string; notes: string; user_id: string; created_at: string; author_name?: string; users?: { name: string }; }
interface AllWhiskey { id: string; name: string; type: string; region: string; age: number; abv: number; created_by: string; created_at: string; }
interface AllSchedule { id: string; name: string; created_by: string; created_at: string; confirmed_date?: string | null; creator_name?: string; }

interface CollectionItem {
  id: string;
  user_id: string;
  status: "tried" | "wishlist";
  whiskey_id: string | null;
  encyclopedia_id: string | null;
  custom_name: string | null;
  created_at: string;
  whiskeys?: { name: string; type: string } | null;
}

interface AdminUser {
  id: string;
  name: string;
  username: string;
  created_at: string;
  last_seen_at?: string | null;
  is_admin: boolean;
  is_member: boolean;
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
  pendingInquiries: number;
  unconfirmedSchedules: number;
  memberCount: number;
  adminCount: number;
  nonMemberCount: number;
  newUsersThisWeek: number;
  newUsersLastWeek: number;
  newReviewsThisWeek: number;
  newReviewsLastWeek: number;
  newArticlesThisWeek: number;
  newArticlesLastWeek: number;
  topUsers: { id: string; name: string; avatar_url?: string; review_count: number; article_count: number; bar_count: number; total: number }[];
}

const USER_TAB_IDS = [
  "overview",
  "collection",
  "reviews",
  "whiskeys",
  "articles",
  "bars",
  "favorites",
  "schedules",
  "comments",
] as const;

const ADMIN_SUB_TAB_IDS = ["stats", "users", "notices", "reviews", "articles", "bars", "whiskeys", "schedules"] as const;
const ADMIN_CONTENT_SUB_TAB_IDS = ["notices", "reviews", "articles", "bars", "whiskeys", "schedules"] as const;

type AdminSubTab = typeof ADMIN_SUB_TAB_IDS[number];

async function fetchAdminUsers(): Promise<AdminUser[]> {
  const fields = "id, name, username, created_at, last_seen_at, is_admin, is_member, avatar_url";
  const { data, error } = await supabase
    .from("users")
    .select(fields)
    .order("created_at", { ascending: false });

  if (!error) return (data || []) as unknown as AdminUser[];

  // last_seen_at 컬럼 적용 전에도 관리자 화면의 기존 기능은 유지한다.
  const { data: fallbackData } = await supabase
    .from("users")
    .select("id, name, username, created_at, is_admin, is_member, avatar_url")
    .order("created_at", { ascending: false });

  return ((fallbackData || []) as unknown as AdminUser[]).map((user) => ({
    ...user,
    last_seen_at: null,
  }));
}

function formatLastSeen(value?: string | null) {
  if (!value) return "기록 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "기록 없음";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [requestedTab, setRequestedTab] = useState<string | null>(null);
  const [requestedSubTab, setRequestedSubTab] = useState<string | null>(null);
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
  const [favoriteBars, setFavoriteBars] = useState<{ id: string; bar_name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", bio: "", favorite_category: "", favorite_whiskey: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [showPwChange, setShowPwChange] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwChanging, setPwChanging] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // 관리자 전용
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [memberUpdatingId, setMemberUpdatingId] = useState<string | null>(null);
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>("stats");
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminSortOrder, setAdminSortOrder] = useState<"latest" | "oldest">("latest");
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "member" | "nonmember" | "admin">("all");
  const [userSort, setUserSort] = useState<"latest" | "oldest" | "active">("latest");
  const [allArticles, setAllArticles] = useState<AllArticle[]>([]);
  const [allReviews, setAllReviews] = useState<AllReview[]>([]);
  const [allBars, setAllBars] = useState<AllBar[]>([]);
  const [allWhiskeys, setAllWhiskeys] = useState<AllWhiskey[]>([]);
  const [allSchedules, setAllSchedules] = useState<AllSchedule[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [editingAdminArticle, setEditingAdminArticle] = useState<AllArticle | null>(null);
  const [editingAdminBar, setEditingAdminBar] = useState<AllBar | null>(null);
  const [editingAdminWhiskey, setEditingAdminWhiskey] = useState<AllWhiskey | null>(null);
  const [allAnnouncements, setAllAnnouncements] = useState<AllAnnouncement[]>([]);
  const [editingAdminAnnouncement, setEditingAdminAnnouncement] = useState<AllAnnouncement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "" });
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);

  // 컬렉션
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [collectionTab, setCollectionTab] = useState<"tried" | "wishlist">("tried");
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionAddStatus, setCollectionAddStatus] = useState<"tried" | "wishlist">("tried");
  const [collectionAddMode, setCollectionAddMode] = useState<"encyclopedia" | "manual">("encyclopedia");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [collectionManualName, setCollectionManualName] = useState("");

  // Initial bootstrap for authenticated user data.
  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (!id) { router.push("/login"); return; }
    setUserId(id);
    fetchAll(id);
    fetchCollection(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setRequestedTab(params.get("tab"));
    setRequestedSubTab(params.get("sub"));
  }, []);

  useEffect(() => {
    setAdminSearchQuery("");
    setAdminSortOrder("latest");
    setAdminStatusFilter("all");
  }, [adminSubTab]);

  useEffect(() => {
    if (!requestedTab) return;

    if (requestedTab === "admin") {
      if (!profile?.is_admin) return;
      setActiveTab("admin");

      if (requestedSubTab && (ADMIN_SUB_TAB_IDS as readonly string[]).includes(requestedSubTab)) {
        const nextSub = requestedSubTab as AdminSubTab;
        setAdminSubTab(nextSub);
      }
      return;
    }

    if ((USER_TAB_IDS as readonly string[]).includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [profile?.is_admin, requestedSubTab, requestedTab]);

  const fetchCollection = async (uid: string) => {
    const { data } = await supabase
      .from("user_collection")
      .select("*, whiskeys(name, type)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setCollection((data || []) as unknown as CollectionItem[]);
  };

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

    // 즐겨찾기 Bar
    const { data: favData } = await supabase
      .from("bar_favorites")
      .select("bars(id, bar_name)")
      .eq("user_id", id);
    if (favData) {
      setFavoriteBars((favData as unknown as { bars: { id: string; bar_name: string } }[]).map((f) => f.bars).filter(Boolean) as { id: string; bar_name: string }[]);
    }

    setLoading(false);
  };

  const fetchAdminData = async () => {
    setAdminLoading(true);
    try {
      const [usersRes, reviewsRes, articlesRes, barsRes, whiskeysRes, schedulesRes, inquiriesRes] = await Promise.allSettled([
        fetchAdminUsers(),
        supabase.from("reviews").select("id, user_id, created_at"),
        supabase.from("articles").select("id, author_id, created_at"),
        supabase.from("bars").select("id, user_id"),
        supabase.from("whiskeys").select("id"),
        supabase.from("schedules").select("id, confirmed_date"),
        supabase.from("inquiries").select("id, status"),
      ]);

      const usersData = usersRes.status === "fulfilled" ? usersRes.value : [];
      const reviewsData = reviewsRes.status === "fulfilled" ? (reviewsRes.value.data || []) : [];
      const articlesData = articlesRes.status === "fulfilled" ? (articlesRes.value.data || []) : [];
      const barsData = barsRes.status === "fulfilled" ? (barsRes.value.data || []) : [];
      const schedulesData = schedulesRes.status === "fulfilled" ? (schedulesRes.value.data || []) : [];
      const inquiriesData = inquiriesRes.status === "fulfilled" ? (inquiriesRes.value.data || []) : [];

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

      // 주간 활동 (최근 7일 / 지난주)
      const nowMs = new Date().getTime();
      const WEEK = 7 * 24 * 60 * 60 * 1000;
      const weekAgo = nowMs - WEEK;
      const twoWeeksAgo = nowMs - 2 * WEEK;
      const countThisWeek = <T extends { created_at?: string }>(rows: T[]) =>
        rows.filter((r) => r.created_at && new Date(r.created_at).getTime() >= weekAgo).length;
      const countLastWeek = <T extends { created_at?: string }>(rows: T[]) =>
        rows.filter((r) => {
          if (!r.created_at) return false;
          const t = new Date(r.created_at).getTime();
          return t >= twoWeeksAgo && t < weekAgo;
        }).length;

      const topUsers = enrichedUsers
        .map((u) => ({
          id: u.id, name: u.name, avatar_url: u.avatar_url,
          review_count: u.review_count || 0, article_count: u.article_count || 0, bar_count: u.bar_count || 0,
          total: (u.review_count || 0) + (u.article_count || 0) + (u.bar_count || 0),
        }))
        .filter((u) => u.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setAdminStats({
        totalUsers: usersData.length,
        totalReviews: reviewsData.length,
        totalArticles: articlesData.length,
        totalBars: barsData.length,
        totalWhiskeys: whiskeysRes.status === "fulfilled" ? (whiskeysRes.value.data?.length || 0) : 0,
        totalSchedules: schedulesData.length,
        pendingInquiries: inquiriesData.filter((i) => i.status === "pending").length,
        unconfirmedSchedules: schedulesData.filter((s) => !s.confirmed_date).length,
        memberCount: usersData.filter((u) => u.is_member && !u.is_admin).length,
        adminCount: usersData.filter((u) => u.is_admin).length,
        nonMemberCount: usersData.filter((u) => !u.is_member && !u.is_admin).length,
        newUsersThisWeek: countThisWeek(usersData),
        newUsersLastWeek: countLastWeek(usersData),
        newReviewsThisWeek: countThisWeek(reviewsData),
        newReviewsLastWeek: countLastWeek(reviewsData),
        newArticlesThisWeek: countThisWeek(articlesData),
        newArticlesLastWeek: countLastWeek(articlesData),
        topUsers,
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
      const getUserNameMap = async (ids: string[]) => {
        if (ids.length === 0) return {} as Record<string, string>;
        const { data } = await supabase.from("users").select("id, name").in("id", ids);
        return Object.fromEntries((data || []).map((u) => [u.id, u.name])) as Record<string, string>;
      };

      if (tab === "notices") {
        const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
        setAllAnnouncements(data || []);
      } else if (tab === "articles") {
        const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
        const rows = (data || []) as AllArticle[];
        const userNameMap = await getUserNameMap([...new Set(rows.map((a) => a.author_id).filter(Boolean))]);
        setAllArticles(rows.map((a) => ({ ...a, author_name: userNameMap[a.author_id] || "알 수 없음" })));
      } else if (tab === "reviews") {
        const { data } = await supabase.from("reviews").select("*, users(name), whiskeys(name)").order("created_at", { ascending: false });
        setAllReviews((data || []) as unknown as AllReview[]);
      } else if (tab === "bars") {
        const { data } = await supabase.from("bars").select("*").order("created_at", { ascending: false });
        const rows = (data || []) as AllBar[];
        const userNameMap = await getUserNameMap([...new Set(rows.map((b) => b.user_id).filter(Boolean))]);
        setAllBars(rows.map((b) => ({ ...b, author_name: userNameMap[b.user_id] || "알 수 없음" })));
      } else if (tab === "whiskeys") {
        const { data } = await supabase.from("whiskeys").select("*").order("created_at", { ascending: false });
        setAllWhiskeys(data || []);
      } else if (tab === "schedules") {
        const { data } = await supabase.from("schedules").select("*").order("created_at", { ascending: false });
        const rows = (data || []) as AllSchedule[];
        const userNameMap = await getUserNameMap([...new Set(rows.map((s) => s.created_by).filter(Boolean))]);
        setAllSchedules(rows.map((s) => ({ ...s, creator_name: userNameMap[s.created_by] || "알 수 없음" })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "admin") return;
    if (!(ADMIN_CONTENT_SUB_TAB_IDS as readonly string[]).includes(adminSubTab)) return;
    fetchAdminContent(adminSubTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, adminSubTab]);

  const handleAdminSubTab = (tab: AdminSubTab) => {
    setAdminSubTab(tab);
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
      await notifyAllUsers("announcement", `📢 새 공지: ${announcementForm.title}`, "/notices", userId);
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
  const handleAdminDeleteSchedule = async (id: string) => {
    if (!confirm("이 일정을 삭제할까요?")) return;
    await supabase.from("schedules").delete().eq("id", id);
    setAllSchedules((prev) => prev.filter((s) => s.id !== id));
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    if (adminStats) {
      setAdminStats({ ...adminStats, totalSchedules: Math.max(adminStats.totalSchedules - 1, 0) });
    }
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

  const handleToggleMember = async (targetId: string, currentMember: boolean, isTargetAdmin: boolean) => {
    if (isTargetAdmin) { alert("관리자 계정은 w_lab 회원 토글이 불가합니다."); return; }
    setMemberUpdatingId(targetId);
    try {
      const { error } = await supabase.from("users").update({ is_member: !currentMember }).eq("id", targetId);
      if (error) throw error;
      setAdminUsers((prev) => prev.map((u) => u.id === targetId ? { ...u, is_member: !currentMember } : u));
    } catch (err) {
      console.error(err);
      alert("w_lab 회원 상태 변경에 실패했습니다.");
    } finally {
      setMemberUpdatingId(null);
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
      name: profileForm.name || null,
      bio: profileForm.bio || null,
      favorite_category: profileForm.favorite_category || null,
      favorite_whiskey: profileForm.favorite_whiskey || null,
    }).eq("id", userId);
    await fetchAll(userId);
    setEditingProfile(false);
    setProfileSaving(false);
  };

  const handleChangePassword = async () => {
    setPwError("");
    setPwSuccess(false);
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      setPwError("모든 필드를 입력해주세요."); return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError("새 비밀번호가 일치하지 않습니다."); return;
    }
    if (pwForm.newPw.length < 6) {
      setPwError("새 비밀번호는 6자 이상이어야 합니다."); return;
    }
    setPwChanging(true);
    const { data } = await supabase.from("users").select("password_hash").eq("id", userId).single();
    if (!data) { setPwError("사용자 정보를 불러올 수 없습니다."); setPwChanging(false); return; }
    const bcrypt = (await import("bcryptjs")).default;
    const match = await bcrypt.compare(pwForm.current, data.password_hash);
    if (!match) { setPwError("현재 비밀번호가 올바르지 않습니다."); setPwChanging(false); return; }
    const newHash = await bcrypt.hash(pwForm.newPw, 10);
    const { error } = await supabase.from("users").update({ password_hash: newHash }).eq("id", userId);
    if (error) { setPwError("비밀번호 변경에 실패했습니다."); setPwChanging(false); return; }
    setPwSuccess(true);
    setPwForm({ current: "", newPw: "", confirm: "" });
    setTimeout(() => { setShowPwChange(false); setPwSuccess(false); }, 2000);
    setPwChanging(false);
  };

  const handleAddCollection = async (item: { whiskey_id?: string; encyclopedia_id?: string; custom_name?: string }) => {
    if (!userId) return;
    const payload: Record<string, string> = { user_id: userId, status: collectionAddStatus };
    if (item.whiskey_id) payload.whiskey_id = item.whiskey_id;
    if (item.encyclopedia_id) payload.encyclopedia_id = item.encyclopedia_id;
    if (item.custom_name) payload.custom_name = item.custom_name;
    await supabase.from("user_collection").upsert([payload], { onConflict: item.whiskey_id ? "user_id,whiskey_id" : item.encyclopedia_id ? "user_id,encyclopedia_id" : undefined });
    setShowCollectionModal(false);
    setCollectionSearch("");
    setCollectionManualName("");
    fetchCollection(userId);
  };

  const handleDeleteCollection = async (id: string) => {
    await supabase.from("user_collection").delete().eq("id", id);
    setCollection((prev) => prev.filter((c) => c.id !== id));
  };

  const tabs = [
    { id: "overview", label: "개요" },
    { id: "collection", label: `컬렉션 (${collection.length})` },
    { id: "reviews", label: `리뷰 (${reviews.length})` },
    { id: "whiskeys", label: `위스키 (${whiskeys.length})` },
    { id: "articles", label: `지식글 (${articles.length})` },
    { id: "bars", label: `Bar (${bars.length})` },
    { id: "favorites", label: `즐겨찾기 (${favoriteBars.length})` },
    { id: "schedules", label: `일정 (${schedules.length})` },
    { id: "comments", label: `댓글 (${userComments.length})` },
    ...(profile?.is_admin ? [{ id: "admin", label: "🛡️ 관리자" }] : []),
  ];

  const normalizedQuery = adminSearchQuery.trim().toLowerCase();
  const hasAdminQuery = normalizedQuery.length > 0;
  const sortFactor = adminSortOrder === "latest" ? -1 : 1;

  const matchesAdminQuery = (...values: Array<string | null | undefined>) => {
    if (!hasAdminQuery) return true;
    return values.some((value) => (value || "").toLowerCase().includes(normalizedQuery));
  };

  const sortByCreatedAt = <T extends { created_at: string }>(items: T[]) => {
    return [...items].sort((a, b) => (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * sortFactor);
  };

  const visibleAnnouncements = sortByCreatedAt(
    allAnnouncements.filter((a) => matchesAdminQuery(a.title, a.content, a.author_name))
  );
  const visibleArticles = sortByCreatedAt(
    allArticles.filter((a) => matchesAdminQuery(a.title, a.content, a.category, a.author_name, a.users?.name))
  );
  const visibleReviews = sortByCreatedAt(
    allReviews.filter((r) => matchesAdminQuery(r.review_text, r.users?.name, (r.whiskeys as unknown as { name: string } | null)?.name))
  );
  const visibleBars = sortByCreatedAt(
    allBars.filter((b) => matchesAdminQuery(b.bar_name, b.notes, b.author_name, b.users?.name))
  );
  const visibleWhiskeys = sortByCreatedAt(
    allWhiskeys.filter((w) => matchesAdminQuery(w.name, w.type, w.region))
  );
  const visibleSchedules = sortByCreatedAt(
    allSchedules
      .filter((s) => {
        if (adminStatusFilter === "confirmed") return !!s.confirmed_date;
        if (adminStatusFilter === "unconfirmed") return !s.confirmed_date;
        return true;
      })
      .filter((s) => matchesAdminQuery(s.name, s.creator_name))
  );

  const userQuery = userSearch.trim().toLowerCase();
  const visibleAdminUsers = adminUsers
    .filter((u) => {
      if (userFilter === "member") return u.is_member && !u.is_admin;
      if (userFilter === "nonmember") return !u.is_member && !u.is_admin;
      if (userFilter === "admin") return u.is_admin;
      return true;
    })
    .filter((u) => !userQuery || (u.name || "").toLowerCase().includes(userQuery) || (u.username || "").toLowerCase().includes(userQuery))
    .sort((a, b) => {
      if (userSort === "active") {
        const ta = (a.review_count || 0) + (a.article_count || 0) + (a.bar_count || 0);
        const tb = (b.review_count || 0) + (b.article_count || 0) + (b.bar_count || 0);
        return tb - ta;
      }
      const factor = userSort === "latest" ? -1 : 1;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * factor;
    });

  const adminSearchPlaceholderMap: Record<AdminSubTab, string> = {
    stats: "검색",
    users: "이 탭에서는 검색을 지원하지 않습니다",
    notices: "공지 제목/내용 검색",
    reviews: "리뷰 내용/작성자/위스키 검색",
    articles: "지식글 제목/내용/작성자 검색",
    bars: "Bar 이름/노트/작성자 검색",
    whiskeys: "위스키 이름/타입/지역 검색",
    schedules: "일정명/작성자 검색",
  };

  const showAdminListControls = (ADMIN_CONTENT_SUB_TAB_IDS as readonly string[]).includes(adminSubTab);
  const showAdminStatusFilter = adminSubTab === "schedules";

  if (loading) {
    return (
      <div className="tone min-h-screen flex items-center justify-center">
        <p className="text-white/40">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="tone min-h-screen">
      <div className="tone-wrap max-w-4xl mx-auto px-4 py-8 md:py-12">

        {/* 프로필 카드 */}
        <div className="glass-card card rounded-2xl p-5 sm:p-8 mb-8">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* 아바타 */}
            <div className="relative flex-shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-3xl font-bold cursor-pointer overflow-hidden hover:opacity-80 transition"
              >
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="avatar"
                    loader={passthroughImageLoader}
                    unoptimized
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  (profile?.name || "?")[0].toUpperCase()
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>
                {uploading ? "..." : "✎"}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="section-title text-2xl font-bold text-white">{profile?.name}</h1>
                {profile?.is_admin && (
                  <span className="chip px-2 py-0.5 bg-indigo-500/80 text-white text-xs font-bold rounded-full">관리자</span>
                )}
              </div>
              <p className="text-white/40 text-sm mt-0.5">@{profile?.username}</p>
              <p className="text-white/30 text-xs mt-1">
                가입일: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ko-KR") : "-"}
              </p>
              <p className="text-xs text-blue-400 mt-1 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>
                프로필 사진 변경
              </p>
            </div>
          </div>

          {/* 한줄소개 / 관심주류 / 최애위스키 */}
          <div className="mt-5 pt-5 border-t border-white/8">
            {editingProfile ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1">이름</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="표시될 이름"
                    maxLength={30}
                    className="glass-input surface w-full px-3 py-2 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1">한 줄 소개</label>
                  <input
                    type="text"
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    placeholder="나를 한 마디로 소개해보세요"
                    maxLength={80}
                    className="glass-input surface w-full px-3 py-2 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/40 mb-1">관심 주류 카테고리</label>
                    <select
                      value={profileForm.favorite_category}
                      onChange={(e) => setProfileForm({ ...profileForm, favorite_category: e.target.value })}
                      className="glass-input surface w-full px-3 py-2 rounded-lg text-sm"
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
                    <label className="block text-xs font-medium text-white/40 mb-1">최애 위스키</label>
                    <input
                      type="text"
                      value={profileForm.favorite_whiskey}
                      onChange={(e) => setProfileForm({ ...profileForm, favorite_whiskey: e.target.value })}
                      placeholder="ex) Lagavulin 16"
                      className="glass-input surface w-full px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} disabled={profileSaving}
                    className="cta px-4 py-1.5 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-50">
                    {profileSaving ? "저장 중..." : "저장"}
                  </button>
                  <button onClick={() => setEditingProfile(false)}
                    className="px-4 py-1.5 bg-white/8 text-white/70 text-sm rounded-lg hover:bg-white/12">
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 text-sm">
                  {profile?.bio && <p className="text-white/70 italic border-l-2 border-indigo-400 pl-3">{profile.bio}</p>}
                  <div className="flex flex-wrap gap-3 text-white/40 text-xs">
                    {profile?.favorite_category && <span>🍹 {profile.favorite_category}</span>}
                    {profile?.favorite_whiskey && <span>🥃 최애: {profile.favorite_whiskey}</span>}
                  </div>
                  {!profile?.bio && !profile?.favorite_category && !profile?.favorite_whiskey && (
                    <p className="text-white/30 text-xs">한 줄 소개와 관심 주류를 설정해보세요.</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setProfileForm({
                      name: profile?.name || "",
                      bio: profile?.bio || "",
                      favorite_category: profile?.favorite_category || "",
                      favorite_whiskey: profile?.favorite_whiskey || "",
                    });
                    setEditingProfile(true);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex-shrink-0"
                >
                  ✎ 편집
                </button>
              </div>
            )}
          </div>

          {/* 비밀번호 변경 */}
          <div className="mt-4 pt-4 border-t border-white/8">
            <button onClick={() => { setShowPwChange(!showPwChange); setPwError(""); setPwSuccess(false); }}
              className="text-xs text-white/40 hover:text-white/70 transition">
              🔑 비밀번호 변경
            </button>
            {showPwChange && (
              <div className="mt-3 space-y-2 max-w-sm">
                <input type="password" placeholder="현재 비밀번호" value={pwForm.current}
                  onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                  className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                <input type="password" placeholder="새 비밀번호 (6자 이상)" value={pwForm.newPw}
                  onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                  className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                <input type="password" placeholder="새 비밀번호 확인" value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                {pwError && <p className="text-xs text-red-400">{pwError}</p>}
                {pwSuccess && <p className="text-xs text-green-400">비밀번호가 변경되었습니다.</p>}
                <div className="flex gap-2">
                  <button onClick={handleChangePassword} disabled={pwChanging}
                    className="cta px-4 py-1.5 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition">
                    {pwChanging ? "변경 중..." : "변경"}
                  </button>
                  <button onClick={() => setShowPwChange(false)}
                    className="px-4 py-1.5 bg-white/8 text-white/60 text-sm rounded-lg hover:bg-white/12 transition">
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 활동 통계 */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 mt-8 pt-6 border-t border-white/8">
            {[
              { label: "리뷰", count: reviews.length },
              { label: "위스키", count: whiskeys.length },
              { label: "지식글", count: articles.length },
              { label: "Bar", count: bars.length },
              { label: "일정", count: schedules.length },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-indigo-300">{stat.count}</p>
                <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 flex-wrap mb-6">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === tab.id ? "chip bg-indigo-500/80 text-white" : "bg-white/5 text-white/60 border border-white/10 hover:border-indigo-400/50"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 개요 탭 */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card card rounded-xl p-5">
              <h2 className="font-bold text-white mb-3">최근 리뷰</h2>
              {reviews.length === 0 ? <p className="text-white/30 text-sm">작성한 리뷰가 없습니다.</p> : (
                <div className="space-y-2">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} onClick={() => router.push("/reviews")} className="flex justify-between items-center text-sm cursor-pointer hover:bg-white/5 rounded px-2 py-1 -mx-2 transition">
                      <span className="text-white/55 truncate">{r.whiskeys?.name || "위스키"}</span>
                      <span className="text-blue-400 text-xs ml-2 flex-shrink-0">{r.rating}/10</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="glass-card card rounded-xl p-5">
              <h2 className="font-bold text-white mb-3">최근 지식글</h2>
              {articles.length === 0 ? <p className="text-white/30 text-sm">작성한 글이 없습니다.</p> : (
                <div className="space-y-2">
                  {articles.slice(0, 3).map((a) => (
                    <div key={a.id} onClick={() => router.push("/articles")} className="text-sm cursor-pointer hover:bg-white/5 rounded px-2 py-1 -mx-2 transition">
                      <span className="text-xs bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded mr-2">{a.category}</span>
                      <span className="text-white/55">{a.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="glass-card card rounded-xl p-5">
              <h2 className="font-bold text-white mb-3">추천한 Bar</h2>
              {bars.length === 0 ? <p className="text-white/30 text-sm">추천한 바가 없습니다.</p> : (
                <div className="space-y-2">
                  {bars.slice(0, 3).map((b) => (
                    <div key={b.id} onClick={() => router.push("/bars")} className="text-sm text-white/55 cursor-pointer hover:bg-white/5 rounded px-2 py-1 -mx-2 transition">{b.bar_name}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="glass-card card rounded-xl p-5">
              <h2 className="font-bold text-white mb-3">만든 일정</h2>
              {schedules.length === 0 ? <p className="text-white/30 text-sm">만든 일정이 없습니다.</p> : (
                <div className="space-y-2">
                  {schedules.slice(0, 3).map((s) => (
                    <div key={s.id} onClick={() => router.push("/schedule")} className="flex justify-between items-center text-sm cursor-pointer hover:bg-white/5 rounded px-2 py-1 -mx-2 transition">
                      <span className="text-white/55">{s.name}</span>
                      <span className="text-xs text-white/30">{new Date(s.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "collection" && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              {(["tried", "wishlist"] as const).map((s) => (
                <button key={s} onClick={() => setCollectionTab(s)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${collectionTab === s ? "chip bg-indigo-500/80 text-white" : "bg-white/5 text-white/50 hover:text-white/80"}`}>
                  {s === "tried" ? `마셔봤어요 (${collection.filter((c) => c.status === "tried").length})` : `마시고 싶어요 (${collection.filter((c) => c.status === "wishlist").length})`}
                </button>
              ))}
              <button onClick={() => { setCollectionAddStatus(collectionTab); setShowCollectionModal(true); }}
                className="cta ml-auto px-4 py-1.5 bg-indigo-500/80 text-white rounded-lg text-sm hover:bg-indigo-500 transition">
                + 추가
              </button>
            </div>
            {collection.filter((c) => c.status === collectionTab).length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">아직 항목이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {collection.filter((c) => c.status === collectionTab).map((item) => {
                  const name = item.whiskeys?.name || item.custom_name || item.encyclopedia_id || "알 수 없음";
                  const type = item.whiskeys?.type || "";
                  const hasEncycLink = !!item.encyclopedia_id;
                  return (
                    <div key={item.id} className="glass-card card rounded-xl px-4 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{name}</p>
                        {type && <p className="text-white/40 text-xs">{type}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasEncycLink && (
                          <a href="/encyclopedia" className="text-xs text-indigo-400 hover:text-indigo-300 transition">백과 →</a>
                        )}
                        <button onClick={() => handleDeleteCollection(item.id)}
                          className="text-xs text-white/30 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition">삭제</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-3">
            {reviews.length === 0 ? <div className="text-center py-12 text-white/30">작성한 리뷰가 없습니다.</div> : (
              reviews.map((r) => (
                <div key={r.id} onClick={() => router.push("/reviews")} className="glass-card card rounded-xl p-5 cursor-pointer transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white">{r.whiskeys?.name || "위스키"}</p>
                      <span className="text-xs bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded">{r.whiskeys?.type}</span>
                    </div>
                    <span className="text-blue-400">{r.rating}/10</span>
                  </div>
                  {r.review_text && <p className="text-white/55 text-sm mt-2">{r.review_text}</p>}
                  <p className="text-xs text-white/30 mt-2">{new Date(r.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "whiskeys" && (
          <div className="grid md:grid-cols-2 gap-3">
            {whiskeys.length === 0 ? <div className="text-center py-12 text-white/30 col-span-2">추가한 위스키가 없습니다.</div> : (
              whiskeys.map((w) => (
                <div key={w.id} onClick={() => router.push("/reviews")} className="glass-card card rounded-xl p-5 cursor-pointer transition">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-white">{w.name}</p>
                    <span className="text-xs bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded">{w.type}</span>
                  </div>
                  {w.region && <p className="text-sm text-white/40 mt-1">📍 {w.region}</p>}
                  <p className="text-xs text-white/30 mt-2">{new Date(w.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "articles" && (
          <div className="space-y-3">
            {articles.length === 0 ? <div className="text-center py-12 text-white/30">작성한 글이 없습니다.</div> : (
              articles.map((a) => (
                <div key={a.id} onClick={() => router.push("/articles")} className="glass-card card rounded-xl p-5 cursor-pointer transition">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-white">{a.title}</p>
                    <span className="text-xs bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">{a.category}</span>
                  </div>
                  <p className="text-xs text-white/30 mt-2">{new Date(a.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "bars" && (
          <div className="grid md:grid-cols-2 gap-3">
            {bars.length === 0 ? <div className="text-center py-12 text-white/30 col-span-2">추천한 바가 없습니다.</div> : (
              bars.map((b) => (
                <div key={b.id} onClick={() => router.push("/bars")} className="glass-card card rounded-xl p-5 cursor-pointer transition">
                  <p className="font-bold text-white">{b.bar_name}</p>
                  {b.notes && <SafeHtml html={b.notes} className="rich-content text-sm leading-relaxed mt-1 line-clamp-3 text-white/40" />}
                  <p className="text-xs text-white/30 mt-2">{new Date(b.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "favorites" && (
          <div className="grid md:grid-cols-2 gap-3">
            {favoriteBars.length === 0 ? <div className="text-center py-12 text-white/30 col-span-2">즐겨찾기한 바가 없습니다.</div> : (
              favoriteBars.map((b) => (
                <div key={b.id} onClick={() => router.push("/bars")} className="glass-card card rounded-xl p-5 cursor-pointer hover:bg-white/8 transition flex items-center gap-3">
                  <span className="text-red-400 text-lg">❤️</span>
                  <p className="font-bold text-white">{b.bar_name}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "schedules" && (
          <div className="space-y-3">
            {schedules.length === 0 ? <div className="text-center py-12 text-white/30">만든 일정이 없습니다.</div> : (
              schedules.map((s) => (
                <div key={s.id} onClick={() => router.push("/schedule")} className="glass-card card rounded-xl p-5 flex justify-between items-center cursor-pointer transition">
                  <p className="font-bold text-white">{s.name}</p>
                  <p className="text-xs text-white/30">{new Date(s.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="space-y-3">
            {userComments.length === 0 ? <div className="text-center py-12 text-white/30">작성한 댓글이 없습니다.</div> : (
              userComments.map((c) => (
                <div key={c.id} onClick={() => router.push(c.source === "article" ? "/articles" : "/reviews")} className="glass-card card rounded-xl p-5 cursor-pointer transition">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.source === "article" ? "bg-purple-500/20 text-purple-300" : "bg-indigo-500/30 text-indigo-300"
                    }`}>
                      {c.source === "article" ? "지식글" : "리뷰"}
                    </span>
                    <span className="text-xs text-white/30 truncate">{c.target_title}</span>
                  </div>
                  <p className="text-white/55 text-sm break-words whitespace-pre-wrap">{c.content}</p>
                  <p className="text-xs text-white/30 mt-2">{new Date(c.created_at).toLocaleDateString("ko-KR")}</p>
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
                { id: "reviews", label: "⭐ 리뷰" },
                { id: "articles", label: "📚 지식글" },
                { id: "bars", label: "🍸 Bar" },
                { id: "whiskeys", label: "🥃 위스키" },
                { id: "schedules", label: "📅 일정" },
              ].map((t) => (
                <button key={t.id} onClick={() => handleAdminSubTab(t.id as AdminSubTab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    adminSubTab === t.id ? "chip bg-indigo-500/80 text-white" : "bg-white/5 text-white/60 border border-white/10 hover:border-indigo-400/50"
                  }`}>{t.label}</button>
              ))}
            </div>

            {showAdminListControls && (
              <div className="glass-card card rounded-xl p-4 border border-white/10">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  <input
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    placeholder={adminSearchPlaceholderMap[adminSubTab]}
                    className="glass-input surface flex-1 px-3 py-2 rounded-lg text-sm"
                  />
                  <select
                    value={adminSortOrder}
                    onChange={(e) => setAdminSortOrder(e.target.value as "latest" | "oldest")}
                    className="glass-input surface md:w-36 px-3 py-2 rounded-lg text-sm"
                  >
                    <option value="latest">최신순</option>
                    <option value="oldest">오래된순</option>
                  </select>
                  {showAdminStatusFilter && (
                    <select
                      value={adminStatusFilter}
                      onChange={(e) => setAdminStatusFilter(e.target.value)}
                      className="glass-input surface md:w-36 px-3 py-2 rounded-lg text-sm"
                    >
                      <option value="all">전체 상태</option>
                      <option value="confirmed">확정</option>
                      <option value="unconfirmed">미확정</option>
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAdminSearchQuery("");
                      setAdminSortOrder("latest");
                      setAdminStatusFilter("all");
                    }}
                    className="px-3 py-2 rounded-lg text-sm bg-white/8 text-white/70 hover:bg-white/12 transition"
                  >
                    초기화
                  </button>
                </div>
              </div>
            )}

            {/* 통계 — 운영 대시보드 */}
            {adminSubTab === "stats" && (
              adminLoading ? (
                <div className="glass-card card rounded-xl p-6"><p className="text-white/30 text-sm">로딩 중...</p></div>
              ) : adminStats ? (
                <div className="space-y-4">
                  {/* 처리 필요 */}
                  {(adminStats.pendingInquiries > 0 || adminStats.unconfirmedSchedules > 0) ? (
                    <div className="glass-card card rounded-xl p-5 border border-orange-400/20">
                      <h2 className="font-bold text-white text-base mb-3">처리 필요 <span className="text-xs font-normal text-white/40 ml-1">지금 확인이 필요한 항목</span></h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {adminStats.pendingInquiries > 0 && (
                          <a href="/contact" className="flex items-center justify-between p-4 rounded-lg bg-orange-500/10 border border-orange-400/20 hover:bg-orange-500/20 transition">
                            <div>
                              <p className="text-xs text-white/50 mb-0.5">미답변 문의</p>
                              <p className="text-2xl font-bold text-orange-300">{adminStats.pendingInquiries}<span className="text-sm font-normal text-white/40 ml-1">건</span></p>
                            </div>
                            <span className="text-xs text-orange-300/80">답변하기 →</span>
                          </a>
                        )}
                        {adminStats.unconfirmedSchedules > 0 && (
                          <a href="/schedule" className="flex items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-400/20 hover:bg-amber-500/20 transition">
                            <div>
                              <p className="text-xs text-white/50 mb-0.5">미확정 일정</p>
                              <p className="text-2xl font-bold text-amber-300">{adminStats.unconfirmedSchedules}<span className="text-sm font-normal text-white/40 ml-1">건</span></p>
                            </div>
                            <span className="text-xs text-amber-300/80">보러가기 →</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card card rounded-xl p-4 border border-emerald-400/20">
                      <p className="text-sm font-medium text-emerald-300">✓ 처리할 항목이 없습니다.</p>
                    </div>
                  )}

                  {/* 이번 주 활동 */}
                  <div className="glass-card card rounded-xl p-6">
                    <h2 className="font-bold text-white text-base mb-4">이번 주 활동 <span className="text-xs font-normal text-white/40 ml-1">최근 7일 · 지난주 대비</span></h2>
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                      {[
                        { label: "신규 가입", now: adminStats.newUsersThisWeek, prev: adminStats.newUsersLastWeek, color: "text-indigo-300" },
                        { label: "신규 리뷰", now: adminStats.newReviewsThisWeek, prev: adminStats.newReviewsLastWeek, color: "text-green-400" },
                        { label: "신규 지식글", now: adminStats.newArticlesThisWeek, prev: adminStats.newArticlesLastWeek, color: "text-purple-400" },
                      ].map((m) => {
                        const delta = m.now - m.prev;
                        return (
                          <div key={m.label} className="text-center p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]">
                            <p className="text-xs text-white/40 mb-1">{m.label}</p>
                            <p className={`text-2xl font-bold ${m.color}`}>{m.now}</p>
                            <p className={`text-xs mt-1 ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-white/30"}`}>
                              {delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${Math.abs(delta)}` : "± 0"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 전체 현황 */}
                  <div className="glass-card card rounded-xl p-6">
                    <h2 className="font-bold text-white text-base mb-4">전체 현황</h2>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
                      {[
                        { label: "전체 유저", count: adminStats.totalUsers, color: "text-indigo-300" },
                        { label: "전체 리뷰", count: adminStats.totalReviews, color: "text-green-400" },
                        { label: "전체 지식글", count: adminStats.totalArticles, color: "text-purple-400" },
                        { label: "전체 Bar", count: adminStats.totalBars, color: "text-orange-300" },
                        { label: "전체 위스키", count: adminStats.totalWhiskeys, color: "text-amber-300" },
                        { label: "전체 일정", count: adminStats.totalSchedules, color: "text-pink-300" },
                      ].map((s) => (
                        <div key={s.label} className="text-center p-3 bg-indigo-500/10 rounded-lg">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                          <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 활동 많은 유저 + 회원 구성 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="glass-card card rounded-xl p-6">
                      <h2 className="font-bold text-white text-base mb-4">활동 많은 유저 <span className="text-xs font-normal text-white/40 ml-1">리뷰+글+Bar 합산</span></h2>
                      {adminStats.topUsers.length === 0 ? (
                        <p className="text-white/30 text-sm py-4 text-center">아직 활동 데이터가 없습니다.</p>
                      ) : (
                        <div className="space-y-2">
                          {adminStats.topUsers.map((u, i) => (
                            <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]">
                              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-amber-400/30 text-amber-200" : i === 1 ? "bg-white/20 text-white/80" : i === 2 ? "bg-orange-400/20 text-orange-200" : "bg-white/8 text-white/50"}`}>{i + 1}</span>
                              <div className="relative w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-xs overflow-hidden flex-shrink-0">
                                {u.avatar_url ? (
                                  <Image src={u.avatar_url} alt="avatar" loader={passthroughImageLoader} unoptimized fill sizes="32px" className="object-cover" />
                                ) : (u.name || "?")[0].toUpperCase()}
                              </div>
                              <span className="flex-1 min-w-0 truncate text-sm font-medium text-white">{u.name}</span>
                              <div className="text-right flex-shrink-0">
                                <span className="text-sm font-bold text-indigo-300">{u.total}</span>
                                <span className="hidden sm:inline text-[11px] text-white/35 ml-2">리뷰 {u.review_count} · 글 {u.article_count} · Bar {u.bar_count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="glass-card card rounded-xl p-6">
                      <h2 className="font-bold text-white text-base mb-4">회원 구성 <span className="text-xs font-normal text-white/40 ml-1">총 {adminStats.totalUsers}명</span></h2>
                      {(() => {
                        const total = adminStats.memberCount + adminStats.nonMemberCount + adminStats.adminCount || 1;
                        const seg = [
                          { label: "w_lab 회원", count: adminStats.memberCount, bar: "bg-emerald-400", dot: "bg-emerald-400" },
                          { label: "비회원", count: adminStats.nonMemberCount, bar: "bg-gray-400", dot: "bg-gray-400" },
                          { label: "관리자", count: adminStats.adminCount, bar: "bg-indigo-400", dot: "bg-indigo-400" },
                        ];
                        return (
                          <>
                            <div className="flex h-3 rounded-full overflow-hidden mb-4 bg-black/10 dark:bg-white/5">
                              {seg.map((s) => s.count > 0 ? (
                                <div key={s.label} className={s.bar} style={{ width: `${(s.count / total) * 100}%` }} />
                              ) : null)}
                            </div>
                            <div className="space-y-2">
                              {seg.map((s) => (
                                <div key={s.label} className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2 text-white/60"><span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />{s.label}</span>
                                  <span className="text-white/80 font-medium">{s.count}명 <span className="text-white/30 text-xs">({Math.round((s.count / total) * 100)}%)</span></span>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : null
            )}

            {/* 유저 관리 */}
            {adminSubTab === "users" && (
              <div className="glass-card card rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-white text-lg">유저 관리</h2>
                  <span className="text-sm text-white/40">{visibleAdminUsers.length}{visibleAdminUsers.length !== adminUsers.length ? ` / ${adminUsers.length}` : ""}명</span>
                </div>

                {/* 검색·필터·정렬 */}
                <div className="flex flex-col md:flex-row gap-2 md:items-center mb-4">
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="이름 또는 아이디 검색"
                    className="glass-input surface flex-1 px-3 py-2 rounded-lg text-sm"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {([["all", "전체"], ["member", "회원"], ["nonmember", "비회원"], ["admin", "관리자"]] as const).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => setUserFilter(val)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition ${userFilter === val ? "bg-indigo-500/80 text-white" : "bg-white/8 text-white/60 hover:bg-white/12"}`}>{label}</button>
                    ))}
                  </div>
                  <select
                    value={userSort}
                    onChange={(e) => setUserSort(e.target.value as "latest" | "oldest" | "active")}
                    className="glass-input surface md:w-32 px-3 py-2 rounded-lg text-sm"
                  >
                    <option value="latest">가입 최신순</option>
                    <option value="oldest">가입 오래된순</option>
                    <option value="active">활동순</option>
                  </select>
                </div>

                {adminLoading ? <p className="text-white/30 text-sm">로딩 중...</p> : visibleAdminUsers.length === 0 ? (
                  <p className="text-center text-white/30 text-sm py-8">조건에 맞는 유저가 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {visibleAdminUsers.map((u) => (
                      <div key={u.id} className={`flex items-center justify-between p-4 rounded-lg border ${u.id === userId ? "border-indigo-400/30 bg-indigo-500/10" : "border-white/8 bg-black/[0.03] dark:bg-white/[0.03]"}`}>
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-sm overflow-hidden flex-shrink-0">
                            {u.avatar_url ? (
                              <Image
                                src={u.avatar_url}
                                alt="avatar"
                                loader={passthroughImageLoader}
                                unoptimized
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              (u.name || "?")[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white text-sm">{u.name}</span>
                              {u.is_admin && <span className="px-1.5 py-0.5 bg-indigo-500/80 text-white text-xs rounded-full">관리자</span>}
                              {u.is_member ? (
                                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-full">w_lab 회원</span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-white/10 text-white/45 text-xs rounded-full">비회원</span>
                              )}
                              {u.id === userId && <span className="px-1.5 py-0.5 bg-white/20 text-white text-xs rounded-full">본인</span>}
                            </div>
                            <p className="text-xs text-white/40">@{u.username}</p>
                            <p className="text-xs text-white/30 mt-0.5">가입: {new Date(u.created_at).toLocaleDateString("ko-KR")} · 최근 접속: {formatLastSeen(u.last_seen_at)}</p>
                            <p className="text-xs text-white/30">리뷰 {u.review_count} · 글 {u.article_count} · Bar {u.bar_count}</p>
                          </div>
                        </div>
                        {u.id !== userId && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => handleToggleMember(u.id, u.is_member, u.is_admin)}
                              disabled={memberUpdatingId === u.id || u.is_admin}
                              title={u.is_admin ? "관리자 계정은 회원 토글 불가" : undefined}
                              className={`px-3 py-1.5 text-xs rounded-lg transition font-medium disabled:opacity-40 disabled:cursor-not-allowed ${u.is_member ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "bg-white/8 text-white/60 hover:bg-white/12"}`}>
                              {memberUpdatingId === u.id ? "변경 중..." : u.is_member ? "회원 해제" : "회원 지정"}
                            </button>
                            <button onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                              className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${u.is_admin ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30" : "bg-white/8 text-white/60 hover:bg-white/12"}`}>
                              {u.is_admin ? "관리자 해제" : "관리자 지정"}
                            </button>
                            <button onClick={() => handleDeleteUser(u.id, u.name)} disabled={deletingUserId === u.id}
                              className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition font-medium disabled:opacity-50">
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
              <div className="glass-card card rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-white text-lg">공지사항 관리</h2>
                    <span className="text-sm text-white/40">
                      {visibleAnnouncements.length}{visibleAnnouncements.length !== allAnnouncements.length ? ` / ${allAnnouncements.length}` : ""}개
                    </span>
                  </div>
                  <button onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                    className="cta px-4 py-2 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 transition">
                    {showAnnouncementForm ? "취소" : "📢 공지 작성"}
                  </button>
                </div>

                {showAnnouncementForm && (
                  <form onSubmit={handleAdminSubmitAnnouncement} className="space-y-3 mb-6 p-4 glass-card card rounded-lg border border-indigo-400/20">
                    <input value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      placeholder="공지 제목" className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                    <RichTextEditor
                      value={announcementForm.content}
                      onChange={(html) => setAnnouncementForm({ ...announcementForm, content: html })}
                      placeholder="공지 내용"
                      minHeight="120px"
                    />
                    <button type="submit" disabled={announcementSubmitting}
                      className="cta px-6 py-2 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition">
                      {announcementSubmitting ? "등록 중..." : "등록"}
                    </button>
                  </form>
                )}

                {contentLoading ? <p className="text-white/30 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {visibleAnnouncements.length === 0 ? (
                      <p className="text-center text-white/30 text-sm py-8">
                        {hasAdminQuery ? "조건에 맞는 공지가 없습니다." : "등록된 공지가 없습니다."}
                      </p>
                    ) : visibleAnnouncements.map((a) => (
                      <div key={a.id} className="border border-white/8 rounded-lg p-4 bg-black/[0.03] dark:bg-white/[0.03]">
                        {editingAdminAnnouncement?.id === a.id ? (
                          <form onSubmit={handleAdminSaveAnnouncement} className="space-y-3">
                            <input value={editingAdminAnnouncement.title}
                              onChange={(e) => setEditingAdminAnnouncement({ ...editingAdminAnnouncement, title: e.target.value })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                            <RichTextEditor
                              value={editingAdminAnnouncement.content}
                              onChange={(html) => setEditingAdminAnnouncement({ ...editingAdminAnnouncement, content: html })}
                              placeholder="공지 내용"
                              minHeight="120px"
                            />
                            <div className="flex gap-2">
                              <button type="submit" className="cta px-4 py-1.5 bg-indigo-500/80 text-white text-xs rounded-lg hover:bg-indigo-500 transition">저장</button>
                              <button type="button" onClick={() => setEditingAdminAnnouncement(null)} className="px-4 py-1.5 bg-white/8 text-white/70 text-xs rounded-lg hover:bg-white/12 transition">취소</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white text-sm">{a.title}</p>
                              <SafeHtml html={a.content} className="rich-content text-sm leading-relaxed mt-1 line-clamp-2 text-white/40" />
                              <p className="text-xs text-white/30 mt-1">{new Date(a.created_at).toLocaleDateString("ko-KR")}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => setEditingAdminAnnouncement(a)} className="text-xs text-white/40 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10 transition">편집</button>
                              <button onClick={() => handleAdminDeleteAnnouncement(a.id)} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition">삭제</button>
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
              <div className="glass-card card rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-white text-lg">지식글 전체 관리</h2>
                  <span className="text-sm text-white/40">
                    {visibleArticles.length}{visibleArticles.length !== allArticles.length ? ` / ${allArticles.length}` : ""}개
                  </span>
                </div>
                {contentLoading ? <p className="text-white/30 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {visibleArticles.length === 0 ? (
                      <p className="text-center text-white/30 text-sm py-8">
                        {hasAdminQuery ? "조건에 맞는 지식글이 없습니다." : "등록된 지식글이 없습니다."}
                      </p>
                    ) : visibleArticles.map((a) => (
                      <div key={a.id} className="border border-white/8 rounded-lg p-4 bg-black/[0.03] dark:bg-white/[0.03]">
                        {editingAdminArticle?.id === a.id ? (
                          <form onSubmit={handleAdminSaveArticle} className="space-y-3">
                            <input value={editingAdminArticle.title} onChange={(e) => setEditingAdminArticle({ ...editingAdminArticle, title: e.target.value })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                            <select value={editingAdminArticle.category} onChange={(e) => setEditingAdminArticle({ ...editingAdminArticle, category: e.target.value })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg text-sm">
                              {["기초 지식","테이스팅","역사","문화","기타"].map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <RichTextEditor
                              value={editingAdminArticle.content}
                              onChange={(html) => setEditingAdminArticle({ ...editingAdminArticle, content: html })}
                              placeholder="글 내용"
                              minHeight="120px"
                            />
                            <div className="flex gap-2">
                              <button type="submit" className="cta px-4 py-1.5 bg-indigo-500/80 text-white text-xs rounded-lg hover:bg-indigo-500 transition">저장</button>
                              <button type="button" onClick={() => setEditingAdminArticle(null)} className="px-4 py-1.5 bg-white/8 text-white/70 text-xs rounded-lg hover:bg-white/12 transition">취소</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">{a.category}</span>
                                <span className="text-xs text-white/30">{a.author_name || a.users?.name || "-"}</span>
                              </div>
                              <p className="font-medium text-white text-sm">{a.title}</p>
                              <SafeHtml html={a.content} className="rich-content text-sm leading-relaxed mt-1 line-clamp-2 text-white/40" />
                              <p className="text-xs text-white/30 mt-1">{new Date(a.created_at).toLocaleDateString("ko-KR")}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => setEditingAdminArticle(a)} className="text-xs text-white/40 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10 transition">편집</button>
                              <button onClick={() => handleAdminDeleteArticle(a.id)} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition">삭제</button>
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
              <div className="glass-card card rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-white text-lg">리뷰 전체 관리</h2>
                  <span className="text-sm text-white/40">
                    {visibleReviews.length}{visibleReviews.length !== allReviews.length ? ` / ${allReviews.length}` : ""}개
                  </span>
                </div>
                {contentLoading ? <p className="text-white/30 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {visibleReviews.length === 0 ? (
                      <p className="text-center text-white/30 text-sm py-8">
                        {hasAdminQuery ? "조건에 맞는 리뷰가 없습니다." : "등록된 리뷰가 없습니다."}
                      </p>
                    ) : visibleReviews.map((r) => (
                      <div key={r.id} className="border border-white/8 rounded-lg p-4 flex justify-between items-start gap-3 bg-black/[0.03] dark:bg-white/[0.03]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-white/30">{r.users?.name || "-"}</span>
                            <span className="text-xs text-blue-400">{r.rating}/10</span>
                          </div>
                          <p className="font-medium text-white text-sm">{(r.whiskeys as unknown as { name: string } | null)?.name || "위스키"}</p>
                          {r.review_text && <p className="text-xs text-white/40 mt-1 break-words">{r.review_text}</p>}
                          <p className="text-xs text-white/30 mt-1">{new Date(r.created_at).toLocaleDateString("ko-KR")}</p>
                        </div>
                        <button onClick={() => handleAdminDeleteReview(r.id)} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition flex-shrink-0">삭제</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bar 관리 */}
            {adminSubTab === "bars" && (
              <div className="glass-card card rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-white text-lg">Bar 전체 관리</h2>
                  <span className="text-sm text-white/40">
                    {visibleBars.length}{visibleBars.length !== allBars.length ? ` / ${allBars.length}` : ""}개
                  </span>
                </div>
                {contentLoading ? <p className="text-white/30 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {visibleBars.length === 0 ? (
                      <p className="text-center text-white/30 text-sm py-8">
                        {hasAdminQuery ? "조건에 맞는 Bar가 없습니다." : "등록된 Bar가 없습니다."}
                      </p>
                    ) : visibleBars.map((b) => (
                      <div key={b.id} className="border border-white/8 rounded-lg p-4 bg-black/[0.03] dark:bg-white/[0.03]">
                        {editingAdminBar?.id === b.id ? (
                          <form onSubmit={handleAdminSaveBar} className="space-y-3">
                            <input value={editingAdminBar.bar_name} onChange={(e) => setEditingAdminBar({ ...editingAdminBar, bar_name: e.target.value })}
                              placeholder="Bar 이름" className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                            <input value={editingAdminBar.link || ""} onChange={(e) => setEditingAdminBar({ ...editingAdminBar, link: e.target.value })}
                              placeholder="링크" className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                            <textarea value={editingAdminBar.notes || ""} rows={2} onChange={(e) => setEditingAdminBar({ ...editingAdminBar, notes: e.target.value })}
                              placeholder="비고" className="glass-input surface w-full px-3 py-2 rounded-lg text-sm resize-none" />
                            <div className="flex gap-2">
                              <button type="submit" className="cta px-4 py-1.5 bg-indigo-500/80 text-white text-xs rounded-lg hover:bg-indigo-500 transition">저장</button>
                              <button type="button" onClick={() => setEditingAdminBar(null)} className="px-4 py-1.5 bg-white/8 text-white/70 text-xs rounded-lg hover:bg-white/12 transition">취소</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-white/30">{b.author_name || b.users?.name || "-"}</span>
                              </div>
                              <p className="font-medium text-white text-sm">{b.bar_name}</p>
                              {b.notes && <SafeHtml html={b.notes} className="rich-content text-xs leading-relaxed mt-1 line-clamp-3 text-white/40" />}
                              <p className="text-xs text-white/30 mt-1">{new Date(b.created_at).toLocaleDateString("ko-KR")}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => setEditingAdminBar(b)} className="text-xs text-white/40 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10 transition">편집</button>
                              <button onClick={() => handleAdminDeleteBar(b.id)} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition">삭제</button>
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
              <div className="glass-card card rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-white text-lg">위스키 전체 관리</h2>
                  <span className="text-sm text-white/40">
                    {visibleWhiskeys.length}{visibleWhiskeys.length !== allWhiskeys.length ? ` / ${allWhiskeys.length}` : ""}개
                  </span>
                </div>
                {contentLoading ? <p className="text-white/30 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {visibleWhiskeys.length === 0 ? (
                      <p className="text-center text-white/30 text-sm py-8">
                        {hasAdminQuery ? "조건에 맞는 위스키가 없습니다." : "등록된 위스키가 없습니다."}
                      </p>
                    ) : visibleWhiskeys.map((w) => (
                      <div key={w.id} className="border border-white/8 rounded-lg p-4 bg-black/[0.03] dark:bg-white/[0.03]">
                        {editingAdminWhiskey?.id === w.id ? (
                          <form onSubmit={handleAdminSaveWhiskey} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <input value={editingAdminWhiskey.name} onChange={(e) => setEditingAdminWhiskey({ ...editingAdminWhiskey, name: e.target.value })}
                                placeholder="이름" className="col-span-2 glass-input surface px-3 py-2 rounded-lg text-sm" />
                              <select value={editingAdminWhiskey.type} onChange={(e) => setEditingAdminWhiskey({ ...editingAdminWhiskey, type: e.target.value })}
                                className="glass-input surface px-3 py-2 rounded-lg text-sm">
                                {["Scotch","Irish","Bourbon/Rye","Etc"].map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <input value={editingAdminWhiskey.region || ""} onChange={(e) => setEditingAdminWhiskey({ ...editingAdminWhiskey, region: e.target.value })}
                                placeholder="지역" className="glass-input surface px-3 py-2 rounded-lg text-sm" />
                              <input type="number" value={editingAdminWhiskey.age || ""} onChange={(e) => setEditingAdminWhiskey({ ...editingAdminWhiskey, age: parseInt(e.target.value) || 0 })}
                                placeholder="숙성년" className="glass-input surface px-3 py-2 rounded-lg text-sm" />
                              <input type="number" step="0.1" value={editingAdminWhiskey.abv || ""} onChange={(e) => setEditingAdminWhiskey({ ...editingAdminWhiskey, abv: parseFloat(e.target.value) || 0 })}
                                placeholder="도수%" className="glass-input surface px-3 py-2 rounded-lg text-sm" />
                            </div>
                            <div className="flex gap-2">
                              <button type="submit" className="cta px-4 py-1.5 bg-indigo-500/80 text-white text-xs rounded-lg hover:bg-indigo-500 transition">저장</button>
                              <button type="button" onClick={() => setEditingAdminWhiskey(null)} className="px-4 py-1.5 bg-white/8 text-white/70 text-xs rounded-lg hover:bg-white/12 transition">취소</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">{w.type}</span>
                                {w.region && <span className="text-xs text-white/30">{w.region}</span>}
                              </div>
                              <p className="font-medium text-white text-sm">{w.name}</p>
                              <p className="text-xs text-white/30 mt-1">
                                {w.age ? `${w.age}년 ` : ""}{w.abv ? `${w.abv}% ` : ""}· {new Date(w.created_at).toLocaleDateString("ko-KR")}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => setEditingAdminWhiskey(w)} className="text-xs text-white/40 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10 transition">편집</button>
                              <button onClick={() => handleAdminDeleteWhiskey(w.id)} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition">삭제</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 일정 관리 */}
            {adminSubTab === "schedules" && (
              <div className="glass-card card rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-white text-lg">일정 전체 관리</h2>
                  <span className="text-sm text-white/40">
                    {visibleSchedules.length}{visibleSchedules.length !== allSchedules.length ? ` / ${allSchedules.length}` : ""}개
                  </span>
                </div>
                {contentLoading ? <p className="text-white/30 text-sm">로딩 중...</p> : (
                  <div className="space-y-3">
                    {visibleSchedules.length === 0 ? (
                      <p className="text-center text-white/30 text-sm py-8">
                        {hasAdminQuery || adminStatusFilter !== "all" ? "조건에 맞는 일정이 없습니다." : "등록된 일정이 없습니다."}
                      </p>
                    ) : visibleSchedules.map((s) => (
                      <div key={s.id} className="border border-white/8 rounded-lg p-4 flex justify-between items-start gap-3 bg-black/[0.03] dark:bg-white/[0.03]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-white/30">{s.creator_name || "-"}</span>
                            {s.confirmed_date ? <span className="text-xs text-amber-300">확정</span> : <span className="text-xs text-white/30">미확정</span>}
                          </div>
                          <p className="font-medium text-white text-sm">{s.name}</p>
                          <p className="text-xs text-white/30 mt-1">
                            생성: {new Date(s.created_at).toLocaleDateString("ko-KR")}
                            {s.confirmed_date ? ` · 확정: ${new Date(s.confirmed_date + "T00:00:00").toLocaleDateString("ko-KR")}` : ""}
                          </p>
                        </div>
                        <button onClick={() => handleAdminDeleteSchedule(s.id)} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition flex-shrink-0">삭제</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* 컬렉션 추가 모달 */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCollectionModal(false); }}>
          <div className="glass-card card rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">{collectionAddStatus === "tried" ? "마셔봤어요 추가" : "마시고 싶어요 추가"}</h2>
              <button type="button" aria-label="닫기" onClick={() => setShowCollectionModal(false)} className="text-white/40 hover:text-white text-xl">×</button>
            </div>
            <div className="flex gap-2 mb-4">
              {(["encyclopedia", "manual"] as const).map((m) => (
                <button key={m} onClick={() => setCollectionAddMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${collectionAddMode === m ? "chip bg-indigo-500/80 text-white" : "bg-white/5 text-white/50"}`}>
                  {m === "encyclopedia" ? "백과에서" : "직접 입력"}
                </button>
              ))}
            </div>
            {collectionAddMode === "encyclopedia" ? (
              <div className="space-y-3">
                <input type="text" value={collectionSearch}
                  onChange={(e) => setCollectionSearch(e.target.value)}
                  placeholder="위스키 이름으로 검색..."
                  className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {ENCYCLOPEDIA_WHISKEYS
                    .filter((w) => !collectionSearch.trim() || w.name.toLowerCase().includes(collectionSearch.toLowerCase()))
                    .slice(0, 20)
                    .map((w) => (
                      <button key={w.id} onClick={() => handleAddCollection({ encyclopedia_id: w.id })}
                        className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-sm">
                        <p className="text-white font-medium">{w.name}</p>
                        <p className="text-white/40 text-xs">{w.distillery} · {w.region}</p>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input type="text" value={collectionManualName}
                  onChange={(e) => setCollectionManualName(e.target.value)}
                  placeholder="위스키 이름을 직접 입력하세요"
                  className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                <button onClick={() => collectionManualName.trim() && handleAddCollection({ custom_name: collectionManualName.trim() })}
                  disabled={!collectionManualName.trim()}
                  className="cta w-full py-2 bg-indigo-500/80 text-white rounded-lg text-sm hover:bg-indigo-500 disabled:opacity-40 transition">
                  추가하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
