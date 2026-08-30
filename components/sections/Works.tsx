"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { REPOS } from "@/lib/feeds";

export default function Works() {
  if (REPOS.length === 0) return null;

  return (
    <Section id="works" index="05" label="Works">
      <div className="grid gap-4 sm:grid-cols-2">
        {REPOS.map((repo, i) => (
          <Reveal key={repo.name} delay={(i % 2) * 0.07}>
            <a
              href={repo.homepage ?? repo.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group relative flex h-full flex-col rounded-lg border border-line bg-abyss/70 p-6 backdrop-blur-md transition-colors duration-500 hover:border-ember/45"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-[1.05rem] font-medium tracking-tight text-ink">
                  {repo.label ?? repo.name}
                </h3>
                <span
                  aria-hidden
                  className="mt-1 shrink-0 text-muted transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ember"
                >
                  ↗
                </span>
              </div>

              {repo.label && (
                <p className="mt-1 font-mono text-[10px] text-faint">{repo.name}</p>
              )}

              {repo.description && (
                <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-ink/65">
                  {repo.description}
                </p>
              )}

              <div className="mt-5 flex items-center gap-3 font-mono text-[10px] text-faint">
                {repo.language && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-ember/70" />
                    {repo.language}
                  </span>
                )}
                {repo.updatedAt && <span>updated {repo.updatedAt}</span>}
              </div>
            </a>
          </Reveal>
        ))}
      </div>

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
