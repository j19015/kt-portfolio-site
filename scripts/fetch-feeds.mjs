/**
 * ビルド前にブログRSSとGitHubリポジトリを取得して data/ に保存する。
 *
 * 設計方針: 取得に失敗しても絶対にビルドを止めない。
 * 前回取得したJSONをそのまま残して exit 0 する。
 * （外部サービスの一時的な障害でデプロイが落ちるのを防ぐため）
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");

const BLOG_FEED = "https://kt-tech.blog/feed.xml";
const GH_USER = "j19015";
const TIMEOUT = 12000;

const log = (...a) => console.log("[fetch-feeds]", ...a);

async function get(url, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "kt-portfolio-build", ...headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** XMLの1タグ分を取り出す。CDATAも剥がす */
function tag(block, name) {
  const m = block.match(
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"),
  );
  if (!m) return null;
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** RSS 2.0 と Atom の両方を受け付ける */
function parseFeed(xml) {
  const isAtom = /<feed[\s>]/i.test(xml);
  const blocks = isAtom
    ? [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0])
    : [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]);

  return blocks
    .map((b) => {
      let link = tag(b, "link");
      if (isAtom && !link) {
        const href = b.match(/<link[^>]*href=["']([^"']+)["']/i);
        link = href?.[1] ?? null;
      }
      const date = tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated");
      return {
        title: tag(b, "title"),
        url: link,
        date: date ? new Date(date).toISOString().slice(0, 10) : null,
        description: (tag(b, "description") ?? tag(b, "summary") ?? "").slice(0, 160),
      };
    })
    .filter((p) => p.title && p.url);
}

async function fetchBlog() {
  const xml = await get(BLOG_FEED);
  const posts = parseFeed(xml).slice(0, 6);
  if (posts.length === 0) throw new Error("フィードは取れたが記事0件");
  return posts;
}

async function fetchRepos() {
  const token = process.env.GITHUB_TOKEN;
  const json = await get(
    `https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`,
    {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  );
  const repos = JSON.parse(json);
  if (!Array.isArray(repos)) throw new Error("想定外のレスポンス形式");

  // 学習用リポジトリまで並べると実態を過小に見せるので、
  // works-config.json に挙げたものだけをこの順で出す
  const cfg = JSON.parse(
    await readFile(path.join(DATA, "works-config.json"), "utf8"),
  );
  const order = cfg.feature ?? [];
  const overrides = cfg.overrides ?? {};

  return repos
    .filter((r) => !r.fork && !r.archived && !r.private)
    .filter((r) => order.includes(r.name))
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
    .map((r) => ({
      name: r.name,
      label: overrides[r.name]?.label ?? null,
      description: overrides[r.name]?.description ?? r.description,
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language,
      stars: r.stargazers_count,
      topics: r.topics ?? [],
      updatedAt: r.pushed_at?.slice(0, 10) ?? null,
    }))
    .slice(0, 12);
}

/** 取得できたときだけ書き込む。失敗したら前回の内容を保持する */
async function update(file, fetcher, label) {
  const target = path.join(DATA, file);
  try {
    const data = await fetcher();
    await writeFile(target, JSON.stringify(data, null, 2) + "\n", "utf8");
    log(`✓ ${label}: ${Array.isArray(data) ? data.length : "?"} 件を更新`);
    return true;
  } catch (e) {
    let kept = 0;
    try {
      kept = JSON.parse(await readFile(target, "utf8")).length;
    } catch {
      // 初回でキャッシュも無い場合は空で作る。ビルドは通す
      await writeFile(target, "[]\n", "utf8");
    }
    log(`✗ ${label}: 取得失敗 (${e.message}) — 前回の ${kept} 件を維持`);
    return false;
  }
}

const ok = await Promise.all([
  update("blog.json", fetchBlog, "ブログ"),
  update("repos.json", fetchRepos, "リポジトリ"),
]);

log(ok.every(Boolean) ? "すべて更新しました" : "一部は前回の内容を使います");
process.exit(0); // 失敗してもビルドは続行する
