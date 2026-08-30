"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { SITE } from "@/lib/site";

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // 3Dが奥へ進むのに合わせて、文字は手前に留まりつつ沈んで消える
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const blur = useTransform(scrollYProgress, [0, 0.6], ["blur(0px)", "blur(6px)"]);

  return (
    <section
      ref={ref}
      id="hero"
      className="relative flex min-h-[100svh] flex-col items-center justify-center px-6"
    >
      {/* 粒子の上に敷く暗幕。中心だけ落として文字を浮かせる */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 58% 48% at 50% 48%, rgba(8,8,12,0.88) 0%, rgba(8,8,12,0.62) 42%, rgba(8,8,12,0) 76%)",
        }}
      />

      <motion.div style={{ y, opacity, filter: blur }} className="relative text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.1 }}
          className="mb-7 font-mono text-[10px] tracking-[0.45em] text-ember/90 uppercase"
        >
          {SITE.location}
        </motion.p>

        <h1 className="font-display text-[clamp(2.5rem,9.5vw,7.5rem)] leading-[0.9] font-medium tracking-[-0.035em] text-ink">
          {SITE.nameEn.split(" ").map((word, i) => (
            <motion.span
              key={word}
              className="block"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 1.4,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.15 + i * 0.12,
              }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.7 }}
        >
          <p className="mt-9 font-display text-[clamp(0.85rem,2.1vw,1.2rem)] tracking-[0.28em] text-ember uppercase">
            {SITE.role}
          </p>
          {/* 琥珀の細い線。肩書きとキャッチの間を締める */}
          <span className="mx-auto mt-6 block h-px w-16 bg-ember/50" />
          <p className="mx-auto mt-6 max-w-md text-[13px] leading-loose text-balance text-ink/70">
            {SITE.tagline}
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        style={{ opacity }}
        className="absolute bottom-10 flex flex-col items-center gap-3"
      >
        <span className="font-mono text-[9px] tracking-[0.35em] text-ink/45 uppercase">
          Scroll
        </span>
        <span className="relative h-14 w-px overflow-hidden bg-line">
          {/* 線の中を光が繰り返し降りる */}
          <motion.span
            className="absolute inset-x-0 h-5 bg-gradient-to-b from-transparent via-ember to-transparent"
            animate={{ y: ["-100%", "380%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.div>
    </section>
  );
}
