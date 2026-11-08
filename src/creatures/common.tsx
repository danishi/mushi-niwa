import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, toon } from '../three/toon';
import type { CreatureAnim } from './anim';

type V3 = [number, number, number];

/** 背中のつや。げんきなほど強く光る（色のつやで状態を見せる） */
export function Shine({ position, scale, anim }: { position: V3; scale: V3; anim: { current: CreatureAnim } }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }),
    [],
  );
  useFrame(() => {
    mat.opacity = 0.08 + 0.5 * Math.max(0, anim.current.energy - 0.3);
    if (ref.current) ref.current.visible = mat.opacity > 0.05;
  });
  return <mesh ref={ref} geometry={GEO.sphereLo()} material={mat} position={position} scale={scale} />;
}

/** 体全体の呼吸・ぷにっと・ぶるぶる */
export function useBodyMotion(anim: { current: CreatureAnim }, amount = 1) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    const g = ref.current;
    if (!g) return;
    const breathe = Math.sin(a.t * (1.2 + a.energy)) * 0.02 * (1 - a.sleep * 0.5);
    const squish = a.bounce;
    g.scale.set(1 + squish * 0.12 + breathe, 1 - squish * 0.15 + breathe, 1 + squish * 0.12);
    g.position.y = Math.abs(Math.sin(a.gait * 2)) * 0.02 * a.walk * amount;
    g.rotation.z = Math.sin(a.t * 40) * 0.05 * a.shiver;
    g.rotation.x = -a.eat * 0.12 * Math.max(0.3, Math.sin(a.t * 8) * 0.5 + 0.5);
  });
  return ref;
}

/** ふつうのマテリアルを使い回すための小さなメッシュ */
export function M({
  geo = GEO.sphere(),
  color,
  position,
  rotation,
  scale,
  part,
}: {
  geo?: THREE.BufferGeometry;
  color: string;
  position?: V3;
  rotation?: V3;
  scale?: V3 | number;
  part?: string;
}) {
  const mat = useMemo(() => toon(color), [color]);
  return (
    <mesh
      geometry={geo}
      material={mat}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      userData={part ? { part } : undefined}
    />
  );
}
