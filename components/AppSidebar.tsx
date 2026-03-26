"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface SearchResult { id: string; title: string; subtitle?: string; icon: string; href: string; }
interface Notification { id: string; type: string; link?: string; message: string; is_read: boolean; created_at: string; }

const NAV = [
  { href: "/", icon: "⊞", label: "홈", exact: true },
  { href: "/reviews", icon: "⭐", label: "위스키 리뷰" },
  { href: "/encyclopedia", icon: "📖", label: "위스키 백과" },
  { href: "/bars", icon: "🍸", label: "Bar 추천" },
  { href: "/articles", icon: "📚", label: "지식글" },
  { href: "/schedule", icon: "📅", label: "일정" },
  { href: "/notices", icon: "📢", label: "공지" },
  { href: "/contact", icon: "✉️", label: "문의" },
];

// 모바일 하단 탭바 (5개)
const TAB_NAV = [
  { href: "/", icon: "⊞", label: "홈", exact: true },
  { href: "/reviews", icon: "⭐", label: "리뷰" },
  { href: "/encyclopedia", icon: "📖", label: "백과" },
  { href: "/schedule", icon: "📅", label: "일정" },
];

// 더보기 드로어 (나머지 메뉴)
const DRAWER_NAV = [
  { href: "/bars", icon: "🍸", label: "Bar 추천" },
  { href: "/articles", icon: "📚", label: "지식글" },
  { href: "/notices", icon: "📢", label: "공지" },
  { href: "/contact", icon: "✉️", label: "문의" },
];

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
const GLASS_SIDEBAR_DARK = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  borderRight: "1px solid rgba(255,255,255,0.08)",
};
const GLASS_SIDEBAR_LIGHT = {
  background: "rgba(255,255,255,0.70)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  borderRight: "1px solid rgba(0,0,0,0.08)",
};
const BG_DARK = "radial-gradient(ellipse at 20% 50%, #1a1f3c 0%, #0d0d1a 40%, #0a0a14 100%)";
const BG_LIGHT = "radial-gradient(ellipse at 20% 50%, #dde3f8 0%, #eef1fb 40%, #f4f6ff 100%)";
const NO_SIDEBAR_PATHS = ["/login", "/signup"];

