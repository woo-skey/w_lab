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

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

export default function HomeV2() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("userId"));
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-10 pt-14 pb-20" style={{ fontFamily: SF }}>
      {/* 히어로 */}
      <div className="mb-16 text-center">
        <h1
          className="text-5xl md:text-6xl font-bold mb-4 tracking-tight"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          위스키 연구소
        </h1>
        <p className="text-white/45 text-lg max-w-lg leading-relaxed mx-auto">
          리뷰를 공유하고, 바를 추천하고, 친구들과 일정을 맞춰보세요.
        </p>
        {mounted && !loggedIn && (
          <Link href="/signup"
            className="inline-flex items-center gap-2 mt-7 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              boxShadow: "0 0 30px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            시작하기 →
          </Link>
        )}
      </div>

      {/* 피처 카드 */}
      <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl">
        {features.map((f) => (
          <Link key={f.href} href={f.href}
            className="group relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 cursor-pointer overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />
            <div className="relative z-10">
              <div className="flex gap-1.5 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className={`w-2.5 h-2.5 rounded-full ${f.dot} opacity-70 group-hover:opacity-100 transition-opacity`} />
              </div>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-xl font-semibold text-white/90 mb-2 group-hover:text-white transition-colors" style={{ letterSpacing: "-0.01em" }}>
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

    </main>
  );
}
