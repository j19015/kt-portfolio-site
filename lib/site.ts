/**
 * サイト全体で使う定数。
 * 肩書き・キャッチはここだけ直せば全画面に反映される。
 */
export const SITE = {
  nameEn: "KOKI TAKAHASHI",
  nameJa: "高橋 幸希",
  /** 肩書き。Full-stack / Product Engineer に変えるならここ1行 */
  role: "Full-cycle Engineer",
  /** 3Dヒーローの下に出る一行 */
  tagline: "設計から運用まで、ひとつのサイクルで回す。",
  location: "Hamamatsu, Japan",
  url: "https://me.kt-tech.blog",
  description:
    "フロントエンドからバックエンド、インフラの構築・運用までを一貫して担当するエンジニアのポートフォリオ。",
  links: {
    github: "https://github.com/j19015",
    blog: "https://kt-tech.blog",
    wantedly: "https://wantedly.com/id/kt_tech",
    youtrust: "https://youtrust.jp/users/meow_koki",
  },
} as const;

/** ページ内セクション。ナビとスクロール進捗の両方がこれを見る */
export const SECTIONS = [
  { id: "hero", label: "Index" },
  { id: "about", label: "About" },
  { id: "career", label: "Career" },
  { id: "skills", label: "Skills" },
  { id: "next", label: "Next" },
  { id: "works", label: "Works" },
  { id: "blog", label: "Blog" },
  { id: "contact", label: "Contact" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];
