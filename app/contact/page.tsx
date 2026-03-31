"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import RichTextEditor from "@/components/RichTextEditor";
import SafeHtml from "@/components/SafeHtml";

interface Inquiry {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  content: string;
  status: "pending" | "answered";
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function ContactPage() {
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // 일반 유저: 본인 문의 목록
  const [myInquiries, setMyInquiries] = useState<Inquiry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", content: "" });
  const [submitting, setSubmitting] = useState(false);

  // 관리자: 전체 문의
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);
  const [adminFilter, setAdminFilter] = useState<"all" | "pending" | "answered">("all");

  useEffect(() => {
    const id = localStorage.getItem("userId") || "";
    const admin = localStorage.getItem("isAdmin") === "true";
    setUserId(id);
    setIsAdmin(admin);
    if (id) {
      if (admin) fetchAllInquiries();
      else fetchMyInquiries(id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMyInquiries = async (id: string) => {
    const { data } = await supabase
      .from("inquiries").select("*").eq("user_id", id).order("created_at", { ascending: false });
    setMyInquiries(data || []);
    setLoading(false);
  };

  const fetchAllInquiries = async () => {
    const { data } = await supabase
      .from("inquiries").select("*").order("created_at", { ascending: false });
    setAllInquiries(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) { alert("제목과 내용을 입력해주세요"); return; }
    setSubmitting(true);
    try {
      const userName = localStorage.getItem("userName") || "알 수 없음";
      const { error } = await supabase.from("inquiries").insert([{
        user_id: userId, user_name: userName,
        title: formData.title, content: formData.content,
        status: "pending",
      }]);
      if (error) throw error;
      setFormData({ title: "", content: "" });
      setShowForm(false);
      fetchMyInquiries(userId);
    } catch (err) {
      console.error(err);
      alert("문의 등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (inquiryId: string) => {
    const reply = replyText[inquiryId]?.trim();
    if (!reply) return;
    setReplying(inquiryId);
    try {
      const targetInquiry = allInquiries.find((i) => i.id === inquiryId) || null;
      const repliedAt = new Date().toISOString();
      const { error } = await supabase.from("inquiries").update({
        reply, status: "answered", replied_at: repliedAt,
      }).eq("id", inquiryId);
      if (error) throw error;
      setAllInquiries((prev) => prev.map((i) =>
        i.id === inquiryId ? { ...i, reply, status: "answered", replied_at: repliedAt } : i
      ));
      setReplyText((prev) => ({ ...prev, [inquiryId]: "" }));
      if (targetInquiry?.user_id && targetInquiry.user_id !== userId) {
        await createNotification(
          targetInquiry.user_id,
          "contact_reply",
          `문의 "${targetInquiry.title}"에 답변이 등록됐습니다.`,
          "/contact"
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReplying(null);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm("이 문의를 삭제할까요?")) return;
    await supabase.from("inquiries").delete().eq("id", id);
    if (isAdmin) setAllInquiries((prev) => prev.filter((i) => i.id !== id));
    else setMyInquiries((prev) => prev.filter((i) => i.id !== id));
  };

  const filteredInquiries = adminFilter === "all" ? allInquiries
    : allInquiries.filter((i) => i.status === adminFilter);

  // 관리자 뷰
  if (isAdmin) {
    return (
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">문의 관리</h1>
          <p className="text-white/55 mb-2">회원들의 문의를 확인하고 답변하세요.</p>
          <p className="text-xs text-white/30 mb-8">미답변 문의에 답변을 달면 해당 유저에게 알림이 전송됩니다.</p>

          {/* 필터 */}
          <div className="flex gap-2 mb-6">
            {([["all","전체"], ["pending","미답변"], ["answered","답변완료"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setAdminFilter(val)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  adminFilter === val ? "bg-indigo-500/80 text-white" : "bg-white/5 text-white/60 border border-white/10 hover:border-indigo-400/50"
                }`}>{label} {val === "pending" ? `(${allInquiries.filter(i => i.status === "pending").length})` : ""}</button>
            ))}
          </div>

          {loading ? <div className="text-center py-12 text-white/40">로딩 중...</div> : filteredInquiries.length === 0 ? (
            <div className="text-center py-12 text-white/30">문의가 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {filteredInquiries.map((inq) => (
                <div key={inq.id} className="glass-card rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedId(expandedId === inq.id ? null : inq.id)}
                    className="w-full text-left px-6 py-4 hover:bg-white/5 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          inq.status === "pending" ? "bg-orange-500/20 text-orange-300" : "bg-green-500/20 text-green-300"
                        }`}>{inq.status === "pending" ? "미답변" : "답변완료"}</span>
                        <span className="font-semibold text-white text-sm">{inq.title}</span>
                        <span className="text-xs text-white/35">— {inq.user_name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-white/35">{new Date(inq.created_at).toLocaleDateString("ko-KR")}</span>
                        <span className="text-white/35 text-sm">{expandedId === inq.id ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  </button>

                  {expandedId === inq.id && (
                    <div className="px-6 pb-6 border-t border-white/8">
                      {/* 문의 내용 */}
                      <div className="mt-4 p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-xs text-white/40 mb-2 font-medium">문의 내용</p>
                        <SafeHtml html={inq.content} className="rich-content text-sm leading-relaxed text-white/80" />
                      </div>

                      {/* 기존 답변 */}
                      {inq.reply && (
                        <div className="mt-3 p-4 rounded-lg border border-indigo-500/20" style={{ background: "rgba(99,102,241,0.08)" }}>
                          <p className="text-xs text-indigo-400 mb-2 font-medium">답변 · {inq.replied_at ? new Date(inq.replied_at).toLocaleDateString("ko-KR") : ""}</p>
                          <p className="text-white/80 text-sm whitespace-pre-wrap break-words">{inq.reply}</p>
                        </div>
                      )}

                      {/* 답변 입력 */}
                      <div className="mt-4">
                        <p className="text-xs font-medium text-white/60 mb-2">{inq.reply ? "답변 수정" : "답변 작성"}</p>
                        <textarea
                          value={replyText[inq.id] ?? (inq.reply || "")}
                          onChange={(e) => setReplyText((prev) => ({ ...prev, [inq.id]: e.target.value }))}
                          rows={3} placeholder="답변을 입력하세요"
                          className="glass-input w-full px-4 py-2 rounded-lg text-sm resize-none"
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleReply(inq.id)} disabled={replying === inq.id}
                            className="px-4 py-2 bg-indigo-500/80 text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition">
                            {replying === inq.id ? "전송 중..." : "답변 등록"}
                          </button>
                          <button onClick={() => handleDeleteInquiry(inq.id)}
                            className="px-4 py-2 bg-red-500/10 text-red-400 text-sm rounded-lg hover:bg-red-500/20 transition">삭제</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 일반 유저 뷰
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">문의하기</h1>
        <p className="text-white/55 mb-2">궁금한 점이나 불편한 점을 운영진에게 직접 전달해보세요.</p>
        <p className="text-xs text-white/30 mb-8">문의를 등록하면 운영진이 검토 후 답변을 남깁니다. 본인의 문의와 답변은 이 페이지에서 확인할 수 있습니다.</p>

        {!userId ? (
          <div className="glass-card rounded-lg p-4 mb-6 text-center">
            <p className="text-white/60 mb-2">문의하려면 로그인이 필요합니다.</p>
            <a href="/login" className="text-indigo-400 underline font-medium text-sm">로그인하기</a>
          </div>
        ) : (
          <>
            <button onClick={() => setShowForm(!showForm)}
              className="mb-6 px-6 py-2 bg-indigo-500/80 text-white rounded-lg hover:bg-indigo-500 transition">
              {showForm ? "취소" : "✉️ 문의 작성"}
            </button>

            {showForm && (
              <div className="glass-card rounded-xl p-8 mb-8">
                <h2 className="text-xl font-bold text-white mb-6">문의 작성</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">제목 *</label>
                    <input type="text" value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="문의 제목을 입력하세요"
                      className="glass-input w-full px-4 py-2 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">내용 *</label>
                    <RichTextEditor
                      value={formData.content}
                      onChange={(html) => setFormData({ ...formData, content: html })}
                      placeholder="문의 내용을 자세히 입력해주세요"
                      minHeight="160px"
                    />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full py-2 bg-indigo-500/80 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition">
                    {submitting ? "등록 중..." : "문의 등록"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* 내 문의 목록 */}
        {userId && (
          loading ? <div className="text-center py-12 text-white/40">로딩 중...</div> :
          myInquiries.length === 0 ? (
            <div className="text-center py-12 text-white/30">등록한 문의가 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {myInquiries.map((inq) => (
                <div key={inq.id} className="glass-card rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedId(expandedId === inq.id ? null : inq.id)}
                    className="w-full text-left px-6 py-4 hover:bg-white/5 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          inq.status === "pending" ? "bg-orange-500/20 text-orange-300" : "bg-green-500/20 text-green-300"
                        }`}>{inq.status === "pending" ? "답변 대기" : "답변 완료"}</span>
                        <span className="font-semibold text-white text-sm">{inq.title}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-white/35">{new Date(inq.created_at).toLocaleDateString("ko-KR")}</span>
                        <span className="text-white/35 text-sm">{expandedId === inq.id ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  </button>

                  {expandedId === inq.id && (
                    <div className="px-6 pb-5 border-t border-white/8">
                      <div className="mt-4 p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-xs text-white/40 mb-2 font-medium">문의 내용</p>
                        <SafeHtml html={inq.content} className="rich-content text-sm leading-relaxed text-white/80" />
                      </div>
                      {inq.reply ? (
                        <div className="mt-3 p-4 rounded-lg border border-indigo-500/20" style={{ background: "rgba(99,102,241,0.08)" }}>
                          <p className="text-xs text-indigo-400 mb-2 font-medium">운영진 답변 · {inq.replied_at ? new Date(inq.replied_at).toLocaleDateString("ko-KR") : ""}</p>
                          <p className="text-white/80 text-sm whitespace-pre-wrap break-words">{inq.reply}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-white/30 mt-4">아직 답변이 등록되지 않았습니다. 조금만 기다려주세요.</p>
                      )}
                      <button onClick={() => handleDeleteInquiry(inq.id)}
                        className="mt-3 text-xs text-white/30 hover:text-red-400 transition">문의 삭제</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
