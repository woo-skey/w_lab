"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Result {
  id: string;
  title: string;
  subtitle?: string;
  type: "whiskey" | "bar" | "article";
  href: string;
}

const TYPE_LABEL: Record<Result["type"], string> = {
  whiskey: "위스키",
  bar: "Bar",
  article: "지식글",
};

const TYPE_ICON: Record<Result["type"], string> = {
  whiskey: "🥃",
  bar: "🍸",
  article: "📚",
};

export default function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K 토글
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const [wRes, bRes, aRes] = await Promise.allSettled([
      supabase.from("whiskeys").select("id, name, type").ilike("name", `%${q}%`).limit(4),
      supabase.from("bars").select("id, name, address").ilike("name", `%${q}%`).limit(4),
      supabase.from("articles").select("id, title, category").ilike("title", `%${q}%`).limit(4),
    ]);
    const combined: Result[] = [];
    if (wRes.status === "fulfilled") {
      (wRes.value.data || []).forEach((w) =>
        combined.push({ id: w.id, title: w.name, subtitle: w.type, type: "whiskey", href: "/reviews" })
      );
    }
    if (bRes.status === "fulfilled") {
      (bRes.value.data || []).forEach((b) =>
        combined.push({ id: b.id, title: b.name, subtitle: b.address, type: "bar", href: "/bars" })
      );
    }
    if (aRes.status === "fulfilled") {
      (aRes.value.data || []).forEach((a) =>
        combined.push({ id: a.id, title: a.title, subtitle: a.category, type: "article", href: "/articles" })
      );
    }
    setResults(combined);
    setSelected(0);
    setLoading(false);
  }, []);

  // 디바운스
  useEffect(() => {
    const t = setTimeout(() => search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  // 키보드 탐색
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) {
      router.push(results[selected].href);
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(28,28,32,0.95)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
          fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <span className="text-white/40 text-lg">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="위스키, Bar, 지식글 검색..."
            className="flex-1 bg-transparent text-white placeholder-white/30 text-base outline-none"
          />
          {loading && <span className="text-white/30 text-xs">검색 중...</span>}
          <kbd className="text-white/25 text-xs px-1.5 py-0.5 rounded border border-white/15">ESC</kbd>
        </div>

        {/* 결과 */}
        {results.length > 0 ? (
          <div className="py-2 max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={r.id + r.type}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{ background: i === selected ? "rgba(99,102,241,0.25)" : "transparent" }}
                onMouseEnter={() => setSelected(i)}
                onClick={() => { router.push(r.href); setOpen(false); }}
              >
                <span className="text-xl w-8 text-center">{TYPE_ICON[r.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">{r.title}</p>
                  {r.subtitle && <p className="text-white/35 text-xs truncate">{r.subtitle}</p>}
                </div>
                <span className="text-white/25 text-xs px-2 py-0.5 rounded-full border border-white/10 flex-shrink-0">
                  {TYPE_LABEL[r.type]}
                </span>
              </button>
            ))}
          </div>
        ) : query && !loading ? (
          <div className="py-10 text-center text-white/30 text-sm">결과 없음</div>
        ) : !query ? (
          <div className="py-6 px-4">
            <p className="text-white/25 text-xs mb-3">빠른 이동</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { href: "/reviews", icon: "⭐", label: "위스키 리뷰" },
                { href: "/bars", icon: "🍸", label: "Bar 추천" },
                { href: "/articles", icon: "📚", label: "지식글" },
              ].map((item) => (
                <button key={item.href}
                  onClick={() => { router.push(item.href); setOpen(false); }}
                  className="flex flex-col items-center gap-2 py-3 rounded-xl transition-colors hover:bg-white/8"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-white/40 text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* 하단 힌트 */}
        <div className="px-4 py-2.5 border-t border-white/8 flex items-center gap-4 text-white/25 text-xs">
          <span><kbd className="border border-white/15 rounded px-1">↑↓</kbd> 탐색</span>
          <span><kbd className="border border-white/15 rounded px-1">↵</kbd> 이동</span>
          <span><kbd className="border border-white/15 rounded px-1">⌘K</kbd> 닫기</span>
        </div>
      </div>
    </div>
  );
}
