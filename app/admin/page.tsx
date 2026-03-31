"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    router.replace("/mypage?tab=admin&sub=users");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-white/45 text-sm">관리자 페이지로 이동 중...</p>
    </div>
  );
}
