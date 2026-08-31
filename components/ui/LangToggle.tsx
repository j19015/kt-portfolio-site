"use client";

import { motion } from "motion/react";
import { useLocale } from "@/components/LocaleProvider";
import { LOCALES, UI } from "@/lib/i18n";

/**
 * 日本語 / 英語の切り替え。
 *
 * このサイトにはヘッダーが無いので、よくあるサイトと同じ「右上」に小さく置く。
 * 右端のマージンは SideNav と揃えてあり、画面右辺に沿った縦の関係になる。
 * SideNav が md 未満で消えるのに対し、こちらは全画面幅で出す。
 */
export default function LangToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 1.6 }}
      role="group"
      aria-label={UI[locale].langLabel}
      className="fixed top-5 right-5 z-40 flex items-center gap-2.5 rounded-full border border-line bg-abyss/70 px-3 py-1.5 backdrop-blur-md lg:right-8"
    >
      {LOCALES.map((l, i) => {
        const on = l === locale;
        return (
          <div key={l} className="flex items-center gap-2.5">
            {i > 0 && <span aria-hidden className="h-2.5 w-px bg-line" />}
            <button
              type="button"
              lang={l}
              onClick={() => setLocale(l)}
              aria-current={on ? "true" : undefined}
              className={`cursor-pointer font-mono text-[10px] tracking-[0.18em] uppercase transition-colors duration-300 ${
                on ? "text-ember" : "text-faint hover:text-ink"
              }`}
            >
              {l}
            </button>
          </div>
        );
      })}
    </motion.div>
  );
}
