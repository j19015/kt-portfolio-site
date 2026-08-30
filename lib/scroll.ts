/**
 * スクロール状態の共有ストア。
 *
 * R3F の useFrame から毎フレーム読むため、あえて React の state に載せない。
 * state にすると1フレームごとに再レンダリングが走って60fpsが出せないので、
 * ミュータブルなオブジェクトを直接書き換える方式を取る。
 */
export const scrollState = {
  /** ページ全体の進捗 0..1 */
  progress: 0,
  /** 直近のスクロール速度（px/frame 相当）。粒子の乱れに使う */
  velocity: 0,
  /** ビューポート高さを1とした現在位置 */
  pages: 0,
};

/** セクションIDごとの「そのセクション内での進捗 0..1」 */
export const sectionProgress: Record<string, number> = {};

/**
 * 要素が画面を通過する進捗を 0..1 で返す。
 * 0 = 要素の上端が画面下端に触れた瞬間 / 1 = 要素の下端が画面上端を抜けた瞬間
 */
export function computeProgress(rect: DOMRect, viewportH: number): number {
  const total = rect.height + viewportH;
  const passed = viewportH - rect.top;
  return Math.min(1, Math.max(0, passed / total));
}

export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));

/** 線形補間 */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * a..b を 0..1 に写像してクランプ。
 * 「スクロールのこの区間だけでこの演出を進める」という指定に使う
 */
export const range = (v: number, a: number, b: number) =>
  clamp((v - a) / (b - a));

/** smoothstep。範囲の両端で速度が0になるので、演出の出入りが自然になる */
export const smoothstep = (v: number, a: number, b: number) => {
  const t = range(v, a, b);
  return t * t * (3 - 2 * t);
};

/**
 * Lenis のインスタンス参照。
 * ナビゲーションからスクロールさせるとき、window.scrollTo だと
 * Lenis の内部状態とずれるので、必ずこちら経由で動かす。
 */
type Scroller = {
  scrollTo: (target: string | number | HTMLElement, opts?: Record<string, unknown>) => void;
};

let scroller: Scroller | null = null;

export const setScroller = (s: Scroller | null) => {
  scroller = s;
};

export const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  if (scroller) scroller.scrollTo(el, { offset: 0, duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth" });
};
