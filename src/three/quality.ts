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

interface QualityState {
  /** 自動調整の結果 */
  autoTier: QualityTier;
  setAutoTier: (t: QualityTier) => void;
}

export const useQuality = create<QualityState>()((set) => ({
  autoTier: guessInitialTier(
    typeof navigator === 'undefined'
      ? {}
      : (navigator as Navigator & { deviceMemory?: number }),
  ),
  setAutoTier: (autoTier) => set({ autoTier }),
}));

/** 計測値。React の再描画を起こさないように可変オブジェクトで共有する */
export const perfStats = { fps: 60, frameMs: 16.7, drawCalls: 0, triangles: 0 };
