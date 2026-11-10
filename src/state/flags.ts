/**
 * URL の `?…` で 切りかえる 開発・テスト用の スイッチ（1 か所で 読む）。
 * - `?e2e`: テスト用フック（`window.__mushi`・`window.__r3f`）。おきゃくさんが すぐ 来る
 * - `?fps`: FPS メーター
 * - `?speed=30`: 時間を 30 倍速
 */
const query = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);

function positive(value: string | null, fallback: number): number {
  const n = value ? Number(value) : fallback;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const FLAGS = {
  e2e: query.has('e2e'),
  fps: query.has('fps'),
  speed: positive(query.get('speed'), 1),
};
