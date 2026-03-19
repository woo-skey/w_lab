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
      router.push("/");
    } else {
      setError(result.error || "로그인에 실패했습니다");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-blue-900 mb-8">
          위스키 연구소
        </h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">로그인</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              아이디
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="아이디를 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="text-blue-600 hover:underline font-medium"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
