"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { DATA, fmt } from "@/lib/career";

/** 右カラムの各項目。見出しと中身の組を統一した見た目で並べる */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.25em] text-faint uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 space-y-1 text-ink">{children}</dd>
    </div>
  );
}

/** 名称と年月を並べる1行。資格・受賞で共通 */
function DatedRow({ name, date }: { name: string; date: string | null }) {
  return (
    <p className="flex items-baseline justify-between gap-3">
      <span>{name}</span>
      {date && (
        <span className="shrink-0 font-mono text-[10px] text-faint">
          {date.replace("-", ".")}
        </span>
      )}
    </p>
  );
}

export default function About() {
  return (
    <Section id="about" index="01" label="About">
      <div className="grid gap-12 md:grid-cols-[1.35fr_1fr] md:gap-16">
        <Reveal>
          <p className="max-w-xl text-[15px] leading-[2.05] text-ink/85">
            {DATA.profile.summary}
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <dl className="space-y-6 rounded-r-lg border-l border-line bg-abyss/45 py-2 pl-6 text-[13px] backdrop-blur-[3px]">
            <Field label="Name">
              {DATA.profile.nameJa}
              <span className="ml-2 text-muted">/ {DATA.profile.nameEn}</span>
            </Field>

            <Field label="Based in">{DATA.profile.location}</Field>

            {DATA.education?.length ? (
              <Field label="Education">
                {DATA.education.map((e) => (
                  <p key={e.school} className="leading-relaxed">
                    <span>{e.school}</span>
                    {e.note && (
                      <span className="ml-2 text-muted">（{e.note}）</span>
                    )}
                    <span className="mt-0.5 block font-mono text-[10px] text-faint">
                      {fmt(e.start)} – {fmt(e.end)}
                    </span>
                  </p>
                ))}
              </Field>
            ) : null}

            <Field label="Certifications">
              {DATA.certifications.map((c) => (
                <DatedRow key={c.name} name={c.name} date={c.date} />
              ))}
            </Field>

            {DATA.awards?.length ? (
              <Field label="Awards">
                {DATA.awards.map((a) => (
                  <DatedRow key={a.name} name={a.name} date={a.date} />
                ))}
              </Field>
            ) : null}
          </dl>
        </Reveal>
      </div>
    </Section>
  );
}
