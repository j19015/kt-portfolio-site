"use client";

import { motion } from "motion/react";

/**
 * 全セクション共通の枠。
 * 3Dを背景に見せ続けたいので全面は塗らず、コンテンツ側だけ暗幕をかけて可読性を確保する。
 */
export default function Section({
  id,
  index,
  label,
  children,
  className = "",
}: {
  id: string;
  index: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`relative py-32 md:py-44 ${className}`}>
      {/* 左に寄せた暗幕。右側は3Dが素通しで見える */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(8,8,12,0.95) 0%, rgba(8,8,12,0.92) 42%, rgba(8,8,12,0.8) 74%, rgba(8,8,12,0.58) 92%, rgba(8,8,12,0.45) 100%)",
          // 上下端で暗幕を抜く。セクションの継ぎ目に3Dだけが見える帯ができる
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 md:px-10">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 flex items-baseline gap-4"
        >
          <span className="font-mono text-[10px] tracking-[0.3em] text-ember">
            {index}
          </span>
          <h2 className="font-display text-[clamp(1.6rem,4vw,2.6rem)] font-medium tracking-tight text-ink">
            {label}
          </h2>
          <span className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
        </motion.header>

        {children}
      </div>
    </section>
  );
}

/** 下から浮き上がる入場アニメーション。リスト項目に順番に効かせる */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
