import * as THREE from "three";
import { BONE, LEGS, TAIL_SEGMENTS } from "./catRig";

/**
 * 猫の体を粒子で作る。
 *
 * 顔のパーツは一切置かない。目や鼻を描いた瞬間にキャラクターになってしまうので、
 * 情報は輪郭だけに絞る。耳の三角と背中から尻尾へのラインがあれば猫だと分かる。
 *
 * 各点は「どのボーンに属するか」と「ボーン内での位置・法線」だけを持ち、
 * 実際の変形は頂点シェーダーで uBones[] を掛けて行う（catShader.ts）。
 * 骨は11本しかないので、毎フレームCPUで座標を書き換えるより桁違いに軽い。
 */

type Sink = {
  bone: number[];
  local: number[];
  normal: number[];
  seed: number[];
  scale: number[];
};

const rnd = () => Math.random();

/** ガウス分布に近い乱数。粒子を表面付近に寄せる */
function gauss() {
  return (rnd() + rnd() + rnd()) / 1.5 - 1;
}

function push(
  s: Sink,
  bone: number,
  p: [number, number, number],
  n: [number, number, number],
  scale: number,
) {
  s.bone.push(bone);
  s.local.push(p[0], p[1], p[2]);
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  s.normal.push(n[0] / l, n[1] / l, n[2] / l);
  s.seed.push(rnd());
  s.scale.push(scale);
}

/** 単位球面上の一様な方向 */
function dir(): [number, number, number] {
  const z = rnd() * 2 - 1;
  const a = rnd() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return [Math.cos(a) * r, Math.sin(a) * r, z];
}

/** 楕円体の表面。厚みを少し持たせて塗りつぶし感を出す */
function ellipsoid(
  s: Sink,
  bone: number,
  center: [number, number, number],
  radii: [number, number, number],
  count: number,
  scale = 1,
) {
  for (let i = 0; i < count; i++) {
    const d = dir();
    // 表面に集めつつ内側にもわずかに散らす
    const shell = 1 - Math.abs(gauss()) * 0.16;
    const p: [number, number, number] = [
      center[0] + d[0] * radii[0] * shell,
      center[1] + d[1] * radii[1] * shell,
      center[2] + d[2] * radii[2] * shell,
    ];
    push(s, bone, p, [d[0] / radii[0], d[1] / radii[1], d[2] / radii[2]], scale);
  }
}

/** 先細りの筒。首・脚・尻尾に使う */
function tube(
  s: Sink,
  bone: number,
  count: number,
  /** t=0..1 に対する中心線の座標 */
  axis: (t: number) => [number, number, number],
  /** t=0..1 に対する半径 */
  radius: (t: number) => number,
  /** 断面の平面を張る2軸 */
  basis: [[number, number, number], [number, number, number]],
  scale = 1,
) {
  const [u, v] = basis;
  for (let i = 0; i < count; i++) {
    const t = rnd();
    const a = rnd() * Math.PI * 2;
    const r = radius(t) * (1 - Math.abs(gauss()) * 0.12);
    const c = axis(t);
    const cs = Math.cos(a);
    const sn = Math.sin(a);
    push(
      s,
      bone,
      [c[0] + (u[0] * cs + v[0] * sn) * r, c[1] + (u[1] * cs + v[1] * sn) * r, c[2] + (u[2] * cs + v[2] * sn) * r],
      [u[0] * cs + v[0] * sn, u[1] * cs + v[1] * sn, u[2] * cs + v[2] * sn],
      scale,
    );
  }
}

/** テーブルを線形補間して半径プロファイルを作る */
function profile(table: [number, number][]) {
  return (t: number) => {
    for (let i = 1; i < table.length; i++) {
      if (t <= table[i][0]) {
        const [t0, r0] = table[i - 1];
        const [t1, r1] = table[i];
        const k = (t - t0) / (t1 - t0 || 1);
        return r0 + (r1 - r0) * k;
      }
    }
    return table[table.length - 1][1];
  };
}

const FORE_PROFILE = profile([
  [0, 0.075],
  [0.3, 0.052],
  [0.62, 0.036],
  [0.88, 0.03],
  [1, 0.043],
]);

const HIND_PROFILE = profile([
  [0, 0.105],
  [0.28, 0.072],
  [0.55, 0.045],
  [0.85, 0.031],
  [1, 0.043],
]);

/** 尻尾は根元から先へ細くなる。節ごとの端の半径 */
const TAIL_RADII = [0.05, 0.043, 0.036, 0.03, 0.024, 0.016];

