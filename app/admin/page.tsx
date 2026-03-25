"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  username: string;
  name: string;
  is_admin: boolean;
  is_member: boolean;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem("isAdmin") !== "true") {
      router.push("/");
      return;
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, name, is_admin, is_member, created_at")
      .order("created_at", { ascending: true });
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const handleToggleMember = async (user: User) => {
    setUpdating(user.id);
    const newValue = !user.is_member;
    const { error } = await supabase
      .from("users")
      .update({ is_member: newValue })
      .eq("id", user.id);
    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_member: newValue } : u))
      );
    }
    setUpdating(null);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">관리자 — 회원 관리</h1>
        <p className="text-white/50 mb-8 text-sm">w_lab 회원 여부를 관리합니다. 회원만 일정 투표·생성이 가능합니다.</p>

        {loading ? (
          <div className="text-center py-12 text-white/40">로딩 중...</div>
        ) : (
          <div className="glass-card rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">이름</th>
                  <th className="text-left py-3 px-4 text-white/50 font-semibold">아이디</th>
                  <th className="text-center py-3 px-4 text-white/50 font-semibold">관리자</th>
                  <th className="text-center py-3 px-4 text-white/50 font-semibold">w_lab 회원</th>
                  <th className="text-right py-3 px-4 text-white/50 font-semibold">가입일</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/8 hover:bg-white/5 transition">
                    <td className="py-3 px-4 font-medium text-white">{user.name}</td>
                    <td className="py-3 px-4 text-white/50">{user.username}</td>
                    <td className="py-3 px-4 text-center">
                      {user.is_admin ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">관리자</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => !user.is_admin && handleToggleMember(user)}
                        disabled={updating === user.id || user.is_admin}
                        className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                          user.is_member ? "bg-indigo-500" : "bg-white/15"
                        }`}
                        title={user.is_admin ? "관리자는 회원 토글 불가" : undefined}
                      >
                        <span
                          className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
                            user.is_member ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right text-white/35">
                      {new Date(user.created_at).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
