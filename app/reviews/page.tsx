"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import RichTextEditor from "@/components/RichTextEditor";

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
const STAR = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];

export default function ReviewsPage() {
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
  const [whiskey, setWhiskey] = useState({ name: "", type: "Scotch", region: "", age: "", abv: "", nose: "", palate: "", finish_note: "", tasting_notes: "", price: "" });

  // 리뷰 작성 폼
  const [reviewForm, setReviewForm] = useState<{ whiskey_id: string; rating: number; review_text: string; taste_profile: string; nose: string; palate: string; finish_note: string; remarks: string } | null>(null);

  // 리뷰 편집
  const [editingReview, setEditingReview] = useState<{ id: string; rating: number; review_text: string; taste_profile: string; nose: string; palate: string; finish_note: string; remarks: string } | null>(null);

  // 위스키 편집
  const [editingWhiskey, setEditingWhiskey] = useState<Whiskey | null>(null);

  // 댓글
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchWhiskeys();
  }, []);

  const fetchWhiskeys = async () => {
    try {
      const [{ data, error }, { data: countData }] = await Promise.all([
        supabase.from("whiskeys").select("*").order("created_at", { ascending: false }),
        supabase.from("reviews").select("whiskey_id"),
      ]);
      if (error) throw error;
      setWhiskeys(data || []);
      const counts: Record<string, number> = {};
      (countData || []).forEach((r) => {
        counts[r.whiskey_id] = (counts[r.whiskey_id] || 0) + 1;
      });
      setReviewCounts(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      if (!reviews[whiskeyId]) fetchReviews(whiskeyId);
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

  const filteredWhiskeys = selectedType === "전체" ? whiskeys : whiskeys.filter((w) => w.type === selectedType);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">위스키 리뷰</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">다양한 위스키를 평가하고 리뷰를 공유하세요.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">위스키 카드를 클릭하면 리뷰 목록이 펼쳐집니다. 새 위스키 추가 후 리뷰 작성 버튼으로 별점과 테이스팅 노트를 남길 수 있습니다.</p>

        {/* 타입 필터 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {WHISKEY_TYPES.map((type) => (
            <button key={type} onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedType === type ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-blue-400"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* 위스키 추가 버튼 */}
        {userId ? (
          <button onClick={() => {
              if (!showAddForm && selectedType !== "전체") {
                setWhiskey((prev) => ({ ...prev, type: selectedType }));
              }
              setShowAddForm(!showAddForm);
            }}
            className="mb-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            {showAddForm ? "취소" : "🥃 새 위스키 추가"}
          </button>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-center">
            <p className="text-blue-800 dark:text-blue-300 mb-2">위스키 추가 및 리뷰 작성은 로그인이 필요합니다.</p>
            <a href="/login" className="text-blue-600 underline font-medium text-sm">로그인하기</a>
          </div>
        )}

        {/* 위스키 추가 폼 */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-8 mb-8 border border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">새 위스키 추가</h2>
            <form onSubmit={handleAddWhiskey} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름 *</label>
                  <input type="text" value={whiskey.name} onChange={(e) => setWhiskey({ ...whiskey, name: e.target.value })}
                    placeholder="예: Glenmorangie 10" required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">타입 *</label>
                  <select value={whiskey.type} onChange={(e) => setWhiskey({ ...whiskey, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500">
                    {WHISKEY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">지역</label>
                  <input type="text" value={whiskey.region} onChange={(e) => setWhiskey({ ...whiskey, region: e.target.value })}
                    placeholder="예: Highland"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">숙성 (년)</label>
                  <input type="number" value={whiskey.age} onChange={(e) => setWhiskey({ ...whiskey, age: e.target.value })}
                    placeholder="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">도수 (%)</label>
                  <input type="number" step="0.1" value={whiskey.abv} onChange={(e) => setWhiskey({ ...whiskey, abv: e.target.value })}
                    placeholder="43.0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">가격 (₩)</label>
                  <input type="number" value={whiskey.price} onChange={(e) => setWhiskey({ ...whiskey, price: e.target.value })}
                    placeholder="50000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🌸 향 (Nose)</label>
                  <input type="text" value={whiskey.nose}
                    onChange={(e) => setWhiskey({ ...whiskey, nose: e.target.value })}
                    placeholder="예: 바닐라, 꿀, 시트러스"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">👅 맛 (Palate)</label>
                  <input type="text" value={whiskey.palate}
                    onChange={(e) => setWhiskey({ ...whiskey, palate: e.target.value })}
                    placeholder="예: 스모키, 오크, 카라멜"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">✨ 피니쉬 (Finish)</label>
                  <input type="text" value={whiskey.finish_note}
                    onChange={(e) => setWhiskey({ ...whiskey, finish_note: e.target.value })}
                    placeholder="예: 길고 따뜻한 여운"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📝 설명</label>
                  <input type="text" value={whiskey.tasting_notes}
                    onChange={(e) => setWhiskey({ ...whiskey, tasting_notes: e.target.value })}
                    placeholder="기타 특징"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
                위스키 추가
              </button>
            </form>
          </div>
        )}

        {/* 위스키 목록 */}
        <div>
          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">로딩 중...</div>
          ) : filteredWhiskeys.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">아직 위스키가 없습니다.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
            {filteredWhiskeys.map((w) => {
              const isExpanded = expandedWhiskey === w.id;
              const whiskeyReviews = reviews[w.id] || [];
              const displayCount = isExpanded ? whiskeyReviews.length : (reviewCounts[w.id] || 0);
              const avgRating = whiskeyReviews.length
                ? (whiskeyReviews.reduce((s, r) => s + r.rating, 0) / whiskeyReviews.length).toFixed(1)
                : null;

              return (
                <div key={w.id} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-hidden">
                  {/* 위스키 헤더 */}
                  {editingWhiskey?.id === w.id ? (
                    <div className="p-6">
                      <form onSubmit={handleEditWhiskey} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름</label>
                            <input type="text" value={editingWhiskey.name}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">타입</label>
                            <select value={editingWhiskey.type}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, type: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500">
                              {WHISKEY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">지역</label>
                            <input type="text" value={editingWhiskey.region || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, region: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">숙성 (년)</label>
                            <input type="number" value={editingWhiskey.age || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, age: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">도수 (%)</label>
                            <input type="number" step="0.1" value={editingWhiskey.abv || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, abv: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">가격 (₩)</label>
                            <input type="number" value={editingWhiskey.price || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, price: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🌸 향</label>
                            <input type="text" value={editingWhiskey.nose || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, nose: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">👅 맛</label>
                            <input type="text" value={editingWhiskey.palate || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, palate: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">✨ 피니쉬</label>
                            <input type="text" value={editingWhiskey.finish_note || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, finish_note: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">📝 설명</label>
                            <input type="text" value={editingWhiskey.tasting_notes || ""}
                              onChange={(e) => setEditingWhiskey({ ...editingWhiskey, tasting_notes: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">저장</button>
                          <button type="button" onClick={() => setEditingWhiskey(null)}
                            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition">취소</button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="flex items-start p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <button onClick={() => handleToggleWhiskey(w.id)} className="flex-1 text-left">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{w.name}</h3>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{w.type}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                          {w.region && <span>📍 {w.region}</span>}
                          {w.age && <span>🗓 {w.age}년</span>}
                          {w.abv && <span>🔥 {w.abv}%</span>}
                          {w.price && <span>💰 ₩{w.price.toLocaleString()}</span>}
                        </div>
                        {(w.nose || w.palate || w.finish_note || w.tasting_notes) && (
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                            {w.nose && <p className="text-xs text-gray-500 dark:text-gray-400"><span className="font-medium text-gray-600 dark:text-gray-300">🌸 향</span> {w.nose}</p>}
                            {w.palate && <p className="text-xs text-gray-500 dark:text-gray-400"><span className="font-medium text-gray-600 dark:text-gray-300">👅 맛</span> {w.palate}</p>}
                            {w.finish_note && <p className="text-xs text-gray-500 dark:text-gray-400"><span className="font-medium text-gray-600 dark:text-gray-300">✨ 피니쉬</span> {w.finish_note}</p>}
                            {w.tasting_notes && <p className="text-xs text-gray-500 dark:text-gray-400"><span className="font-medium text-gray-600 dark:text-gray-300">📝 설명</span> {w.tasting_notes}</p>}
                          </div>
                        )}
                      </button>
                      <div className="text-right ml-4 flex-shrink-0 flex flex-col items-end gap-1">
                        {avgRating && (
                          <div className="text-blue-500 text-lg font-bold">★ {avgRating}</div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500">{displayCount}개 리뷰</div>
                        {(w.created_by === userId || isAdmin) && userId && (
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => setEditingWhiskey(w)}
                              className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition">편집</button>
                            <button onClick={() => handleDeleteWhiskey(w.id)}
                              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition">삭제</button>
                          </div>
                        )}
                        <button onClick={() => handleToggleWhiskey(w.id)} className="text-gray-400 dark:text-gray-500 mt-1">{isExpanded ? "▲" : "▼"}</button>
                      </div>
                    </div>
                  )}

                  {/* 리뷰 목록 */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800">
                      {/* 리뷰 작성 버튼 */}
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                        {userId ? (
                          reviewForm?.whiskey_id === w.id ? (
                            <form onSubmit={handleAddReview} className="space-y-3">
                              <div className="flex gap-2 items-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">평점</span>
                                <select value={reviewForm.rating}
                                  onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500">
                                  {[5, 4, 3, 2, 1].map((r) => (
                                    <option key={r} value={r}>{STAR[r]} ({r}/5)</option>
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
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">🌸 향 (Nose)</label>
                                  <input type="text" value={reviewForm.nose}
                                    onChange={(e) => setReviewForm({ ...reviewForm, nose: e.target.value })}
                                    placeholder="예: 바닐라, 꿀, 시트러스"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">👅 맛 (Palate)</label>
                                  <input type="text" value={reviewForm.palate}
                                    onChange={(e) => setReviewForm({ ...reviewForm, palate: e.target.value })}
                                    placeholder="예: 스모키, 오크, 카라멜"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">✨ 피니쉬 (Finish)</label>
                                  <input type="text" value={reviewForm.finish_note}
                                    onChange={(e) => setReviewForm({ ...reviewForm, finish_note: e.target.value })}
                                    placeholder="예: 길고 따뜻한 여운"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">📝 비고</label>
                                  <input type="text" value={reviewForm.remarks}
                                    onChange={(e) => setReviewForm({ ...reviewForm, remarks: e.target.value })}
                                    placeholder="기타 메모"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                                  리뷰 등록
                                </button>
                                <button type="button" onClick={() => setReviewForm(null)}
                                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition">
                                  취소
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button onClick={() => setReviewForm({ whiskey_id: w.id, rating: 5, review_text: "", taste_profile: "", nose: "", palate: "", finish_note: "", remarks: "" })}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                              ✏️ 리뷰 작성
                            </button>
                          )
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <a href="/login" className="text-blue-600 underline">로그인</a>하고 리뷰를 남겨보세요.
                          </p>
                        )}
                      </div>

                      {/* 리뷰 카드들 */}
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {whiskeyReviews.length === 0 ? (
                          <p className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">아직 리뷰가 없습니다.</p>
                        ) : (
                          whiskeyReviews.map((r) => {
                            const isReviewExpanded = expandedReview === r.id;
                            const reviewComments = comments[r.id] || [];
                            const isOwner = (r.user_id === userId || isAdmin);

                            return (
                              <div key={r.id} className="px-6 py-4">
                                {/* 편집 모드 */}
                                {editingReview?.id === r.id ? (
                                  <form onSubmit={(e) => handleEditReview(e, w.id)} className="space-y-3">
                                    <div className="flex gap-2 items-center">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">평점</span>
                                      <select value={editingReview.rating}
                                        onChange={(e) => setEditingReview({ ...editingReview, rating: parseInt(e.target.value) })}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500">
                                        {[5, 4, 3, 2, 1].map((r) => (
                                          <option key={r} value={r}>{STAR[r]} ({r}/5)</option>
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
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">🌸 향 (Nose)</label>
                                        <input type="text" value={editingReview.nose || ""}
                                          onChange={(e) => setEditingReview({ ...editingReview, nose: e.target.value })}
                                          placeholder="예: 바닐라, 꿀, 시트러스"
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">👅 맛 (Palate)</label>
                                        <input type="text" value={editingReview.palate || ""}
                                          onChange={(e) => setEditingReview({ ...editingReview, palate: e.target.value })}
                                          placeholder="예: 스모키, 오크, 카라멜"
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">✨ 피니쉬 (Finish)</label>
                                        <input type="text" value={editingReview.finish_note || ""}
                                          onChange={(e) => setEditingReview({ ...editingReview, finish_note: e.target.value })}
                                          placeholder="예: 길고 따뜻한 여운"
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">📝 비고</label>
                                        <input type="text" value={editingReview.remarks || ""}
                                          onChange={(e) => setEditingReview({ ...editingReview, remarks: e.target.value })}
                                          placeholder="기타 메모"
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                                        저장
                                      </button>
                                      <button type="button" onClick={() => setEditingReview(null)}
                                        className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition">
                                        취소
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <>
                                    {/* 리뷰 내용 */}
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                          {(r.users?.name || "?")[0].toUpperCase()}
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-gray-900 dark:text-white">{r.users?.name || "알 수 없음"}</span>
                                          <div className="text-blue-500 text-sm">{STAR[r.rating]}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                          {new Date(r.created_at).toLocaleDateString("ko-KR")}
                                        </span>
                                        {isOwner && (
                                          <>
                                            <button
                                              onClick={() => setEditingReview({ id: r.id, rating: r.rating, review_text: r.review_text, taste_profile: r.taste_profile, nose: r.nose || "", palate: r.palate || "", finish_note: r.finish_note || "", remarks: r.remarks || "" })}
                                              className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 transition px-2 py-1 rounded hover:bg-blue-50">
                                              편집
                                            </button>
                                            <button onClick={() => handleDeleteReview(r.id, w.id)}
                                              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-50">
                                              삭제
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {r.review_text && (
                                      <div dangerouslySetInnerHTML={{ __html: r.review_text }} className="rich-content text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-3 ml-10" />
                                    )}
                                    {(r.nose || r.palate || r.finish_note || r.remarks) && (
                                      <div className="ml-10 mb-2 grid grid-cols-2 gap-x-4 gap-y-1">
                                        {r.nose && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-700 dark:text-gray-300">🌸 향</span> {r.nose}</p>
                                        )}
                                        {r.palate && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-700 dark:text-gray-300">👅 맛</span> {r.palate}</p>
                                        )}
                                        {r.finish_note && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-700 dark:text-gray-300">✨ 피니쉬</span> {r.finish_note}</p>
                                        )}
                                        {r.remarks && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-medium text-gray-700 dark:text-gray-300">📝 비고</span> {r.remarks}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* 댓글 토글 버튼 */}
                                    <button onClick={() => handleToggleReview(r.id)}
                                      className="ml-10 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 transition mt-1">
                                      💬 댓글 {reviewComments.length > 0 ? `${reviewComments.length}개` : ""} {isReviewExpanded ? "▲" : "▼"}
                                    </button>

                                    {/* 댓글 섹션 */}
                                    {isReviewExpanded && (
                                      <div className="ml-10 mt-3 space-y-2">
                                        {reviewComments.length === 0 ? (
                                          <p className="text-xs text-gray-400 dark:text-gray-500">첫 댓글을 남겨보세요!</p>
                                        ) : (
                                          reviewComments.map((c) => (
                                            <div key={c.id} className="flex gap-2">
                                              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xs font-bold flex-shrink-0">
                                                {(c.users?.name || "?")[0].toUpperCase()}
                                              </div>
                                              <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                                                <div className="flex justify-between items-center">
                                                  <div>
                                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-100 mr-2">{c.users?.name || "알 수 없음"}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(c.created_at).toLocaleDateString("ko-KR")}</span>
                                                  </div>
                                                  {(c.user_id === userId || isAdmin) && (
                                                    <button onClick={() => handleDeleteComment(c.id, r.id)}
                                                      className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition">삭제</button>
                                                  )}
                                                </div>
                                                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{c.content}</p>
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
                                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                                            <button onClick={() => handleAddComment(r.id)}
                                              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition">
                                              등록
                                            </button>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-400 dark:text-gray-500">
                                            <a href="/login" className="text-blue-600 underline">로그인</a>하고 댓글 달기
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
      </div>
    </div>
  );
}
