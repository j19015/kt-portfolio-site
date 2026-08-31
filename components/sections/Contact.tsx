"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { useLocale } from "@/components/LocaleProvider";
import { getData } from "@/lib/career";
import { UI } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export default function Contact() {
  const { locale } = useLocale();
  const data = getData(locale);

  return (
    <Section id="contact" index="07" label="Contact">
      <Reveal>
        <p className="mb-12 max-w-lg text-[14px] leading-loose text-ink/70">
          {UI[locale].contactLead}
        </p>
      </Reveal>

      <ul className="border-t border-line">
        {data.links.map((link, i) => (
          <li key={link.label}>
            <Reveal delay={Math.min(i, 5) * 0.04}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex items-center justify-between gap-6 border-b border-line py-5"
              >
                <span className="font-display text-[clamp(1.1rem,3vw,1.75rem)] font-medium tracking-tight text-ink/85 transition-colors duration-300 group-hover:text-ember">
                  {link.label}
                </span>
                <span className="flex items-center gap-4">
                  <span className="hidden font-mono text-[10.5px] text-faint sm:block">
                    {link.url.replace(/^https?:\/\/(www\.)?/, "")}
                  </span>
                  <span
                    aria-hidden
                    className="text-muted transition-all duration-500 group-hover:translate-x-1 group-hover:text-ember"
                  >
                    →
                  </span>
                </span>
              </a>
            </Reveal>
          </li>
        ))}
      </ul>

      <Reveal delay={0.2}>
        <footer className="mt-24 flex flex-col gap-3 border-t border-line pt-8 font-mono text-[10px] tracking-[0.2em] text-faint uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {SITE.nameEn}
          </span>
          <span>Built with Next.js · React Three Fiber</span>
        </footer>
      </Reveal>
    </Section>
  );
}
