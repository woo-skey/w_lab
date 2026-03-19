"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TwemojiProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    let isParsing = false;

    const parse = async () => {
      if (isParsing) return;
      isParsing = true;
      const twemoji = (await import("twemoji")).default;
      twemoji.parse(document.body, {
        folder: "svg",
        ext: ".svg",
        base: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/",
      });
      setTimeout(() => { isParsing = false; }, 200);
    };

    parse();

    const observer = new MutationObserver(() => {
      if (!isParsing) parse();
    });

    const timeout = setTimeout(() => {
      observer.observe(document.body, { childList: true, subtree: true });
    }, 500);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [pathname]);

  return <>{children}</>;
}