export default function AppSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [notifMaxH, setNotifMaxH] = useState(340);
  const [isDark, setIsDark] = useState(true);

  // 모바일 관련 state
  const [isMobile, setIsMobile] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showMobileNotif, setShowMobileNotif] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // 모바일 감지
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 라우트 변경 시 드로어 닫기
  useEffect(() => {
    setShowDrawer(false);
    setShowMobileNotif(false);
    setShowMobileSearch(false);
  }, [pathname]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const [wRes, bRes, aRes] = await Promise.allSettled([
      supabase.from("whiskeys").select("id, name, type").ilike("name", `%${q}%`).limit(3),
      supabase.from("bars").select("id, name").ilike("name", `%${q}%`).limit(3),
      supabase.from("articles").select("id, title, category").ilike("title", `%${q}%`).limit(3),
    ]);
    const results: SearchResult[] = [];
    if (wRes.status === "fulfilled") (wRes.value.data || []).forEach((w) => results.push({ id: w.id, title: w.name, subtitle: w.type, icon: "🥃", href: "/reviews" }));
    if (bRes.status === "fulfilled") (bRes.value.data || []).forEach((b) => results.push({ id: b.id, title: b.name, icon: "🍸", href: "/bars" }));
    if (aRes.status === "fulfilled") (aRes.value.data || []).forEach((a) => results.push({ id: a.id, title: a.title, subtitle: a.category, icon: "📚", href: "/articles" }));
    setSearchResults(results);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery, doSearch]);

  useEffect(() => {
    const sync = () => {
      const id = localStorage.getItem("userId") || "";
      setUserName(localStorage.getItem("userName") || "");
      setUserId(id);
      setIsAdmin(localStorage.getItem("isAdmin") === "true");
      if (id) fetchNotifications(id);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("auth-change", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("auth-change", sync); };
  }, [pathname]);

  const fetchNotifications = async (id: string) => {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20);
    setNotifications(data || []);
  };

  const handleBellClick = () => {
    const next = !showNotifications;
    if (next && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setNotifMaxH(Math.max(200, rect.top - 12));
    }
    setShowNotifications(next);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotifClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((item) => item.id === n.id ? { ...item, is_read: true } : item));
    }
    const typeMap: Record<string, string> = { announcement: "/notices", review: "/reviews", review_comment: "/reviews", article_comment: "/articles", contact_reply: "/contact", schedule: "/schedule" };
    const dest = n.link || typeMap[n.type] || null;
    if (dest) { router.push(dest); setShowNotifications(false); setShowMobileNotif(false); }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('notifications-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUserName(""); setUserId("");
    window.dispatchEvent(new Event("auth-change"));
    router.push("/");
  };

  const hideSidebar = NO_SIDEBAR_PATHS.includes(pathname);

  const bg = isDark ? BG_DARK : BG_LIGHT;
  const sidebarStyle = isDark ? GLASS_SIDEBAR_DARK : GLASS_SIDEBAR_LIGHT;

  const T = isDark ? {
    textPrimary: "rgba(255,255,255,0.90)",
    textSecondary: "rgba(255,255,255,0.55)",
    textTertiary: "rgba(255,255,255,0.35)",
    textMuted: "rgba(255,255,255,0.22)",
    border: "rgba(255,255,255,0.08)",
    searchBg: "rgba(255,255,255,0.04)",
    searchBorder: "rgba(255,255,255,0.08)",
    navActive: "#fff",
    navInactive: "rgba(255,255,255,0.45)",
    notifBg: "rgba(14,14,22,0.98)",
    notifBorder: "rgba(255,255,255,0.1)",
    notifText: "rgba(255,255,255,0.85)",
    notifMuted: "rgba(255,255,255,0.4)",
    notifDivider: "rgba(255,255,255,0.05)",
    dropdownBg: "rgba(18,18,24,0.98)",
    dropdownBorder: "rgba(255,255,255,0.1)",
    dropdownText: "rgba(255,255,255,0.65)",
    tabBarBg: "rgba(12,12,20,0.97)",
    tabBarBorder: "rgba(255,255,255,0.08)",
    drawerBg: "rgba(14,14,22,0.98)",
  } : {
    textPrimary: "rgba(10,10,30,0.95)",
    textSecondary: "rgba(10,10,30,0.80)",
    textTertiary: "rgba(10,10,30,0.65)",
    textMuted: "rgba(10,10,30,0.40)",
    border: "rgba(0,0,0,0.08)",
    searchBg: "rgba(0,0,0,0.04)",
    searchBorder: "rgba(0,0,0,0.10)",
    navActive: "rgba(10,10,30,0.95)",
    navInactive: "rgba(10,10,30,0.75)",
    notifBg: "rgba(255,255,255,0.97)",
    notifBorder: "rgba(0,0,0,0.10)",
    notifText: "rgba(10,10,30,0.85)",
    notifMuted: "rgba(10,10,30,0.45)",
    notifDivider: "rgba(0,0,0,0.06)",
    dropdownBg: "rgba(250,250,255,0.98)",
    dropdownBorder: "rgba(0,0,0,0.10)",
    dropdownText: "rgba(10,10,30,0.70)",
    tabBarBg: "rgba(255,255,255,0.95)",
    tabBarBorder: "rgba(0,0,0,0.08)",
    drawerBg: "rgba(250,250,255,0.98)",
  };

  if (hideSidebar) {
    return (
      <div className="relative min-h-screen" style={{ background: bg, fontFamily: SF }}>
        <Orbs isDark={isDark} />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  // ─── 모바일 레이아웃 ────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="relative min-h-screen" style={{ background: bg, fontFamily: SF }}>
        <Orbs isDark={isDark} />

        {/* 모바일 상단 바 */}
        <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-12"
          style={{ background: T.tabBarBg, borderBottom: `1px solid ${T.tabBarBorder}`, backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" }}>
          <Link href="/" style={{ color: T.textPrimary, fontWeight: 700, fontSize: 15 }}>🥃 위스키 연구소</Link>
          <button onClick={() => setShowMobileSearch(true)} className="p-2 rounded-lg transition"
            style={{ color: T.navInactive, fontSize: 18 }}>⌕</button>
        </div>

        {/* 메인 콘텐츠 — 상단 바 + 하단 탭바 높이만큼 패딩 */}
        <div className="relative z-10 pt-12 pb-20">{children}</div>

        {/* 더보기 드로어 백드롭 */}
        {showDrawer && (
          <div
            className="fixed inset-0 z-30"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={() => setShowDrawer(false)}
          />
        )}

        {/* 더보기 드로어 */}
        <div
          className="fixed left-0 right-0 z-40 rounded-t-2xl transition-transform duration-300"
          style={{
            bottom: 64,
            background: T.drawerBg,
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            borderTop: `1px solid ${T.tabBarBorder}`,
            transform: showDrawer ? "translateY(0)" : "translateY(100%)",
          }}
        >
          {/* 드래그 핸들 */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full" style={{ background: T.textMuted }} />
          </div>

          <div className="px-4 pb-4">
            {/* 나머지 내비 */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {DRAWER_NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition-all"
                    style={{
                      background: active ? "rgba(99,102,241,0.2)" : T.searchBg,
                      color: active ? T.navActive : T.navInactive,
                      border: active ? "1px solid rgba(99,102,241,0.3)" : `1px solid ${T.border}`,
                    }}>
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link href="/admin"
                  className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition-all"
                  style={{
                    background: pathname.startsWith("/admin") ? "rgba(99,102,241,0.2)" : T.searchBg,
                    color: pathname.startsWith("/admin") ? T.navActive : T.navInactive,
                    border: pathname.startsWith("/admin") ? "1px solid rgba(99,102,241,0.3)" : `1px solid ${T.border}`,
                  }}>
                  <span className="text-xl">🔐</span>
                  <span>회원 관리</span>
                </Link>
              )}
            </div>

            <div className="h-px mb-4" style={{ background: T.border }} />

            {/* 유저 영역 */}
            <div className="space-y-1">
              {userId ? (
                <>
                  {/* 알림 */}
                  <button
                    onClick={() => { setShowDrawer(false); setShowMobileNotif(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors"
                    style={{ background: T.searchBg, color: T.textSecondary }}>
                    <span className="relative text-base">
                      🔔
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </span>
                    <span>알림{unreadCount > 0 ? ` (${unreadCount})` : ""}</span>
                  </button>

                  {/* 마이페이지 */}
                  <Link href="/mypage"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors"
                    style={{ background: T.searchBg, color: T.textSecondary }}>
                    <span className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                      {userName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate">{userName}</span>
                  </Link>

                  {/* 테마 토글 + 로그아웃 */}
                  <div className="flex gap-2">
                    <button onClick={toggleTheme}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors"
                      style={{ background: T.searchBg, color: T.textTertiary }}>
                      <span>{isDark ? "☀️" : "🌙"}</span>
                      <span>{isDark ? "라이트" : "다크"}</span>
                    </button>
                    <button onClick={handleLogout}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors"
                      style={{ background: T.searchBg, color: T.textTertiary }}>
                      <span>↩</span>
                      <span>로그아웃</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm"
                    style={{ background: "rgba(99,102,241,0.2)", color: T.navActive, border: "1px solid rgba(99,102,241,0.3)" }}>
                    <span>→</span><span>로그인</span>
                  </Link>
                  <button onClick={toggleTheme}
                    className="flex items-center justify-center px-4 py-3 rounded-xl text-sm"
                    style={{ background: T.searchBg, color: T.textTertiary }}>
                    <span>{isDark ? "☀️" : "🌙"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 하단 탭바 */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center"
          style={{
            height: 64,
            background: T.tabBarBg,
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            borderTop: `1px solid ${T.tabBarBorder}`,
          }}
        >
          {TAB_NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all"
                style={{ color: active ? "#818cf8" : T.navInactive }}>
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* 더보기 탭 */}
          <button
            onClick={() => setShowDrawer((v) => !v)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all"
            style={{ color: showDrawer ? "#818cf8" : T.navInactive }}>
            <span className="text-xl leading-none relative">
              ☰
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium">더보기</span>
          </button>
        </nav>

        {/* 모바일 검색 오버레이 */}
        {showMobileSearch && (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: T.drawerBg, fontFamily: SF }}>
            {/* 검색 입력 */}
            <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
              <span style={{ color: T.textMuted, fontSize: 20 }}>⌕</span>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); }}
                placeholder="위스키, Bar, 지식글 검색..."
                className="flex-1 bg-transparent text-base outline-none"
                style={{ color: T.textSecondary }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                  style={{ color: T.textMuted, fontSize: 18 }}>✕</button>
              )}
              <button onClick={() => { setShowMobileSearch(false); setSearchQuery(""); setSearchResults([]); }}
                className="text-sm px-2 py-1 rounded-lg ml-1"
                style={{ color: T.textSecondary }}>취소</button>
            </div>

            {/* 결과 목록 */}
            <div className="flex-1 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((r) => (
                  <button key={r.id + r.icon}
                    onClick={() => { router.push(r.href); setShowMobileSearch(false); setSearchQuery(""); setSearchResults([]); }}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left transition active:opacity-70"
                    style={{ borderBottom: `1px solid ${T.border}`, color: T.dropdownText }}>
                    <span className="text-2xl w-8 text-center">{r.icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.title}</p>
                      {r.subtitle && <p className="text-sm truncate" style={{ color: T.textMuted }}>{r.subtitle}</p>}
                    </div>
                  </button>
                ))
              ) : searchQuery ? (
                <p className="text-center py-16 text-sm" style={{ color: T.textMuted }}>검색 결과가 없습니다</p>
              ) : (
                <div className="px-4 py-5">
                  <p className="text-xs uppercase tracking-wider mb-3" style={{ color: T.textMuted }}>빠른 이동</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[...TAB_NAV, ...DRAWER_NAV].map((item) => (
                      <button key={item.href}
                        onClick={() => { router.push(item.href); setShowMobileSearch(false); }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-left transition active:opacity-70"
                        style={{ background: T.searchBg, color: T.textSecondary, border: `1px solid ${T.border}` }}>
                        <span className="text-xl">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 모바일 알림 오버레이 */}
        {showMobileNotif && (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: T.notifBg, fontFamily: SF }}>
            <div className="flex items-center justify-between px-4 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
              <span className="text-base font-semibold" style={{ color: T.textPrimary }}>
                알림 {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-indigo-500/70 text-white text-[10px] rounded-full font-bold">{unreadCount}</span>}
              </span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-sm" style={{ color: T.textMuted }}>모두 읽음</button>
                )}
                {notifications.length > 0 && (
                  <button onClick={async () => { await supabase.from("notifications").delete().eq("user_id", userId); setNotifications([]); }}
                    className="text-sm" style={{ color: T.textMuted }}>전체 삭제</button>
                )}
                <button onClick={() => setShowMobileNotif(false)} className="text-lg px-1" style={{ color: T.textSecondary }}>✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center py-16 text-sm" style={{ color: T.textMuted }}>알림이 없습니다</p>
              ) : notifications.map((n) => (
                <div key={n.id} onClick={() => handleNotifClick(n)}
                  className="px-4 py-4 flex items-start gap-3 cursor-pointer active:opacity-70 transition-opacity"
                  style={{
                    borderBottom: `1px solid ${T.notifDivider}`,
                    background: n.is_read ? "transparent" : "rgba(99,102,241,0.07)",
                  }}>
                  <div className="mt-2 flex-shrink-0 w-2 h-2 rounded-full" style={{ background: n.is_read ? "transparent" : "rgba(99,102,241,0.9)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug" style={{ color: n.is_read ? T.notifMuted : T.notifText }}>{n.message}</p>
                    <p className="text-xs mt-1" style={{ color: T.textMuted }}>
                      {new Date(n.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── 데스크탑 레이아웃 (기존과 동일) ──────────────────────────
  return (
    <div className="flex min-h-screen" style={{ background: bg, fontFamily: SF }}>
      <Orbs isDark={isDark} />

      {/* 사이드바 */}
      <aside className="fixed top-0 left-0 h-screen w-56 z-20 flex flex-col" style={sidebarStyle}>
        {/* 로고 */}
        <div className="px-5 pt-8 pb-4">
          <Link href="/">
            <h1 className="font-bold text-base tracking-tight cursor-pointer transition" style={{ color: T.textPrimary }}>🥃 위스키 연구소</h1>
          </Link>
        </div>

        {/* 검색 */}
        <div className="px-3 mb-4 relative" ref={searchRef}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ border: `1px solid ${T.searchBorder}`, background: T.searchBg }}>
            <span className="text-sm" style={{ color: T.textMuted }}>⌕</span>
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="검색..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: T.textSecondary }}
            />
            {searchQuery && <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="text-xs" style={{ color: T.textMuted }}>✕</button>}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-3 right-3 mt-1 rounded-xl overflow-hidden z-50" style={{ background: T.dropdownBg, border: `1px solid ${T.dropdownBorder}`, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
              {searchResults.map((r) => (
                <button key={r.id + r.icon} onClick={() => { router.push(r.href); setSearchQuery(""); setSearchOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-black/5"
                  style={{ color: T.dropdownText }}>
                  <span>{r.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate">{r.title}</p>
                    {r.subtitle && <p className="text-xs truncate" style={{ color: T.textMuted }}>{r.subtitle}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-3 mb-2">
          <p className="text-xs px-2 mb-1 uppercase tracking-wider" style={{ color: T.textMuted }}>메뉴</p>
        </div>

        {/* 내비게이션 */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                style={{
                  color: active ? T.navActive : T.navInactive,
                  background: active ? "rgba(99,102,241,0.25)" : "transparent",
                  border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
              style={{
                color: pathname.startsWith("/admin") ? T.navActive : T.navInactive,
                background: pathname.startsWith("/admin") ? "rgba(99,102,241,0.25)" : "transparent",
                border: pathname.startsWith("/admin") ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                fontWeight: pathname.startsWith("/admin") ? 600 : 400,
              }}>
              <span className="text-base w-5 text-center">🔐</span>
              <span>회원 관리</span>
            </Link>
          )}
        </nav>

        {/* 하단 유저 */}
        <div className="px-3 py-4 space-y-1" style={{ borderTop: `1px solid ${T.border}` }}>
          {/* 다크/라이트 토글 */}
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left mb-1 hover:bg-black/5"
            style={{ color: T.textTertiary }}>
            <span className="text-base w-5 text-center">{isDark ? "☀️" : "🌙"}</span>
            <span>{isDark ? "라이트 모드" : "다크 모드"}</span>
          </button>

          {userId ? (
            <>
              {/* 알림 */}
              <div className="relative" ref={notifRef}>
                <button ref={bellRef} onClick={handleBellClick}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left hover:bg-black/5"
                  style={{ color: T.textSecondary }}>
                  <span className="relative w-5 text-center text-base">
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  <span>알림{unreadCount > 0 ? ` (${unreadCount})` : ""}</span>
                </button>
                {showNotifications && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl overflow-hidden z-50 flex flex-col"
                    style={{ background: T.notifBg, border: `1px solid ${T.notifBorder}`, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: notifMaxH }}>
                    <div className="px-4 py-3 flex justify-between items-center flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <span className="text-sm font-medium" style={{ color: T.textPrimary }}>
                        알림 {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-indigo-500/70 text-white text-[10px] rounded-full font-bold">{unreadCount}</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead}
                            className="text-xs hover:text-indigo-400 transition" style={{ color: T.textMuted }}>모두 읽음</button>
                        )}
                        {notifications.length > 0 && (
                          <button onClick={async () => { await supabase.from("notifications").delete().eq("user_id", userId); setNotifications([]); }}
                            className="text-xs hover:text-red-400 transition" style={{ color: T.textMuted }}>전체 삭제</button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <p className="text-center text-sm py-8" style={{ color: T.textMuted }}>알림이 없습니다</p>
                      ) : notifications.map((n) => (
                        <div key={n.id} onClick={() => handleNotifClick(n)}
                          className="px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-black/5 flex items-start gap-3"
                          style={{
                            borderBottom: `1px solid ${T.notifDivider}`,
                            background: n.is_read ? "transparent" : "rgba(99,102,241,0.07)",
                          }}>
                          <div className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full" style={{ background: n.is_read ? "transparent" : "rgba(99,102,241,0.9)" }} />
                          <div className="flex-1 min-w-0">
                            <p className="leading-snug" style={{ color: n.is_read ? T.notifMuted : T.notifText }}>{n.message}</p>
                            <p className="text-xs mt-1" style={{ color: T.textMuted }}>
                              {new Date(n.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link href="/mypage"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/5"
                style={{ color: T.textSecondary }}>
                <span className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                  {userName.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate">{userName}</span>
              </Link>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:text-red-500 hover:bg-red-500/10 transition-colors text-left"
                style={{ color: T.textTertiary }}>
                <span className="text-base w-5 text-center">↩</span>
                <span>로그아웃</span>
              </button>
            </>
          ) : (
            <Link href="/login"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/5"
              style={{ color: T.textSecondary }}>
              <span className="text-base w-5 text-center">→</span>
              <span>로그인</span>
            </Link>
          )}
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 ml-56 relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  );
}

function Orbs({ isDark }: { isDark: boolean }) {
  const o1 = isDark ? "radial-gradient(circle, #3b82f6 0%, transparent 70%)" : "radial-gradient(circle, #6366f1 0%, transparent 70%)";
  const o2 = isDark ? "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" : "radial-gradient(circle, #a78bfa 0%, transparent 70%)";
  const o3 = isDark ? "radial-gradient(circle, #06b6d4 0%, transparent 70%)" : "radial-gradient(circle, #38bdf8 0%, transparent 70%)";
  return (
    <>
      <style>{`
        @keyframes orb-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.08); }
          66% { transform: translate(-30px, 40px) scale(0.95); }
        }
        @keyframes orb-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(-50px, 50px) scale(1.1); }
          70% { transform: translate(30px, -30px) scale(0.92); }
        }
        @keyframes orb-float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, -40px) scale(1.05); }
        }
      `}</style>
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: o1, animation: "orb-float-1 18s ease-in-out infinite" }} />
        <div className="absolute top-1/3 -right-60 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: o2, animation: "orb-float-2 22s ease-in-out infinite" }} />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: o3, animation: "orb-float-3 15s ease-in-out infinite" }} />
      </div>
    </>
  );
}