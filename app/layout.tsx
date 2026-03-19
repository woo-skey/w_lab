import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "위스키 랩",
  description: "위스키 리뷰, 바 추천, 일정 짜기",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-white text-gray-900">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
