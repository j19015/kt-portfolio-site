"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLocale } from "@/components/LocaleProvider";
import { UI } from "@/lib/i18n";
import { SECTIONS } from "@/lib/site";
import { scrollToSection } from "@/lib/scroll";

/**
 * 右端の縦ナビ。現在地の表示とジャンプを兼ねる。
 * 画面の大半を3Dに使うので、ナビは細く小さく置く。
 */
export default function SideNav() {
  const { locale } = useLocale();
  const [active, setActive] = useState<string>("hero");

  useEffect(() => {
    // 画面の上下中央あたりに来たセクションを「現在地」とみなす
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.6, 1] },
    );

    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, delay: 1.8 }}
      aria-label={UI[locale].navLabel}
      className="fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 md:block lg:right-8"
    >
      <ul className="flex flex-col items-end gap-1">
        {SECTIONS.map((s) => {
          const on = active === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => scrollToSection(s.id)}
                aria-current={on ? "true" : undefined}
                className="group flex cursor-pointer items-center gap-2.5 py-1.5"
              >
                <span
                  className={`font-mono text-[9px] tracking-[0.2em] uppercase transition-all duration-500 ${
                    on
                      ? "text-ember opacity-100"
                      : "text-muted opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {s.label}
                </span>
                <span
                  className={`block h-px transition-all duration-500 ${
                    on
                      ? "w-7 bg-ember"
                      : "w-3.5 bg-faint group-hover:w-5 group-hover:bg-muted"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
