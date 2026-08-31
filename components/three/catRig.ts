import * as THREE from "three";
import { emitPaw } from "./pawTrail";

/**
 * 猫の骨格と歩容。
 *
 * 顔を描かない代わりに「歩き方」で猫だと分からせる方針なので、
 * 脚は見た目の辻褄合わせではなく実際の歩容から解いている。
 *
 * - 4本脚の接地順は側対歩（lateral sequence walk）: 左後 → 左前 → 右後 → 右前
 * - 接地率(duty factor)は 0.78。猫は常に3本以上を地に着けている
 * - 接地中の足は**ワールド座標に固定**する。体の速度がどう変わっても足が滑らない
 *
 * 寸法はすべて肩の高さを 1 とした比率（bu = body unit）で書き、
 * 最後に CAT_SIZE 倍してワールドへ移す。
 */

/** 肩の高さ。猫のすべての寸法はこれに比例する */
export const CAT_SIZE = 8.0;

/** 1歩容周期で進む距離。実際の猫は肩高の 1.4〜1.8 倍 */
export const STRIDE = CAT_SIZE * 0.95;

/** 接地率。1周期のうち足が地に着いている割合 */
const DUTY = 0.78;

/** 胴の中心の高さ（bu） */
const BODY_Y = 0.75;

/** ボーン番号。頂点シェーダーが uBones[] を引くための添字 */
export const BONE = {
  TORSO: 0,
  HEAD: 1,
  /** 前左・前右・後左・後右 */
  LEG: [2, 3, 4, 5],
  TAIL: [6, 7, 8, 9, 10],
} as const;

export const BONE_COUNT = 11;

/** 脚の定義。fore = 前脚 / side = +1 が右 */
export type LegSpec = {
  fore: boolean;
  side: 1 | -1;
  /** 肩・股関節の位置（胴ローカル, bu） */
  hip: [number, number, number];
  /** 足の基準位置。胴の中心からの水平オフセット（bu） */
  foot: [number, number];
  /** 歩容の位相オフセット */
  phase: number;
};

/** 左後 → 左前 → 右後 → 右前 の順に 0.25 ずつずらす */
export const LEGS: LegSpec[] = [
  { fore: true, side: -1, hip: [-0.155, -0.12, -0.42], foot: [-0.10, -0.44], phase: 0.25 },
  { fore: true, side: 1, hip: [0.155, -0.12, -0.42], foot: [0.10, -0.44], phase: 0.75 },
  { fore: false, side: -1, hip: [-0.17, -0.10, 0.50], foot: [-0.115, 0.52], phase: 0.0 },
  { fore: false, side: 1, hip: [0.17, -0.10, 0.50], foot: [0.115, 0.52], phase: 0.5 },
];

/** 尻尾の分割。根元から先端へ向かって短くなる（bu） */
export const TAIL_SEGMENTS = [0.26, 0.24, 0.22, 0.19, 0.16];

const frac = (v: number) => v - Math.floor(v);
const smooth = (t: number) => t * t * (3 - 2 * t);

export type CatConfig = {
  /** 基準の横位置 */
  lane: number;
  /** カメラの何ユニット先を歩くか */
  lead: number;
  /** 蛇行の位相。2匹が同じ軌跡を描かないようにずらす */
  weave: number;
  /** 体格の微差 */
  scale: number;
  /** 尻尾を立てるか。立てるとシルエットが猫だと分かりやすい */
  tailUp: boolean;
  /** 歩容の初期位相 */
  gait: number;
};

type LegState = {
  /** 接地点（ワールド） */
  plant: THREE.Vector3;
  /** 離地した位置 */
  lift: THREE.Vector3;
  /** 次に着く位置 */
  target: THREE.Vector3;
  swinging: boolean;
};

/** 歩く軌跡。z を与えると横位置を返す。ゆっくり蛇行させて機械的な直進を避ける */
function laneX(z: number, cfg: CatConfig, laneScale: number): number {
  return (
    cfg.lane * laneScale +
    Math.sin(z * 0.017 + cfg.weave) * 2.6 +
    Math.sin(z * 0.041 + cfg.weave * 1.7) * 1.1
  );
}

