"use client";

import Section, { Reveal } from "@/components/ui/Section";
import { POSTS, parsePostTitle } from "@/lib/feeds";
import { SITE } from "@/lib/site";

export default function Blog() {
  if (POSTS.length === 0) return null;

  return (
    <Section id="blog" index="06" label="Writing">
      <ul>
        {POSTS.map((post, i) => {
          const { category, title, subtitle } = parsePostTitle(post.title);
          return (
            <li key={post.url}>
              <Reveal delay={Math.min(i, 4) * 0.05}>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group grid gap-2 border-t border-line py-6 transition-colors md:grid-cols-[96px_1fr] md:gap-8"
                >
                  <time className="font-mono text-[11px] text-faint transition-colors group-hover:text-ember/80">
                    {post.date?.replace(/-/g, ".")}
                  </time>

                  <div>
                    {category && (
                      <span className="font-mono text-[9.5px] tracking-[0.2em] text-ember/70 uppercase">
                        {category}
                      </span>
                    )}
                    <h3 className="mt-1.5 text-[15px] leading-snug font-medium text-ink transition-colors group-hover:text-ember">
                      {title}
                    </h3>
                    {subtitle && (
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </a>
              </Reveal>
            </li>
          );
        })}
      </ul>

      <Reveal delay={0.15}>
        <a
          href={SITE.links.blog}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-8 inline-flex items-center gap-2 border-t border-line pt-8 font-mono text-[11px] tracking-[0.15em] text-muted uppercase transition-colors hover:text-ember"
        >
          Read more on kt-tech.blog
          <span aria-hidden>→</span>
        </a>
      </Reveal>
    </Section>
  );
}
