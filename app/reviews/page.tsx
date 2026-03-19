"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Whiskey {
  id: string;
  name: string;
  type: string;
  region: string;
  age: number;
  abv: number;
  tasting_notes: string;
  price: number;
  review_count?: number;
  avg_rating?: number;
}

interface Review {
  id: string;
  whiskey_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  taste_profile: string;
}

const WHISKEY_TYPES = ["Scotch", "Irish", "Bourbon", "Rye"];

export default function ReviewsPage() {
  const [whiskeys, setWhiskeys] = useState<Whiskey[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedType, setSelectedType] = useState("Scotch");
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userId, setUserId] = useState("");

  const [whiskey, setWhiskey] = useState({
    name: "",
    type: "Scotch",
    region: "",
    age: "",
    abv: "",
    tasting_notes: "",
    price: "",
  });

  const [review, setReview] = useState({
    whiskey_id: "",
    rating: 5,
    review_text: "",
    taste_profile: "",
  });

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (!id) {
      window.location.href = "/login";
      return;
    }
    setUserId(id);
    fetchWhiskeys();
    fetchReviews();
  }, []);

  const fetchWhiskeys = async () => {
    try {
      const { data, error } = await supabase
        .from("whiskeys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWhiskeys(data || []);
    } catch (err) {
      console.error("Failed to fetch whiskeys:", err);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWhiskey = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("whiskeys").insert([
        {
          name: whiskey.name,
          type: whiskey.type,
          region: whiskey.region || null,
          age: whiskey.age ? parseInt(whiskey.age) : null,
          abv: whiskey.abv ? parseFloat(whiskey.abv) : null,
          tasting_notes: whiskey.tasting_notes || null,
          price: whiskey.price ? parseFloat(whiskey.price) : null,
        },
      ]);

      if (error) throw error;

      setWhiskey({
        name: "",
        type: "Scotch",
        region: "",
        age: "",
        abv: "",
        tasting_notes: "",
        price: "",
      });
      setShowAddForm(false);
      fetchWhiskeys();
      alert("위스키가 추가되었습니다!");
    } catch (err) {
      console.error("Failed to add whiskey:", err);
      alert("위스키 추가에 실패했습니다");
    }
  };

  const handleAddReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!review.whiskey_id) {
      alert("위스키를 선택해주세요");
      return;
    }

    try {
      const { error } = await supabase.from("reviews").insert([
        {
          whiskey_id: review.whiskey_id,
          user_id: userId,
          rating: review.rating,
          review_text: review.review_text,
          taste_profile: review.taste_profile,
        },
      ]);

      if (error) throw error;

      setReview({
        whiskey_id: "",
        rating: 5,
        review_text: "",
        taste_profile: "",
      });
      fetchReviews();
      alert("리뷰가 등록되었습니다!");
    } catch (err) {
      console.error("Failed to add review:", err);
      alert("리뷰 등록에 실패했습니다");
    }
  };

  const filteredWhiskeys = whiskeys.filter((w) => w.type === selectedType);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">위스키 리뷰</h1>
        <p className="text-gray-600 mb-8">
          다양한 종류의 위스키를 평가하고 리뷰를 공유하세요.
        </p>

        {/* 위스키 타입 필터 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {WHISKEY_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-6 py-2 rounded-lg font-medium transition ${
                  selectedType === type
                    ? "bg-amber-600 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 위스키 추가 버튼 */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="mb-8 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
        >
          {showAddForm ? "취소" : "새 위스키 추가"}
        </button>

        {/* 위스키 추가 폼 */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">새 위스키 추가</h2>
            <form onSubmit={handleAddWhiskey} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    위스키 이름 *
                  </label>
                  <input
                    type="text"
                    value={whiskey.name}
                    onChange={(e) =>
                      setWhiskey({ ...whiskey, name: e.target.value })
                    }
                    placeholder="예: Glenmorangie 10"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    타입 *
                  </label>
                  <select
                    value={whiskey.type}
                    onChange={(e) =>
                      setWhiskey({ ...whiskey, type: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {WHISKEY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    지역
                  </label>
                  <input
                    type="text"
                    value={whiskey.region}
                    onChange={(e) =>
                      setWhiskey({ ...whiskey, region: e.target.value })
                    }
                    placeholder="예: Highland"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    나이 (년)
                  </label>
                  <input
                    type="number"
                    value={whiskey.age}
                    onChange={(e) =>
                      setWhiskey({ ...whiskey, age: e.target.value })
                    }
                    placeholder="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    도수 (ABV)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={whiskey.abv}
                    onChange={(e) =>
                      setWhiskey({ ...whiskey, abv: e.target.value })
                    }
                    placeholder="43.0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    가격
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={whiskey.price}
                    onChange={(e) =>
                      setWhiskey({ ...whiskey, price: e.target.value })
                    }
                    placeholder="50000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  테이스팅 노트
                </label>
                <textarea
                  value={whiskey.tasting_notes}
                  onChange={(e) =>
                    setWhiskey({ ...whiskey, tasting_notes: e.target.value })
                  }
                  placeholder="풍미, 향, 마감 등을 적어주세요"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition"
              >
                위스키 추가
              </button>
            </form>
          </div>
        )}

        {/* 위스키 목록 */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {loading ? (
            <div className="col-span-2 text-center py-12 text-gray-600">
              로딩 중...
            </div>
          ) : filteredWhiskeys.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-gray-600">
              아직 위스키가 없습니다.
            </div>
          ) : (
            filteredWhiskeys.map((w) => (
              <div
                key={w.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border border-gray-100"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {w.name}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                  {w.region && <p>지역: {w.region}</p>}
                  {w.age && <p>나이: {w.age}년</p>}
                  {w.abv && <p>도수: {w.abv}%</p>}
                  {w.price && <p>가격: ₩{w.price.toLocaleString()}</p>}
                </div>
                {w.tasting_notes && (
                  <p className="text-gray-700 text-sm mb-4 bg-amber-50 p-3 rounded">
                    {w.tasting_notes}
                  </p>
                )}

                {/* 리뷰 폼 */}
                {review.whiskey_id === w.id ? (
                  <form onSubmit={handleAddReview} className="space-y-3 border-t pt-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        평점
                      </label>
                      <select
                        value={review.rating}
                        onChange={(e) =>
                          setReview({
                            ...review,
                            rating: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((r) => (
                          <option key={r} value={r}>
                            {"⭐".repeat(r)} ({r}/5)
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      value={review.review_text}
                      onChange={(e) =>
                        setReview({ ...review, review_text: e.target.value })
                      }
                      placeholder="리뷰를 작성해주세요"
                      rows={2}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                    />

                    <input
                      type="text"
                      value={review.taste_profile}
                      onChange={(e) =>
                        setReview({
                          ...review,
                          taste_profile: e.target.value,
                        })
                      }
                      placeholder="테이스팅 프로필 (예: 스모키, 과일향)"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
                      >
                        리뷰 등록
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReview({
                            ...review,
                            whiskey_id: "",
                          })
                        }
                        className="flex-1 py-1 bg-gray-300 text-gray-800 text-sm rounded hover:bg-gray-400"
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() =>
                      setReview({ ...review, whiskey_id: w.id })
                    }
                    className="w-full py-2 bg-amber-100 text-amber-600 text-sm rounded hover:bg-amber-200 transition"
                  >
                    리뷰 작성
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* 최근 리뷰 */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">최근 리뷰</h2>
          {reviews.length === 0 ? (
            <p className="text-gray-600">아직 리뷰가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {reviews.slice(0, 10).map((r) => (
                <div key={r.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {
                          whiskeys.find((w) => w.id === r.whiskey_id)
                            ?.name
                        }
                      </p>
                      <p className="text-amber-600 text-sm">
                        {"⭐".repeat(r.rating)}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-1">{r.review_text}</p>
                  {r.taste_profile && (
                    <p className="text-gray-600 text-sm">
                      태그: {r.taste_profile}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