/** laneX の z 微分。進行方向（ヨー角）を出すのに使う */
function laneSlope(z: number, cfg: CatConfig): number {
  return (
    Math.cos(z * 0.017 + cfg.weave) * 2.6 * 0.017 +
    Math.cos(z * 0.041 + cfg.weave * 1.7) * 1.1 * 0.041
  );
}

export class CatRig {
  readonly bones: THREE.Matrix4[] = Array.from(
    { length: BONE_COUNT },
    () => new THREE.Matrix4(),
  );

  /** 胴の中心（ワールド）。光の当たり具合の判定に外から読む */
  readonly bodyPos = new THREE.Vector3();

  /** いまの歩行速度（ユニット/秒）。速すぎるときの見せ方を変えるのに使う */
  speed = 0;

  /**
   * 横位置の倍率。縦長の画面ほど水平方向の視野が狭くなるので、
   * これを掛けて猫を画面内へ寄せる。1 = 横長のデスクトップ想定
   */
  laneScale = 1;

  private readonly cfg: CatConfig;
  private readonly size: number;
  private readonly stride: number;
  private phase: number;
  private z = 0;
  private readonly legs: LegState[];
  private headBob = 0;
  private ready = false;

  // 毎フレーム new しないための作業用
  private readonly q = new THREE.Quaternion();
  private readonly headQ = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly scaleV = new THREE.Vector3();
  private readonly back = new THREE.Vector3();
  private readonly hip = new THREE.Vector3();
  private readonly head = new THREE.Vector3();
  private readonly foot = new THREE.Vector3();
  private readonly tailA = new THREE.Vector3();
  private readonly tailB = new THREE.Vector3();
  private readonly diff = new THREE.Vector3();
  private readonly axX = new THREE.Vector3();
  private readonly axY = new THREE.Vector3();
  private readonly axZ = new THREE.Vector3();

  constructor(cfg: CatConfig) {
    this.cfg = cfg;
    this.size = CAT_SIZE * cfg.scale;
    this.stride = STRIDE * cfg.scale;
    this.phase = cfg.gait;
    this.legs = LEGS.map(() => ({
      plant: new THREE.Vector3(),
      lift: new THREE.Vector3(),
      target: new THREE.Vector3(),
      swinging: false,
    }));
  }

