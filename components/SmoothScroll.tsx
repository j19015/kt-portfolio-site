"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import {
  scrollState,
  sectionProgress,
  computeProgress,
  setScroller,
} from "@/lib/scroll";
import { SECTIONS } from "@/lib/site";

/**
 * Lenis による慣性スクロール。
 * あわせて、3D側が読むスクロール進捗をここで一元的に更新する。
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // OS側で視差効果を減らしている人には慣性を付けない
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const lenis = new Lenis({
      duration: reduced ? 0 : 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reduced,
touchMultiplier: 1.6,
    });

    const updateSections = () => {
      const vh = window.innerHeight;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el) sectionProgress[s.id] = computeProgress(el.getBoundingClientRect(), vh);
      }
    };

    lenis.on("scroll", (e: { progress: number; velocity: number; scroll: number }) => {
      scrollState.progress = e.progress;
      scrollState.velocity = e.velocity;
      scrollState.pages = e.scroll / window.innerHeight;
      updateSections();
    });

    setScroller(lenis);

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    updateSections();

    return () => {
      cancelAnimationFrame(raf);
      setScroller(null);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
