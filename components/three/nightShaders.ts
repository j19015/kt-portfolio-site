/**
 * 夜の空間そのものを描くシェーダー3種。
 *
 * - dust  : 床すれすれと空中に漂うちり。床面がどこにあるかを面ではなく密度で示す
 * - paw   : 足跡。床に貼りつくクアッドに肉球の形をフラグメントで描く
 * - pool  : 経歴1件につき1つ、床に落ちた窓の明かり。以前の「環」の役割を引き継ぐ
 */

/** 床と空中のちり。カメラの手前 uSpan の範囲を無限に巡回させる */
export const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uCameraZ;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uSpan;
  uniform float uVelocity;

  attribute vec3 aPos;    // x, y, 巡回用のz
  attribute float aSeed;
  attribute float aScale;
  attribute float aType;  // 0 = 床のちり / 1 = 空中

  varying float vFade;
  varying float vSeed;
  varying float vType;

  void main() {
    // カメラの前方 uSpan の帯に畳み込む。ワールドに対しては静止して見える
    float z = uCameraZ - mod(uCameraZ - aPos.z, uSpan);
    vec3 pos = vec3(aPos.x, aPos.y, z);

    float w = aSeed * 6.28318;
    pos.x += sin(uTime * 0.21 + w * 2.7) * (0.6 + aType * 3.0);
    pos.y += sin(uTime * 0.29 + w * 3.3) * (0.25 + aType * 2.2);

    // スクロールの勢いで軸方向に流す
    pos.z += clamp(uVelocity, -90.0, 90.0) * 0.05 * (0.3 + aSeed);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = -mv.z;

    vFade = smoothstep(6.0, 40.0, dist) * (1.0 - smoothstep(175.0, 250.0, dist));
    vFade *= aType > 0.5 ? 0.5 : 1.0;
    vSeed = aSeed;
    vType = aType;

    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * uPixelRatio * (30.0 / max(dist, 0.001));
    gl_PointSize = min(gl_PointSize, 14.0 * uPixelRatio);
  }
`;

export const dustFragment = /* glsl */ `
  precision highp float;

  uniform vec3 uCool;
  uniform vec3 uWarm;
  uniform float uOpacity;

  varying float vFade;
  varying float vSeed;
  varying float vType;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = dot(uv, uv);
    if (d > 0.25) discard;
    float alpha = pow(1.0 - d * 4.0, 2.0);

    // 大半は月明かりの色。ごく一部だけ琥珀を混ぜて画面が単色にならないようにする
    vec3 col = mix(uCool, uWarm, smoothstep(0.86, 1.0, vSeed));
    float lum = vType > 0.5 ? 0.5 : 0.34 + 0.3 * vSeed;

    gl_FragColor = vec4(col, alpha * vFade * uOpacity * lum);
    #include <colorspace_fragment>
  }
`;

/** 足跡。インスタンスごとに床の上へ寝かせたクアッドを1枚置く */
export const pawVertex = /* glsl */ `
  uniform float uTime;

  attribute vec4 aPaw;   // x, z, ヨー角, 生まれた時刻
  attribute vec3 aMeta;  // 猫の大きさ, 前脚なら1, 左右(-1/+1)

  varying vec2 vUv;
  varying float vAge;
  varying float vSide;
  varying float vFore;
  varying float vDist;

  void main() {
    float age = uTime - aPaw.w;
    // 未使用スロットは画面外へ飛ばす
    if (age > 100000.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }

    vAge = age;
    vSide = aMeta.z;
    vFore = aMeta.y;
    vUv = position.xy;

    float s = aMeta.x * 0.42;
    float yaw = aPaw.z;
    vec2 fwd = vec2(-sin(yaw), -cos(yaw)); // 進行方向を +v にとる
    vec2 rgt = vec2(cos(yaw), -sin(yaw));
    vec2 xz = aPaw.xy + rgt * (position.x * s) + fwd * (position.y * s);

    vec4 mv = modelViewMatrix * vec4(xz.x, 0.04, xz.y, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const pawFragment = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vAge;
  varying float vSide;
  varying float vFore;
  varying float vDist;

  float blob(vec2 p, vec2 c, vec2 r) {
    vec2 d = (p - c) / r;
    return exp(-dot(d, d) * 1.7);
  }

  void main() {
    vec2 p = vUv;
    p.x *= vSide;                      // 左右で鏡像にする
    p.y *= mix(1.06, 0.94, vFore);     // 後肢は前肢よりわずかに細長い

    // 掌球ひとつと趾球4つ。輪郭を線で描かず、にじんだ光の集まりとして置く
    float f = blob(p, vec2(0.0, -0.105), vec2(0.118, 0.100));
    f += blob(p, vec2(-0.152, 0.050), vec2(0.052, 0.058));
    f += blob(p, vec2(-0.054, 0.124), vec2(0.050, 0.056));
    f += blob(p, vec2(0.054, 0.124), vec2(0.050, 0.056));
    f += blob(p, vec2(0.150, 0.046), vec2(0.052, 0.058));

    float shape = smoothstep(0.26, 0.80, f);
    float halo = exp(-dot(p, p) * 15.0) * 0.16;

    // 着いた瞬間だけ強く光り、あとはゆっくり沈んで薄く残り続ける
    float a = 0.62 * exp(-vAge / 0.75) + 0.32 * exp(-vAge / 22.0) + 0.11;
    float near = smoothstep(6.0, 26.0, vDist);
    float far = 1.0 - smoothstep(170.0, 260.0, vDist);

    gl_FragColor = vec4(uColor, (shape + halo) * a * near * far * uOpacity);
    #include <colorspace_fragment>
  }
`;

/** 床に落ちた窓明かり。経歴1件につき1枚 */
export const poolVertex = /* glsl */ `
  uniform float uLaneScale;  // 縦長の画面では横位置を詰める

  attribute vec4 aPool;  // x, z, ヨー角, 大きさ

  varying vec2 vUv;
  varying float vDist;

  void main() {
    vUv = position.xy;

    float yaw = aPool.z;
    vec2 fwd = vec2(-sin(yaw), -cos(yaw));
    vec2 rgt = vec2(cos(yaw), -sin(yaw));
    vec2 center = vec2(aPool.x * uLaneScale, aPool.y);
    vec2 xz = center + rgt * (position.x * aPool.w * 1.55) + fwd * (position.y * aPool.w);

    vec4 mv = modelViewMatrix * vec4(xz.x, 0.02, xz.y, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const poolFragment = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vDist;

  void main() {
    // ふちの緩い楕円。窓から差した明かりが床に落ちているだけの存在にする。
    // 四角い枠や桟を入れると床がタイル張りに見えて、夜の静けさが消える
    float r = length(vUv * vec2(1.0, 1.35));
    float pool = 1.0 - smoothstep(0.04, 0.46, r);
    float glow = exp(-r * r * 9.0) * 0.30;
    // クアッドの外周でゼロに落とす。ここを切らないと板の縁が線として見える
    float clip = 1.0 - smoothstep(0.30, 0.50, r);

    // 真下に来た明かりは画面を覆うので沈める。中距離でいちばん明るい
    float depth = smoothstep(14.0, 78.0, vDist) * (1.0 - smoothstep(130.0, 260.0, vDist));

    gl_FragColor = vec4(uColor, (pool * 0.26 + glow) * clip * depth * uOpacity);
    #include <colorspace_fragment>
  }
`;
