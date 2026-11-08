import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CameraShot } from '../../three/CameraRig';
import { Meadow } from '../../three/Diorama';
import { GEO, toon } from '../../three/toon';

export const titleShot = (): CameraShot => ({ position: [0, 3.2, 9], target: [0, 0.6, 0], fov: 40 });

/** Phase 0 の仮キャラクター：くねくね動く いもむし */
function Wiggler({ radius, speed, phase, color }: { radius: number; speed: number; phase: number; color: string }) {
  const group = useRef<THREE.Group>(null);
  const segs = useRef<THREE.Mesh[]>([]);
  const body = useMemo(() => toon(color), [color]);
  const eyeW = useMemo(() => toon('#ffffff'), []);
  const eyeB = useMemo(() => toon('#2b2118'), []);
  const N = 6;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase;
    for (let i = 0; i < N; i++) {
      const a = t - i * 0.12;
      const m = segs.current[i];
      if (!m) continue;
      m.position.set(Math.cos(a) * radius, 0.22 + Math.abs(Math.sin(a * 6 - i)) * 0.08, Math.sin(a) * radius);
    }
    const head = segs.current[0];
    if (head && group.current) {
      const a = t + 0.05;
      group.current.position.copy(head.position);
      group.current.lookAt(Math.cos(a) * radius, head.position.y, Math.sin(a) * radius);
    }
  });
  return (
    <group>
      {Array.from({ length: N }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) segs.current[i] = m;
          }}
          geometry={GEO.sphere()}
          material={body}
          scale={0.26 - i * 0.02}
          castShadow
        />
      ))}
      <group ref={group}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.1, 0.08, 0.17]}>
            <mesh geometry={GEO.sphereLo()} material={eyeW} scale={0.08} />
            <mesh geometry={GEO.sphereLo()} material={eyeB} scale={0.05} position={[0, 0, 0.04]} />
          </group>
        ))}
      </group>
    </group>
  );
}

export function TitleScene() {
  return (
    <group>
      <Meadow radius={7} />
      <Wiggler radius={2.4} speed={0.35} phase={0} color="#aed581" />
      <Wiggler radius={3.4} speed={-0.25} phase={2} color="#ffcc80" />
      <Wiggler radius={1.6} speed={0.45} phase={4} color="#f8bbd0" />
    </group>
  );
}
