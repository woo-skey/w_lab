"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export default function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = useMemo(() => {
    if (typeof window === "undefined") return "";
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "span", "h1", "h2", "h3"],
      ALLOWED_ATTR: ["style", "class"],
    });
  }, [html]);

  return <div dangerouslySetInnerHTML={{ __html: clean }} className={className} />;
}
