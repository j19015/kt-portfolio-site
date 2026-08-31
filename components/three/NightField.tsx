"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CatRig, CAT_SIZE, STRIDE } from "./catRig";
import { emitPaw } from "./pawTrail";
import { buildTailGeometry, tailVertex, tailFragment } from "./tailSweep";
import { buildYarnGeometry, yarnVertex, yarnFragment } from "./yarnBall";
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
import { scrollState, sectionProgress } from "@/lib/scroll";

/** 窓明かりの間隔。旧実装の環の間隔をそのまま引き継いでいる */
export const POOL_GAP = 26;
/** カメラの開始位置 */
export const START_Z = 20;
/** カメラの高さ。猫の肩より少し上から見下ろす */
export const CAMERA_Y = CAT_SIZE * 1.28;

/** 猫が振り返る節目。ヒーローとフッターは除く */
const WATCH_SECTIONS = ["about", "career", "skills", "next", "works", "blog"];
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

/**
 * カメラの前方の余白に、姿の見えない猫が横切った跡を置く。
 *
 * 歩いている2匹の足跡は画面の右寄りにしか出ないため、左右が空いたままになる。
 * そこを埋めるが、ランダムな位置に1つずつ撒くと「点が散っている」だけで
 * 足跡に見えない。実際に歩いた跡に見せるため、
 * 4〜7歩ぶんを一列に、左右交互の振り幅を付けて並べる。
 */
