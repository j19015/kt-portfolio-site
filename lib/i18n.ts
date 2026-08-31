/**
 * 日本語 / 英語の切り替え。
 *
 * サーバーランタイムを持たない（output: "export"）ので、ロケール判定は
 * すべてクライアントで行う。初期HTMLは常に日本語で焼かれ、
 * マウント直後に URL の ?lang= と localStorage を読んで切り替える。
 * 切り替えが見えないのは、その間まだ Loader の幕が下りているため。
 */
import { SITE } from "@/lib/site";

export type Locale = "ja" | "en";

export const LOCALES = ["ja", "en"] as const;

export const isLocale = (v: unknown): v is Locale => v === "ja" || v === "en";

/** localStorage のキー。リロードしても選択が残る */
export const LOCALE_KEY = "portfolio.locale";

/** URLに載せるクエリ名。?lang=en で英語版を直接共有できる */
export const LOCALE_PARAM = "lang";

/**
 * コンポーネントに直接書かれている文言。
 * データ（career.json / works-config.json）側の翻訳はそれぞれの
 * `*.en.json` / `en` キーが持つので、ここはUIの地の文だけを扱う。
 */
type Dict = {
  /** SideNav の aria-label */
  navLabel: string;
  /** 言語切り替えの aria-label */
  langLabel: string;
  /** Hero の一行。実体は lib/site.ts にあり、ここは参照するだけ */
  tagline: string;
  /** 在職中の経歴の「終了年月」欄 */
  present: string;
  /** Career のグループ見出し。sub は日本語版だけの英字サブラベル */
  fulltime: { label: string; sub: string };
  contract: { label: string; sub: string };
  /** アルバイト・インターンをまとめた枠。各1件なので束ねる */
  other: { label: string; sub: string };
  /** グループ見出し右端の件数 */
  count: (n: number) => string;
  /** Next の冒頭。em の部分だけ琥珀色で出る */
  nextLead: { pre: string; em: string; post: string };
  /** Contact の導入文 */
  contactLead: string;
  /** About の Name 欄。主・副の並びが言語で入れ替わる */
  name: (ja: string, en: string) => { primary: string; secondary: string };
  /** About の学歴の補足を包む括弧。全角/半角を使い分ける */
  paren: (s: string) => string;
};

export const UI: Record<Locale, Dict> = {
  ja: {
    navLabel: "セクション",
    langLabel: "言語を切り替える",
    tagline: SITE.tagline,
    present: "現在",
    fulltime: { label: "正社員", sub: "Full-time" },
    contract: { label: "業務委託・受託", sub: "Contract" },
    other: { label: "その他の経歴", sub: "Other" },
    count: (n) => `${n} 件`,
    nextLead: {
      pre: "書ける範囲を広げるより、",
      em: "回せる範囲",
      post: "を広げたい。",
    },
    contactLead: "各プラットフォームで発信・活動しています。お気軽にどうぞ。",
    name: (ja, en) => ({ primary: ja, secondary: en }),
    paren: (s) => `（${s}）`,
  },
  en: {
    navLabel: "Sections",
    langLabel: "Switch language",
    tagline: SITE.taglineEn,
    present: "Present",
    // 英語では見出しそのものが Full-time / Contract なので、サブラベルは重複する
    fulltime: { label: "Full-time", sub: "" },
    contract: { label: "Contract", sub: "" },
    other: { label: "Other", sub: "" },
    count: (n) => `${n} ${n === 1 ? "position" : "positions"}`,
    nextLead: {
      pre: "Rather than widening what I can write, I want to widen ",
      em: "what I can run",
      post: ".",
    },
    contactLead: "I'm active on these platforms — feel free to reach out.",
    name: (ja, en) => ({ primary: en, secondary: ja }),
    paren: (s) => `(${s})`,
  },
};
