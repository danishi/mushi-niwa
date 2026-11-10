import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSettings } from '../state/settings';
import { useUi } from '../state/ui';
import { createGovernor, GOVERNOR, governorApply, governorReset, governorSample, perfStats, saveTier, useQuality, type QualityTier } from './quality';

/** 現在の画質ティア（設定で固定されていればそちら） */
export function useTier(): QualityTier {
  const setting = useSettings((s) => s.quality);
  const auto = useQuality((s) => s.autoTier);
  return setting === 'auto' ? auto : setting;
}

/** これより 長く 止まった フレームは 計測に 入れない（タブ復帰・パネルを 閉じた 直後・コンパイルの 引っかかり） */
const STALL_MS = 1000;

/**
 * FPS を 計って 画質（解像度・影・後処理・草の 量）を 自動で 決める。60fps 目標、30fps を 割らないことが 目的。
 * 画質を 変えると 見た目が 変わるので、変えるのは 画面を 切りかえる ときだけ（`Governor`）。
 */
export function QualityManager() {
  const auto = useSettings((s) => s.quality === 'auto');
  const gl = useThree((s) => s.gl);
  const governor = useRef(createGovernor(useQuality.getState().autoTier));
  const frames = useRef(0);
  const windowStart = useRef(performance.now());
  const lastFrame = useRef(performance.now());

  // 最初の フレームを 描く 前に 決める（描いた あとで 変えると 見た目が 切りかわる）
  useLayoutEffect(() => {
    // ソフトウェア描画（GPU が使えない環境）なら 最初から 低画質にして 上げない
    const ctx = gl.getContext();
    const info = ctx.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(ctx.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|softpipe|software/i.test(renderer)) {
      governor.current = createGovernor('low', 'low');
      useQuality.getState().setAutoTier('low');
    }
    // 後処理で複数パス描いても 1 フレーム分を合計できるよう、手動でリセットする
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  // 画面を 切りかえる ときに、待たせていた 画質の 変更を 反映する
  useEffect(() => {
    if (!auto) return;
    const g = governor.current;
    g.tier = useQuality.getState().autoTier;
    governorReset(g);
    return useUi.subscribe((s, prev) => {
      if (s.screen !== prev.screen) commit(g);
    });
  }, [auto]);

  useFrame(() => {
    const now = performance.now();
    const gap = now - lastFrame.current;
    lastFrame.current = now;
    // 前の フレームの 合計（このあとの 描画で また 数えはじめる）
    const { calls, triangles } = gl.info.render;
    gl.info.reset();
    if (gap > STALL_MS) {
      frames.current = 0;
      windowStart.current = now;
      governorReset(governor.current);
      return;
    }
    frames.current++;
    const dt = now - windowStart.current;
    if (dt < GOVERNOR.windowMs) return;
    perfStats.fps = (frames.current * 1000) / dt;
    perfStats.frameMs = dt / frames.current;
    perfStats.drawCalls = calls;
    perfStats.triangles = triangles;
    frames.current = 0;
    windowStart.current = now;
    if (!auto) return;
    const g = governor.current;
    const urgent = governorSample(g, perfStats.fps);
    // とても 重い ときと、3D が かくれている 起動画面では すぐに 変える
    if (g.pending && (urgent || useUi.getState().screen === 'boot')) commit(g);
  });

  return null;
}

function commit(g: ReturnType<typeof createGovernor>) {
  const next = governorApply(g);
  if (!next) return;
  useQuality.getState().setAutoTier(next);
  saveTier(next);
}
