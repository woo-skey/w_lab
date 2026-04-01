"use client";

import { useState } from "react";
import { signup, checkUsernameExists } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === "username") {
      setUsernameChecked(false);
    }
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleUsernameCheck = async () => {
    if (!formData.username.trim()) {
      setErrors((prev) => ({
        ...prev,
        username: "아이디를 입력해주세요",
      }));
      return;
    }

    setLoading(true);
    try {
      const exists = await checkUsernameExists(formData.username);
      setUsernameChecked(true);
      setUsernameAvailable(!exists);
      if (exists) {
        setErrors((prev) => ({
          ...prev,
          username: "이미 사용 중인 아이디입니다",
        }));
      }
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        username: "확인 중 오류가 발생했습니다",
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "이름을 입력해주세요";
    }

    if (!usernameChecked || !usernameAvailable) {
      newErrors.username = "아이디 중복확인을 해주세요";
    }

    if (!formData.password) {
      newErrors.password = "비밀번호를 입력해주세요";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "비밀번호가 일치하지 않습니다";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const result = await signup(
      formData.username,
      formData.password,
      formData.name
    );

    if (result.success) {
      alert("회원가입이 완료되었습니다!");
      router.push("/login");
    } else {
      setErrors({ submit: result.error || "회원가입에 실패했습니다" });
    }
    setLoading(false);
  };

  return (
    <div className="tone min-h-screen flex items-center justify-center px-4">
      <div className="tone-wrap w-full max-w-md glass-card card rounded-2xl p-8">
        <h1 className="section-title text-3xl font-bold text-center text-white mb-8">
          🥃 위스키 연구소
        </h1>
        <h2 className="text-2xl font-bold text-white mb-6">회원가입</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              이름
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="glass-input surface w-full px-4 py-2 rounded-lg"
              placeholder="이름을 입력하세요"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name}</p>
            )}
          </div>

          {/* 아이디 */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              아이디
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="glass-input surface flex-1 px-4 py-2 rounded-lg"
                placeholder="아이디를 입력하세요"
              />
              <button
                type="button"
                onClick={handleUsernameCheck}
                disabled={loading}
                className="cta px-4 py-2 bg-indigo-500/80 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                중복확인
              </button>
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-400">{errors.username}</p>
            )}
            {usernameChecked && usernameAvailable && (
              <p className="mt-1 text-sm text-green-400">
                ✓ 사용 가능한 아이디입니다
              </p>
            )}
          </div>

          {/* 비밀번호 */}
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
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password}</p>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              비밀번호 확인
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="glass-input surface w-full px-4 py-2 rounded-lg"
              placeholder="비밀번호를 다시 입력하세요"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              {errors.submit}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cta w-full py-2 bg-indigo-500/80 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-6 text-center text-white/50">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-indigo-400 hover:underline font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
