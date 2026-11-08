import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { newAnim } from '../../creatures/anim';
import { modelFor } from '../../creatures/registry';
import { SPECIES, SPECIES_ORDER } from '../../data/species';
import type { CameraShot } from '../../three/CameraRig';
import { Meadow } from '../../three/Diorama';
import { useTier } from '../../three/QualityManager';
import { QUALITY } from '../../three/quality';

export const titleShot = (): CameraShot => ({ position: [0, 3.2, 9], target: [0, 0.6, 0], fov: 40 });

/** 原っぱを ぐるぐる歩く（飛ぶ）虫 */
function Walker({ model, radius, speed, phase, sex }: { model: string; radius: number; speed: number; phase: number; sex: 'male' | 'female' }) {
  const ref = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const tier = useTier();
  const entry = modelFor(model);
  const flyer = entry.locomotion === 'flutter';
  const hopper = entry.locomotion === 'hop';
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const a = anim.current;
    a.t += dt;
    a.energy = 1;
    a.walk = flyer ? 0 : 1;
    a.flap = flyer ? 1 : 0;
    a.gait += dt * speed * 40;
    a.bounce = THREE.MathUtils.damp(a.bounce, 0, 6, dt);
    const ang = phase + a.t * speed * Math.sign(radius);
    const r = Math.abs(radius);
    const g = ref.current;
    if (!g) return;
    g.position.set(Math.cos(ang) * r, flyer ? 1.4 + Math.sin(a.t * 1.3) * 0.4 : hopper ? Math.abs(Math.sin(a.t * 3)) * 0.25 : 0, Math.sin(ang) * r);
    // 進む向きに顔を向ける
    const dir = Math.sign(radius);
    g.rotation.y = -ang + (dir > 0 ? 0 : Math.PI);
  });
  const Model = entry.C;
  return (
    <group ref={ref} onPointerDown={() => (anim.current.bounce = 1)}>
      <Model anim={anim} sex={sex} molts={0} outlines={QUALITY[tier].outlines} />
    </group>
  );
}

export function TitleScene() {
  return (
    <group>
      <Meadow radius={7} />
      {SPECIES_ORDER.map((id, i) => {
        const sp = SPECIES[id];
        const adult = sp.stages[sp.stages.length - 1]!;
        return (
          <Walker
            key={id}
            model={adult.model}
            radius={(i % 2 ? -1 : 1) * (1.8 + (i % 3) * 0.9)}
            speed={0.18 + (i % 3) * 0.05}
            phase={i * 1.05}
            sex={i % 2 ? 'female' : 'male'}
          />
        );
      })}
    </group>
  );
}
