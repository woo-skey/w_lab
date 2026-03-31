"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type NameRelation = { name: string } | { name: string }[] | null;

interface RecentReview {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  users?: NameRelation;
  whiskeys?: NameRelation;
}

interface TopWhiskey {
  id: string;
  name: string;
  type: string;
  avgRating: number;
  reviewCount: number;
}

interface ConfirmedSchedule {
  id: string;
  name: string;
  confirmed_date: string;
}

interface HomeMetrics {
  totalReviews: number;
  totalMembers: number;
  totalWhiskeys: number;
}

const numberFormatter = new Intl.NumberFormat("ko-KR");

function getName(rel: NameRelation | undefined, fallback: string) {
  if (!rel) return fallback;
  if (Array.isArray(rel)) return rel[0]?.name || fallback;
  return rel.name || fallback;
}

function formatDateShort(date: string) {
  return new Date(date).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [topWhiskeys, setTopWhiskeys] = useState<TopWhiskey[]>([]);
  const [confirmedSchedule, setConfirmedSchedule] = useState<ConfirmedSchedule | null>(null);
  const [metrics, setMetrics] = useState<HomeMetrics>({
    totalReviews: 0,
    totalMembers: 0,
    totalWhiskeys: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    const name = localStorage.getItem("userName");
    setLoggedIn(!!id);
    if (name) setUserName(name);
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [reviewsRes, schedulesRes, whiskeyRatingsRes, reviewCountRes, memberCountRes, whiskeyCountRes] = await Promise.all([
        supabase
          .from("reviews")
          .select("id, rating, review_text, created_at, users(name), whiskeys(name)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("schedules")
          .select("id, name, confirmed_date")
          .not("confirmed_date", "is", null)
          .gte("confirmed_date", new Date().toISOString().slice(0, 10))
          .order("confirmed_date", { ascending: true })
          .limit(1),
        supabase
          .from("reviews")
          .select("whiskey_id, rating, whiskeys(id, name, type)"),
        supabase
          .from("reviews")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("is_member", true),
        supabase
          .from("whiskeys")
          .select("id", { count: "exact", head: true }),
      ]);

      setRecentReviews((reviewsRes.data || []) as unknown as RecentReview[]);
      setConfirmedSchedule((schedulesRes.data?.[0] as ConfirmedSchedule | undefined) || null);
      setMetrics({
        totalReviews: reviewCountRes.count || 0,
        totalMembers: memberCountRes.count || 0,
        totalWhiskeys: whiskeyCountRes.count || 0,
      });

      const ratingData = (whiskeyRatingsRes.data || []) as unknown as {
        whiskey_id: string;
        rating: number;
        whiskeys: { id: string; name: string; type: string } | null;
      }[];

      const byWhiskey: Record<string, { name: string; type: string; ratings: number[] }> = {};
      ratingData.forEach((row) => {
        if (!row.whiskeys) return;
        if (!byWhiskey[row.whiskey_id]) {
          byWhiskey[row.whiskey_id] = {
            name: row.whiskeys.name,
            type: row.whiskeys.type,
            ratings: [],
          };
        }
        byWhiskey[row.whiskey_id].ratings.push(row.rating);
      });

      const top = Object.entries(byWhiskey)
        .filter(([, value]) => value.ratings.length > 0)
        .map(([id, value]) => ({
          id,
          name: value.name,
          type: value.type,
          avgRating: value.ratings.reduce((sum, current) => sum + current, 0) / value.ratings.length,
          reviewCount: value.ratings.length,
        }))
        .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
        .slice(0, 3);

      setTopWhiskeys(top);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const trustStrip = [
    { label: "누적 리뷰", value: metrics.totalReviews },
    { label: "활동 멤버", value: metrics.totalMembers },
    { label: "등록 위스키", value: metrics.totalWhiskeys },
  ];

  return (
    <main className="nr-home min-h-screen">
      <div className="nr-shell max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pb-20">
        <section className="nr-reveal" style={{ animationDelay: "0ms" }}>
          <p className="nr-kicker">Nocturne Reserve</p>
          <h1 className="nr-display mt-3">
            {loggedIn
              ? `${userName || "멤버"}님을 위한 오늘의 위스키 저널`
              : "위스키를 더 깊고 우아하게 기록하는 커뮤니티"}
          </h1>
          <p className="nr-body mt-4">
            취향을 남기고, 평점을 읽고, 다음 모임의 한 잔을 함께 고르세요. 데이터는 선명하게,
            분위기는 절제된 럭셔리로 정리했습니다.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href={loggedIn ? "/reviews" : "/signup"}
              className="nr-btn-primary w-full sm:w-auto text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8b77a]/80"
            >
              {loggedIn ? "리뷰 작성하기" : "커뮤니티 시작하기"}
            </Link>
            <Link
              href={loggedIn ? "/schedule" : "/reviews"}
              className="nr-btn-secondary w-full sm:w-auto text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ca8d4]/70"
            >
              {loggedIn ? "이번 일정 확인" : "리뷰 둘러보기"}
            </Link>
          </div>
        </section>

        <section className="nr-card nr-strip mt-6 nr-reveal" style={{ animationDelay: "80ms" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {trustStrip.map((item) => (
              <div key={item.label} className="nr-strip-item px-5 py-4 sm:px-6 sm:py-5">
                <p className="nr-metric-label">{item.label}</p>
                <p className="nr-metric-value">{numberFormatter.format(item.value)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-12">
          <article className="nr-card p-5 sm:p-6 lg:col-span-7 lg:row-span-2 nr-reveal" style={{ animationDelay: "140ms" }}>
            <header className="flex items-center justify-between gap-3 mb-4">
              <h2 className="nr-section-title">Recent Tasting Notes</h2>
              <Link
                href="/reviews"
                className="nr-section-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8b77a]/70 rounded"
              >
                전체 보기
              </Link>
            </header>

            {loading ? (
              <div className="space-y-2.5" aria-label="리뷰 로딩 중">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="nr-skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : recentReviews.length === 0 ? (
              <div className="nr-empty">첫 리뷰를 남겨 오늘의 테이스팅 로그를 시작해보세요.</div>
            ) : (
              <ul className="space-y-2.5">
                {recentReviews.map((review) => (
                  <li key={review.id}>
                    <Link
                      href="/reviews"
                      className="nr-list-item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ca8d4]/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="nr-item-title truncate">{getName(review.whiskeys, "이름 미상 위스키")}</p>
                          <p className="nr-item-sub truncate">
                            {review.review_text?.trim() || "테이스팅 노트를 남기지 않은 리뷰입니다."}
                          </p>
                        </div>
                        <p className="nr-score flex-shrink-0">{review.rating}/10</p>
                      </div>
                      <div className="nr-meta mt-2">
                        <span>{getName(review.users, "익명")}</span>
                        <span>{formatDateShort(review.created_at)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="nr-card p-5 sm:p-6 lg:col-span-5 nr-reveal" style={{ animationDelay: "220ms" }}>
            <header className="flex items-center justify-between gap-3 mb-4">
              <h2 className="nr-section-title">Top Rated Whiskies</h2>
              <Link
                href="/reviews"
                className="nr-section-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8b77a]/70 rounded"
              >
                랭킹 보기
              </Link>
            </header>

            {loading ? (
              <div className="space-y-2.5" aria-label="평점 로딩 중">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="nr-skeleton h-14 rounded-xl" />
                ))}
              </div>
            ) : topWhiskeys.length === 0 ? (
              <div className="nr-empty">평점 데이터가 쌓이면 오늘의 랭킹이 표시됩니다.</div>
            ) : (
              <ol className="space-y-2.5">
                {topWhiskeys.map((whiskey, idx) => (
                  <li key={whiskey.id}>
                    <Link
                      href="/reviews"
                      className="nr-list-item focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ca8d4]/70"
                    >
                      <div className="flex items-start gap-3">
                        <span className="nr-rank">{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="nr-item-title truncate">{whiskey.name}</p>
                          <p className="nr-item-sub truncate">
                            {whiskey.type} · 리뷰 {numberFormatter.format(whiskey.reviewCount)}개
                          </p>
                        </div>
                        <p className="nr-score flex-shrink-0">{whiskey.avgRating.toFixed(1)}/10</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </article>

          <article className="nr-card p-5 sm:p-6 lg:col-span-5 nr-reveal" style={{ animationDelay: "300ms" }}>
            <header className="flex items-center justify-between gap-3 mb-4">
              <h2 className="nr-section-title">This Week&apos;s Gathering</h2>
              <Link
                href="/schedule"
                className="nr-section-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8b77a]/70 rounded"
              >
                일정 보러가기
              </Link>
            </header>

            {loading ? (
              <div className="nr-skeleton h-24 rounded-xl" aria-label="일정 로딩 중" />
            ) : confirmedSchedule ? (
              <div className="rounded-xl border border-[#d8b77a]/30 bg-[#d8b77a]/8 p-4">
                <p className="text-[0.72rem] tracking-[0.14em] uppercase text-[#d8b77a]/85">Confirmed</p>
                <p className="mt-2 text-[1.06rem] leading-snug text-[#f2ece1] font-semibold">{confirmedSchedule.name}</p>
                <p className="mt-1 text-sm text-[#ddd0b6]/75">
                  {new Date(confirmedSchedule.confirmed_date + "T00:00:00").toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  })}
                </p>
              </div>
            ) : (
              <div className="nr-empty">
                이번 주 확정 일정이 없습니다. 날짜 제안을 추가하고 구성원들과 일정을 맞춰보세요.
              </div>
            )}
          </article>
        </section>

        <section className="mt-6 nr-reveal" style={{ animationDelay: "360ms" }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="nr-section-title">Quick Navigation</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              {
                href: "/reviews",
                eyebrow: "Review",
                title: "위스키 리뷰",
                description: "10점 척도로 기록하고 다른 멤버 평점을 함께 확인하세요.",
              },
              {
                href: "/encyclopedia",
                eyebrow: "Reference",
                title: "위스키 백과",
                description: "증류소와 스타일을 빠르게 찾아 비교할 수 있습니다.",
              },
              {
                href: "/bars",
                eyebrow: "Place",
                title: "Bar 추천",
                description: "직접 다녀온 Bar 노트를 공유하고 저장해보세요.",
              },
              {
                href: "/schedule",
                eyebrow: "Gathering",
                title: "일정 맞추기",
                description: "모임 날짜를 제안하고 확정 일정을 한눈에 확인하세요.",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nr-card nr-quick-card p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8b77a]/70"
              >
                <p className="nr-quick-eyebrow">{item.eyebrow}</p>
                <p className="nr-quick-title mt-2">{item.title}</p>
                <p className="nr-quick-desc mt-2">{item.description}</p>
                <span className="nr-quick-arrow mt-4 inline-block">자세히 보기</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <style jsx>{`
        .nr-home {
          position: relative;
          background:
            radial-gradient(1100px 600px at 8% -8%, rgba(122, 95, 54, 0.22), transparent 62%),
            radial-gradient(760px 420px at 95% 0%, rgba(60, 76, 126, 0.28), transparent 60%),
            linear-gradient(165deg, #070b14 0%, #0b1220 44%, #06080f 100%);
        }

        .nr-home::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(0deg, rgba(5, 7, 12, 0.62) 0%, rgba(5, 7, 12, 0) 35%);
        }

        .nr-shell {
          position: relative;
          z-index: 1;
        }

        .nr-kicker {
          font-size: 0.74rem;
          line-height: 1;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(216, 183, 122, 0.86);
          font-weight: 600;
        }

        .nr-display {
          font-family: "Iowan Old Style", "Times New Roman", "Noto Serif KR", serif;
          color: #f6f1e7;
          font-size: clamp(2rem, 5vw, 3.95rem);
          line-height: 1.08;
          letter-spacing: 0.01em;
          max-width: 16ch;
          text-wrap: balance;
        }

        .nr-body {
          font-family: "Pretendard Variable", "Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif;
          color: rgba(235, 227, 213, 0.74);
          font-size: clamp(0.98rem, 1.4vw, 1.12rem);
          line-height: 1.72;
          max-width: 42rem;
        }

        .nr-btn-primary,
        .nr-btn-secondary {
          font-family: "Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif;
          border-radius: 0.86rem;
          padding: 0.72rem 1.1rem;
          font-size: 0.9rem;
          font-weight: 600;
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
        }

        .nr-btn-primary {
          color: #f8f1e2;
          border: 1px solid rgba(216, 183, 122, 0.62);
          background: linear-gradient(140deg, rgba(216, 183, 122, 0.24), rgba(216, 183, 122, 0.14));
          box-shadow: inset 0 1px 0 rgba(255, 236, 199, 0.2);
        }

        .nr-btn-secondary {
          color: rgba(221, 213, 197, 0.88);
          border: 1px solid rgba(154, 168, 212, 0.32);
          background: rgba(141, 154, 196, 0.08);
        }

        .nr-btn-primary:hover,
        .nr-btn-secondary:hover {
          transform: translateY(-1px);
        }

        .nr-card {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.058), rgba(255, 255, 255, 0.02));
          border: 1px solid rgba(216, 183, 122, 0.2);
          border-radius: 1rem;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 10px 34px rgba(0, 0, 0, 0.28);
          transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease;
        }

        .nr-card:hover {
          transform: translateY(-2px);
          border-color: rgba(216, 183, 122, 0.34);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.36);
        }

        .nr-card:focus-within {
          border-color: rgba(216, 183, 122, 0.48);
          box-shadow: 0 0 0 1px rgba(216, 183, 122, 0.24), 0 16px 40px rgba(0, 0, 0, 0.36);
        }

        .nr-strip-item + .nr-strip-item {
          border-top: 1px solid rgba(216, 183, 122, 0.14);
        }

        .nr-metric-label {
          color: rgba(201, 183, 148, 0.72);
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.34rem;
        }

        .nr-metric-value {
          color: #f4efe4;
          font-size: 1.45rem;
          line-height: 1.15;
          font-weight: 700;
          font-family: "Iowan Old Style", "Times New Roman", "Noto Serif KR", serif;
        }

        .nr-section-title {
          color: #f1ecdf;
          font-size: 1.03rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .nr-section-link {
          color: rgba(216, 183, 122, 0.84);
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .nr-section-link:hover {
          color: rgba(232, 202, 149, 1);
        }

        .nr-list-item {
          display: block;
          border-radius: 0.86rem;
          border: 1px solid rgba(216, 183, 122, 0.16);
          background: linear-gradient(140deg, rgba(255, 255, 255, 0.034), rgba(255, 255, 255, 0.016));
          padding: 0.78rem 0.9rem;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .nr-list-item:hover {
          transform: translateY(-1px);
          border-color: rgba(216, 183, 122, 0.3);
          background: linear-gradient(140deg, rgba(255, 255, 255, 0.052), rgba(255, 255, 255, 0.018));
        }

        .nr-item-title {
          color: #f2ece1;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .nr-item-sub {
          margin-top: 0.22rem;
          color: rgba(210, 200, 180, 0.62);
          font-size: 0.79rem;
          line-height: 1.45;
        }

        .nr-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          color: rgba(192, 181, 160, 0.5);
          font-size: 0.73rem;
          letter-spacing: 0.01em;
        }

        .nr-score {
          color: #d8b77a;
          font-weight: 700;
          font-size: 0.86rem;
        }

        .nr-rank {
          width: 1.7rem;
          height: 1.7rem;
          border-radius: 9999px;
          border: 1px solid rgba(216, 183, 122, 0.38);
          color: #e6c891;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.78rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .nr-empty {
          border-radius: 0.86rem;
          border: 1px dashed rgba(216, 183, 122, 0.28);
          background: rgba(216, 183, 122, 0.04);
          padding: 1rem;
          color: rgba(215, 202, 177, 0.68);
          font-size: 0.86rem;
          line-height: 1.6;
        }

        .nr-quick-card {
          min-height: 172px;
        }

        .nr-quick-eyebrow {
          color: rgba(207, 185, 145, 0.7);
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .nr-quick-title {
          color: #f2ebdf;
          font-size: 1.03rem;
          font-weight: 600;
          line-height: 1.34;
        }

        .nr-quick-desc {
          color: rgba(212, 200, 175, 0.64);
          font-size: 0.82rem;
          line-height: 1.55;
        }

        .nr-quick-arrow {
          color: rgba(216, 183, 122, 0.84);
          font-size: 0.78rem;
          letter-spacing: 0.04em;
        }

        .nr-skeleton {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03) 20%,
            rgba(216, 183, 122, 0.12) 50%,
            rgba(255, 255, 255, 0.03) 80%
          );
          background-size: 200% 100%;
          animation: nrShimmer 1.35s ease-in-out infinite;
        }

        .nr-reveal {
          opacity: 0;
          transform: translateY(12px);
          animation: nrFadeUp 0.56s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes nrFadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes nrShimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @media (min-width: 640px) {
          .nr-strip-item + .nr-strip-item {
            border-top: 0;
            border-left: 1px solid rgba(216, 183, 122, 0.14);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nr-reveal {
            animation: none;
            opacity: 1;
            transform: none;
          }

          .nr-card,
          .nr-list-item,
          .nr-btn-primary,
          .nr-btn-secondary {
            transition: none;
          }

          .nr-card:hover,
          .nr-list-item:hover,
          .nr-btn-primary:hover,
          .nr-btn-secondary:hover {
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}
