/**
 * 足跡の共有バッファ。
 *
 * 猫が着地するたびに1件書き込み、描画側は同じ Float32Array を
 * InstancedBufferAttribute としてそのまま参照する。
 * スクロール量と同じ理由で React の state には載せない
 * （着地は毎秒数回起きるので、そのたび再レンダリングしたくない）。
 *
 * 容量を超えたら古いものから上書きする輪バッファ。カメラは常に前を向いていて
 * 通り過ぎた足跡は画面に入らないので、消えても気づかれない。
 */

/** 同時に保持できる足跡の数。2匹ぶんを共有する */
export const PAW_CAPACITY = 384;

export const pawTrail = {
  /** x, z, ヨー角, 生まれた時刻 */
  data: new Float32Array(PAW_CAPACITY * 4),
  /** 大きさ, 前脚なら1, 左右(-1/+1) */
  meta: new Float32Array(PAW_CAPACITY * 3),
  /** 書き込み位置 */
  head: 0,
  /** GPUへ送り直す必要があるか */
  dirty: true,
};

// 未使用のスロットは「生まれた時刻 = 十分昔」にしておき、シェーダー側で捨てる
pawTrail.data.fill(0);
for (let i = 0; i < PAW_CAPACITY; i++) pawTrail.data[i * 4 + 3] = -1e6;

export function emitPaw(
  x: number,
  z: number,
  yaw: number,
  birth: number,
  fore: boolean,
  side: number,
  size: number,
) {
  const i = pawTrail.head;
  pawTrail.data[i * 4] = x;
  pawTrail.data[i * 4 + 1] = z;
  pawTrail.data[i * 4 + 2] = yaw;
  pawTrail.data[i * 4 + 3] = birth;
  pawTrail.meta[i * 3] = size;
  pawTrail.meta[i * 3 + 1] = fore ? 1 : 0;
  pawTrail.meta[i * 3 + 2] = side;
  pawTrail.head = (i + 1) % PAW_CAPACITY;
  pawTrail.dirty = true;
}

/** ページを開き直したときに前回の足跡が残らないようにする */
export function resetPawTrail() {
  for (let i = 0; i < PAW_CAPACITY; i++) pawTrail.data[i * 4 + 3] = -1e6;
  pawTrail.head = 0;
  pawTrail.dirty = true;
}
