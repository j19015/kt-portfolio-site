import raw from "@/data/career.json";

export type CareerEntry = {
  company: string;
  product: string | null;
  role: string;
  start: string;
  end: string | null;
  description: string;
  stack: string[];
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
  career: CareerEntry[];
  skills: SkillGroup[];
  certifications: Certification[];
  awards?: Award[];
  education?: Education[];
  nextItems?: NextItem[];
  links: LinkItem[];
};

export const DATA = raw as CareerData;

/** 新しい順に並べ替えた経歴。開始日の降順 */
export const CAREER = [...DATA.career].sort((a, b) =>
  b.start.localeCompare(a.start),
);

/** "2024-04" → "2024.04" 表示用 */
export const fmt = (ym: string | null) =>
  ym ? ym.replace("-", ".") : "現在";

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
 * 会社名から表示用の名前と雇用形態を切り出す。
 * データ側は "株式会社インフラトップ（DMM WEBCAMP / 業務委託）" のような
 * 正式名称で持っているので、見出しに使える形へ整える。
 */
export function parseCompany(raw: string): {
  name: string;
  contract: boolean;
} {
  const contract = /業務委託/.test(raw);

  // 括弧の中から「業務委託」だけを抜き、他の情報（サービス名など）は残す
  let name = raw.replace(/[（(][^）)]*[）)]/g, (m) => {
    const inner = m
      .slice(1, -1)
      .replace(/業務委託/g, "")
      .replace(/^[\s/・]+|[\s/・]+$/g, "")
      .trim();
    return inner ? `（${inner}）` : "";
  });

  name = name
    .replace(/^株式会社\s*/, "")
    .replace(/\s*株式会社$/, "")
    .trim();

  return { name, contract };
}
