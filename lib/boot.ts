/**
 * 3Dの初期化完了を画面全体へ知らせるための最小の通知機構。
 * Context を使うと Canvas の外側まで再レンダリングが波及するので、
 * 購読者にだけ伝わる素朴な実装にしている。
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let ready = false;

export const isReady = () => ready;

export function markReady() {
  if (ready) return;
  ready = true;
  for (const fn of listeners) fn();
}

export function onReady(fn: Listener) {
  if (ready) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
