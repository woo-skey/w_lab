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
    { title: "위스키 리뷰", description: "Scotch, Irish, Bourbon, Rye 4가지 종류별로 위스키를 리뷰하고 평가해보세요.", icon: "⭐", href: "/reviews" },
    { title: "Bar 추천", description: "좋아하는 바를 추천하고 다른 사람들의 추천을 확인해보세요.", icon: "🍸", href: "/bars" },
    { title: "위스키 지식", description: "위스키에 대한 전문 지식글과 정보를 통해 더 깊이 있게 배워보세요.", icon: "📚", href: "/articles" },
    { title: "일정 맞추기", description: "친구들과 위스키 바투어 일정을 함께 짜고 가능한 날을 찾아보세요.", icon: "📅", href: "/schedule" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-blue-900 mb-6">
          위스키 세상에 오신 것을 환영합니다
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          위스키 리뷰를 공유하고, 바를 추천하고, 친구들과 일정을 맞춰보세요.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/reviews" className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
            위스키 탐색하기
          </Link>
          {!loggedIn && (
            <Link href="/signup" className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium">
              가입하기
            </Link>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}
              className="group p-8 bg-white rounded-lg shadow hover:shadow-lg transition border border-gray-100">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-blue-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">위스키 애호가들의 커뮤니티</h2>
          <p className="text-blue-100 text-lg">
            전 세계의 위스키 팬들과 경험을 나누고, 새로운 위스키를 발견하세요.
          </p>
        </div>
      </section>
    </main>
  );
}
