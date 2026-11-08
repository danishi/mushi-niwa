/**
 * にわの おきゃくさんの 出かた（純 TS）。まだ 見つけていない 子が 来やすい。
 */
export const FIRST_VISIT_AFTER = 6; // 秒：にわに 来てから すぐ 気づけるように
export const STAY_SECONDS = 28;
export const GAP_MIN = 14;
export const GAP_MAX = 30;

export interface Visit {
  id: string;
  /** その 種類の 出る 場所の 番号 */
  spot: number;
}

/** 次に 来る 子を 選ぶ。見つけていない 子を 7 割の 確率で 優先、同じ 子が 2 回 つづかない */
export function pickVisitor(ids: readonly string[], found: readonly string[], last: string | null, rand: () => number): string {
  const others = ids.filter((id) => id !== last);
  const pool = others.length > 0 ? others : [...ids];
  const fresh = pool.filter((id) => !found.includes(id));
  const from = fresh.length > 0 && rand() < 0.7 ? fresh : pool;
  return from[Math.floor(rand() * from.length) % from.length]!;
}

export function pickSpot(count: number, rand: () => number): number {
  return Math.floor(rand() * count) % count;
}

export function nextGap(rand: () => number): number {
  return GAP_MIN + rand() * (GAP_MAX - GAP_MIN);
}
