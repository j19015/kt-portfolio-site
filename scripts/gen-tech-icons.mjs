/**
 * data/career.json の skills 項目に対応するアイコンのパスデータを lib/tech-icons.ts に書き出す。
 *
 *   node scripts/gen-tech-icons.mjs
 *
 * 生成物はリポジトリにコミットする。ビルド時に simple-icons も外部CDNも参照しないので、
 * 上流の都合（パッケージのメジャー更新でアイコンが消える等）でビルドが壊れることがない。
 * 実際 simple-icons v14 以降で AWS 系と OpenAI のアイコンは削除されており、
 * それらは scripts/retired-icons.mjs にパスデータを退避してある。
 *
 * アイコン: Simple Icons (https://simpleicons.org) — CC0 1.0 Universal
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import * as simpleIcons from "simple-icons";
import { RETIRED_ICONS } from "./retired-icons.mjs";

// 座標を小数2桁に丸めて容量を削る案は却下した。
// SVGパスのコンパクト記法は数値を空白なしで連結するため
// （例: `a.315.315 0 01.29-.187` の "0 0 1" はアークフラグ）、
// 数値だけを正規表現で置換するとフラグや区切りが壊れる。
// 実際に試して18個のパスが不正になった。gzipで6KB減るだけなので割に合わない。

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * career.json の項目名 → Simple Icons の slug。
 * ここに無い項目、および slug が解決できない項目はアイコン無し（表示側でフォールバック）。
 * 「AWS CDK」「MediaLive」のような個別ロゴが存在しないものに親ブランドのロゴを当てると
 * 同じ絵が並んで誤読を招くので、当てずにフォールバックへ落とす。
 */
const SLUGS = {
  // Languages
  TypeScript: "typescript",
  JavaScript: "javascript",
  Python: "python",
  Ruby: "ruby",
  Go: "go",

  // Frontend
  React: "react",
  "Next.js (App Router)": "nextdotjs",
  Vite: "vite",
  Nx: "nx",
  Redux: "redux",
  "TanStack Router / Query": "tanstack",
  "React Hook Form": "reacthookform",
  Zod: "zod",
  Storybook: "storybook",

  // Styling
  "Tailwind CSS": "tailwindcss",
  "CSS Modules": "cssmodules",
  Sass: "sass",
  MUI: "mui",

  // Backend
  "Node.js": "nodedotjs",
  Express: "express",
  FastAPI: "fastapi",
  "Ruby on Rails": "rubyonrails",
  Prisma: "prisma",

  // Database
  PostgreSQL: "postgresql",
  MySQL: "mysql",
  MongoDB: "mongodb",
  SQLite: "sqlite",

  // Testing
  Vitest: "vitest",
  Jest: "jest",
  "Testing Library": "testinglibrary",

  // AWS
  Lambda: "awslambda",
  Amplify: "awsamplify",
  S3: "amazons3",
  EC2: "amazonec2",
  RDS: "amazonrds",

  // Azure / GCP
  "Azure OpenAI": "openai",
  "Google Cloud": "googlecloud",

  // Firebase
  Firestore: "firebase",

  // AI / LLM / RAG
  "Claude Code": "claude",
  GPT: "openai",
  Gemini: "googlegemini",
  MCP: "modelcontextprotocol",

  // Auth / CMS
  Strapi: "strapi",

  // DevOps / Tools
  "GitHub Actions": "githubactions",
  CircleCI: "circleci",
  Docker: "docker",
  Terraform: "terraform",
  "pre-commit": "precommit",
  Cloudflare: "cloudflare",
  Jira: "jira",
  Notion: "notion",
  Figma: "figma",
};

const BY_SLUG = new Map(
  Object.values(simpleIcons)
    .filter((i) => i && typeof i === "object" && i.slug && i.path)
    .map((i) => [i.slug, i]),
);
for (const [slug, icon] of Object.entries(RETIRED_ICONS)) {
  if (!BY_SLUG.has(slug)) BY_SLUG.set(slug, { ...icon, slug });
}

/* ---- 色: ほぼ黒の背景に載せるので、暗すぎるブランド色は持ち上げる ---- */

const hexToRgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

function rgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const INK = "#f2f0ec";

/**
 * ホバー時に使う色を決める。
 * - 黒〜グレー系（Next.js / Notion / Express / MCP など）は白に寄せる。
 *   これらはダークテーマ用のロゴが実際に白なので、ブランド的にも正しい。
 * - 有彩色で暗いもの（Jira / SQLite / OpenAI など）は色相と彩度を保ったまま明度だけ上げる。
 */
function displayColor(hex) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  if (s < 0.25 && l < 0.55) return INK;
  if (l < 0.58) return hslToHex(h, Math.max(s, 0.5), 0.62);
  return `#${hex.toLowerCase()}`;
}

/* ---- 生成 ---- */

const career = JSON.parse(readFileSync(resolve(ROOT, "data/career.json"), "utf8"));
const items = career.skills.flatMap((g) => g.items);

const entries = [];
const missing = [];
const unresolved = [];

for (const item of items) {
  const slug = SLUGS[item];
  if (!slug) {
    missing.push(item);
    continue;
  }
  const icon = BY_SLUG.get(slug);
  if (!icon) {
    unresolved.push(`${item} (slug: ${slug})`);
    missing.push(item);
    continue;
  }
  entries.push([item, icon]);
}

const unused = Object.keys(SLUGS).filter((k) => !items.includes(k));

const body = entries
  .map(
    ([item, icon]) =>
      `  ${JSON.stringify(item)}: {\n` +
      `    title: ${JSON.stringify(icon.title)},\n` +
      `    color: ${JSON.stringify(displayColor(icon.hex))},\n` +
      `    path: ${JSON.stringify(icon.path)},\n` +
      `  },`,
  )
  .join("\n");

const out = `/**
 * 自動生成ファイル。直接編集しない。
 * 更新するには: node scripts/gen-tech-icons.mjs
 *
 * data/career.json の skills 項目名をキーに、24x24 viewBox の単一パスを持つ。
 * ビルド時・実行時ともに外部への通信は発生しない（パスデータをここに埋め込んでいるため）。
 *
 * Icons: Simple Icons — https://simpleicons.org
 * License: CC0 1.0 Universal (Public Domain Dedication)
 *
 * color はホバー時に使うブランド色。ほぼ黒の背景で沈まないよう、
 * 暗い色は明度を持ち上げ、黒系はダークテーマ用ロゴに合わせて白に寄せてある。
 */
export type TechIcon = {
  /** Simple Icons 上の正式名称。alt/title 用 */
  title: string;
  /** ホバー時の色。背景が暗いので調整済み */
  color: string;
  /** viewBox="0 0 24 24" の単一パス */
  path: string;
};

export const TECH_ICONS: Record<string, TechIcon | undefined> = {
${body}
};
`;

writeFileSync(resolve(ROOT, "lib/tech-icons.ts"), out);

const pad = (n) => String(n).padStart(2, " ");
console.log(`simple-icons: ${BY_SLUG.size} icons available`);
console.log(`generated lib/tech-icons.ts — ${pad(entries.length)}/${items.length} items matched`);
if (unresolved.length) console.log(`\n  !! slug not found:\n   - ${unresolved.join("\n   - ")}`);
if (unused.length) console.log(`\n  !! SLUGS key not in career.json:\n   - ${unused.join("\n   - ")}`);
console.log(`\nno icon (${missing.length}):\n  - ${missing.join("\n  - ")}`);
