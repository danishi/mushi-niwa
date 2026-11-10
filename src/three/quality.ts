import { create } from 'zustand';

export type QualityTier = 'low' | 'mid' | 'high';

export interface QualityProfile {
  /** devicePixelRatio の上限（さらに端末の DPR と 2 で頭打ち） */
  dpr: number;
  shadows: boolean;
  post: boolean;
  outlines: boolean;
  antialias: boolean;
  /** パーティクル量の倍率 */
  particles: number;
}

export const QUALITY: Record<QualityTier, QualityProfile> = {
  high: { dpr: 2, shadows: true, post: true, outlines: true, antialias: true, particles: 1 },
  mid: { dpr: 1.5, shadows: false, post: false, outlines: true, antialias: true, particles: 0.6 },
  low: { dpr: 1, shadows: false, post: false, outlines: false, antialias: false, particles: 0.35 },
};

const ORDER: QualityTier[] = ['low', 'mid', 'high'];

export function stepTier(tier: QualityTier, dir: 1 | -1): QualityTier {
  const i = ORDER.indexOf(tier) + dir;
  return ORDER[Math.max(0, Math.min(ORDER.length - 1, i))]!;
}

export function effectiveDpr(tier: QualityTier, deviceDpr: number): number {
  return Math.min(deviceDpr || 1, QUALITY[tier].dpr, 2);
}

/** 起動時の初期推定。弱そうな端末は mid から始める */
export function guessInitialTier(nav: { hardwareConcurrency?: number; deviceMemory?: number } = {}): QualityTier {
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  if (cores <= 2 || mem <= 2) return 'low';
  if (cores <= 4 || mem <= 3) return 'mid';
  return 'high';
}

const TIER_KEY = 'mushi-niwa:tier';

/** 前に 遊んだ ときに 落ちついた 画質（毎回 高画質から 下げなおして 見た目が 変わるのを 防ぐ） */
export function loadTier(): QualityTier | null {
  try {
    const v = localStorage.getItem(TIER_KEY);
    return v === 'low' || v === 'mid' || v === 'high' ? v : null;
  } catch {
    return null;
  }
}

export function saveTier(tier: QualityTier) {
  try {
    localStorage.setItem(TIER_KEY, tier);
  } catch {
    // 保存できなくても 遊べる
  }
}

/** 自動調整の しきい値（FPS は 0.5 秒ごとの 平均で 見る） */
export const GOVERNOR = {
  windowMs: 500,
  /** これを 下回る 区間が 続いたら 下げる */
  lowFps: 45,
  /** これ以上の 区間が 続いたら 上げる */
  highFps: 55,
  /** これを 下回る 区間が 続いたら 画面切りかえを 待たずに 下げる */
  urgentFps: 24,
  downWindows: 6,
  upWindows: 20,
  urgentWindows: 6,
  /** 画面切りかえ・復帰の 直後（シェーダの コンパイルで 一時的に 重い）は 数えない */
  warmupWindows: 6,
};

/**
 * 画質の 自動調整（純ロジック）。
 * 画質が 変わると 影・解像度・草の 量が 目に見えて 変わるので、変えるのは 画面を 切りかえる ときだけ。
 * 一度 下げた 画質には、その回の 遊びの 間は もどらない（上げ下げの くり返しで チラつかせない）。
 */
export interface Governor {
  tier: QualityTier;
  /** 次の 画面切りかえで 変える 先 */
  pending: QualityTier | null;
  /** これより 上には 上げない */
  ceiling: QualityTier;
  low: number;
  high: number;
  urgent: number;
  skip: number;
}

export function createGovernor(tier: QualityTier, ceiling: QualityTier = 'high'): Governor {
  return { tier, pending: null, ceiling, low: 0, high: 0, urgent: 0, skip: GOVERNOR.warmupWindows };
}

/** 計測を やりなおす（画面切りかえ・タブ復帰・長い 引っかかりの あと） */
export function governorReset(g: Governor) {
  g.low = g.high = g.urgent = 0;
  g.skip = GOVERNOR.warmupWindows;
}

/** 1 区間の FPS を 入れる。すぐに 下げるべき（とても 重い）ときは true */
export function governorSample(g: Governor, fps: number): boolean {
  if (g.skip > 0) {
    g.skip--;
    return false;
  }
  g.low = fps < GOVERNOR.lowFps ? g.low + 1 : 0;
  g.high = fps >= GOVERNOR.highFps ? g.high + 1 : 0;
  g.urgent = fps < GOVERNOR.urgentFps ? g.urgent + 1 : 0;
  const i = ORDER.indexOf(g.tier);
  if (g.low >= GOVERNOR.downWindows && i > 0) g.pending = ORDER[i - 1]!;
  else if (g.high >= GOVERNOR.upWindows) g.pending = i < ORDER.indexOf(g.ceiling) ? ORDER[i + 1]! : null;
  return g.urgent >= GOVERNOR.urgentWindows && i > 0;
}

/** 待たせていた 変更を 反映する（画面切りかえの ときに 呼ぶ）。変わったら 新しい 画質を 返す */
export function governorApply(g: Governor): QualityTier | null {
  const next = g.pending;
  g.pending = null;
  governorReset(g);
  if (!next || next === g.tier) return null;
  if (ORDER.indexOf(next) < ORDER.indexOf(g.tier)) g.ceiling = next;
  g.tier = next;
  return next;
}

interface QualityState {
  /** 自動調整の結果 */
  autoTier: QualityTier;
  setAutoTier: (t: QualityTier) => void;
}

export const useQuality = create<QualityState>()((set) => ({
  autoTier:
    loadTier() ??
    guessInitialTier(
      typeof navigator === 'undefined'
        ? {}
        : (navigator as Navigator & { deviceMemory?: number }),
    ),
  setAutoTier: (autoTier) => set({ autoTier }),
}));

/** 計測値。React の再描画を起こさないように可変オブジェクトで共有する */
export const perfStats = { fps: 60, frameMs: 16.7, drawCalls: 0, triangles: 0 };
