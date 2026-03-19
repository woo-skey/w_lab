"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem("userName");
    setUserName(name || "");
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("isAdmin");
    setUserName("");
    router.push("/");
  };

  const navItems = [
    { name: "홈", href: "/" },
    { name: "Bar 추천", href: "/bars" },
    { name: "위스키 리뷰", href: "/reviews" },
    { name: "지식", href: "/articles" },
    { name: "일정", href: "/schedule" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-900">
            🥃 위스키 연구소
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8 items-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition ${
                  pathname === item.href
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {userName ? (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/mypage" className="text-sm text-gray-700 hover:text-blue-600 transition">
                  {userName}님
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="hidden md:flex gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  회원가입
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 space-y-2 border-t pt-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {userName ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
              >
                로그아웃
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  onClick={() => setIsMenuOpen(false)}
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="block px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
