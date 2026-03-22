"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SpotlightSearch from "@/components/SpotlightSearch";

const NAV = [
  { href: "/v2", icon: "⊞", label: "홈", exact: true },
  { href: "/reviews", icon: "⭐", label: "위스키 리뷰" },
  { href: "/bars", icon: "🍸", label: "Bar 추천" },
  { href: "/articles", icon: "📚", label: "지식글" },
  { href: "/schedule", icon: "📅", label: "일정" },
  { href: "/notices", icon: "📢", label: "공지" },
  { href: "/contact", icon: "✉️", label: "문의" },
];

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
const GLASS = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  borderRight: "1px solid rgba(255,255,255,0.08)",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    setUserName(localStorage.getItem("userName") || "");
    setUserId(localStorage.getItem("userId") || "");
    // v2에선 전역 Navigation 숨기기
    const nav = document.querySelector("nav");
    if (nav) nav.style.display = "none";
    return () => {
      if (nav) nav.style.display = "";
    };
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/v2");
    setUserName("");
    setUserId("");
  };

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: "radial-gradient(ellipse at 20% 50%, #1a1f3c 0%, #0d0d1a 40%, #0a0a14 100%)",
        fontFamily: SF,
      }}
    >
      {/* 배경 orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-60 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }} />
      </div>

      {/* 사이드바 */}
      <aside className="fixed top-0 left-0 h-screen w-56 z-20 flex flex-col" style={GLASS}>
        {/* 로고 */}
        <div className="px-5 pt-8 pb-4">
          <h1 className="text-white/90 font-bold text-base tracking-tight">🥃 위스키 연구소</h1>
          <p className="text-white/30 text-xs mt-0.5">v2 · macOS</p>
        </div>

        {/* Spotlight 버튼 */}
        <div className="px-3 mb-4">
          <button
            onClick={() => {
              const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
              window.dispatchEvent(e);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/35 text-sm transition-colors hover:text-white/60 hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span>⌕</span>
            <span className="flex-1 text-left">검색</span>
            <kbd className="text-xs border border-white/15 rounded px-1 text-white/25">⌘K</kbd>
          </button>
        </div>

        <div className="px-3 mb-2">
          <p className="text-white/20 text-xs px-2 mb-1 uppercase tracking-wider">메뉴</p>
        </div>

        {/* 내비게이션 */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                style={{
                  color: active ? "#fff" : "rgba(255,255,255,0.45)",
                  background: active ? "rgba(99,102,241,0.3)" : "transparent",
                  border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                }}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 하단 유저 영역 */}
        <div className="px-3 py-4 border-t border-white/8 space-y-1">
          {userId ? (
            <>
              <Link href="/mypage"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/45 hover:text-white/80 hover:bg-white/5 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center text-xs text-white font-bold">
                  {userName.slice(0, 1)}
                </span>
                <span className="truncate">{userName}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
              >
                <span className="text-base w-5 text-center">↩</span>
                <span>로그아웃</span>
              </button>
            </>
          ) : (
            <Link href="/login"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/45 hover:text-white/80 hover:bg-white/5 transition-colors"
            >
              <span className="text-base w-5 text-center">→</span>
              <span>로그인</span>
            </Link>
          )}

          <div className="pt-2">
            <Link href="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/25 hover:text-white/50 transition-colors"
            >
              ← 기존 버전으로
            </Link>
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 ml-56 relative z-10">
        {children}
      </div>

      {/* Spotlight */}
      <SpotlightSearch />
    </div>
  );
}
