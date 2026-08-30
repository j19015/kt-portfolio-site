"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { CAREER, fmt, parseCompany } from "@/lib/career";

export default function Career() {
  return (
    <Section id="career" index="02" label="Career">
      <ol className="relative">
        {CAREER.map((entry, i) => {
          const { name, contract } = parseCompany(entry.company);
          return (
            <li key={`${entry.company}-${entry.start}`}>
              <Reveal delay={Math.min(i, 4) * 0.05}>
                <article className="group relative grid gap-4 border-t border-line py-9 md:grid-cols-[132px_1fr] md:gap-10">
                  {/* ホバー時に上端の線だけ琥珀へ変わる */}
                  <span className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-ember/60 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />

                  <div className="font-mono text-[11px] leading-relaxed text-faint">
                    <div className="text-ember/80">{fmt(entry.start)}</div>
                    <div className="my-1 h-3 w-px bg-line md:my-1.5" />
                    <div>{fmt(entry.end)}</div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                      <h3 className="font-display text-[clamp(1.05rem,2.4vw,1.5rem)] font-medium tracking-tight text-ink">
                        {name}
                      </h3>
                      {contract && (
                        <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[9px] tracking-[0.18em] text-muted uppercase">
                          Contract
                        </span>
                      )}
                    </div>

                    {entry.product && (
                      <p className="mt-1.5 text-[13px] text-ember/75">
                        {entry.product}
                      </p>
                    )}

                    <p className="mt-4 max-w-2xl text-[13.5px] leading-[1.95] text-ink/70">
                      {entry.description}
                    </p>

                    {entry.stack.length > 0 && (
                      <ul className="mt-5 flex flex-wrap gap-x-2 gap-y-2">
                        {entry.stack.map((s) => (
                          <li
                            key={s}
                            className="rounded border border-line/70 bg-surface/40 px-2 py-1 font-mono text-[10.5px] text-muted transition-colors duration-300 group-hover:border-line group-hover:text-ink/70"
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
