"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const features = [
  {
    title: "위스키 리뷰",
    description: "테이스팅 노트와 평점을 기록하고 공유해보세요.",
    icon: "⭐",
    href: "/reviews",
    accent: "from-amber-500/20 to-orange-500/10",
    dot: "bg-amber-400",
  },
  {
    title: "Bar 추천",
    description: "좋아하는 바를 추천하고 다른 사람들의 픽을 확인하세요.",
    icon: "🍸",
    href: "/bars",
    accent: "from-emerald-500/20 to-teal-500/10",
    dot: "bg-emerald-400",
  },
  {
    title: "위스키 지식",
    description: "전문 지식글과 정보를 통해 더 깊이 있게 배워보세요.",
    icon: "📚",
    href: "/articles",
    accent: "from-blue-500/20 to-indigo-500/10",
    dot: "bg-blue-400",
  },
  {
    title: "일정 맞추기",
    description: "친구들과 바투어 일정을 함께 짜고 날짜를 찾아보세요.",
    icon: "📅",
    href: "/schedule",
    accent: "from-purple-500/20 to-pink-500/10",
    dot: "bg-purple-400",
  },
];

export default function HomeV2() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    setLoggedIn(!!id);
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 20% 50%, #1a1f3c 0%, #0d0d1a 40%, #0a0a14 100%)",
      }}
    >
      {/* 배경 orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-60 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }} />
      </div>

      {/* v1 돌아가기 버튼 */}
      <div className="absolute top-4 right-4 z-20">
        <Link href="/"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white/90 transition"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          ← 기존 버전
        </Link>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-20">

        {/* 히어로 — macOS 창 스타일 */}
        <div className="mb-20 text-center">
          <h1
            className="text-5xl md:text-7xl font-bold mb-5 tracking-tight"
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              background: "linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            위스키 연구소
          </h1>
          <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            리뷰를 공유하고, 바를 추천하고,<br />친구들과 일정을 맞춰보세요.
          </p>

          {mounted && !loggedIn && (
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                boxShadow: "0 0 30px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              시작하기 →
            </Link>
          )}
        </div>

        {/* 피처 카드 — 글래스 모피즘 */}
        <div className="grid md:grid-cols-2 gap-4">
          {features.map((f) => (
            <Link key={f.href} href={f.href}
              className="group relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 cursor-pointer overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              {/* 내부 gradient accent */}
              <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />

              <div className="relative z-10">
                {/* 트래픽 라이트 미니 */}
                <div className="flex gap-1.5 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                  <span className={`w-2.5 h-2.5 rounded-full ${f.dot} opacity-70 group-hover:opacity-100 transition-opacity`} />
                </div>

                <div className="text-3xl mb-3">{f.icon}</div>
                <h3
                  className="text-xl font-semibold text-white/90 mb-2 group-hover:text-white transition-colors"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {f.title}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed group-hover:text-white/60 transition-colors">
                  {f.description}
                </p>

                <div className="mt-5 flex items-center gap-1 text-xs text-white/30 group-hover:text-white/60 transition-colors">
                  <span>열기</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 하단 Dock 힌트 */}
        <div className="mt-20 flex justify-center">
          <div className="flex items-end gap-3 px-6 py-3 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {[
              { href: "/reviews", icon: "⭐", label: "리뷰" },
              { href: "/bars", icon: "🍸", label: "Bar" },
              { href: "/articles", icon: "📚", label: "지식" },
              { href: "/schedule", icon: "📅", label: "일정" },
              { href: "/notices", icon: "📢", label: "공지" },
              { href: "/contact", icon: "✉️", label: "문의" },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                className="group flex flex-col items-center gap-1 hover:-translate-y-2 transition-transform duration-200"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[10px] text-white/30 group-hover:text-white/70 transition-colors"
                  style={{ fontFamily: "-apple-system, system-ui, sans-serif" }}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
