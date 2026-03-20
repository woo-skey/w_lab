"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import RichTextEditor from "@/components/RichTextEditor";
import UserProfilePopup from "@/components/UserProfilePopup";
import SafeHtml from "@/components/SafeHtml";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  created_at: string;
  image_url?: string;
  users?: { name: string };
}

interface Comment {
  id: string;
  article_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: { name: string };
}

const CATEGORIES = ["전체", "기초 지식", "테이스팅", "역사", "문화", "기타"];

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const [formData, setFormData] = useState({ title: "", content: "", category: "기초 지식" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setUserId(id);
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("articles").select("*, users(name)").order("created_at", { ascending: false });
      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (articleId: string) => {
    try {
      const { data, error } = await supabase
        .from("comments").select("*, users(name)")
        .eq("article_id", articleId).order("created_at", { ascending: true });
      if (error) throw error;
      setComments((prev) => ({ ...prev, [articleId]: data || [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleArticle = (articleId: string) => {
    if (expandedId === articleId) {
      setExpandedId(null);
    } else {
      setExpandedId(articleId);
      if (!comments[articleId]) fetchComments(articleId);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File, articleId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${articleId}/image.${ext}`;
    const { error } = await supabase.storage.from("article-images").upload(path, file, { upsert: true });
    if (error) { console.error(error); return null; }
    const { data } = supabase.storage.from("article-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) { alert("제목과 내용을 입력해주세요"); return; }
    try {
      const { data, error } = await supabase.from("articles").insert([{
        title: formData.title, content: formData.content, category: formData.category, author_id: userId,
      }]).select().single();
      if (error) throw error;

      if (imageFile && data) {
        const imageUrl = await uploadImage(imageFile, data.id);
        if (imageUrl) await supabase.from("articles").update({ image_url: imageUrl }).eq("id", data.id);
      }

      setFormData({ title: "", content: "", category: "기초 지식" });
      setImageFile(null);
      setImagePreview("");
      setShowForm(false);
      fetchArticles();
    } catch (err) {
      console.error(err);
      alert("글 등록에 실패했습니다");
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm("글을 삭제할까요?")) return;
    try {
      const { error } = await supabase.from("articles").delete().eq("id", articleId);
      if (error) throw error;
      if (expandedId === articleId) setExpandedId(null);
      fetchArticles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    try {
      const { error } = await supabase.from("articles").update({
        title: editingArticle.title, content: editingArticle.content, category: editingArticle.category,
      }).eq("id", editingArticle.id);
      if (error) throw error;
      setEditingArticle(null);
      fetchArticles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitComment = async (articleId: string) => {
    const content = commentText[articleId]?.trim();
    if (!content) return;
    try {
      const { error } = await supabase.from("comments").insert([{ article_id: articleId, user_id: userId, content }]);
      if (error) throw error;
      // 글 작성자에게 알림 (본인 제외)
      const targetArticle = articles.find((a) => a.id === articleId);
      if (targetArticle && targetArticle.author_id !== userId) {
        const userName = localStorage.getItem("userName") || "누군가";
        await createNotification(targetArticle.author_id, "comment", `💬 ${userName}님이 "${targetArticle.title}"에 댓글을 남겼습니다.`, "/articles");
      }
      setCommentText((prev) => ({ ...prev, [articleId]: "" }));
      fetchComments(articleId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId: string, articleId: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
      fetchComments(articleId);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredArticles = selectedCategory === "전체" ? articles : articles.filter((a) => a.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">위스키 지식</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">위스키에 대한 다양한 정보와 지식을 공유하세요.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">카테고리 탭으로 원하는 주제의 글을 찾아보세요. 글을 클릭하면 본문과 댓글이 펼쳐집니다. 새 글 작성 시 이미지도 첨부할 수 있습니다.</p>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedCategory === cat ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-blue-400"
              }`}>{cat}</button>
          ))}
        </div>

        {/* 글쓰기 */}
        {userId ? (
          <>
            <button onClick={() => {
                if (!showForm && selectedCategory !== "전체") {
                  setFormData((prev) => ({ ...prev, category: selectedCategory }));
                }
                setShowForm(!showForm);
              }}
              className="mb-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              {showForm ? "취소" : "✏️ 새 글 작성"}
            </button>
            {showForm && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-8 mb-8 border border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">새 글 작성</h2>
                <form onSubmit={handleSubmitArticle} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">제목 *</label>
                      <input type="text" value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="글의 제목을 입력하세요"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">카테고리</label>
                      <select value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500">
                        {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">내용 *</label>
                    <RichTextEditor value={formData.content} onChange={(html) => setFormData({ ...formData, content: html })} placeholder="내용을 입력하세요" minHeight="200px" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이미지 (선택)</label>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition w-full text-center">
                      {imageFile ? imageFile.name : "📷 이미지 선택"}
                    </button>
                    {imagePreview && (
                      <div className="mt-2 relative inline-block">
                        <img src={imagePreview} alt="preview" className="max-h-48 rounded-lg object-cover" />
                        <button type="button" onClick={() => { setImageFile(null); setImagePreview(""); }}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">×</button>
                      </div>
                    )}
                  </div>
                  <button type="submit" className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">글 등록</button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-center">
            <p className="text-blue-800 dark:text-blue-300 mb-2">글을 작성하려면 로그인이 필요합니다.</p>
            <a href="/login" className="text-blue-600 underline font-medium">로그인하기</a>
          </div>
        )}

        {/* 글 목록 */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">로딩 중...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">아직 글이 없습니다.</div>
          ) : (
            filteredArticles.map((article) => {
              const isExpanded = expandedId === article.id;
              const articleComments = comments[article.id] || [];
              const isOwner = (article.author_id === userId || isAdmin);

              return (
                <div key={article.id} className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-hidden">
                  {/* 편집 모드 */}
                  {editingArticle?.id === article.id ? (
                    <div className="p-6">
                      <form onSubmit={handleEditArticle} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">제목</label>
                            <input type="text" value={editingArticle.title}
                              onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">카테고리</label>
                            <select value={editingArticle.category}
                              onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500">
                              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          </div>
                        </div>
                        <RichTextEditor value={editingArticle.content} onChange={(html) => setEditingArticle({ ...editingArticle, content: html })} placeholder="내용을 입력하세요" minHeight="200px" />
                        <div className="flex gap-2">
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">저장</button>
                          <button type="button" onClick={() => setEditingArticle(null)}
                            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition">취소</button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <>
                      {/* 글 헤더 */}
                      <div className="p-6">
                        <div className="flex justify-between items-start gap-4">
                          <button onClick={() => handleToggleArticle(article.id)} className="flex-1 text-left">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs bg-blue-100 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">{article.category}</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{article.title}</h3>
                            <SafeHtml html={article.content} className="rich-content text-gray-500 dark:text-gray-400 text-sm break-words line-clamp-3" />
                            <div className="flex gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                              <UserProfilePopup userId={article.author_id} displayName={article.users?.name || "알 수 없음"} />
                              <span>{new Date(article.created_at).toLocaleDateString("ko-KR")}</span>
                            </div>
                          </button>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isOwner && (
                              <>
                                <button onClick={() => { setEditingArticle(article); setExpandedId(null); }}
                                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition">편집</button>
                                <button onClick={() => handleDeleteArticle(article.id)}
                                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 transition">삭제</button>
                              </>
                            )}
                            <button onClick={() => handleToggleArticle(article.id)}
                              className="text-gray-400 dark:text-gray-500 text-lg px-2">{isExpanded ? "▲" : "▼"}</button>
                          </div>
                        </div>
                      </div>

                      {/* 본문 + 댓글 */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 dark:border-gray-800">
                          <div className="p-6 bg-gray-50 dark:bg-gray-800">
                            {article.image_url && (
                              <img src={article.image_url} alt="article" className="w-full max-h-96 object-cover rounded-lg mb-4" />
                            )}
                            <SafeHtml html={article.content} className="rich-content text-sm leading-relaxed" />
                          </div>
                          <div className="p-6">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">댓글 {articleComments.length}개</h4>
                            <div className="space-y-3 mb-4">
                              {articleComments.length === 0 ? (
                                <p className="text-gray-400 dark:text-gray-500 text-sm">첫 댓글을 남겨보세요!</p>
                              ) : (
                                articleComments.map((comment) => (
                                  <div key={comment.id} className="flex gap-3">
                                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                                      <div className="flex justify-between items-center mb-1">
                                        <div className="flex gap-2 items-center">
                                          <UserProfilePopup userId={comment.user_id} displayName={comment.users?.name || "알 수 없음"} />
                                          <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(comment.created_at).toLocaleDateString("ko-KR")}</span>
                                        </div>
                                        {(comment.user_id === userId || isAdmin) && (
                                          <button onClick={() => handleDeleteComment(comment.id, article.id)}
                                            className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition">삭제</button>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            {userId ? (
                              <div className="flex gap-2">
                                <input type="text" value={commentText[article.id] || ""}
                                  onChange={(e) => setCommentText((prev) => ({ ...prev, [article.id]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmitComment(article.id); }}
                                  placeholder="댓글을 입력하세요..."
                                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500" />
                                <button onClick={() => handleSubmitComment(article.id)}
                                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">등록</button>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                댓글을 달려면 <a href="/login" className="text-blue-600 underline">로그인</a>하세요.
                              </p>
                            )}
                          </div>
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
    </div>
  );
}
