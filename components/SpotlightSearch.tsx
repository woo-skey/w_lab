"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { searchGlobalContent, type GlobalSearchResult } from "@/lib/globalSearch";

const OPEN_EVENT_NAME = "open-spotlight-search";

const TYPE_LABEL: Record<GlobalSearchResult["type"], string> = {
  whiskey: "위스키",
  bar: "Bar",
  article: "지식글",
};

const TYPE_ICON: Record<GlobalSearchResult["type"], string> = {
  whiskey: "🥃",
  bar: "🍸",
  article: "📚",
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const regex = new RegExp(`(${escapeRegExp(q)})`, "ig");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, idx) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={`${part}-${idx}`} className="bg-indigo-400/30 text-indigo-100 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${idx}`}>{part}</span>
        )
      )}
    </>
  );
}

export default function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const openHandler = () => setOpen(true);

    window.addEventListener("keydown", keyHandler);
    window.addEventListener(OPEN_EVENT_NAME, openHandler as EventListener);

    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener(OPEN_EVENT_NAME, openHandler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    setQuery("");
    setResults([]);
    setSelected(0);
  }, [open]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const found = await searchGlobalContent(q);
      setResults(found);
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 180);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const moveToResult = (result: GlobalSearchResult) => {
    router.push(result.href);
    setOpen(false);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === "Enter" && results[selected]) {
      e.preventDefault();
      moveToResult(results[selected]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]"
      style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(8px)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(22,22,30,0.96)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <span className="text-white/40 text-lg">🔎</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="위스키, Bar, 지식글 검색..."
            className="flex-1 bg-transparent text-white placeholder-white/30 text-base outline-none"
          />
          {loading && <span className="text-white/30 text-xs">검색 중...</span>}
          <kbd className="text-white/25 text-xs px-1.5 py-0.5 rounded border border-white/15">ESC</kbd>
        </div>

        {results.length > 0 ? (
          <div className="py-2 max-h-[24rem] overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{ background: index === selected ? "rgba(99,102,241,0.22)" : "transparent" }}
                onMouseEnter={() => setSelected(index)}
                onClick={() => moveToResult(result)}
              >
                <span className="text-xl w-8 text-center">{TYPE_ICON[result.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">
                    <HighlightText text={result.title} query={query} />
                  </p>
                  {result.subtitle && (
                    <p className="text-white/35 text-xs truncate">
                      <HighlightText text={result.subtitle} query={query} />
                    </p>
                  )}
                </div>
                <span className="text-white/25 text-xs px-2 py-0.5 rounded-full border border-white/10 flex-shrink-0">
                  {TYPE_LABEL[result.type]}
                </span>
              </button>
            ))}
          </div>
        ) : query && !loading ? (
          <div className="py-10 text-center text-white/30 text-sm">검색 결과가 없습니다</div>
        ) : !query ? (
          <div className="py-6 px-4">
            <p className="text-white/30 text-xs mb-3">빠른 이동</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { href: "/reviews", icon: "🥃", label: "리뷰" },
                { href: "/bars", icon: "🍸", label: "Bar" },
                { href: "/articles", icon: "📚", label: "지식글" },
                { href: "/schedule", icon: "📅", label: "일정" },
              ].map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 py-3 rounded-xl transition-colors hover:bg-white/8"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-white/45 text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="px-4 py-2.5 border-t border-white/10 flex items-center gap-4 text-white/25 text-xs">
          <span>
            <kbd className="border border-white/15 rounded px-1">↑↓</kbd> 이동
          </span>
          <span>
            <kbd className="border border-white/15 rounded px-1">Enter</kbd> 열기
          </span>
          <span>
            <kbd className="border border-white/15 rounded px-1">ESC</kbd> 닫기
          </span>
        </div>
      </div>
    </div>
  );
}
