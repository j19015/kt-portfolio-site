"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { onReady } from "@/lib/boot";
import { SITE } from "@/lib/site";

export default function Loader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const off = onReady(() => {
      // WebGLの初期化直後は1フレーム目が重い。少し置いてから幕を開ける
      setTimeout(() => setDone(true), 450);
    });

    // 3Dが何らかの理由で立ち上がらなくても、幕は必ず開ける
    const failsafe = setTimeout(() => setDone(true), 6000);
    return () => {
      off();
      clearTimeout(failsafe);
    };
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex flex-col items-center gap-6">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="font-display text-[11px] tracking-[0.55em] text-muted uppercase"
            >
              {SITE.nameEn}
            </motion.span>

            {/* 読み込み中を示す一本の線。左から光が走る */}
            <span className="relative block h-px w-32 overflow-hidden bg-line">
              <motion.span
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-ember to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
              />
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
