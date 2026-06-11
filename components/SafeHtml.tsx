"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

interface SafeHtmlProps {
  html: string;
  className?: string;
}

// style 속성은 RichTextEditor가 생성하는 안전한 CSS만 허용 (color, font-size, font-family, text-align)
// → 임의 CSS 주입(클릭재킹 오버레이, url()/expression() 등) 차단
const ALLOWED_STYLE_PROPS = ["color", "font-size", "font-family", "text-align"];
function sanitizeStyle(value: string): string {
  return value
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const prop = decl.split(":")[0]?.trim().toLowerCase();
      if (!prop || !ALLOWED_STYLE_PROPS.includes(prop)) return false;
      return !/url\(|expression\(|javascript:|@import|<|>/i.test(decl);
    })
    .join("; ");
}

export default function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = useMemo(() => {
    if (typeof window === "undefined") return "";
    DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
      if (data.attrName === "style") {
        data.attrValue = sanitizeStyle(data.attrValue);
      }
    });
    const result = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "span", "h1", "h2", "h3"],
      ALLOWED_ATTR: ["style", "class"],
    });
    DOMPurify.removeHook("uponSanitizeAttribute");
    return result;
  }, [html]);

  return <div dangerouslySetInnerHTML={{ __html: clean }} className={className} />;
}
