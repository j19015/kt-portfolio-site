import * as THREE from "three";

/**
 * 画面の端を、尻尾だけがゆっくり横切っていく。
 *
 * 姿は見せない。画面外に猫がいて、その尻尾の先だけが視界をかすめる、
 * という見せ方にする。全身を出すと「もう一匹いる」という説明になってしまうが、
 * 尻尾だけなら気配で終わる。
 *
 * 出現はごく稀。頻繁に出ると仕掛けが読めて、驚きが消える。
 */

const SEGMENTS = 26;

export const tailVertex = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;   // 0..1 で画面を横切る
  uniform float uSide;       // -1 = 左端 / +1 = 右端
  uniform float uCameraZ;
  uniform float uPixelRatio;
  uniform float uLaneScale;

  attribute float aT;        // 0 = 根本 / 1 = 先端
  attribute float aSeed;

  varying float vFade;
  varying float vT;

  void main() {
    // 根本は画面外。先端だけが入ってくる
    float sweep = uProgress * 1.35 - 0.2;
    // 尻尾は根本から先へ向かって遅れて動く。むちのようにしなる
    float lag = aT * 0.22;
    float s = clamp(sweep - lag, 0.0, 1.0);

    // 横方向。画面端から中へ入り、また戻る
    float inward = sin(s * 3.14159) * (42.0 + aT * 26.0);
    float x = uSide * (78.0 - inward) * uLaneScale;

    // 奥行き。カメラの前方をゆっくり通る
    float z = uCameraZ - 120.0 + aT * 8.0 - s * 30.0;

    // 高さ。尻尾は持ち上がって先が垂れる
    float y = 9.0 + sin(aT * 2.4) * 7.0 - aT * aT * 4.0;
    // 全体をたゆませる
    y += sin(uTime * 1.7 + aT * 3.1 + aSeed) * (1.2 + aT * 2.2);

    vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
    float dist = -mv.z;

    // 出入りでフェード。端で唐突に消えないように
    float edge = smoothstep(0.0, 0.12, uProgress) * (1.0 - smoothstep(0.86, 1.0, uProgress));
    vFade = edge * smoothstep(6.0, 40.0, dist) * (1.0 - smoothstep(150.0, 240.0, dist));
    vT = aT;

    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPixelRatio * (30.0 / max(dist, 0.001)) * (2.4 - aT * 0.9);
  }
`;

export const tailFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  varying float vT;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = dot(uv, uv);
    if (d > 0.25) discard;
    float a = pow(1.0 - d * 4.0, 2.0);
    // 先端ほど薄い。輪郭が溶けて気配だけが残る
    gl_FragColor = vec4(uColor, a * vFade * uOpacity * (0.85 - vT * 0.35));
    #include <colorspace_fragment>
  }
`;

export function buildTailGeometry() {
  const count = SEGMENTS * 7;
  const aT = new Float32Array(count);
  const aSeed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    aT[i] = (i % SEGMENTS) / (SEGMENTS - 1);
    aSeed[i] = Math.random() * 6.28;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute("aT", new THREE.BufferAttribute(aT, 1));
  g.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}
