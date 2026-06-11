"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TwemojiProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let scheduled = false;

    (async () => {
      const twemoji = (await import("twemoji")).default;
      if (cancelled) return;

      const parse = () => {
        // 파싱이 삽입하는 <img>가 옵저버를 다시 트리거해 무한 재파싱되는 것을 막기 위해
        // 파싱 동안에는 옵저버를 끊었다가 끝나면 다시 연결한다.
        observer?.disconnect();
        twemoji.parse(document.body, {
          folder: "svg",
          ext: ".svg",
          base: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/",
        });
        if (!cancelled) observer?.observe(document.body, { childList: true, subtree: true });
      };

      observer = new MutationObserver(() => {
        if (scheduled || cancelled) return;
        scheduled = true;
        // 변경을 한 프레임으로 모아 처리 (연속 변경 시 폭주 방지)
        requestAnimationFrame(() => {
          scheduled = false;
          if (!cancelled) parse();
        });
      });

      parse();
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [pathname]);

  return <>{children}</>;
}
