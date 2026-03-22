import type { Metadata } from "next";
import "./globals.css";
import AppSidebar from "@/components/AppSidebar";
import TwemojiProvider from "@/components/TwemojiProvider";

export const metadata: Metadata = {
  title: "위스키 연구소",
  description: "위스키 리뷰, 바 추천, 일정 짜기",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <TwemojiProvider>
          <AppSidebar>{children}</AppSidebar>
        </TwemojiProvider>
      </body>
    </html>
  );
}
