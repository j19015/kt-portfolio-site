/**
 * 粒子リング用のシェーダー。
 *
 * 奥行き方向(-Z)に等間隔で並んだリングを粒子で描く。
 * カメラがZ軸を進んでリングをくぐり抜けるので、
 * 「通過済み」「目前」「遠景」で粒子をフェードさせて破綻を防ぐ。
 */
export const ringVertex = /* glsl */ `
  uniform float uTime;
  uniform float uCameraZ;
  uniform float uVelocity;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uRingGap;
  uniform float uFocusRing;   // いま注目しているリング番号(小数)。光らせる対象

  attribute float aAngle;
  attribute float aRing;
  attribute float aSeed;
  attribute float aRadius;
  attribute float aScale;
  attribute float aType;      // 0 = リング / 1 = 背景のちり

  varying float vFade;
  varying float vSeed;
  varying float vGlow;

  void main() {
    float seedAngle = aSeed * 6.28318;
    float t = uTime * 0.12 + aRing * 0.35;

    // リングごとに交互に逆回転させると、奥行きの差が知覚しやすくなる
    float dir = mod(aRing, 2.0) < 0.5 ? 1.0 : -1.0;
    float angle = aAngle + t * 0.5 * dir;

    // 半径をゆっくり脈動させて生物的な揺れを出す
    float pulse = 1.0 + 0.05 * sin(uTime * 0.9 + seedAngle);
    float radius = aRadius * pulse;

    float ringZ = -aRing * uRingGap;

    vec3 pos;
    if (aType < 0.5) {
      pos = vec3(cos(angle) * radius, sin(angle) * radius, ringZ);
      // リング面から少し厚みを持たせる
      pos.z += sin(seedAngle * 3.0 + uTime * 0.7) * 1.6;
      pos.xy += vec2(
        sin(uTime * 0.5 + seedAngle * 2.0),
        cos(uTime * 0.43 + seedAngle * 3.0)
      ) * 0.45;
    } else {
      // 背景のちり: 円柱状に散らす
      pos = vec3(cos(angle) * radius, sin(angle) * radius, ringZ);
      pos.z += (aSeed - 0.5) * uRingGap * 2.0;
    }

    // スクロールの勢いで軸方向に伸ばす → 速く動くほど流れて見える
    pos.z += clamp(uVelocity, -60.0, 60.0) * 0.05 * (0.4 + aSeed);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = -mv.z; // カメラ前方への距離

    // 手前で消す(カメラ貫通の破綻回避) / 奥で消す(描画コスト削減)
    // 近距離のフェード幅を広く取ると、通過中の粒子が巨大なボケ玉になって
    // 前景のテキストを読みにくくするのを防げる
    vFade = smoothstep(2.0, 24.0, dist) * (1.0 - smoothstep(90.0, 150.0, dist));
    if (aType > 0.5) vFade *= 0.35; // ちりは控えめに

    // 注目中のリングだけ強く光らせる
    vGlow = aType < 0.5 ? 1.0 - smoothstep(0.0, 1.4, abs(aRing - uFocusRing)) : 0.0;

    vSeed = aSeed;

    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * uPixelRatio * (34.0 / max(dist, 0.001));
    gl_PointSize = min(gl_PointSize, 30.0 * uPixelRatio);
  }
`;

export const ringFragment = /* glsl */ `
  precision highp float;

  uniform vec3 uColorA;  // 琥珀
  uniform vec3 uColorB;  // シアン
  uniform float uOpacity;

  varying float vFade;
  varying float vSeed;
  varying float vGlow;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = dot(uv, uv);          // 平方距離。sqrtを省いて軽くする
    if (d > 0.25) discard;

    // 中心が濃く外周が薄い。pow で芯を締める
    float alpha = pow(1.0 - d * 4.0, 2.4);

    vec3 col = mix(uColorA, uColorB, smoothstep(0.35, 0.9, vSeed));
    col = mix(col, vec3(1.0), vGlow * 0.55);          // 注目リングは白熱化
    col *= 1.0 + vGlow * 1.2;

    gl_FragColor = vec4(col, alpha * vFade * uOpacity);
    #include <colorspace_fragment>
  }
`;
