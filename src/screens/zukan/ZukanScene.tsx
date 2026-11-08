import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { newAnim } from '../../creatures/anim';
import { modelFor } from '../../creatures/registry';
import { SPECIES } from '../../data/species';
import type { SpeciesId } from '../../sim/types';
import { useUi } from '../../state/ui';
import type { CameraShot } from '../../three/CameraRig';
import { Meadow } from '../../three/Diorama';
import { useTier } from '../../three/QualityManager';
import { QUALITY } from '../../three/quality';
import { GEO, mat } from '../../three/materials';
import { woodTexture } from '../../three/textures';

export const zukanShot = (): CameraShot => ({
  // 下半分は解説シートなので、標本が画面の上半分に来るよう注視点を下げる
  position: [0, 1.5, 3.4],
  target: [0, -0.15, 0],
  fov: 40,
  orbit: { minDistance: 2, maxDistance: 5, minPolar: 0.5, maxPolar: 1.45, azimuth: Math.PI },
  // 横長画面では 説明パネルを 右に 出すので、標本を 画面の 左半分の まん中に
  wide: { position: [0, 2.0, 4.2], target: [0, 0.75, 0], shiftX: 0.23 },
});

/** 台座の上で ゆっくり回る虫（ずかんの 3D 標本） */
function Specimen() {
  const z = useUi((s) => s.zukan);
  return z ? <SpecimenView species={z.species} stage={z.stage} /> : null;
}

export function SpecimenView({ species, stage }: { species: SpeciesId; stage: number }) {
  const z = { species, stage };
  const tier = useTier();
  const spin = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  useFrame((_, dt) => {
    const a = anim.current;
    a.t += dt;
    a.energy = 1;
    a.walk = 0.6;
    a.gait += dt * 4;
    a.flap = 0;
    a.bounce = THREE.MathUtils.damp(a.bounce, 0, 6, dt);
    if (spin.current) spin.current.rotation.y += dt * 0.5;
  });
  const st = SPECIES[z.species].stages[z.stage];
  if (!st) return null;
  const entry = modelFor(st.model);
  const Model = entry.C;
  const k = 1.2 / Math.max(0.6, entry.length);
  return (
    <group ref={spin} position={[0, 0.62, 0]} scale={k} onPointerDown={() => (anim.current.bounce = 1)}>
      <group position={[0, entry.locomotion === 'flutter' ? -0.2 : 0, 0]}>
        <Model key={`${z.species}-${z.stage}`} anim={anim} sex="male" molts={st.molts ?? 0} outlines={QUALITY[tier].outlines} />
      </group>
    </group>
  );
}

/** 木の 台座（上面は 白く とばないよう 落ちついた 生成り色） */
export function Pedestal() {
  const wood = useMemo(() => mat('#e3c9a6', { map: woodTexture(), roughness: 0.8 }), []);
  const top = useMemo(() => mat('#b59d7c', { map: woodTexture(), roughness: 0.9 }), []);
  return (
    <>
      <mesh geometry={GEO.cylinder()} material={wood} position={[0, 0.3, 0]} scale={[0.9, 0.6, 0.9]} castShadow receiveShadow />
      <mesh geometry={GEO.cylinder()} material={top} position={[0, 0.61, 0]} scale={[0.85, 0.03, 0.85]} receiveShadow />
    </>
  );
}

export function ZukanScene() {
  // 一覧の ときは 台座を 出さない（からっぽの 台だけが 大きく 見えて しまうため）
  const open = useUi((s) => s.zukan !== null);
  return (
    <group>
      <Meadow radius={8} />
      {open ? <Pedestal /> : null}
      <Specimen />
    </group>
  );
}
