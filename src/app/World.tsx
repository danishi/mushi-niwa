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
  const [initialTier] = useState(() => useQuality.getState().autoTier);
  const dpr = effectiveDpr(tier, typeof window === 'undefined' ? 1 : window.devicePixelRatio);
  return (
    <Canvas
      dpr={dpr}
      shadows={{ type: THREE.PCFShadowMap }}
      flat
      frameloop={visible ? 'always' : 'never'}
      gl={{ antialias: QUALITY[initialTier].antialias, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 40, near: 0.05, far: 80, position: [0, 4, 12] }}
      data-testid="world-canvas"
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
