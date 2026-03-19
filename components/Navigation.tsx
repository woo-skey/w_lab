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
    setUserName("");
    router.push("/");
  };

  const navItems = [
    { name: "홈", href: "/" },
    { name: "바 추천", href: "/bars" },
    { name: "위스키 리뷰", href: "/reviews" },
    { name: "지식", href: "/articles" },
    { name: "일정", href: "/schedule" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-amber-900">
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
                    ? "text-amber-600 border-b-2 border-amber-600"
                    : "text-gray-600 hover:text-amber-600"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {userName ? (
              <div className="hidden md:flex items-center gap-4">
                <span className="text-sm text-gray-700">{userName}님</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-amber-600 border border-amber-600 rounded hover:bg-amber-50 transition"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="hidden md:flex gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-amber-600 border border-amber-600 rounded hover:bg-amber-50 transition"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 transition"
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
                className="block px-4 py-2 text-sm text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {userName ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded"
              >
                로그아웃
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded"
                  onClick={() => setIsMenuOpen(false)}
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="block px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
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
