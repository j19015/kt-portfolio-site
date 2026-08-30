import blogJson from "@/data/blog.json";
import reposJson from "@/data/repos.json";

export type Post = {
  title: string;
  url: string;
  date: string | null;
  description: string;
};

export type Repo = {
  name: string;
  label: string | null;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  updatedAt: string | null;
};

export const POSTS = blogJson as Post[];
export const REPOS = reposJson as Repo[];

/**
 * 記事タイトルを「【カテゴリ】本題 — 補足」の3つに割る。
 * ブログ側の命名規則に合わせた整形なので、規則から外れたものは本題だけになる。
 */
export function parsePostTitle(raw: string): {
  category: string | null;
  title: string;
  subtitle: string | null;
} {
  const m = raw.match(/^【([^】]+)】\s*(.*)$/);
  const category = m?.[1] ?? null;
  const rest = m?.[2] ?? raw;
  const parts = rest.split(/\s*[—–]\s*/);
  return {
    category,
    title: parts[0].trim(),
    subtitle: parts.slice(1).join(" — ").trim() || null,
  };
}
