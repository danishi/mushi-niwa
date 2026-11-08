import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import * as THREE from 'three';
import { env } from '../state/env';
import { useUi } from '../state/ui';
import { CameraRig } from '../three/CameraRig';
import { Effects } from '../three/Effects';
import { Lights } from '../three/Lights';
import { Particles } from '../three/Particles';
import { QualityManager, useTier } from '../three/QualityManager';
import { effectiveDpr, QUALITY, useQuality } from '../three/quality';
import { registerSnapshotCanvas } from '../three/snapshot';
import { sceneFor } from './scenes';

function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

function EnvDriver() {
  useFrame((_, dt) => {
    env.night = THREE.MathUtils.damp(env.night, env.targetNight, 1.5, Math.min(dt, 0.1));
  });
  return null;
}

function ScreenContent() {
  const screen = useUi((s) => s.screen);
  const dragging = useUi((s) => s.dragging);
  // シネマティック（成長の瞬間など）ではカメラの目標が変わる
  useUi((s) => s.cinematic);
  const { Scene, shot } = sceneFor(screen);
  return (
    <>
      <CameraRig shot={shot()} locked={dragging || useUi.getState().cinematic !== null} />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </>
  );
}

/**
 * 3D の Canvas は 1 つだけ常駐させ、画面切り替えでは中身だけ入れ替える。
 * （iOS Safari で WebGL コンテキストを作り直すと不安定になるため）
 */
export function World() {
  const tier = useTier();
  const visible = usePageVisible();
  // 大人向けの パネルで 画面が おおわれている間は 描画を 止める（入力の 反応と 電池のため）
  const covered = useUi((s) => s.overlays > 0 || s.settingsOpen);
  const [initialTier] = useState(() => useQuality.getState().autoTier);
  const dpr = effectiveDpr(tier, typeof window === 'undefined' ? 1 : window.devicePixelRatio);
  return (
    <Canvas
      dpr={dpr}
      shadows={{ type: THREE.PCFSoftShadowMap }}
      frameloop={visible && !covered ? 'always' : 'never'}
      gl={{ antialias: QUALITY[initialTier].antialias, powerPreference: 'high-performance', alpha: false, toneMapping: THREE.AgXToneMapping }}
      camera={{ fov: 40, near: 0.05, far: 80, position: [0, 4, 12] }}
      data-testid="world-canvas"
      onCreated={(state) => {
        registerSnapshotCanvas(state.gl.domElement);
        // E2E・デバッグ用（?e2e のときだけ）
        if (new URLSearchParams(location.search).has('e2e')) (window as unknown as Record<string, unknown>).__r3f = state;
      }}
    >
      <QualityManager />
      <EnvDriver />
      <Lights night={{ get current() { return env.night; } }} />
      <ScreenContent />
      <Particles />
      <Effects />
    </Canvas>
  );
}
