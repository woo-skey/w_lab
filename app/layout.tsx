import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import TwemojiProvider from "@/components/TwemojiProvider";
import ThemeProvider from "@/components/ThemeProvider";

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
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <TwemojiProvider>
            <Navigation />
            {children}
          </TwemojiProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