function strewGhostTrail(
  camZ: number,
  laneScale: number,
  birth: number,
  rng: () => number,
) {
  // ほとんどを右側に置く。
  // セクションの暗幕は左が濃く右が薄い（左95% → 右45%）ので、
  // 左に置いた足跡は暗幕に沈んでほぼ見えない。
  // ごくまれに左へ出すのは、右だけに規則的に並ぶのを避けるため
  const side = rng() < 0.18 ? -1 : 1;
  // 歩いている猫（lane 12〜15）より外側の余白へ
  const lane = (side < 0 ? 40 + rng() * 14 : 27 + rng() * 22) * side * laneScale;
  // カメラの十分前方に置く。近すぎると唐突に湧いて見える
  const z0 = camZ - (150 + rng() * 130);
  // 進む向き。手前へ来るか奥へ行くかを半々で
  const dir = rng() < 0.5 ? 1 : -1;
  // 少し斜めに歩かせると、まっすぐ並ぶより自然に見える
  const drift = (rng() - 0.5) * 0.5;

  const steps = 4 + Math.floor(rng() * 4);
  const stride = STRIDE * (0.85 + rng() * 0.3);
  const size = 0.8 + rng() * 0.35;

  for (let i = 0; i < steps; i++) {
    const z = z0 + dir * i * stride;
    const x = lane + drift * i * stride;
    // 左右の足を交互に。歩幅の半分ずらすと歩いた列に見える
    const lr = i % 2 === 0 ? 1 : -1;
    const yaw = Math.atan2(drift, dir) + (rng() - 0.5) * 0.12;
    emitPaw(
      x + lr * CAT_SIZE * 0.16,
      z,
      yaw,
      // 1歩ずつ時間をずらす。まとめて現れず、歩いてきたように点いていく
      birth + i * 0.14,
      i % 2 === 0,
      lr,
      size,
    );
  }
}

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
  // 先頭の猫が追いかける毛糸玉
  const yarn = useMemo(() => {
    const geometry = buildYarnGeometry();
    const material = new THREE.ShaderMaterial({
      vertexShader: yarnVertex,
      fragmentShader: yarnFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector3(0, 0, 0) },
        uRadius: { value: CAT_SIZE * 0.17 },
        uSpin: { value: 0 },
        uPixelRatio: { value: 1 },
        // 猫（琥珀 #e79a58）と同系色だと、転がっているものが体の一部に見える。
        // 暖色の猫に対して毛糸玉は寒色にして、追う側と追われる側を分ける
        uColor: { value: new THREE.Color("#79cfd8") },
        uOpacity: { value: 0 },
      },
    });
    return { geometry, material };
  }, []);
  /** 毛糸玉の状態。猫との距離で弾んで逃げる */
  const yarnState = useRef({ z: 0, x: 0, spin: 0, hop: 0, ready: false });

  // 画面端をよぎる尻尾。姿は見せず、気配だけ
  const tail = useMemo(() => {
    const geometry = buildTailGeometry();
    const material = new THREE.ShaderMaterial({
      vertexShader: tailVertex,
      fragmentShader: tailFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 2 }, // 1 を超えていれば出ていない
        uSide: { value: 1 },
        uCameraZ: { value: 0 },
        uPixelRatio: { value: 1 },
        uLaneScale: { value: 1 },
        uColor: { value: new THREE.Color("#f2d6b4") },
        uOpacity: { value: 0 },
      },
    });
    return { geometry, material };
  }, []);
  /** 次に尻尾をよぎらせる時刻。ごく稀にしか出さない */
  const nextTailAt = useRef(0);

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
  /** 次に余白へ足跡を撒くカメラZ。進んだ距離で間隔を測る */
  const nextGhostZ = useRef<number | null>(null);
  /** セクション進捗の前回値。境目を跨いだ瞬間だけ拾うために持つ */
  const lastProg = useRef<Record<string, number>>({});
  /** 毛糸玉の前フレームZ。転がりの回転量を出すのに使う */
  const prevYarnZ = useRef(0);
  const prevCamZ = useRef(START_Z);
  const camSpeed = useRef(0);

  useEffect(() => {
    resetPawTrail();
    seeded.current = false;
    return () => {
      dust.dispose();
      for (const g of catGeos) g.dispose();
      tail.geometry.dispose();
      tail.material.dispose();
      yarn.geometry.dispose();
      yarn.material.dispose();
      dustMat.dispose();
      pools.geometry.dispose();
      pools.material.dispose();
      paws.geometry.dispose();
      paws.material.dispose();
      for (const c of cats) c.material.dispose();
    };
  }, [dust, catGeos, dustMat, pools, paws, cats, tail, yarn]);

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

      // 窓明かりの中にいるとき、たまに座って毛づくろいを始める。
      // 明かりの中は絵として見せ場なので、そこで足を止めると視線が留まる
      if (lit > 0.62 && rig.canPose() && Math.random() < d * 0.5) {
        rig.startPose("groom", 3.4 + Math.random() * 2.2);
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
      nextGhostZ.current = camZ - 260;
    }

    // セクションの見出しに差しかかったら、先頭の猫が一度振り返る。
    // 読み手が新しい節に入る瞬間に視線を上げさせる合図になる
    for (const id of WATCH_SECTIONS) {
      const prog = sectionProgress[id] ?? 0;
      const prev = lastProg.current[id] ?? 0;
      // 見出しが画面に入る瞬間（進捗が 0.28 を跨いだところ）だけ拾う
      if (prev < 0.28 && prog >= 0.28) {
        cats[0]?.rig.startPose("lookBack", 2.1 + Math.random() * 0.8);
      }
      lastProg.current[id] = prog;
    }

    // 進んだ距離で「たまに」を測る。時間で測るとスクロールを止めている間も
    // 湧いてしまい、止まっているのに足跡が増える不自然さが出る。
    // 前進しているときだけ、一定距離ごとに1列置く
    if (nextGhostZ.current !== null && camZ < nextGhostZ.current) {
      strewGhostTrail(camZ, laneScale, t, Math.random);
      // 次までの間隔は毎回ばらつかせる。等間隔だと規則性が見えてしまう
      nextGhostZ.current = camZ - (240 + Math.random() * 320);
    }

    // ---- 毛糸玉 ----
    // 先頭の猫の少し前を転がる。追いつかれると弾んで先へ逃げる
    {
      const lead = cats[0]?.rig;
      const y = yarnState.current;
      const yu = yarn.material.uniforms;
      if (lead) {
        const targetZ = lead.bodyPos.z - CAT_SIZE * 3.4;
        if (!y.ready) {
          y.z = targetZ;
          y.x = lead.bodyPos.x;
          y.ready = true;
        }
        // 猫が近づくほど強く逃げる。距離が詰まると弾む
        const gap = y.z - lead.bodyPos.z; // 負なら猫より前
        const chased = Math.max(0, 1 - Math.abs(gap) / (CAT_SIZE * 3.8));
        if (chased > 0.72 && y.hop <= 0) y.hop = 1;
        if (y.hop > 0) y.hop = Math.max(0, y.hop - d * 1.7);

        // 追従。逃げるぶんだけ余分に前へ出る
        const want = targetZ - chased * CAT_SIZE * 1.4;
        y.z += (want - y.z) * Math.min(1, d * 3.4);
        y.x += (lead.bodyPos.x + Math.sin(t * 0.7) * CAT_SIZE * 0.5 - y.x) * Math.min(1, d * 2.2);
        // 転がりは進んだ距離から。空回りしないよう半径で割る
        y.spin += (prevYarnZ.current - y.z) / (CAT_SIZE * 0.17);
        prevYarnZ.current = y.z;

        // 弾みは山型で戻る
        const bounce = Math.sin(y.hop * Math.PI) * CAT_SIZE * 0.34;
        (yu.uCenter.value as THREE.Vector3).set(y.x, CAT_SIZE * 0.17 + bounce, y.z);
        yu.uSpin.value = y.spin;
      }
      yu.uTime.value = t;
      yu.uPixelRatio.value = pr;
      yu.uOpacity.value = op * 0.85;
    }

    // ---- 画面端をよぎる尻尾 ----
    const tu = tail.material.uniforms;
    tu.uTime.value = t;
    tu.uCameraZ.value = camZ;
    tu.uPixelRatio.value = pr;
    tu.uLaneScale.value = laneScale;
    tu.uOpacity.value = op;
    if (nextTailAt.current === 0) {
      // 開いた直後に出ると仕掛けが読まれる。最初は間を置く
      nextTailAt.current = t + 26 + Math.random() * 30;
    } else if (tu.uProgress.value <= 1) {
      // 横切っている最中。5.5秒かけてゆっくり通る
      tu.uProgress.value += d / 5.5;
      if (tu.uProgress.value > 1) nextTailAt.current = t + 48 + Math.random() * 70;
    } else if (t >= nextTailAt.current) {
      tu.uProgress.value = 0;
      tu.uSide.value = Math.random() < 0.5 ? -1 : 1;
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
      <points geometry={tail.geometry} material={tail.material} frustumCulled={false} />
      <points geometry={yarn.geometry} material={yarn.material} frustumCulled={false} />
      {cats.map((c, i) => (
        <points key={i} geometry={catGeos[i]} material={c.material} frustumCulled={false} />
      ))}
    </>
  );
}
