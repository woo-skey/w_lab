"use client";

import { useState } from "react";
import { login } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.username, formData.password);

    if (result.success) {
      localStorage.setItem("userId", result.userId || "");
      localStorage.setItem("userName", result.name || "");
      localStorage.setItem("isAdmin", result.isAdmin ? "true" : "false");
      localStorage.setItem("isMember", result.isMember ? "true" : "false");
      router.push("/");
    } else {
      setError(result.error || "로그인에 실패했습니다");
    }
    setLoading(false);
  };

  return (
    <div className="tone min-h-screen flex items-center justify-center px-4">
      <div className="tone-wrap w-full max-w-md glass-card card rounded-2xl p-8">
        <h1 className="section-title text-3xl font-bold text-center text-white mb-8">
          🥃 위스키 연구소
        </h1>
        <h2 className="text-2xl font-bold text-white mb-6">로그인</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              아이디
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="glass-input surface w-full px-4 py-2 rounded-lg"
              placeholder="아이디를 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="glass-input surface w-full px-4 py-2 rounded-lg"
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cta w-full py-2 bg-indigo-500/80 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-white/50">
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="text-indigo-400 hover:underline font-medium"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
