/**
 * 猫の粒子シェーダー。
 *
 * 体の内側はほとんど光らせず、**視線に対して法線が寝ている点（＝輪郭）だけ**を光らせる。
 * 面を塗らずに縁だけを描くと、細部が無くてもシルエットとして成立する。
 * 「暗がりに猫の輪郭が浮かぶ」だけの絵になるので、造形の粗さが表に出ない。
 *
 * 変形は uBones[] の11本だけ。CPUは行列を作るところまでで、頂点の移動はここで行う。
 */
export const catVertex = /* glsl */ `
  uniform mat4 uBones[11];
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uStretch;   // 速く動いているとき軸方向へ引き伸ばす量

  attribute float aBone;
  attribute vec3 aLocal;
  attribute vec3 aNormal;
  attribute float aSeed;
  attribute float aScale;

  varying float vFade;
  varying float vRim;
  varying float vFacing;
  varying float vSeed;

  void main() {
    mat4 B = uBones[int(aBone + 0.5)];
    vec3 pos = (B * vec4(aLocal, 1.0)).xyz;
    vec3 nrm = normalize(mat3(B) * aNormal);

    // 体表をわずかに揺らす。光の粒でできた体に見せるための微振動
    float w = aSeed * 6.28318;
    pos += nrm * sin(uTime * 1.6 + w * 3.0) * 0.06;

    // 速く動くほど進行方向へ流す
    pos.z += uStretch * (0.3 + aSeed * 0.7);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = -mv.z;

    vec3 nv = normalize(normalMatrix * nrm);
    vec3 view = normalize(-mv.xyz);
    float facing = dot(nv, view);

    // 輪郭ほど 1 に近づく
    vRim = pow(1.0 - abs(facing), 2.0);
    // 裏側の点を沈めておかないと、体を透かした線が重なって濁る
    vFacing = smoothstep(-0.15, 0.3, facing);
    vSeed = aSeed;
    vFade = smoothstep(3.0, 26.0, dist) * (1.0 - smoothstep(170.0, 280.0, dist));

    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * uPixelRatio * (44.0 / max(dist, 0.001));
    gl_PointSize = min(gl_PointSize, 26.0 * uPixelRatio);
  }
`;

export const catFragment = /* glsl */ `
  precision highp float;

  uniform vec3 uCool;
  uniform vec3 uWarm;
  uniform float uOpacity;
  uniform float uLit;    // 床の月明かりに入っているか 0..1
  uniform float uTime;

  varying float vFade;
  varying float vRim;
  varying float vFacing;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = dot(uv, uv);
    if (d > 0.25) discard;
    float alpha = pow(1.0 - d * 4.0, 2.2);

    // 内側は沈め、縁だけを立ち上げる
    float body = 0.15 + 0.20 * uLit;
    float edge = vRim * (2.7 + 0.9 * uLit);
    float intensity = (body + edge) * (0.26 + 0.74 * vFacing);

    // ごく僅かな明滅。止まっていても画が死なない
    intensity *= 0.82 + 0.18 * sin(uTime * 1.9 + vSeed * 21.0);

    vec3 col = mix(uCool, uWarm, clamp(vRim * 0.5 + vSeed * 0.15, 0.0, 1.0));

    gl_FragColor = vec4(col, alpha * vFade * uOpacity * intensity);
    #include <colorspace_fragment>
  }
`;
