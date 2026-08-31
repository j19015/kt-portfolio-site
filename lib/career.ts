import raw from "@/data/career.json";
import rawEn from "@/data/career.en.json";
import { UI, type Locale } from "@/lib/i18n";

/** career.json が持っている生の形。会社名は正式名称のまま */
type RawCareerEntry = {
  company: string;
  product: string | null;
  role: string;
  start: string;
  end: string | null;
  description: string;
  stack: string[];
  /**
   * 雇用形態。以前は company の括弧内に「業務委託」があるかで判定していたが、
   * アルバイトやインターンを表現できず、括弧の表記を変えると分類が壊れた。
   *
   * company の文字列自体は変更していない。career.en.json の上書きキーが
   * 日本語の正式社名なので、変えると英訳が黙って外れるため
   */
  employment: Employment;
};

/** 雇用形態 */
export type Employment = "fulltime" | "contract" | "parttime" | "intern";

/** 表示用に整えた経歴。company は整形済み */
export type CareerEntry = Omit<RawCareerEntry, "company"> & {
  company: string;
};

export type SkillGroup = { category: string; items: string[] };
export type Certification = { name: string; date: string | null };
export type Award = { name: string; date: string | null };
export type Education = {
  school: string;
  note: string | null;
  start: string;
  end: string | null;
};
export type LinkItem = { label: string; url: string };
export type NextItem = { no: string; title: string; body: string };

export type CareerData = {
  profile: {
    nameJa: string;
    nameEn: string;
    title: string;
    location: string;
    summary: string;
    next: string;
  };
  career: RawCareerEntry[];
  skills: SkillGroup[];
  certifications: Certification[];
  awards?: Award[];
  education?: Education[];
  nextItems?: NextItem[];
  links: LinkItem[];
};

/**
 * 英語の上書き辞書。日本語版が正で、こちらは差分だけを持つ。
 * 訳が無いキーは日本語のまま表示されるので、翻訳が追いつかなくても壊れない。
 */
type Translations = {
  profile?: Partial<CareerData["profile"]>;
  career?: Record<string, Partial<RawCareerEntry>>;
  certifications?: Record<string, string>;
  awards?: Record<string, string>;
  education?: Record<string, { school?: string; note?: string }>;
  nextItems?: Record<string, { title?: string; body?: string }>;
  /** 分類名。いまは日英とも英語なので使っていないが、訳したくなったら足せる */
  skills?: Record<string, string>;
};

const JA = raw as CareerData;
const EN = rawEn as Translations;

/**
 * 経歴の件数。3Dの環の数がこれに追従する。
 * 言語で増減しないので、Canvas 側はロケールを知らなくてよい
 */
export const CAREER_COUNT = JA.career.length;

/** ロケールごとの上書き辞書。日本語は素通し */
const dict = (locale: Locale): Translations => (locale === "en" ? EN : {});

/** 経歴の同定キー。会社名だけだと同じ会社の複数案件を区別できない */
const key = (e: { company: string; start: string }) => `${e.company}|${e.start}`;

/** "2024-04" → "2024.04" 表示用。終わりが無い経歴は「現在 / Present」 */
export const fmt = (ym: string | null, locale: Locale = "ja") =>
  ym ? ym.replace("-", ".") : UI[locale].present;

/** 期間の長さを月数で返す。バーの長さに使う */
export function months(start: string, end: string | null): number {
  const [sy, sm] = start.split("-").map(Number);
  const now = new Date();
  const [ey, em] = end
    ? end.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  return (ey - sy) * 12 + (em - sm) + 1;
}

/**
 * 会社名を見出し用の表示名へ整える。
 *
 * 雇用形態はデータの `employment` が持つので、ここでは判定しない。
 * 以前は括弧内の「業務委託」の有無で判断していたが、アルバイトや
 * インターンを表現できず、括弧の表記を変えると分類が壊れた。
 */
export function displayCompany(raw: string): string {
  // 括弧の中から雇用形態を表す語だけを抜き、サービス名などは残す
  const name = raw.replace(/[（(][^）)]*[）)]/g, (m) => {
    const inner = m
      .slice(1, -1)
      .replace(/業務委託|アルバイト|インターン|パートタイム/g, "")
      .replace(/^[\s/・]+|[\s/・]+$/g, "")
      .trim();
    return inner ? `（${inner}）` : "";
  });

  return name
    .replace(/^株式会社\s*/, "")
    .replace(/\s*株式会社$/, "")
    .trim();
}

/** 表示用に整えた1言語ぶんのデータ */
export type LocalizedData = {
  profile: CareerData["profile"];
  /** 新しい順に並べ替え済み */
  career: CareerEntry[];
  skills: SkillGroup[];
  certifications: Certification[];
  awards: Award[];
  education: Education[];
  nextItems: NextItem[];
  links: LinkItem[];
};

function localize(locale: Locale): LocalizedData {
  const t = dict(locale);

  return {
    profile: { ...JA.profile, ...t.profile },

    career: JA.career
      .map((e): CareerEntry => {
        const over = t.career?.[key(e)];
        // 表示名だけ整える。雇用形態はデータが持っているので、
        // 英訳を当てても分類は崩れない
        return {
          ...e,
          ...over,
          company: over?.company ?? displayCompany(e.company),
        };
      })
      .sort((a, b) => b.start.localeCompare(a.start)),

    skills: JA.skills.map((g) => ({
      ...g,
      category: t.skills?.[g.category] ?? g.category,
    })),

    certifications: JA.certifications.map((c) => ({
      ...c,
      name: t.certifications?.[c.name] ?? c.name,
    })),

    awards: (JA.awards ?? []).map((a) => ({
      ...a,
      name: t.awards?.[a.name] ?? a.name,
    })),

    education: (JA.education ?? []).map((e) => ({
      ...e,
      ...t.education?.[e.school],
      // note は null を取りうるので、訳が無いときに undefined で潰さない
      note: t.education?.[e.school]?.note ?? e.note,
    })),

    nextItems: (JA.nextItems ?? []).map((i) => ({
      ...i,
      ...t.nextItems?.[i.no],
    })),

    // ラベルは "GitHub" などのサービス名なので訳さない
    links: JA.links,
  };
}

// 言語ごとに一度だけ組み立てる。切り替えのたびに作り直す必要はない
const cache = new Map<Locale, LocalizedData>();

export function getData(locale: Locale): LocalizedData {
  let d = cache.get(locale);
  if (!d) {
    d = localize(locale);
    cache.set(locale, d);
  }
  return d;
}
