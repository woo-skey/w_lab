"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { ENCYCLOPEDIA_WHISKEYS, CATEGORY_TO_TYPE } from "@/lib/encyclopediaData";
import RichTextEditor from "@/components/RichTextEditor";
import UserProfilePopup from "@/components/UserProfilePopup";
import SafeHtml from "@/components/SafeHtml";

interface Whiskey {
  id: string;
  name: string;
  type: string;
  region: string;
  age: number;
  abv: number;
  tasting_notes: string;
  nose: string;
  palate: string;
  finish_note: string;
  price: number;
  created_by?: string;
}

interface Review {
  id: string;
  whiskey_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  taste_profile: string;
  nose: string;
  palate: string;
  finish_note: string;
  remarks: string;
  created_at: string;
  users?: { name: string };
}

interface ReviewComment {
  id: string;
  review_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: { name: string };
}

const WHISKEY_TYPES = ["전체", "Scotch", "Irish", "Bourbon/Rye", "Etc"];

function RatingGauge({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const color = rating >= 8 ? "#4ade80" : rating >= 5 ? "#facc15" : "#f87171";
  const isSmall = size === "sm";
  return (
    <div className={`flex flex-col items-end gap-0.5 ${isSmall ? "w-14" : "w-16"}`}>
      <span className={`font-bold leading-none ${isSmall ? "text-sm" : "text-base"}`} style={{ color }}>
        {typeof rating === "number" ? rating.toFixed(1) : rating}/10
      </span>
      <div className={`w-full rounded-full overflow-hidden ${isSmall ? "h-1" : "h-1.5"}`} style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(Number(rating) / 10) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const deepLinkHandledRef = useRef<string | null>(null);
  const [deepLinkWhiskeyId, setDeepLinkWhiskeyId] = useState<string | null>(null);

  const [whiskeys, setWhiskeys] = useState<Whiskey[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [comments, setComments] = useState<Record<string, ReviewComment[]>>({});
  const [selectedType, setSelectedType] = useState("전체");
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedWhiskey, setExpandedWhiskey] = useState<string | null>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // 위스키 추가 폼
  const [addMode, setAddMode] = useState<"encyclopedia" | "manual">("encyclopedia");
  const [encycSearch, setEncycSearch] = useState("");
  const [encycCategory, setEncycCategory] = useState<"전체" | "스카치" | "아이리쉬" | "버번/라이" | "기타">("전체");
  const [whiskey, setWhiskey] = useState({ name: "", type: "Scotch", region: "", age: "", abv: "", nose: "", palate: "", finish_note: "", tasting_notes: "", price: "" });

  // 리뷰 작성 폼
  const [reviewForm, setReviewForm] = useState<{ whiskey_id: string; rating: number; review_text: string; taste_profile: string; nose: string; palate: string; finish_note: string; remarks: string } | null>(null);

  // 리뷰 편집
  const [editingReview, setEditingReview] = useState<{ id: string; rating: number; review_text: string; taste_profile: string; nose: string; palate: string; finish_note: string; remarks: string } | null>(null);

  // 위스키 편집
  const [editingWhiskey, setEditingWhiskey] = useState<Whiskey | null>(null);

  // 댓글
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [page, setPage] = useState(1);
  const [reviewLikes, setReviewLikes] = useState<Record<string, number>>({});
  const [likedReviews, setLikedReviews] = useState<Set<string>>(new Set());
  const [userReviewedWhiskeys, setUserReviewedWhiskeys] = useState<Set<string>>(new Set());
  const [compareList, setCompareList] = useState<string[]>([]);

  // 카드 펼칠 때 리뷰 fetch
  useEffect(() => {
    if (expandedWhiskey) fetchReviews(expandedWhiskey);
  }, [expandedWhiskey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 비교 모달 열릴 때 리뷰 미리 fetch
  useEffect(() => {
    if (compareList.length === 2) {
      compareList.forEach((id) => {
        if (!reviews[id]) fetchReviews(id);
      });
    }
  }, [compareList]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) { setUserId(id); fetchReviewLikes(id); }
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchWhiskeys();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDeepLinkWhiskeyId(params.get("whiskeyId"));
  }, []);

  useEffect(() => {
    if (!deepLinkWhiskeyId || loading) return;
    if (deepLinkHandledRef.current === deepLinkWhiskeyId) return;

    const target = whiskeys.find((w) => w.id === deepLinkWhiskeyId);
    deepLinkHandledRef.current = deepLinkWhiskeyId;
    if (!target) return;

    const targetType = WHISKEY_TYPES.includes(target.type) ? target.type : "전체";
    setSelectedType(targetType);
    setSearchQuery(target.name);
    setShowSearchDrop(false);
    setPage(1);
    setExpandedWhiskey(target.id);

    setTimeout(() => {
      document.getElementById(`whiskey-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 240);
  }, [deepLinkWhiskeyId, loading, whiskeys]);

  const fetchWhiskeys = async () => {
    try {
      const uid = localStorage.getItem("userId");
      const [{ data, error }, { data: countData }, { data: userRevData }] = await Promise.all([
        supabase.from("whiskeys").select("*").order("created_at", { ascending: false }),
        supabase.from("reviews").select("whiskey_id"),
        uid
          ? supabase.from("reviews").select("whiskey_id").eq("user_id", uid)
          : Promise.resolve({ data: [] as { whiskey_id: string }[] }),
      ]);
      if (error) throw error;
      setWhiskeys(data || []);
      const counts: Record<string, number> = {};
      (countData || []).forEach((r) => {
        counts[r.whiskey_id] = (counts[r.whiskey_id] || 0) + 1;
      });
      setReviewCounts(counts);
      setUserReviewedWhiskeys(new Set((userRevData || []).map((r) => r.whiskey_id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewLikes = async (uid: string) => {
    const { data } = await supabase.from("review_likes").select("review_id, user_id");
    if (!data) return;
    const counts: Record<string, number> = {};
    const liked = new Set<string>();
    data.forEach((l) => {
      counts[l.review_id] = (counts[l.review_id] || 0) + 1;
      if (l.user_id === uid) liked.add(l.review_id);
    });
    setReviewLikes(counts);
    setLikedReviews(liked);
  };

  const handleLikeReview = async (reviewId: string) => {
    if (!userId) { alert("로그인이 필요합니다."); return; }
    if (likedReviews.has(reviewId)) {
      await supabase.from("review_likes").delete().eq("review_id", reviewId).eq("user_id", userId);
      setLikedReviews((prev) => { const n = new Set(prev); n.delete(reviewId); return n; });
      setReviewLikes((prev) => ({ ...prev, [reviewId]: Math.max((prev[reviewId] || 1) - 1, 0) }));
    } else {
      await supabase.from("review_likes").insert([{ review_id: reviewId, user_id: userId }]);
      setLikedReviews((prev) => new Set([...prev, reviewId]));
      setReviewLikes((prev) => ({ ...prev, [reviewId]: (prev[reviewId] || 0) + 1 }));
    }
  };

  const fetchReviews = async (whiskeyId: string) => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, users(name)")
        .eq("whiskey_id", whiskeyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReviews((prev) => ({ ...prev, [whiskeyId]: data || [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComments = async (reviewId: string) => {
    try {
      const { data, error } = await supabase
        .from("review_comments")
        .select("*, users(name)")
        .eq("review_id", reviewId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setComments((prev) => ({ ...prev, [reviewId]: data || [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWhiskey = async (whiskeyId: string) => {
    if (!confirm("위스키를 삭제하면 관련 리뷰도 모두 삭제됩니다. 계속할까요?")) return;
    try {
      const { error } = await supabase.from("whiskeys").delete().eq("id", whiskeyId);
      if (error) throw error;
      if (expandedWhiskey === whiskeyId) setExpandedWhiskey(null);
      fetchWhiskeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditWhiskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWhiskey) return;
    try {
      const { error } = await supabase.from("whiskeys").update({
        name: editingWhiskey.name, type: editingWhiskey.type, region: editingWhiskey.region,
        age: editingWhiskey.age, abv: editingWhiskey.abv,
        nose: editingWhiskey.nose || null,
        palate: editingWhiskey.palate || null,
        finish_note: editingWhiskey.finish_note || null,
        tasting_notes: editingWhiskey.tasting_notes, price: editingWhiskey.price,
      }).eq("id", editingWhiskey.id);
      if (error) throw error;
      setEditingWhiskey(null);
      fetchWhiskeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleWhiskey = (whiskeyId: string) => {
    if (expandedWhiskey === whiskeyId) {
      setExpandedWhiskey(null);
    } else {
      setExpandedWhiskey(whiskeyId);
    }
  };

  const handleToggleReview = (reviewId: string) => {
    if (expandedReview === reviewId) {
      setExpandedReview(null);
    } else {
      setExpandedReview(reviewId);
      if (!comments[reviewId]) fetchComments(reviewId);
    }
  };

  const handleAddWhiskey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("whiskeys").insert([{
        name: whiskey.name, type: whiskey.type,
        region: whiskey.region || null,
        age: whiskey.age ? parseInt(whiskey.age) : null,
        abv: whiskey.abv ? parseFloat(whiskey.abv) : null,
        nose: whiskey.nose || null,
        palate: whiskey.palate || null,
        finish_note: whiskey.finish_note || null,
        tasting_notes: whiskey.tasting_notes || null,
        price: whiskey.price ? parseFloat(whiskey.price) : null,
        created_by: userId || null,
      }]);
      if (error) throw error;
      setWhiskey({ name: "", type: "Scotch", region: "", age: "", abv: "", nose: "", palate: "", finish_note: "", tasting_notes: "", price: "" });
      setShowAddForm(false);
      fetchWhiskeys();
    } catch (err) {
      console.error(err);
      alert("위스키 추가에 실패했습니다");
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm) return;
    try {
      const { error } = await supabase.from("reviews").insert([{
        whiskey_id: reviewForm.whiskey_id,
        user_id: userId,
        rating: reviewForm.rating,
        review_text: reviewForm.review_text,
        taste_profile: reviewForm.taste_profile,
        nose: reviewForm.nose || null,
        palate: reviewForm.palate || null,
        finish_note: reviewForm.finish_note || null,
        remarks: reviewForm.remarks || null,
      }]);
      if (error) throw error;
      // 위스키 등록자에게 알림 (본인 제외)
      const w = whiskeys.find((w) => w.id === reviewForm.whiskey_id);
      if (w?.created_by && w.created_by !== userId) {
        const userName = localStorage.getItem("userName") || "누군가";
        await createNotification(w.created_by, "review", `🥃 ${userName}님이 "${w.name}"에 리뷰를 남겼습니다.`, "/reviews");
      }
      setReviewForm(null);
      setUserReviewedWhiskeys((prev) => new Set([...prev, reviewForm.whiskey_id]));
      fetchReviews(reviewForm.whiskey_id);
    } catch (err) {
      console.error(err);
      alert("리뷰 등록에 실패했습니다");
    }
  };

  const handleDeleteReview = async (reviewId: string, whiskeyId: string) => {
    if (!confirm("리뷰를 삭제할까요?")) return;
    try {
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
      if (error) throw error;
      fetchReviews(whiskeyId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditReview = async (e: React.FormEvent, whiskeyId: string) => {
    e.preventDefault();
    if (!editingReview) return;
    try {
      const { error } = await supabase.from("reviews").update({
        rating: editingReview.rating,
        review_text: editingReview.review_text,
        taste_profile: editingReview.taste_profile,
        nose: editingReview.nose || null,
        palate: editingReview.palate || null,
        finish_note: editingReview.finish_note || null,
        remarks: editingReview.remarks || null,
      }).eq("id", editingReview.id);
      if (error) throw error;
      setEditingReview(null);
      fetchReviews(whiskeyId);
    } catch (err) {
      console.error(err);
      alert("편집에 실패했습니다");
    }
  };

  const handleDeleteComment = async (commentId: string, reviewId: string) => {
    try {
      const { error } = await supabase.from("review_comments").delete().eq("id", commentId);
      if (error) throw error;
      fetchComments(reviewId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (reviewId: string) => {
    const content = commentText[reviewId]?.trim();
    if (!content) return;
    try {
      const { error } = await supabase.from("review_comments").insert([{
        review_id: reviewId,
        user_id: userId,
        content,
      }]);
      if (error) throw error;
      // 리뷰 작성자에게 알림 (본인 제외)
      const reviewList = Object.values(reviews).flat();
      const targetReview = reviewList.find((r) => r.id === reviewId);
      if (targetReview && targetReview.user_id !== userId) {
        const userName = localStorage.getItem("userName") || "누군가";
        await createNotification(targetReview.user_id, "comment", `💬 ${userName}님이 회원님의 리뷰에 댓글을 남겼습니다.`, "/reviews");
      }
      setCommentText((prev) => ({ ...prev, [reviewId]: "" }));
      fetchComments(reviewId);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredWhiskeys = whiskeys
    .filter((w) =>
      (selectedType === "전체" || w.type === selectedType) &&
      (searchQuery === "" || w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => sortBy === "popular" ? (reviewCounts[b.id] || 0) - (reviewCounts[a.id] || 0) : 0);

  const filteredEncyclopediaEntries = ENCYCLOPEDIA_WHISKEYS.filter((e) => {
    const matchCategory = encycCategory === "전체" || e.category === encycCategory;
    const q = encycSearch.trim().toLowerCase();
    const matchSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.distillery.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(filteredWhiskeys.length / PAGE_SIZE);
  const pagedWhiskeys = filteredWhiskeys.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
    <div className="tone min-h-screen">
      <div className="tone-wrap max-w-5xl mx-auto px-4 py-8 md:py-12">
        <h1 className="section-title text-3xl md:text-4xl font-bold text-white mb-2">위스키 리뷰</h1>
        <p className="meta text-white/55 mb-2">다양한 위스키를 평가하고 리뷰를 공유하세요.</p>
        <p className="meta text-xs text-white/30 mb-8">위스키 카드를 클릭하면 리뷰 목록이 펼쳐집니다. 새 위스키 추가 후 리뷰 작성 버튼으로 별점과 테이스팅 노트를 남길 수 있습니다.</p>

        {/* 타입 필터 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {WHISKEY_TYPES.map((type) => (
            <button key={type} onClick={() => { setSelectedType(type); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedType === type ? "chip bg-indigo-500/80 text-white" : "bg-white/5 text-white/60 border border-white/10 hover:border-indigo-400/50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* 검색 + 정렬 */}
        <div className="flex gap-3 mb-6 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); setShowSearchDrop(true); }}
              onFocus={() => setShowSearchDrop(true)}
              onBlur={() => setTimeout(() => setShowSearchDrop(false), 150)}
              placeholder="위스키 이름 검색..."
              className="glass-input surface w-full px-4 py-2 rounded-lg text-sm pr-8"
            />
            {searchQuery && (
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setSearchQuery(""); setPage(1); setShowSearchDrop(false); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 text-base leading-none"
              >×</button>
            )}
            {showSearchDrop && searchQuery.trim() && (() => {
              const suggestions = whiskeys
                .filter((w) => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 6);
              if (!suggestions.length) return null;
              return (
                <div className="absolute top-full left-0 right-0 mt-1 glass-card card rounded-xl overflow-hidden z-30 shadow-xl">
                  {suggestions.map((w) => (
                    <button key={w.id} onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setSearchQuery(w.name); setShowSearchDrop(false); setPage(1); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/8 transition border-b border-white/5 last:border-0">
                      {w.name}
                      <span className="text-white/35 text-xs ml-2">{w.type}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="flex gap-1">
            {(["latest", "popular"] as const).map((s) => (
              <button key={s} onClick={() => { setSortBy(s); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${sortBy === s ? "bg-indigo-500/80 text-white" : "bg-white/5 text-white/55 border border-white/10 hover:border-indigo-400/50"}`}>
                {s === "latest" ? "최신순" : "인기순"}
              </button>
            ))}
          </div>
        </div>

        {/* 위스키 추가 버튼 */}
        {userId ? (
          <button onClick={() => {
              if (!showAddForm) {
                setAddMode("encyclopedia");
                setEncycSearch("");
                setEncycCategory("전체");
                setWhiskey({ name: "", type: selectedType !== "전체" ? selectedType : "Scotch", region: "", age: "", abv: "", nose: "", palate: "", finish_note: "", tasting_notes: "", price: "" });
              }
              setShowAddForm(!showAddForm);
            }}
            className="cta mb-6 px-6 py-2 bg-indigo-500/80 text-white rounded-lg hover:bg-indigo-500 transition">
            {showAddForm ? "취소" : "🥃 새 위스키 추가"}
          </button>
        ) : (
          <div className="glass-card card rounded-lg p-4 mb-6 text-center">
            <p className="text-white/60 mb-2">위스키 추가 및 리뷰 작성은 로그인이 필요합니다.</p>
            <a href="/login" className="text-indigo-400 underline font-medium text-sm">로그인하기</a>
          </div>
        )}

        {/* 위스키 추가 폼 */}
        {showAddForm && (
          <div className="glass-card card rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">새 위스키 추가</h2>

            {/* 탭 */}
            <div className="flex gap-1 mb-5 p-1 bg-white/5 rounded-lg w-fit">
              {(["encyclopedia", "manual"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAddMode(mode)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                    addMode === mode ? "chip bg-indigo-500/80 text-white" : "text-white/50 hover:text-white/70"
                  }`}
                >
                  {mode === "encyclopedia" ? "백과에서 가져오기" : "직접 입력"}
                </button>
              ))}
            </div>

            {/* 백과 picker */}
            {addMode === "encyclopedia" && (
              <div>
                <input
                  type="text"
                  value={encycSearch}
                  onChange={(e) => setEncycSearch(e.target.value)}
                  placeholder="위스키 이름으로 검색..."
                  className="glass-input surface w-full px-4 py-2 rounded-lg text-sm mb-3"
                />
                <div className="flex flex-wrap gap-2 mb-3">
                  {(["전체", "스카치", "아이리쉬", "버번/라이", "기타"] as const).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setEncycCategory(category)}
                      className={`px-3 py-1 rounded-full text-xs border transition ${
                        encycCategory === category
                          ? "chip bg-indigo-500/80 text-white border-indigo-500/70"
                          : "bg-white/5 text-white/60 border-white/10 hover:bg-white/8 hover:text-white/80"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {filteredEncyclopediaEntries.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/4 px-4 py-5 text-center">
                      <p className="text-sm text-white/55">검색 결과가 없습니다.</p>
                      <p className="text-xs text-white/35 mt-1">검색어 또는 카테고리를 바꿔보세요.</p>
                      <button
                        type="button"
                        onClick={() => { setEncycSearch(""); setEncycCategory("전체"); }}
                        className="mt-3 px-3 py-1.5 rounded-lg text-xs bg-white/8 text-white/70 hover:bg-white/12 transition"
                      >
                        필터 초기화
                      </button>
                    </div>
                  ) : (
                    filteredEncyclopediaEntries.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          const priceNum = parseInt(entry.priceRange.replace(/[₩,]/g, "").split("–")[0]) || 0;
                          setWhiskey({
                            name: entry.name,
                            type: CATEGORY_TO_TYPE[entry.category] ?? "Etc",
                            region: `${entry.region}, ${entry.country}`,
                            age: entry.age ? String(entry.age) : "",
                            abv: String(entry.abv),
                            nose: entry.nose,
                            palate: entry.palate,
                            finish_note: entry.finish,
                            tasting_notes: "",
                            price: priceNum ? String(priceNum) : "",
                          });
                          setAddMode("manual");
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg bg-white/4 hover:bg-white/8 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-white text-sm font-medium">{entry.name}</p>
                            <p className="text-white/40 text-xs mt-0.5">{entry.distillery} · {entry.region}, {entry.country}</p>
                          </div>
                          <span className="text-indigo-300 text-xs flex-shrink-0">{entry.priceRange}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 직접 입력 폼 */}
            {addMode === "manual" && (
              <form onSubmit={handleAddWhiskey} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">이름 *</label>
                    <input type="text" value={whiskey.name} onChange={(e) => setWhiskey({ ...whiskey, name: e.target.value })}
                      placeholder="예: Glenmorangie 10" required
                      className="glass-input surface w-full px-4 py-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">타입 *</label>
                    <select value={whiskey.type} onChange={(e) => setWhiskey({ ...whiskey, type: e.target.value })}
                      className="glass-input surface w-full px-4 py-2 rounded-lg">
                      {WHISKEY_TYPES.filter((t) => t !== "전체").map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">지역</label>
                    <input type="text" value={whiskey.region} onChange={(e) => setWhiskey({ ...whiskey, region: e.target.value })}
                      placeholder="예: Highland"
                      className="glass-input surface w-full px-4 py-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">숙성 (년)</label>
                    <input type="number" value={whiskey.age} onChange={(e) => setWhiskey({ ...whiskey, age: e.target.value })}
                      placeholder="10"
                      className="glass-input surface w-full px-4 py-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">도수 (%)</label>
                    <input type="number" step="0.1" value={whiskey.abv} onChange={(e) => setWhiskey({ ...whiskey, abv: e.target.value })}
                      placeholder="43.0"
                      className="glass-input surface w-full px-4 py-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">가격 (₩)</label>
                    <input type="number" value={whiskey.price} onChange={(e) => setWhiskey({ ...whiskey, price: e.target.value })}
                      placeholder="50000"
                      className="glass-input surface w-full px-4 py-2 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>향 (Nose)</label>
                    <input type="text" value={whiskey.nose}
                      onChange={(e) => setWhiskey({ ...whiskey, nose: e.target.value })}
                      placeholder="예: 바닐라, 꿀, 시트러스"
                      className="glass-input surface w-full px-4 py-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>맛 (Palate)</label>
                    <input type="text" value={whiskey.palate}
                      onChange={(e) => setWhiskey({ ...whiskey, palate: e.target.value })}
                      placeholder="예: 스모키, 오크, 카라멜"
                      className="glass-input surface w-full px-4 py-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>피니쉬 (Finish)</label>
                    <input type="text" value={whiskey.finish_note}
                      onChange={(e) => setWhiskey({ ...whiskey, finish_note: e.target.value })}
                      placeholder="예: 길고 따뜻한 여운"
                      className="glass-input surface w-full px-4 py-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>리뷰</label>
                    <input type="text" value={whiskey.tasting_notes}
                      onChange={(e) => setWhiskey({ ...whiskey, tasting_notes: e.target.value })}
                      placeholder="기타 특징"
                      className="glass-input surface w-full px-4 py-2 rounded-lg" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAddMode("encyclopedia")}
                    className="px-4 py-2 text-sm text-white/50 hover:text-white/70 bg-white/5 rounded-lg transition">
                    ← 목록으로
                  </button>
                  <button type="submit" className="cta flex-1 py-2 bg-indigo-500/80 text-white font-medium rounded-lg hover:bg-indigo-500 transition">
                    위스키 추가
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 위스키 목록 */}
        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:gap-4 items-start">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card card rounded-xl p-4 space-y-3">
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/3 rounded" />
                  <div className="skeleton h-3 w-full rounded mt-1" />
                  <div className="skeleton h-3 w-2/3 rounded" />
                </div>
              ))}
            </div>
          ) : filteredWhiskeys.length === 0 ? (
            <div className="empty text-center py-12 text-white/40">아직 위스키가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-4 items-start">
            {pagedWhiskeys.map((w) => {
              const isExpanded = expandedWhiskey === w.id;
              const whiskeyReviews = reviews[w.id] || [];
              const displayCount = isExpanded ? whiskeyReviews.length : (reviewCounts[w.id] || 0);
              const avgRating = whiskeyReviews.length
                ? (whiskeyReviews.reduce((s, r) => s + r.rating, 0) / whiskeyReviews.length).toFixed(1)
                : null;

              return (
                <div id={`whiskey-${w.id}`} key={w.id} className="glass-card card rounded-xl overflow-hidden">
                  {/* 위스키 헤더 */}
                  {editingWhiskey?.id === w.id ? (
                    <div className="p-6">
                      <form onSubmit={handleEditWhiskey} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">이름</label>
                            <input type="text" value={editingWhiskey.name}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, name: e.target.value })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">타입</label>
                            <select value={editingWhiskey.type}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, type: e.target.value })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg">
                              {WHISKEY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">지역</label>
                            <input type="text" value={editingWhiskey.region || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, region: e.target.value })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">숙성 (년)</label>
                            <input type="number" value={editingWhiskey.age || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, age: parseInt(e.target.value) || 0 })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">도수 (%)</label>
                            <input type="number" step="0.1" value={editingWhiskey.abv || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, abv: parseFloat(e.target.value) || 0 })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">가격 (₩)</label>
                            <input type="number" value={editingWhiskey.price || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, price: parseFloat(e.target.value) || 0 })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>향</label>
                            <input type="text" value={editingWhiskey.nose || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, nose: e.target.value })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>맛</label>
                            <input type="text" value={editingWhiskey.palate || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, palate: e.target.value })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>피니쉬</label>
                            <input type="text" value={editingWhiskey.finish_note || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, finish_note: e.target.value })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>리뷰</label>
                            <input type="text" value={editingWhiskey.tasting_notes || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, tasting_notes: e.target.value })}
                              className="glass-input surface w-full px-3 py-2 rounded-lg" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="px-6 py-2 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 transition">저장</button>
                          <button type="button" onClick={() => setEditingWhiskey(null)}
                            className="px-6 py-2 bg-white/8 text-white/70 text-sm rounded-lg hover:bg-white/12 transition">취소</button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="flex items-start p-4 md:p-6 hover:bg-white/5 transition">
                      <button onClick={() => handleToggleWhiskey(w.id)} className="flex-1 text-left">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg md:text-xl font-bold text-white">{w.name}</h3>
                          <span className="text-xs bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">{w.type}</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-white/40 mt-1">
                          {w.region && <span>📍 {w.region}</span>}
                          {w.age && <span>🗓 {w.age}년</span>}
                          {w.abv && <span>🔥 {w.abv}%</span>}
                          {w.price && <span>💰 ₩{w.price.toLocaleString()}</span>}
                        </div>
                        {(w.nose || w.palate || w.finish_note || w.tasting_notes) && (
                          <div className="mt-3 space-y-2">
                            {w.nose && <p className="text-sm text-white/55"><span className="font-semibold"><span className="text-indigo-400/70 mr-1">·</span>향&nbsp;&nbsp;</span>{w.nose}</p>}
                            {w.palate && <p className="text-sm text-white/55"><span className="font-semibold"><span className="text-indigo-400/70 mr-1">·</span>맛&nbsp;&nbsp;</span>{w.palate}</p>}
                            {w.finish_note && <p className="text-sm text-white/55"><span className="font-semibold"><span className="text-indigo-400/70 mr-1">·</span>피니쉬&nbsp;&nbsp;</span>{w.finish_note}</p>}
                            {w.tasting_notes && <p className="text-sm text-white/55"><span className="font-semibold"><span className="text-indigo-400/70 mr-1">·</span>리뷰&nbsp;&nbsp;</span>{w.tasting_notes}</p>}
                          </div>
                        )}
                      </button>
                      <div className="text-right ml-4 flex-shrink-0 flex flex-col items-end gap-1">
                        {avgRating && <RatingGauge rating={Number(avgRating)} />}
                        <div className="text-xs text-white/30">{displayCount}개 리뷰</div>
                        {(w.created_by === userId || isAdmin) && userId && (
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => setEditingWhiskey(w)}
                              className="text-xs text-white/40 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10 transition">편집</button>
                            <button onClick={() => handleDeleteWhiskey(w.id)}
                              className="text-xs text-white/40 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition">삭제</button>
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setCompareList((prev) => prev.includes(w.id) ? prev.filter((id) => id !== w.id) : prev.length < 2 ? [...prev, w.id] : prev); }}
                          className={`text-xs px-2 py-1 rounded mt-1 transition ${compareList.includes(w.id) ? "bg-indigo-500/50 text-white" : "bg-white/5 text-white/30 hover:text-white/60"}`}>
                          {compareList.includes(w.id) ? "비교 ✓" : "비교"}
                        </button>
                        <button onClick={() => handleToggleWhiskey(w.id)} className="text-white/30 mt-1">{isExpanded ? "▲" : "▼"}</button>
                      </div>
                    </div>
                  )}

                  {/* 리뷰 목록 */}
                  {isExpanded && (
                    <div className="border-t border-white/8">
                      {/* 리뷰 작성 버튼 */}
                      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-white/8" style={{ background: "rgba(255,255,255,0.03)" }}>
                        {userId ? (
                          reviewForm?.whiskey_id === w.id ? (
                            <form onSubmit={handleAddReview} className="space-y-3">
                              <div className="flex gap-2 items-center">
                                <span className="text-sm font-medium text-white/70">평점</span>
                                <select value={reviewForm.rating}
                                  onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                                  className="glass-input surface px-2 py-1 rounded text-sm">
                                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
                                    <option key={r} value={r}>{r}/10</option>
                                  ))}
                                </select>
                              </div>
                              <RichTextEditor
                                value={reviewForm.review_text}
                                onChange={(html) => setReviewForm({ ...reviewForm, review_text: html })}
                                placeholder="전체 리뷰를 자유롭게 작성해주세요"
                                minHeight="120px"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>향 (Nose)</label>
                                  <input type="text" value={reviewForm.nose}
                                    onChange={(e) => setReviewForm({ ...reviewForm, nose: e.target.value })}
                                    placeholder="예: 바닐라, 꿀, 시트러스"
                                    className="glass-input surface w-full px-3 py-2 rounded-lg" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>맛 (Palate)</label>
                                  <input type="text" value={reviewForm.palate}
                                    onChange={(e) => setReviewForm({ ...reviewForm, palate: e.target.value })}
                                    placeholder="예: 스모키, 오크, 카라멜"
                                    className="glass-input surface w-full px-3 py-2 rounded-lg" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>피니쉬 (Finish)</label>
                                  <input type="text" value={reviewForm.finish_note}
                                    onChange={(e) => setReviewForm({ ...reviewForm, finish_note: e.target.value })}
                                    placeholder="예: 길고 따뜻한 여운"
                                    className="glass-input surface w-full px-3 py-2 rounded-lg" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>비고</label>
                                  <input type="text" value={reviewForm.remarks}
                                    onChange={(e) => setReviewForm({ ...reviewForm, remarks: e.target.value })}
                                    placeholder="기타 메모"
                                    className="glass-input surface w-full px-3 py-2 rounded-lg" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button type="submit" className="px-4 py-2 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 transition">
                                  리뷰 등록
                                </button>
                                <button type="button" onClick={() => setReviewForm(null)}
                                  className="px-4 py-2 bg-white/8 text-white/70 text-sm rounded-lg hover:bg-white/12 transition">
                                  취소
                                </button>
                              </div>
                            </form>
                          ) : userReviewedWhiskeys.has(w.id) ? (
                            <p className="text-sm text-white/40">이미 이 위스키에 대한 리뷰를 작성하셨습니다.</p>
                          ) : (
                            <button onClick={() => setReviewForm({ whiskey_id: w.id, rating: 7, review_text: "", taste_profile: "", nose: "", palate: "", finish_note: "", remarks: "" })}
                              className="px-4 py-2 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 transition">
                              ✏️ 리뷰 작성
                            </button>
                          )
                        ) : (
                          <p className="text-sm text-white/40">
                            <a href="/login" className="text-indigo-400 underline">로그인</a>하고 리뷰를 남겨보세요.
                          </p>
                        )}
                      </div>

                      {/* 평점 분포 */}
                      {whiskeyReviews.length > 0 && (() => {
                        const dist = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((s) => ({ star: s, count: whiskeyReviews.filter((r) => r.rating === s).length }));
                        const max = Math.max(...dist.map((d) => d.count), 1);
                        return (
                          <div className="px-4 py-3 md:px-6 md:py-4 border-b border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <p className="text-xs text-white/30 mb-2">평점 분포</p>
                            <div className="space-y-1">
                              {dist.map(({ star, count }) => (
                                <div key={star} className="flex items-center gap-2 text-xs">
                                  <span className="text-white/40 w-4 text-right">{star}</span>
                                  <span className="text-yellow-400/60">★</span>
                                  <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                                    <div className="h-full rounded-full bg-indigo-400/60" style={{ width: `${(count / max) * 100}%` }} />
                                  </div>
                                  <span className="text-white/30 w-3">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 리뷰 카드들 */}
                      <div className="divide-y divide-white/8">
                        {whiskeyReviews.length === 0 ? (
                          <p className="px-6 py-8 text-center text-white/30 text-sm">아직 리뷰가 없습니다.</p>
                        ) : (
                          whiskeyReviews.map((r) => {
                            const isReviewExpanded = expandedReview === r.id;
                            const reviewComments = comments[r.id] || [];
                            const isOwner = (r.user_id === userId || isAdmin);

                            return (
                              <div key={r.id} className="px-4 py-3 md:px-6 md:py-4">
                                {/* 편집 모드 */}
                                {editingReview?.id === r.id ? (
                                  <form onSubmit={(e) => handleEditReview(e, w.id)} className="space-y-3">
                                    <div className="flex gap-2 items-center">
                                      <span className="text-sm font-medium text-white/70">평점</span>
                                      <select value={editingReview.rating}
                                        onChange={(e) => setEditingReview({ ...editingReview, rating: parseInt(e.target.value) })}
                                        className="glass-input surface px-2 py-1 rounded text-sm">
                                        {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
                                          <option key={r} value={r}>{r}/10</option>
                                        ))}
                                      </select>
                                    </div>
                                    <RichTextEditor
                                      value={editingReview.review_text}
                                      onChange={(html) => setEditingReview({ ...editingReview, review_text: html })}
                                      placeholder="전체 리뷰를 자유롭게 작성해주세요"
                                      minHeight="120px"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>향 (Nose)</label>
                                        <input type="text" value={editingReview.nose || ""}
                                          onChange={(e) => setEditingReview({ ...editingReview, nose: e.target.value })}
                                          placeholder="예: 바닐라, 꿀, 시트러스"
                                          className="glass-input surface w-full px-3 py-2 rounded-lg" />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>맛 (Palate)</label>
                                        <input type="text" value={editingReview.palate || ""}
                                          onChange={(e) => setEditingReview({ ...editingReview, palate: e.target.value })}
                                          placeholder="예: 스모키, 오크, 카라멜"
                                          className="glass-input surface w-full px-3 py-2 rounded-lg" />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>피니쉬 (Finish)</label>
                                        <input type="text" value={editingReview.finish_note || ""}
                                          onChange={(e) => setEditingReview({ ...editingReview, finish_note: e.target.value })}
                                          placeholder="예: 길고 따뜻한 여운"
                                          className="glass-input surface w-full px-3 py-2 rounded-lg" />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-white/70 mb-1"><span className="text-indigo-400/70 mr-1">·</span>비고</label>
                                        <input type="text" value={editingReview.remarks || ""}
                                          onChange={(e) => setEditingReview({ ...editingReview, remarks: e.target.value })}
                                          placeholder="기타 메모"
                                          className="glass-input surface w-full px-3 py-2 rounded-lg" />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button type="submit" className="cta px-4 py-1.5 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 transition">
                                        저장
                                      </button>
                                      <button type="button" onClick={() => setEditingReview(null)}
                                        className="px-4 py-1.5 bg-white/8 text-white/70 text-sm rounded-lg hover:bg-white/12 transition">
                                        취소
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <>
                                    {/* 리뷰 내용 */}
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                        <UserProfilePopup userId={r.user_id} displayName={r.users?.name || "알 수 없음"} />
                                        <RatingGauge rating={r.rating} size="sm" />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-white/30">
                                          {new Date(r.created_at).toLocaleDateString("ko-KR")}
                                        </span>
                                        {isOwner && (
                                          <>
                                            <button
                                              onClick={() => setEditingReview({ id: r.id, rating: r.rating, review_text: r.review_text, taste_profile: r.taste_profile, nose: r.nose || "", palate: r.palate || "", finish_note: r.finish_note || "", remarks: r.remarks || "" })}
                                              className="text-xs text-white/40 hover:text-indigo-300 transition px-2 py-1 rounded hover:bg-indigo-500/10">
                                              편집
                                            </button>
                                            <button onClick={() => handleDeleteReview(r.id, w.id)}
                                              className="text-xs text-white/40 hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-500/10">
                                              삭제
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {r.review_text && (
                                      <SafeHtml html={r.review_text} className="rich-content text-sm leading-relaxed text-white/55 mb-3 ml-0 md:ml-10" />
                                    )}
                                    {(r.nose || r.palate || r.finish_note || r.remarks) && (
                                      <div className="ml-0 md:ml-10 mb-2 grid grid-cols-2 gap-x-4 gap-y-1">
                                        {r.nose && (
                                          <p className="text-xs text-white/55"><span className="font-medium text-white/70"><span className="text-indigo-400/70 mr-1">·</span>향</span> {r.nose}</p>
                                        )}
                                        {r.palate && (
                                          <p className="text-xs text-white/55"><span className="font-medium text-white/70"><span className="text-indigo-400/70 mr-1">·</span>맛</span> {r.palate}</p>
                                        )}
                                        {r.finish_note && (
                                          <p className="text-xs text-white/55"><span className="font-medium text-white/70"><span className="text-indigo-400/70 mr-1">·</span>피니쉬</span> {r.finish_note}</p>
                                        )}
                                        {r.remarks && (
                                          <p className="text-xs text-white/55"><span className="font-medium text-white/70"><span className="text-indigo-400/70 mr-1">·</span>비고</span> {r.remarks}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* 좋아요 + 댓글 */}
                                    <div className="ml-10 flex items-center gap-3 mt-1">
                                      <button onClick={() => handleLikeReview(r.id)}
                                        className={`text-xs transition flex items-center gap-1 ${likedReviews.has(r.id) ? "text-red-400" : "text-white/35 hover:text-red-400"}`}>
                                        {likedReviews.has(r.id) ? "❤️" : "🤍"} {reviewLikes[r.id] || 0}
                                      </button>
                                      <button onClick={() => handleToggleReview(r.id)}
                                        className="text-xs text-white/35 hover:text-indigo-300 transition">
                                        💬 댓글 {reviewComments.length > 0 ? `${reviewComments.length}개` : ""} {isReviewExpanded ? "▲" : "▼"}
                                      </button>
                                    </div>

                                    {/* 댓글 섹션 */}
                                    {isReviewExpanded && (
                                      <div className="ml-10 mt-3 space-y-2">
                                        {reviewComments.length === 0 ? (
                                          <p className="text-xs text-white/30">첫 댓글을 남겨보세요!</p>
                                        ) : (
                                          reviewComments.map((c) => (
                                            <div key={c.id} className="flex gap-2">
                                              <div className="flex-1 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                                                <div className="flex justify-between items-center">
                                                  <div className="flex items-center gap-2">
                                                    <UserProfilePopup userId={c.user_id} displayName={c.users?.name || "알 수 없음"} />
                                                    <span className="text-xs text-white/40">{new Date(c.created_at).toLocaleDateString("ko-KR")}</span>
                                                  </div>
                                                  {(c.user_id === userId || isAdmin) && (
                                                    <button onClick={() => handleDeleteComment(c.id, r.id)}
                                                      className="text-xs text-white/30 hover:text-red-400 transition">삭제</button>
                                                  )}
                                                </div>
                                                <p className="text-xs text-white/55 mt-0.5">{c.content}</p>
                                              </div>
                                            </div>
                                          ))
                                        )}
                                        {userId ? (
                                          <div className="flex gap-2 mt-2">
                                            <input type="text"
                                              value={commentText[r.id] || ""}
                                              onChange={(e) => setCommentText((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                              onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(r.id); }}
                                              placeholder="댓글 입력..."
                                              className="glass-input surface flex-1 px-3 py-1.5 rounded-lg text-xs" />
                                            <button onClick={() => handleAddComment(r.id)}
                                              className="cta px-3 py-1.5 bg-indigo-500/80 text-white text-xs rounded-lg hover:bg-indigo-500 transition">
                                              등록
                                            </button>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-white/30">
                                            <a href="/login" className="text-indigo-400 underline">로그인</a>하고 댓글 달기
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-lg text-sm bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
              ← 이전
            </button>
            <span className="text-white/50 text-sm px-3">
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 rounded-lg text-sm bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition">
              다음 →
            </button>
          </div>
        )}
      </div>
    </div>

    {/* 위스키 비교 모달 */}
    {compareList.length === 2 && (() => {
      const w1 = whiskeys.find((w) => w.id === compareList[0]);
      const w2 = whiskeys.find((w) => w.id === compareList[1]);
      if (!w1 || !w2) return null;
      const r1 = reviews[w1.id] || [];
      const r2 = reviews[w2.id] || [];
      const avg = (rs: typeof r1) => rs.length ? (rs.reduce((s, r) => s + r.rating, 0) / rs.length).toFixed(1) : "-";
      const TASTING_KEYS = new Set(["nose", "palate", "finish_note"]);
      const fields: { label: string; key: keyof typeof w1 }[] = [
        { label: "타입", key: "type" },
        { label: "지역", key: "region" },
        { label: "숙성", key: "age" },
        { label: "도수", key: "abv" },
        { label: "가격", key: "price" },
        { label: "향", key: "nose" },
        { label: "맛", key: "palate" },
        { label: "피니쉬", key: "finish_note" },
      ];
      return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-2 sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCompareList([]); }}>
          <div className="glass-card card rounded-2xl w-full max-w-2xl p-4 sm:p-6 overflow-y-auto max-h-[92vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">위스키 비교</h2>
              <button onClick={() => setCompareList([])} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>
            {/* 헤더 */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div />
              {[w1, w2].map((w) => (
                <div key={w.id} className="text-center">
                  <p className="font-bold text-white text-sm">{w.name}</p>
                  <span className="text-xs bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">{w.type}</span>
                </div>
              ))}
            </div>
            {/* 평점 */}
            <div className="grid grid-cols-3 gap-4 py-3 border-b border-white/8">
              <p className="text-xs text-white/40 self-center">평균 평점</p>
              {[r1, r2].map((rs, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  {avg(rs) !== "-" ? <RatingGauge rating={Number(avg(rs))} /> : <span className="text-white/30 text-sm">-</span>}
                  <span className="text-xs text-white/30">({rs.length}개)</span>
                </div>
              ))}
            </div>
            {/* 필드들 */}
            {fields.map(({ label, key }) => (
              <div key={key} className="grid grid-cols-3 gap-4 py-3 border-b border-white/8">
                <p className="text-xs text-white/40 self-center">
                  {TASTING_KEYS.has(key as string) && <span className="text-indigo-400/70 mr-1">·</span>}{label}
                </p>
                {[w1, w2].map((w) => (
                  <p key={w.id} className="text-center text-sm text-white/70">
                    {w[key] ? String(w[key]) : <span className="text-white/20">-</span>}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    })()}
    </>
  );
}
