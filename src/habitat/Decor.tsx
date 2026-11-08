import type * as THREE from 'three';
import { useMemo } from 'react';
import { cachedTube } from '../creatures/geom';
import type { DecorId } from '../sim/types';
import { leafGeometry } from '../three/Diorama';
import { GEO, toon } from '../three/toon';

type V3 = [number, number, number];

/** 飾りを置く場所（index ごとにずらす）。手前は虫が見えるようにあけておく */
const SPOTS: V3[] = [
  [-1.25, 0, -0.75],
  [1.3, 0, -0.85],
  [0.2, 0, -1.0],
  [-1.5, 0, 0.6],
  [1.5, 0, 0.5],
];
const HOUSE_SPOT: V3 = [0.9, 0, -0.35];

function Mesh({ color, ...p }: { color: string; geometry: THREE.BufferGeometry; position?: V3; rotation?: V3; scale?: V3 | number }) {
  const m = useMemo(() => toon(color), [color]);
  return <mesh material={m} castShadow receiveShadow {...p} />;
}


export function Decor({ id, top, index, at }: { id: DecorId; top: number; index: number; at?: V3 }) {
  const spot = at ?? (index >= 9 ? HOUSE_SPOT : SPOTS[index % SPOTS.length]!);
  const p: V3 = [spot[0], top, spot[2]];
  switch (id) {
    case 'log':
      return (
        <group position={p} rotation={[0, 0.5, 0]}>
          <Mesh color="#8d6e63" geometry={GEO.cylinder()} position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.22, 1.5, 0.22]} />
          <Mesh color="#c8a27a" geometry={GEO.cylinder()} position={[0.76, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.19, 0.02, 0.19]} />
          <Mesh color="#6d4c41" geometry={GEO.cone()} position={[-0.3, 0.42, 0]} scale={[0.06, 0.18, 0.06]} />
        </group>
      );
    case 'branch':
      return (
        <group position={p}>
          <Mesh
            color="#8d6e63"
            geometry={cachedTube('branch', [[0, 0, 0], [0.2, 0.8, 0.1], [0.1, 1.6, 0.3], [0.4, 2.2, 0.4]], 0.07, 0.03)}
          />
          <Mesh color="#7cb342" geometry={leafGeometry()} position={[0.15, 1.2, 0.2]} rotation={[1.2, 0.3, 0]} scale={0.35} />
        </group>
      );
    case 'stone':
      return (
        <group position={p}>
          <Mesh color="#b0a59a" geometry={GEO.sphere()} position={[0, 0.08, 0]} scale={[0.5, 0.16, 0.38]} rotation={[0.1, 0.4, 0.05]} />
        </group>
      );
    case 'bark':
      return (
        <group position={p} rotation={[0, -0.4, 0]}>
          <Mesh color="#7a5a44" geometry={GEO.cylinder()} position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.25, 0.9, 0.12]} />
        </group>
      );
    case 'leaf':
      return (
        <group position={[p[0], top + 0.01, p[2]]}>
          {[0, 1, 2].map((i) => (
            <Mesh key={i} color={['#9ccc65', '#7cb342', '#aed581'][i]!} geometry={leafGeometry()} rotation={[0, i * 2.1, 0]} scale={0.6} />
          ))}
        </group>
      );
    case 'flower':
      return (
        <group position={p}>
          <Mesh color="#7cb342" geometry={GEO.cylinder()} position={[0, 0.5, 0]} scale={[0.03, 1, 0.03]} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Mesh key={i} color="#ff8fab" geometry={GEO.sphere()} position={[Math.cos(i * 1.26) * 0.12, 1.02, Math.sin(i * 1.26) * 0.12]} scale={[0.1, 0.03, 0.1]} />
          ))}
          <Mesh color="#ffd166" geometry={GEO.sphere()} position={[0, 1.04, 0]} scale={0.06} />
        </group>
      );
    case 'potPlant':
      return (
        <group position={p}>
          <Mesh color="#d4794a" geometry={GEO.cylinder()} position={[0, 0.2, 0]} scale={[0.3, 0.4, 0.3]} />
          <Mesh color="#5d4030" geometry={GEO.cylinder()} position={[0, 0.41, 0]} scale={[0.27, 0.02, 0.27]} />
          <Mesh color="#6d8b3a" geometry={GEO.cylinder()} position={[0, 0.8, 0]} scale={[0.03, 0.8, 0.03]} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Mesh
              key={i}
              color={i % 2 ? '#558b2f' : '#689f38'}
              geometry={leafGeometry()}
              position={[0, 0.6 + i * 0.12, 0]}
              rotation={[0.6, i * 1.9, 0]}
              scale={0.4}
            />
          ))}
        </group>
      );
    case 'mulberryTwig':
      return (
        <group position={p} rotation={[0, 0.3, 0]}>
          <Mesh color="#8d6e63" geometry={GEO.cylinder()} position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.04, 1.2, 0.04]} />
        </group>
      );
  }
}

/** ケース中央付近（飾りと重ならない）に置く、食べ物の場所 */
export function foodSpot(slot: number): V3 {
  void slot;
  return [-0.6, 0, 0.35];
}

