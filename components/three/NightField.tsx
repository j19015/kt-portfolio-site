"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CatRig, CAT_SIZE } from "./catRig";
import { buildCatGeometry } from "./catGeometry";
import { catVertex, catFragment } from "./catShader";
import {
  dustVertex,
  dustFragment,
  pawVertex,
  pawFragment,
  poolVertex,
  poolFragment,
} from "./nightShaders";
import { pawTrail, resetPawTrail, PAW_CAPACITY } from "./pawTrail";
import { scrollState } from "@/lib/scroll";

/** 窓明かりの間隔。旧実装の環の間隔をそのまま引き継いでいる */
export const POOL_GAP = 26;
/** カメラの開始位置 */
export const START_Z = 20;
/** カメラの高さ。猫の肩より少し上から見下ろす */
export const CAMERA_Y = CAT_SIZE * 1.28;
/** 明かりの数からカメラの総移動距離を出す。末尾に余白を足して最後の1枚も通り抜ける */
export const travelFor = (poolCount: number) => (poolCount - 1) * POOL_GAP + 12;

/** ちりを畳み込む奥行き。これより遠い点は手前へ巡回させる */
const DUST_SPAN = 260;

const COOL = new THREE.Color("#c3d8f2"); // 月明かり
const WARM = new THREE.Color("#ff9d4d"); // サイトの琥珀。足跡に使う

/**
 * 2匹ぶんの設定。歩幅の位相と蛇行をずらして同じ動きにしない。
 *
 * 画面上の横位置はおおよそ lane / lead で決まる。この比が近いと
 * 2匹が重なって1匹の妙な生き物に見えるので、必ず離して置くこと
 */
/**
 * 飼い猫2匹に合わせた毛色。どちらも同じ配置（頭頂・背中・尻尾に色、
 * 顔の中央から胸・脚は白）で、乗る色だけが違う。
 * 暗い画面で沈まないよう、写真の色より明度を上げてある。
 */
const COAT = {
  /** 茶白。頭と背中のオレンジ */
  ginger: new THREE.Color("#e79a58"),
  /** グレー白。青みのあるグレー */
  grey: new THREE.Color("#9aa6b4"),
  /** 白い部分。純白だと浮くのでわずかに暖色へ寄せる */
  white: new THREE.Color("#f6efe4"),
};

const CATS = [
  { lane: 15, lead: 34, weave: 0.0, scale: 1.0, tailUp: true, gait: 0.0, coat: COAT.ginger },
  { lane: 12, lead: 64, weave: 2.4, scale: 0.86, tailUp: false, gait: 0.37, coat: COAT.grey },
];

