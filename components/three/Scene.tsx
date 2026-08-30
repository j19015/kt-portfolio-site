"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import RingField, { START_Z, travelFor } from "./RingField";
import { CAREER } from "@/lib/career";
import { scrollState } from "@/lib/scroll";
import { markReady } from "@/lib/boot";

/**
 * カメラをZ軸に沿って進める。
 * スクロール量をそのまま位置にせず指数減衰で追従させることで、
 * ホイールの粗い刻みが慣性のある移動に均される。
 */
function CameraRig({ travel }: { travel: number }) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const cam = state.camera;

    // 0.0015^d でフレームレートに依存しない減衰率を作る
    const k = 1 - Math.pow(0.0015, d);
    const desiredZ = START_Z - scrollState.progress * travel;
    cam.position.z += (desiredZ - cam.position.z) * k;

    // マウスに合わせて視点をわずかに振る。動きすぎると酔うので控えめ
    cam.position.x += (pointer.current.x * 1.6 - cam.position.x) * k * 0.5;
    cam.position.y += (-pointer.current.y * 1.0 - cam.position.y) * k * 0.5;
    cam.rotation.y += (-pointer.current.x * 0.05 - cam.rotation.y) * k * 0.5;
    cam.rotation.x += (pointer.current.y * 0.035 - cam.rotation.x) * k * 0.5;
  });

  return null;
}

export default function Scene() {
  // 端末性能で粒子数とポストエフェクトを切り替える
  const [quality, setQuality] = useState<"low" | "high" | null>(null);

  // 経歴1件 = 環1つ。スクロールしきると全部くぐり抜ける長さになる
  const ringCount = CAREER.length;
  const travel = travelFor(ringCount);

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    const cores = navigator.hardwareConcurrency ?? 4;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setQuality(mobile || cores <= 4 || reduced ? "low" : "high");
  }, []);

  const dpr = useMemo<[number, number]>(
    () => (quality === "high" ? [1, 1.75] : [1, 1.25]),
    [quality],
  );

  if (!quality) return null;

  return (
    <div className="canvas-fixed" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{
          antialias: false, // 点描画なのでMSAAは効果が薄い。負荷だけ増える
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0, START_Z], fov: 62, near: 0.1, far: 320 }}
        onCreated={() => markReady()}
      >
        <CameraRig travel={travel} />
        <RingField quality={quality} ringCount={ringCount} />
        {quality === "high" && (
          <EffectComposer>
            <Bloom
              intensity={1.1}
              luminanceThreshold={0.12}
              luminanceSmoothing={0.5}
              mipmapBlur
            />
            <Vignette offset={0.3} darkness={0.6} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
