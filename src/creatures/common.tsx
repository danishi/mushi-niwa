import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, SURF, type MatOpts } from '../three/materials';
import type { CreatureAnim } from './anim';

type V3 = [number, number, number];

/** 体全体の呼吸・タップしたときの ぴくっ・脱皮前の ふるえ・食べるときの うなずき */
export function useBodyMotion(anim: { current: CreatureAnim }, amount = 1) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    const g = ref.current;
    if (!g) return;
    const breathe = Math.sin(a.t * (1 + a.energy)) * 0.012 * (1 - a.sleep * 0.5);
    const twitch = a.bounce;
    g.scale.set(1 + breathe, 1 + breathe - twitch * 0.04, 1 + breathe);
    g.position.y = Math.abs(Math.sin(a.gait * 2)) * 0.012 * a.walk * amount + twitch * 0.03;
    g.rotation.z = Math.sin(a.t * 40) * 0.04 * a.shiver;
    g.rotation.x = -a.eat * 0.1 * Math.max(0.3, Math.sin(a.t * 8) * 0.5 + 0.5);
  });
  return ref;
}

/** 小さな メッシュ（材質は色と表面プリセットから共有） */
export function M({
  geo = GEO.sphere(),
  color,
  surface,
  position,
  rotation,
  scale,
  part,
  castShadow = false,
}: {
  geo?: THREE.BufferGeometry;
  color: string;
  surface?: MatOpts;
  position?: V3;
  rotation?: V3;
  scale?: V3 | number;
  part?: string;
  castShadow?: boolean;
}) {
  const material = useMemo(() => mat(color, surface ?? SURF.matteChitin()), [color, surface]);
  return (
    <mesh
      geometry={geo}
      material={material}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      userData={part ? { part } : undefined}
    />
  );
}
