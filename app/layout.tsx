import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import TwemojiProvider from "@/components/TwemojiProvider";

export const metadata: Metadata = {
  title: "위스키 연구소",
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
        <TwemojiProvider>
          <Navigation />
          {children}
        </TwemojiProvider>
      </body>
    </html>
  );
}
