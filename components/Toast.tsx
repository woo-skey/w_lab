"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DURATION: Record<ToastKind, number> = {
  success: 2600,
  info: 3200,
  // 에러는 원인을 읽어야 하므로 조금 더 오래 띄운다
  error: 5000,
};

const MAX_VISIBLE = 4;

/**
 * Provider가 없을 때를 대비한 폴백.
 * 던져버리면 화면 전체가 죽으므로, 최소한 기존 alert 동작은 유지한다.
 */
const FALLBACK: ToastApi = {
  success: (m) => console.log(m),
  error: (m) => { if (typeof window !== "undefined") window.alert(m); },
  info: (m) => console.log(m),
};

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? FALLBACK;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const text = (message || "").trim();
    if (!text) return;
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, kind, message: text }].slice(-MAX_VISIBLE));
    timers.current.set(id, setTimeout(() => dismiss(id), DURATION[kind]));
  }, [dismiss]);

  // 언마운트 시 남은 타이머 정리
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => clearTimeout(t));
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed z-[100] left-1/2 -translate-x-1/2 bottom-20 w-[min(22rem,calc(100vw-2rem))]
                   md:left-auto md:right-6 md:translate-x-0 md:bottom-6
                   flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  // 이모지 대신 색상 도트로 종류를 구분한다 (UI 라벨 이모지 금지 규칙)
  const dot =
    toast.kind === "success" ? "bg-emerald-400"
    : toast.kind === "error" ? "bg-red-400"
    : "bg-indigo-400";

  const ring =
    toast.kind === "success" ? "border-emerald-500/30 dark:border-emerald-400/30"
    : toast.kind === "error" ? "border-red-500/35 dark:border-red-400/35"
    : "border-indigo-500/30 dark:border-indigo-400/30";

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
      onClick={onDismiss}
      className={`toast-in pointer-events-auto cursor-pointer select-none flex items-start gap-2.5
                  rounded-xl border px-3.5 py-2.5 shadow-lg backdrop-blur-xl ${ring}
                  bg-white/90 dark:bg-[#161a2e]/90`}
    >
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <p className="text-[13px] leading-snug text-black/75 dark:text-white/80 break-words">
        {toast.message}
      </p>
    </div>
  );
}
