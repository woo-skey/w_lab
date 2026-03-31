import { supabase } from "@/lib/supabase";

export type GlobalSearchType = "whiskey" | "bar" | "article";

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: GlobalSearchType;
  href: string;
  createdAt?: string | null;
}

const PER_TYPE_LIMIT = 8;
const TOTAL_LIMIT = 18;

function stripHtml(html?: string | null) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalized(text: string) {
  return text.trim().toLowerCase();
}

function rankTitle(title: string, query: string) {
  const t = normalized(title);
  const q = normalized(query);
  if (!q) return 99;
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  return 9;
}

function ts(value?: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function searchGlobalContent(rawQuery: string): Promise<GlobalSearchResult[]> {
  const q = rawQuery.trim();
  if (!q) return [];

  const [whiskeyRes, barRes, articleRes] = await Promise.allSettled([
    supabase.from("whiskeys").select("id, name, type, created_at").ilike("name", `%${q}%`).limit(PER_TYPE_LIMIT),
    supabase.from("bars").select("id, bar_name, notes, created_at").ilike("bar_name", `%${q}%`).limit(PER_TYPE_LIMIT),
    supabase.from("articles").select("id, title, category, created_at").ilike("title", `%${q}%`).limit(PER_TYPE_LIMIT),
  ]);

  const rows: GlobalSearchResult[] = [];

  if (whiskeyRes.status === "fulfilled") {
    (whiskeyRes.value.data || []).forEach((w) => {
      rows.push({
        id: w.id,
        title: w.name,
        subtitle: w.type,
        type: "whiskey",
        href: "/reviews",
        createdAt: w.created_at,
      });
    });
  }

  if (barRes.status === "fulfilled") {
    (barRes.value.data || []).forEach((b) => {
      rows.push({
        id: b.id,
        title: b.bar_name,
        subtitle: stripHtml(b.notes).slice(0, 60) || undefined,
        type: "bar",
        href: `/bars/${b.id}`,
        createdAt: b.created_at,
      });
    });
  }

  if (articleRes.status === "fulfilled") {
    (articleRes.value.data || []).forEach((a) => {
      rows.push({
        id: a.id,
        title: a.title,
        subtitle: a.category,
        type: "article",
        href: "/articles",
        createdAt: a.created_at,
      });
    });
  }

  return rows
    .sort((a, b) => {
      const rankA = rankTitle(a.title, q);
      const rankB = rankTitle(b.title, q);
      if (rankA !== rankB) return rankA - rankB;
      return ts(b.createdAt) - ts(a.createdAt);
    })
    .slice(0, TOTAL_LIMIT);
}
