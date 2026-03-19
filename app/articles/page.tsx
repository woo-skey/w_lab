"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  created_at: string;
  users?: { name: string };
}

const CATEGORIES = ["기초 지식", "테이스팅", "역사", "문화", "기타"];

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("기초 지식");
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "기초 지식",
  });

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*, users(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      alert("제목과 내용을 입력해주세요");
      return;
    }

    try {
      const { error } = await supabase.from("articles").insert([
        {
          title: formData.title,
          content: formData.content,
          category: formData.category,
          author_id: userId,
        },
      ]);

      if (error) throw error;

      setFormData({ title: "", content: "", category: "기초 지식" });
      setShowForm(false);
      fetchArticles();
      alert("글이 등록되었습니다!");
    } catch (err) {
      console.error("Failed to add article:", err);
      alert("글 등록에 실패했습니다");
    }
  };

  const filteredArticles = articles.filter(
    (a) => a.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">위스키 지식</h1>
        <p className="text-gray-600 mb-8">
          위스키에 대한 다양한 정보와 지식을 공유하세요.
        </p>

        {/* 카테고리 필터 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === cat
                    ? "bg-amber-600 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 글쓰기 버튼 */}
        {userId ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className="mb-8 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
          >
            {showForm ? "취소" : "새 글 작성"}
          </button>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-center">
            <p className="text-amber-800 mb-2">글을 작성하려면 로그인이 필요합니다.</p>
            <a href="/login" className="text-amber-600 underline font-medium">로그인하기</a>
          </div>
        )}

        {/* 글쓰기 폼 */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">새 글 작성</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목 *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="글의 제목을 입력하세요"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  내용 *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="글의 내용을 입력하세요"
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition"
              >
                글 등록
              </button>
            </form>
          </div>
        )}

        {/* 글 목록 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-600">로딩 중...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              아직 글이 없습니다.
            </div>
          ) : (
            filteredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border border-gray-100"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-gray-900 flex-1">
                    {article.title}
                  </h3>
                  <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                    {article.category}
                  </span>
                </div>

                <p className="text-gray-700 mb-4 whitespace-pre-wrap line-clamp-3">
                  {article.content}
                </p>

                <div className="flex justify-between items-center text-sm text-gray-600">
                  <p>작성자: {article.users?.name || "알 수 없음"}</p>
                  <p>{new Date(article.created_at).toLocaleDateString("ko-KR")}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
