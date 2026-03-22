"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    setLoggedIn(!!id);
  }, []);

  const features = [
    { title: "위스키 리뷰", description: "위스키를 리뷰하고 테이스팅 노트와 평점을 공유해보세요.", icon: "⭐", href: "/reviews" },
    { title: "Bar 추천", description: "좋아하는 바를 추천하고 다른 사람들의 추천을 확인해보세요.", icon: "🍸", href: "/bars" },
    { title: "위스키 지식", description: "위스키에 대한 전문 지식글과 정보를 통해 더 깊이 있게 배워보세요.", icon: "📚", href: "/articles" },
    { title: "일정 맞추기", description: "친구들과 위스키 바투어 일정을 함께 짜고 가능한 날을 찾아보세요.", icon: "📅", href: "/schedule" },
  ];

  return (
    <main className="min-h-screen">
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6" style={{ textShadow: "0 0 40px rgba(99,102,241,0.4)" }}>
          위스키 세상에 오신 것을 환영합니다
        </h1>
        <p className="text-xl text-white/55 mb-10 max-w-2xl mx-auto">
          위스키 리뷰를 공유하고, 바를 추천하고, 친구들과 일정을 맞춰보세요.
        </p>
        {!loggedIn && (
          <Link href="/signup" className="px-8 py-3 border border-indigo-400/60 text-indigo-300 rounded-xl hover:bg-indigo-500/10 transition font-medium">
            가입하기
          </Link>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}
              className="group glass-card rounded-2xl p-8 hover:bg-white/10 transition-all duration-200">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition">{feature.title}</h3>
              <p className="text-white/50">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="glass-card rounded-2xl py-10 px-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">위스키 애호가들의 커뮤니티</h2>
          <p className="text-white/45">위스키 팬들과 경험을 나누고, 새로운 위스키를 발견하세요.</p>
        </div>
      </section>
    </main>
  );
}
