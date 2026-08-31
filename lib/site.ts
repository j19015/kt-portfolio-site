/**
 * サイト全体で使う定数。
 * 肩書き・キャッチはここだけ直せば全画面に反映される。
 */
/**
 * 検索エンジンにインデックスさせるかどうか。
 *
 * 公開する準備が整ったら `true` にして、あわせて `public/_headers` の
 * X-Robots-Tag ブロックを消すこと。片方だけ変えても効かない
 * （ヘッダは meta より強く、HTMLでないファイルにも効くため）。
 */
export const INDEXABLE = false;

export const SITE = {
  nameEn: "KOKI TAKAHASHI",
  nameJa: "高橋 幸希",
  /** 肩書き。ここ1行で全画面に反映される */
  role: "Product Engineer",
  /** 3Dヒーローの下に出る一行。英語版と対にして直すこと */
  tagline: "設計から運用まで、プロダクトが動き続けることに責任を持つ。",
  taglineEn:
    "From design through operations, responsible for keeping the product running.",
  location: "Hamamatsu, Japan",
  url: "https://me.kt-tech.blog",
  description:
    "フロントエンドからバックエンド、インフラの構築・運用までを一貫して担当するプロダクトエンジニアのポートフォリオ。",
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
