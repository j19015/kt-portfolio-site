import * as THREE from "three";

/**
 * 猫が追いかける毛糸玉。
 *
 * 猫の少し前を転がっていく。猫が追いつきそうになると弾んで先へ逃げる。
 * 猫だけが歩いていると「なぜ歩いているのか」が絵から読み取れないので、
 * 追う対象を置いて動機を与える。
 *
 * 球の表面に糸を巻いた形を線で描く。玉の内側が透けて見えるよう、
 * 面ではなく糸そのものを点で表す。
 */

const WINDS = 26;
const PER_WIND = 46;

export const yarnVertex = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform float uSpin;      // 転がりの回転角
  uniform float uPixelRatio;

  attribute vec3 aDir;      // 球面上の向き
  attribute float aSeed;

  varying float vFade;
  varying float vSeed;

  void main() {
    // 転がる方向（進行方向 -Z）に対して X 軸まわりに回す
    float c = cos(uSpin);
    float s = sin(uSpin);
    vec3 d = vec3(aDir.x, aDir.y * c - aDir.z * s, aDir.y * s + aDir.z * c);

    // 糸が少しほつれて毛羽立つ
    float fuzz = 1.0 + sin(uTime * 2.1 + aSeed * 8.0) * 0.035;
    vec3 pos = uCenter + d * uRadius * fuzz;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = -mv.z;
    vFade = smoothstep(4.0, 22.0, dist) * (1.0 - smoothstep(150.0, 250.0, dist));
    vSeed = aSeed;

    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPixelRatio * (26.0 / max(dist, 0.001)) * 2.2;
  }
`;

export const yarnFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = dot(uv, uv);
    if (d > 0.25) discard;
    float a = pow(1.0 - d * 4.0, 2.1);
    // 糸ごとに明るさを散らして、巻きの重なりを出す
    vec3 col = uColor * (0.72 + vSeed * 0.5);
    gl_FragColor = vec4(col, a * vFade * uOpacity);
    #include <colorspace_fragment>
  }
`;

export function buildYarnGeometry() {
  const count = WINDS * PER_WIND;
  const aDir = new Float32Array(count * 3);
  const aSeed = new Float32Array(count);

  let i = 0;
  for (let w = 0; w < WINDS; w++) {
    // 巻くたびに軸を少しずつ倒す。大円がずれて重なり、毛糸玉に見える
    const tilt = (w / WINDS) * Math.PI * 1.618;
    const yaw = w * 2.399; // 黄金角。巻きが均等に散る
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    for (let k = 0; k < PER_WIND; k++, i++) {
      const a = (k / PER_WIND) * Math.PI * 2;
      // 大円上の点
      const x = Math.cos(a);
      const y = Math.sin(a) * ct;
      const z = Math.sin(a) * st;
      // 軸まわりに回して巻きをずらす
      aDir[i * 3] = x * cy - z * sy;
      aDir[i * 3 + 1] = y;
      aDir[i * 3 + 2] = x * sy + z * cy;
      aSeed[i] = Math.random();
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute("aDir", new THREE.BufferAttribute(aDir, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}
