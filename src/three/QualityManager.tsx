import { PerformanceMonitor } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useSettings } from '../state/settings';
import { perfStats, stepTier, useQuality, type QualityTier } from './quality';

/** 現在の画質ティア（設定で固定されていればそちら） */
export function useTier(): QualityTier {
  const setting = useSettings((s) => s.quality);
  const auto = useQuality((s) => s.autoTier);
  return setting === 'auto' ? auto : setting;
}

/**
 * FPS を監視して、落ちたら DPR→影→後処理の順に画質を下げる。
 * 60fps 目標、30fps を割らないことが目的。
 */
export function QualityManager() {
  const setting = useSettings((s) => s.quality);
  const setAutoTier = useQuality((s) => s.setAutoTier);
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const last = useRef(performance.now());

  useEffect(() => {
    // 後処理で複数パス描いても 1 フレーム分を合計できるよう、手動でリセットする
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    const dt = now - last.current;
    if (dt >= 500) {
      perfStats.fps = (frames.current * 1000) / dt;
      perfStats.frameMs = dt / frames.current;
      perfStats.drawCalls = gl.info.render.calls;
      perfStats.triangles = gl.info.render.triangles;
      frames.current = 0;
      last.current = now;
    }
    gl.info.reset();
  });

  useEffect(() => {
    // タブ復帰直後の低 FPS で誤判定しないよう、計測をリセット
    const onVis = () => {
      frames.current = 0;
      last.current = performance.now();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (setting !== 'auto') return null;
  return (
    <PerformanceMonitor
      ms={400}
      iterations={6}
      bounds={(refresh) => (refresh > 90 ? [50, 90] : [45, 58])}
      flipflops={4}
      onDecline={(api) => {
        // 背景タブ等でフレームが間引かれている（極端に低い）ときは端末性能と見なさない
        if (api.fps < 8 || document.hidden) return;
        setAutoTier(stepTier(useQuality.getState().autoTier, -1));
      }}
      onIncline={() => setAutoTier(stepTier(useQuality.getState().autoTier, 1))}
      onFallback={(api) => {
        if (api.fps >= 8 && !document.hidden) setAutoTier('low');
      }}
    />
  );
}
