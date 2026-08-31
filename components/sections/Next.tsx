"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { useLocale } from "@/components/LocaleProvider";
import { getData } from "@/lib/career";
import { UI } from "@/lib/i18n";

export default function Next() {
  const { locale } = useLocale();
  const data = getData(locale);
  const items = data.nextItems;
  const lead = UI[locale].nextLead;

  return (
    <Section id="next" index="04" label="What's Next">
      <Reveal>
        <p className="mb-16 max-w-2xl text-[clamp(1rem,2.2vw,1.35rem)] leading-[1.9] font-medium text-balance text-ink">
          {/* 3本の柱を貫く一行。ここだけ大きく置いて視線の起点にする */}
          {lead.pre}
          <span className="text-ember">{lead.em}</span>
          {lead.post}
        </p>
      </Reveal>

      <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
        {items.map((item, i) => (
          <li key={item.no} className="bg-abyss/70 backdrop-blur-sm">
            <Reveal delay={i * 0.09}>
              <article className="group relative flex h-full flex-col p-7 transition-colors duration-500 hover:bg-surface/50 md:p-8">
                {/* 上端の琥珀線。ホバーで左から伸びる */}
                <span className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-ember/70 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />

                <span className="font-display text-[2.4rem] leading-none font-medium text-line transition-colors duration-500 group-hover:text-ember/45">
                  {item.no}
                </span>

                <h3 className="mt-6 font-display text-[1.02rem] leading-snug font-medium tracking-tight text-ink">
                  {item.title}
                </h3>

                <p className="mt-4 flex-1 text-[13px] leading-[1.95] text-ink/65">
                  {item.body}
                </p>
              </article>
            </Reveal>
          </li>
        ))}
      </ol>

      {data.profile.next && (
        <Reveal delay={0.25}>
          <p className="mt-12 max-w-2xl border-l border-line pl-6 text-[13px] leading-[2] text-muted">
            {data.profile.next}
          </p>
        </Reveal>
      )}
    </Section>
  );
}