  /**
   * @param cameraSpeed カメラの前進速度。**猫自身の速度を使ってはいけない**。
   *   先行距離を自分の速度から決めると「速い→前へ出る→速度が変わる」の
   *   自己フィードバックで位置が発振し、猫が滲んで見える
   */
  update(dt: number, cameraZ: number, cameraSpeed: number, time: number) {
    const cfg = this.cfg;

    // 先行距離はスクロールが速いほど伸びる。勢いよく送ると猫が先へ駆けていく
    const lead = cfg.lead + Math.min(16, Math.max(0, cameraSpeed * 0.35));
    const nextZ = cameraZ - lead;

    if (!this.ready) {
      this.z = nextZ;
      this.poseBody(time);
      for (const [i, spec] of LEGS.entries()) {
        this.nominalFoot(spec, this.legs[i].plant);
        this.legs[i].target.copy(this.legs[i].plant);
        this.legs[i].lift.copy(this.legs[i].plant);
      }
      this.ready = true;
    }

    const moved = this.z - nextZ; // 前進が正
    this.z = nextZ;
    const rawSpeed = dt > 1e-4 ? moved / dt : 0;
    this.speed += (rawSpeed - this.speed) * Math.min(1, dt * 12);

    // 歩容は「進んだ距離」で回す。時間で回すと速度が変わったとき足が滑る
    this.phase += moved / this.stride;

    // ほぼ止まっているときは、踏み出し中の脚だけ着地させてから凍らせる。
    // 途中で固まると片脚を上げたまま静止してしまう
    if (Math.abs(rawSpeed) < this.size * 0.08 && this.legs.some((l) => l.swinging)) {
      this.phase += dt * 0.5;
    }

    const yaw = this.poseBody(time);
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    this.back.set(sin, 0, cos); // 体のローカル +Z をワールドへ

    this.bones[BONE.TORSO].compose(this.bodyPos, this.q, this.scaleV.setScalar(this.size));

    // ---- 脚 ----
    const swingSpan = 1 - DUTY;
    const reach = this.stride * (1 - 0.5 * DUTY);
    const liftH = this.size * 0.15;
    const pawY = this.size * 0.035;

    for (const [i, spec] of LEGS.entries()) {
      const leg = this.legs[i];
      const p = frac(this.phase + spec.phase);
      const swinging = p >= DUTY;

      if (swinging !== leg.swinging) {
        if (swinging) {
          // 離地。着地予定点は基準位置より半歩ぶん前
          leg.lift.copy(leg.plant);
          this.nominalFoot(spec, leg.target);
          leg.target.x -= sin * reach;
          leg.target.z -= cos * reach;
        } else {
          // 着地。ここで足跡がひとつ増える
          leg.plant.copy(leg.target);
          if (moved > 0) {
            emitPaw(leg.plant.x, leg.plant.z, yaw, time, spec.fore, spec.side, this.size);
          }
        }
        leg.swinging = swinging;
      }

      this.hip
        .set(spec.hip[0], spec.hip[1], spec.hip[2])
        .multiplyScalar(this.size)
        .applyQuaternion(this.q)
        .add(this.bodyPos);

      if (swinging) {
        const s = Math.min(1, Math.max(0, (p - DUTY) / swingSpan));
        this.foot.lerpVectors(leg.lift, leg.target, smooth(s));
        this.foot.y = pawY + liftH * Math.pow(Math.sin(Math.PI * s), 0.85);
      } else {
        this.foot.copy(leg.plant);
      }

      this.setLegBone(BONE.LEG[i], this.hip, this.foot, this.back);
    }

    // ---- 頭 ----
    this.head
      .set(0, 0.28 + this.headBob, -0.88)
      .multiplyScalar(this.size)
      .applyQuaternion(this.q)
      .add(this.bodyPos);
    // ゆっくり左右を見る。周期の違う2つの sin を足して規則性を消す
    const look = Math.sin(time * 0.23 + cfg.weave) * 0.16 + Math.sin(time * 0.41 + 2.1) * 0.07;
    this.euler.set(Math.sin(time * 0.31) * 0.05, yaw + look, 0);
    this.headQ.setFromEuler(this.euler);
    this.bones[BONE.HEAD].compose(this.head, this.headQ, this.scaleV.setScalar(this.size));

    // ---- 尻尾 ----
    this.poseTail(yaw, time);
  }

  /**
   * ページを開いた時点で「もう歩いてきた」ように見せるため、
   * 過去の周期ぶんの足跡をさかのぼって置く。
   * これが無いと、スクロールするまで床に何も無い状態から始まってしまう
   */
  seedTrail(time: number) {
    for (let k = 1; k <= 6; k++) {
      for (const spec of LEGS) {
        const z = this.z + (k - spec.phase) * this.stride;
        const yaw = Math.atan(laneSlope(z, this.cfg));
        const cos = Math.cos(yaw);
        const sin = Math.sin(yaw);
        const fx = spec.foot[0] * this.size;
        const fz = spec.foot[1] * this.size;
        emitPaw(
          laneX(z, this.cfg, this.laneScale) + fx * cos + fz * sin,
          z - fx * sin + fz * cos,
          yaw,
          time - k * 0.7,
          spec.fore,
          spec.side,
          this.size,
        );
      }
    }
  }

  /** 胴の姿勢（位置・ヨー角）を z から決める */
  private poseBody(time: number) {
    const cfg = this.cfg;
    const x = laneX(this.z, cfg, this.laneScale);
    const yaw = Math.atan(laneSlope(this.z, cfg));

    const bob = Math.sin(this.phase * Math.PI * 4 + 0.4) * 0.012;
    const breath = Math.sin(time * 1.05 + cfg.weave) * 0.006;
    const roll = Math.sin(this.phase * Math.PI * 2) * 0.045;
    const sway = Math.sin(this.phase * Math.PI * 2 + 0.6) * 0.02;

    this.bodyPos.set(x + sway * this.size, (BODY_Y + bob + breath) * this.size, this.z);
    this.euler.set(0, yaw, roll);
    this.q.setFromEuler(this.euler);

    // 猫は歩いても頭の高さがほとんど変わらない。胴の上下動を打ち消しておく
    this.headBob = -(bob + breath) * 0.75;
    return yaw;
  }