function buildDust(quality: "low" | "high") {
  const floor = quality === "high" ? 3200 : 1100;
  const air = quality === "high" ? 1400 : 500;
  const total = floor + air;

  const aPos = new Float32Array(total * 3);
  const aSeed = new Float32Array(total);
  const aScale = new Float32Array(total);
  const aType = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const isAir = i >= floor;
    // 床のちりは進路の左右へ広く、空中のちりは高く散らす
    aPos[i * 3] = (Math.random() - 0.5) * (isAir ? 240 : 300);
    aPos[i * 3 + 1] = isAir ? 4 + Math.random() * 66 : Math.pow(Math.random(), 2.2) * 3.6;
    aPos[i * 3 + 2] = Math.random() * DUST_SPAN;
    aSeed[i] = Math.random();
    aScale[i] = isAir ? 0.45 + Math.random() * 0.8 : 0.3 + Math.random() * 0.65;
    aType[i] = isAir ? 1 : 0;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  g.setAttribute("aPos", new THREE.BufferAttribute(aPos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 1));
  g.setAttribute("aScale", new THREE.BufferAttribute(aScale, 1));
  g.setAttribute("aType", new THREE.BufferAttribute(aType, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}

/** 床に寝かせるクアッド1枚を、インスタンス用のジオメトリに仕立てる */
function quadInstances(count: number) {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute("position", base.attributes.position);
  g.instanceCount = count;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}

export default function NightField({
  quality,
  poolCount,
}: {
  quality: "low" | "high";
  /** 経歴1件につき1枚の窓明かり。データが増えれば演出も自動で伸びる */
  poolCount: number;
}) {
  const dust = useMemo(() => buildDust(quality), [quality]);
  // 1匹目は折れ耳（スコティッシュフォールド）なので、耳の形が違う。
  // ジオメトリを2種類作って猫ごとに使い分ける
  const catGeos = useMemo(
    () => [buildCatGeometry(quality, true), buildCatGeometry(quality, false)],
    [quality],
  );

  const dustMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uCameraZ: { value: START_Z },
          uPixelRatio: { value: 1 },
          uSize: { value: quality === "high" ? 2.4 : 3.0 },
          uSpan: { value: DUST_SPAN },
          uVelocity: { value: 0 },
          uCool: { value: COOL.clone() },
          uWarm: { value: WARM.clone() },
          uOpacity: { value: 0 },
        },
      }),
    [quality],
  );

  // 窓明かり。位置は経歴の並び順から決まるので毎回同じ配置になる
  const pools = useMemo(() => {
    const g = quadInstances(poolCount);
    const data = new Float32Array(poolCount * 4);
    const centers: THREE.Vector2[] = [];
    for (let i = 0; i < poolCount; i++) {
      const x = 15 + Math.sin(i * 2.1) * 9;
      const z = -i * POOL_GAP;
      data[i * 4] = x;
      data[i * 4 + 1] = z;
      data[i * 4 + 2] = Math.sin(i * 1.3) * 0.28;
      data[i * 4 + 3] = 15 + Math.sin(i * 0.7) * 4;
      centers.push(new THREE.Vector2(x, z));
    }
    g.setAttribute("aPool", new THREE.InstancedBufferAttribute(data, 4));
    const m = new THREE.ShaderMaterial({
      vertexShader: poolVertex,
      fragmentShader: poolFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: COOL.clone() },
        uOpacity: { value: 0 },
        uLaneScale: { value: 1 },
      },
    });
    return { geometry: g, material: m, centers };
  }, [poolCount]);

  const paws = useMemo(() => {
    const g = quadInstances(PAW_CAPACITY);
    const dataAttr = new THREE.InstancedBufferAttribute(pawTrail.data, 4);
    const metaAttr = new THREE.InstancedBufferAttribute(pawTrail.meta, 3);
    dataAttr.setUsage(THREE.DynamicDrawUsage);
    metaAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("aPaw", dataAttr);
    g.setAttribute("aMeta", metaAttr);
    const m = new THREE.ShaderMaterial({
      vertexShader: pawVertex,
      fragmentShader: pawFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: WARM.clone() },
        uOpacity: { value: 0 },
      },
    });
    return { geometry: g, material: m, dataAttr, metaAttr };
  }, []);

  const cats = useMemo(
    () =>
      CATS.map((cfg) => {
        const rig = new CatRig(cfg);
        const material = new THREE.ShaderMaterial({
          vertexShader: catVertex,
          fragmentShader: catFragment,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uBones: { value: rig.bones },
            uTime: { value: 0 },
            uPixelRatio: { value: 1 },
            uSize: { value: quality === "high" ? 3.0 : 3.7 },
            uStretch: { value: 0 },
            uCool: { value: COOL.clone() },
            uWarm: { value: WARM.clone() },
            uCoat: { value: cfg.coat.clone() },
            uWhite: { value: COAT.white.clone() },
            uLit: { value: 0 },
            uOpacity: { value: 0 },
          },
        });
        return { rig, material };
      }),
    [quality],
  );

  const time = useRef(0);
  const fade = useRef(0);
  const seeded = useRef(false);
  const prevCamZ = useRef(START_Z);
  const camSpeed = useRef(0);

  useEffect(() => {
    resetPawTrail();
    seeded.current = false;
    return () => {
      dust.dispose();
      for (const g of catGeos) g.dispose();
      dustMat.dispose();
      pools.geometry.dispose();
      pools.material.dispose();
      paws.geometry.dispose();
      paws.material.dispose();
      for (const c of cats) c.material.dispose();
    };
  }, [dust, catGeos, dustMat, pools, paws, cats]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05); // タブ復帰時の巨大なdeltaを吸収
    time.current += d;
    const t = time.current;
    const camZ = state.camera.position.z;
    const pr = state.gl.getPixelRatio();

    // カメラの前進速度。猫の先行距離と流し具合はこの外部の値から決める。
    // 初回フレームは delta が 0 になることがあるので必ず割る前に確かめる
    const raw = d > 1e-4 ? (prevCamZ.current - camZ) / d : 0;
    prevCamZ.current = camZ;
    camSpeed.current += (raw - camSpeed.current) * Math.min(1, d * 6);

    // 起動時にふわりと出す
    if (fade.current < 1) fade.current = Math.min(1, fade.current + d * 0.55);
    const op = fade.current;

    dustMat.uniforms.uTime.value = t;
    dustMat.uniforms.uCameraZ.value = camZ;
    dustMat.uniforms.uPixelRatio.value = pr;
    dustMat.uniforms.uOpacity.value = op;
    dustMat.uniforms.uVelocity.value +=
      (scrollState.velocity - dustMat.uniforms.uVelocity.value) * 0.08;

    pools.material.uniforms.uOpacity.value = op;

    // 縦長の画面ほど水平方向の視野が狭い。猫と明かりを中央へ寄せて画面内に留める
    const cam = state.camera as THREE.PerspectiveCamera;
    const laneScale = Math.min(1, Math.max(0.4, (cam.aspect ?? 1.6) / 1.6));
    pools.material.uniforms.uLaneScale.value = laneScale;

    for (const { rig, material } of cats) {
      rig.laneScale = laneScale;
      rig.update(d, camZ, camSpeed.current, t);

      // 窓明かりの中に入ると体が明るくなる
      let lit = 0;
      for (const c of pools.centers) {
        const dx = rig.bodyPos.x - c.x * laneScale;
        const dz = rig.bodyPos.z - c.y;
        lit = Math.max(lit, Math.exp(-(dx * dx + dz * dz) / 700));
      }

      const u = material.uniforms;
      u.uTime.value = t;
      u.uPixelRatio.value = pr;
      u.uLit.value += (lit - u.uLit.value) * 0.08;
      // 速く送られたときは光の筋に溶かす。歩容が破綻して見えるのを避ける
      const rush = Math.min(1, Math.max(0, (Math.abs(camSpeed.current) - 30) / 60));
      u.uStretch.value += (rush * 9 - u.uStretch.value) * 0.15;
      u.uOpacity.value = op * (1 - rush * 0.55);
    }

    if (!seeded.current) {
      // 開いた時点で既に歩いてきたように、少し前の足跡を置いておく
      for (const { rig } of cats) rig.seedTrail(t);
      seeded.current = true;
    }

    paws.material.uniforms.uTime.value = t;
    paws.material.uniforms.uOpacity.value = op;
    if (pawTrail.dirty) {
      paws.dataAttr.needsUpdate = true;
      paws.metaAttr.needsUpdate = true;
      pawTrail.dirty = false;
    }
  });

  return (
    <>
      <points geometry={dust} material={dustMat} frustumCulled={false} />
      <mesh geometry={pools.geometry} material={pools.material} frustumCulled={false} />
      <mesh geometry={paws.geometry} material={paws.material} frustumCulled={false} />
      {cats.map((c, i) => (
        <points key={i} geometry={catGeos[i]} material={c.material} frustumCulled={false} />
      ))}
    </>
  );
}
