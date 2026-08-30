"use client";

import Image from "next/image";

import Section, { Reveal } from "@/components/ui/Section";
import worksConfig from "@/data/works-config.json";
import { REPOS } from "@/lib/feeds";

/**
 * 作品カードに載せる情報。
 * GitHub APIから機械的に取れるのは更新日ぐらいなので、
 * サムネイル・技術スタック・工夫した点は data/works-config.json に手で書いている。
 */
type WorkMeta = {
  label: string;
  homepage: string;
  repo: string;
  thumbnail: string;
  thumbnailAlt: string;
  role: string;
  description: string;
  notes: string[];
  stack: string[];
};

const OVERRIDES = worksConfig.overrides as Record<string, WorkMeta>;

/**
 * 表示順は works-config.json の feature がそのまま決める。
 * GitHubの取得に失敗してもセクションごと消えないよう、
 * カードの本体は設定ファイルだけで組み立てて、更新日だけを任意で足す。
 */
const WORKS = worksConfig.feature.flatMap((name) => {
  const meta = OVERRIDES[name];
  if (!meta) return [];
  const repo = REPOS.find((r) => r.name === name);
  return [{ name, ...meta, updatedAt: repo?.updatedAt ?? null }];
});

const host = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export default function Works() {
  if (WORKS.length === 0) return null;

  return (
    <Section id="works" index="05" label="Works">
      <ul className="flex flex-col gap-6">
        {WORKS.map((work, i) => {
          // 2枚並ぶので画像の位置を左右で入れ替えて、同じ形の繰り返しに見せない
          const flipped = i % 2 === 1;

          return (
            <li key={work.name}>
              <Reveal delay={Math.min(i, 3) * 0.08}>
                <article className="group relative grid overflow-hidden rounded-xl border border-line bg-abyss/70 backdrop-blur-md transition-colors duration-500 hover:border-ember/40 md:grid-cols-2">
                  {/* 5:4 で撮ってある。md以上ではテキスト側の高さに合わせて伸びるが、
                      元の比率がカードの比率に近いので object-cover でもほとんど切れない */}
                  <figure
                    className={`relative aspect-[5/4] overflow-hidden md:aspect-auto ${
                      flipped ? "md:order-2" : ""
                    }`}
                  >
                    <Image
                      src={work.thumbnail}
                      alt={work.thumbnailAlt}
                      width={1200}
                      height={960}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
                    />
                    {/* 背景の3Dとぶつからないよう普段は少し沈めておき、hoverで本来の明るさに戻す */}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-void/35 transition-opacity duration-700 group-hover:opacity-0"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 ring-1 ring-line ring-inset"
                    />
                  </figure>

                  <div className="flex flex-col gap-4 p-6 md:p-8">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[10px] tracking-[0.3em] text-ember">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
                        {work.role}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-[1.35rem] leading-tight font-medium tracking-tight text-ink">
                        {/* カード全面をこのリンクの当たり判定にする（中のRepositoryリンクだけ上に出す） */}
                        <a
                          href={work.homepage}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="transition-colors duration-300 after:absolute after:inset-0 after:content-[''] group-hover:text-ember"
                        >
                          {work.label}
                        </a>
                      </h3>
                      <p className="mt-1.5 font-mono text-[10.5px] text-faint">
                        {host(work.homepage)}
                      </p>
                    </div>

                    <p className="text-[13px] leading-relaxed text-ink/70">
                      {work.description}
                    </p>

                    <ul className="flex flex-col gap-2">
                      {work.notes.map((note) => (
                        <li
                          key={note}
                          className="flex gap-2.5 text-[11.5px] leading-relaxed text-muted"
                        >
                          <span
                            aria-hidden
                            className="mt-[8px] h-px w-2.5 shrink-0 bg-ember/60"
                          />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>

                    <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
                      {work.stack.map((tech) => (
                        <li
                          key={tech}
                          className="rounded-full border border-line bg-surface/60 px-2.5 py-1 font-mono text-[10px] text-muted"
                        >
                          {tech}
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 font-mono text-[10.5px]">
                      <span className="flex items-center gap-1.5 text-muted transition-colors duration-300 group-hover:text-ember">
                        Visit site
                        <span
                          aria-hidden
                          className="transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        >
                          ↗
                        </span>
                      </span>
                      <a
                        href={work.repo}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="relative z-10 flex items-center gap-1.5 text-faint transition-colors hover:text-ember"
                      >
                        Repository
                        <span aria-hidden>↗</span>
                      </a>
                      {work.updatedAt && (
                        <span className="ml-auto text-faint">
                          updated {work.updatedAt.replace(/-/g, ".")}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ul>

      <Reveal delay={0.15}>
        <a
          href="https://github.com/j19015"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] text-muted uppercase transition-colors hover:text-ember"
        >
          View all on GitHub
          <span aria-hidden>→</span>
        </a>
      </Reveal>
    </Section>
  );
}