  /** 足の基準位置（接地面）をワールドで求める */
  private nominalFoot(spec: LegSpec, out: THREE.Vector3) {
    out.set(spec.foot[0], 0, spec.foot[1]).multiplyScalar(this.size).applyQuaternion(this.q);
    out.x += this.bodyPos.x;
    out.z += this.bodyPos.z;
    out.y = this.size * 0.035;
    return out;
  }

  /** 脚のボーン行列。局所 (0,0,0)→股関節 / (0,-1,0)→足先 に写す */
  private setLegBone(
    index: number,
    hip: THREE.Vector3,
    foot: THREE.Vector3,
    back: THREE.Vector3,
  ) {
    const len = this.diff.subVectors(foot, hip).length();
    if (len < 1e-4) return;

    this.axY.subVectors(hip, foot).divideScalar(len); // 局所 +Y = 上（付け根方向）
    this.axZ.copy(back).addScaledVector(this.axY, -back.dot(this.axY));
    if (this.axZ.lengthSq() < 1e-6) this.axZ.set(0, 0, 1);
    this.axZ.normalize();
    this.axX.crossVectors(this.axY, this.axZ).normalize();

    const w = this.size;
    this.bones[index].set(
      this.axX.x * w, this.axY.x * len, this.axZ.x * w, hip.x,
      this.axX.y * w, this.axY.y * len, this.axZ.y * w, hip.y,
      this.axX.z * w, this.axY.z * len, this.axZ.z * w, hip.z,
      0, 0, 0, 1,
    );
  }

  /** 尻尾の一節。局所 (0,0,0)→始点 / (0,0,-1)→終点 に写す */
  private setTailBone(index: number, a: THREE.Vector3, b: THREE.Vector3) {
    const len = this.diff.subVectors(a, b).length();
    if (len < 1e-4) return;

    this.axZ.copy(this.diff).divideScalar(len);
    this.axY.set(0, 1, 0).addScaledVector(this.axZ, -this.axZ.y);
    if (this.axY.lengthSq() < 1e-6) this.axY.set(1, 0, 0);
    this.axY.normalize();
    this.axX.crossVectors(this.axY, this.axZ).normalize();

    const w = this.size;
    this.bones[index].set(
      this.axX.x * w, this.axY.x * w, this.axZ.x * len, a.x,
      this.axX.y * w, this.axY.y * w, this.axZ.y * len, a.y,
      this.axX.z * w, this.axY.z * w, this.axZ.z * len, a.z,
      0, 0, 0, 1,
    );
  }

  /** 尻尾を根元から順に伸ばす。揺れの位相を1節ずつ遅らせると鞭のようにしなる */
  private poseTail(yaw: number, time: number) {
    const cfg = this.cfg;
    // 節ごとの仰角（度）。正で上、負で下を向く。
    // 立て尾は根元を起こして先へ行くほど寝かせ、先端が頭と同じ高さに来るあたりで止める。
    // 真上に伸ばすと旗竿に、高く弧を描かせると首のように見えるので、必ず先端を落とす
    const pitchDeg = cfg.tailUp ? [34, 30, 14, -10, -34] : [10, -10, -30, -34, -10];

    this.tailA
      .set(0, 0.18, 0.66)
      .multiplyScalar(this.size)
      .applyQuaternion(this.q)
      .add(this.bodyPos);

    for (const [i, seg] of TAIL_SEGMENTS.entries()) {
      const amp = (0.05 + i * 0.035) * (cfg.tailUp ? 1 : 0.7);
      const sway = Math.sin(time * 0.62 + cfg.weave * 2 - i * 0.55) * amp;
      const drift = Math.sin(this.phase * Math.PI * 2 - i * 0.4) * 0.03;

      const pitch = THREE.MathUtils.degToRad(pitchDeg[i]);
      const dir = yaw + sway + drift;
      const len = seg * this.size;
      const horiz = Math.cos(pitch) * len;

      this.tailB.set(
        this.tailA.x + Math.sin(dir) * horiz,
        this.tailA.y + Math.sin(pitch) * len,
        this.tailA.z + Math.cos(dir) * horiz,
      );
      this.setTailBone(BONE.TAIL[i], this.tailA, this.tailB);
      this.tailA.copy(this.tailB);
    }
  }
}
