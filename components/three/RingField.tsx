"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ringVertex, ringFragment } from "./ringShader";
import { scrollState } from "@/lib/scroll";

/** リング間の距離 */
export const RING_GAP = 26;
/** カメラの開始位置 */
export const START_Z = 20;
/** リング数からカメラの総移動距離を出す。末尾に余白を足して最後の環も抜ける */
export const travelFor = (ringCount: number) =>
  // 末尾の余白は控えめにする。取りすぎると最後のセクションで
  // 環を抜けきってしまい、背景が真っ暗になる
  (ringCount - 1) * RING_GAP + 12;

/** ガウス分布に近い乱数。粒子を円周付近へ寄せるのに使う */
function gaussian() {
  let u = 0;
  for (let i = 0; i < 3; i++) u += Math.random();
  return (u / 3 - 0.5) * 2;
}

export default function RingField({
  quality,
  ringCount,
}: {
  quality: "low" | "high";
  /** 経歴1件につき1つの環。データが増えれば演出も自動で伸びる */
  ringCount: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, material } = useMemo(() => {
    const perRing = quality === "high" ? 2200 : 900;
    const dust = quality === "high" ? 5200 : 1800;
    const total = ringCount * perRing + dust;

    const aAngle = new Float32Array(total);
    const aRing = new Float32Array(total);
    const aSeed = new Float32Array(total);
    const aRadius = new Float32Array(total);
    const aScale = new Float32Array(total);
    const aType = new Float32Array(total);

    let i = 0;
    for (let r = 0; r < ringCount; r++) {
      // リングごとに半径を変える。単調な繰り返しに見せないため
      const base = 8.5 + Math.sin(r * 1.7) * 2.2 + r * 0.25;
      for (let k = 0; k < perRing; k++, i++) {
        aAngle[i] = Math.random() * Math.PI * 2;
        aRing[i] = r;
        aSeed[i] = Math.random();
        aRadius[i] = base + gaussian() * 1.3;
        aScale[i] = 0.45 + Math.random() * 0.95;
        aType[i] = 0;
      }
    }
    for (let k = 0; k < dust; k++, i++) {
      aAngle[i] = Math.random() * Math.PI * 2;
      aRing[i] = Math.random() * ringCount;
      aSeed[i] = Math.random();
      aRadius[i] = 4 + Math.random() * 38;
      aScale[i] = 0.2 + Math.random() * 0.5;
      aType[i] = 1;
    }

    const g = new THREE.BufferGeometry();
    // position は使わないが、three が bounding sphere 計算で要求するので入れておく
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    g.setAttribute("aAngle", new THREE.BufferAttribute(aAngle, 1));
    g.setAttribute("aRing", new THREE.BufferAttribute(aRing, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 1));
    g.setAttribute("aRadius", new THREE.BufferAttribute(aRadius, 1));
    g.setAttribute("aScale", new THREE.BufferAttribute(aScale, 1));
    g.setAttribute("aType", new THREE.BufferAttribute(aType, 1));
    // 頂点シェーダーで位置を作るのでカリングは無効化する
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    const m = new THREE.ShaderMaterial({
      vertexShader: ringVertex,
      fragmentShader: ringFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCameraZ: { value: START_Z },
        uVelocity: { value: 0 },
        uPixelRatio: { value: 1 },
        uSize: { value: quality === "high" ? 2.6 : 3.2 },
        uRingGap: { value: RING_GAP },
        uFocusRing: { value: -1 },
        uColorA: { value: new THREE.Color("#ff9d4d") },
        uColorB: { value: new THREE.Color("#6ee7f0") },
        uOpacity: { value: 0 }, // 初回フェードインは useFrame で上げる
      },
    });

    return { geometry: g, material: m };
  }, [quality, ringCount]);

  useFrame((state, delta) => {
    const m = matRef.current;
    if (!m) return;
    const d = Math.min(delta, 0.05); // タブ復帰時の巨大なdeltaを吸収

    m.uniforms.uTime.value += d;
    m.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    m.uniforms.uCameraZ.value = state.camera.position.z;
    m.uniforms.uFocusRing.value = -state.camera.position.z / RING_GAP;

    // 速度は生値だと跳ねるので均す
    m.uniforms.uVelocity.value +=
      (scrollState.velocity - m.uniforms.uVelocity.value) * 0.08;

    // 起動時にふわりと出す
    if (m.uniforms.uOpacity.value < 1) {
      m.uniforms.uOpacity.value = Math.min(1, m.uniforms.uOpacity.value + d * 0.6);
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <primitive object={material} ref={matRef} attach="material" />
    </points>
  );
}