/** 耳。三角の板。猫だと分かる最小限の手がかりなのでここだけは形を作り込む */
function ear(s: Sink, side: 1 | -1, count: number) {
  const base: [number, number, number] = [side * 0.105, 0.115, -0.05];
  // 外へ22度・後ろへ8度倒す
  const ax: [number, number, number] = [side * 0.372, 0.921, 0.122];
  // 板の薄い向きは前後。耳が正面を向く
  const dz = ax[2];
  const thin: [number, number, number] = [-ax[0] * dz, -ax[1] * dz, 1 - dz * dz];
  const tl = Math.hypot(...thin);
  const th: [number, number, number] = [thin[0] / tl, thin[1] / tl, thin[2] / tl];
  const wide: [number, number, number] = [
    th[1] * ax[2] - th[2] * ax[1],
    th[2] * ax[0] - th[0] * ax[2],
    th[0] * ax[1] - th[1] * ax[0],
  ];

  const H = 0.21;
  const R = 0.085;
  for (let i = 0; i < count; i++) {
    const t = Math.pow(rnd(), 0.75);
    const a = rnd() * Math.PI * 2;
    const w = Math.pow(1 - t, 0.8);
    const cs = Math.cos(a) * R * w;
    const sn = Math.sin(a) * R * 0.32 * w;
    push(
      s,
      BONE.HEAD,
      [
        base[0] + ax[0] * H * t + wide[0] * cs + th[0] * sn,
        base[1] + ax[1] * H * t + wide[1] * cs + th[1] * sn,
        base[2] + ax[2] * H * t + wide[2] * cs + th[2] * sn,
      ],
      [wide[0] * cs + th[0] * sn * 3, wide[1] * cs + th[1] * sn * 3, wide[2] * cs + th[2] * sn * 3],
      1,
    );
  }
}

export function buildCatGeometry(quality: "low" | "high") {
  const k = quality === "high" ? 1 : 0.58;
  const s: Sink = { bone: [], local: [], normal: [], seed: [], scale: [] };

  // ---- 胴 ----
  const torsoCount = Math.round(880 * k);
  for (let i = 0; i < torsoCount; i++) {
    const d = dir();
    const shell = 1 - Math.abs(gauss()) * 0.15;
    const p: [number, number, number] = [
      d[0] * 0.205 * shell,
      d[1] * 0.245 * shell,
      0.03 + d[2] * 0.68 * shell,
    ];
    // 胸を絞り、腹の中ほどを少し膨らませ、尻をわずかに上げる
    const t = (p[2] + 0.65) / 1.3;
    const w = 0.9 + 0.16 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
    p[0] *= w;
    p[1] *= w;
    p[1] += 0.025 * (t - 0.5);
    push(s, BONE.TORSO, p, [d[0] / 0.205, d[1] / 0.245, d[2] / 0.68], 1);
  }

  // 首。胸の前から頭の付け根へ
  tube(
    s,
    BONE.TORSO,
    Math.round(150 * k),
    (t) => [0, 0.09 + t * 0.18, -0.6 - t * 0.28],
    (t) => 0.145 - t * 0.03,
    [
      [1, 0, 0],
      [0, 0.85, 0.53],
    ],
  );

  // ---- 頭 ----
  ellipsoid(s, BONE.HEAD, [0, 0, -0.09], [0.17, 0.155, 0.185], Math.round(200 * k));
  ellipsoid(s, BONE.HEAD, [0, -0.075, -0.245], [0.095, 0.075, 0.085], Math.round(70 * k), 0.85);
  ear(s, -1, Math.round(65 * k));
  ear(s, 1, Math.round(65 * k));

  // ---- 脚 ----
  for (const [i, spec] of LEGS.entries()) {
    const prof = spec.fore ? FORE_PROFILE : HIND_PROFILE;
    // 前脚は肘が後ろへ、後脚は膝が前・飛節が後ろのZ字を描く。
    // 局所 +Z は体の後ろ向き
    const bow = spec.fore
      ? (t: number) => 0.045 * Math.sin(Math.PI * t)
      : (t: number) => -0.075 * Math.sin(2 * Math.PI * t);
    tube(
      s,
      BONE.LEG[i],
      Math.round(150 * k),
      (t) => [0, -t, bow(t)],
      prof,
      [
        [1, 0, 0],
        [0, 0, 1],
      ],
      0.9,
    );
  }

  // ---- 尻尾 ----
  for (let i = 0; i < TAIL_SEGMENTS.length; i++) {
    tube(
      s,
      BONE.TAIL[i],
      Math.round(66 * k),
      (t) => [0, 0, -t],
      (t) => TAIL_RADII[i] + (TAIL_RADII[i + 1] - TAIL_RADII[i]) * t,
      [
        [1, 0, 0],
        [0, 1, 0],
      ],
      0.7,
    );
  }

  const g = new THREE.BufferGeometry();
  const total = s.bone.length;
  // position は使わないが three が要求するので用意する
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  g.setAttribute("aBone", new THREE.BufferAttribute(new Float32Array(s.bone), 1));
  g.setAttribute("aLocal", new THREE.BufferAttribute(new Float32Array(s.local), 3));
  g.setAttribute("aNormal", new THREE.BufferAttribute(new Float32Array(s.normal), 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(s.seed), 1));
  g.setAttribute("aScale", new THREE.BufferAttribute(new Float32Array(s.scale), 1));
  // 頂点シェーダーで位置を作るのでカリングは無効化する
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}
