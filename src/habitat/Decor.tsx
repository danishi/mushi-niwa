import { useMemo } from 'react';
import * as THREE from 'three';
import { cachedTube } from '../creatures/geom';
import type { DecorId } from '../sim/types';
import { leafGeometry } from '../three/Diorama';
import { GEO, mat, type MatOpts } from '../three/materials';
import { barkNormal, barkTexture, grainBump, granuleNormal, leafTexture, woodTexture } from '../three/textures';

type V3 = [number, number, number];

/** 飾りを置く場所（index ごとにずらす）。手前は 虫が見えるように あけておく */
const SPOTS: V3[] = [
  [-1.25, 0, -0.75],
  [1.3, 0, -0.85],
  [0.2, 0, -1.0],
  [-1.5, 0, 0.6],
  [1.5, 0, 0.5],
];
const HOUSE_SPOT: V3 = [0.9, 0, -0.35];

function Mesh({ color, surface, ...p }: { color: string; surface?: MatOpts; geometry: THREE.BufferGeometry; position?: V3; rotation?: V3; scale?: V3 | number }) {
  const m = useMemo(() => mat(color, surface ?? { roughness: 0.85 }), [color, surface]);
  return <mesh material={m} castShadow receiveShadow {...p} />;
}

const bark = (): MatOpts => ({ map: barkTexture(), roughness: 0.95, normalMap: barkNormal(), normalScale: 1.4 });
const leaf = (c = '#4f7f2a'): MatOpts => ({ map: leafTexture(c), roughness: 0.6, side: THREE.DoubleSide });

/** 飼育ケースの飾り（とまり木・枝・石・樹皮・葉・鉢植え など） */
export function Decor({ id, top, index, at }: { id: DecorId; top: number; index: number; at?: V3 }) {
  const spot = at ?? (index >= 9 ? HOUSE_SPOT : SPOTS[index % SPOTS.length]!);
  const p: V3 = [spot[0], top, spot[2]];
  switch (id) {
    case 'log':
      // とまり木（クヌギなどの 樹皮つきの 枝）
      return (
        <group position={p} rotation={[0, 0.5, 0]}>
          <Mesh color="#ffffff" surface={bark()} geometry={GEO.bark()} position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.22, 1.5, 0.22]} />
          <Mesh color="#ffffff" surface={{ map: woodTexture(), roughness: 0.8 }} geometry={GEO.cylinder()} position={[0.751, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.215, 0.012, 0.215]} />
          <Mesh color="#ffffff" surface={bark()} geometry={GEO.cone()} position={[-0.3, 0.42, 0]} scale={[0.06, 0.18, 0.06]} />
        </group>
      );
    case 'branch':
      return (
        <group position={p}>
          <Mesh color="#ffffff" surface={bark()} geometry={cachedTube('branch2', [[0, 0, 0], [0.2, 0.8, 0.1], [0.1, 1.6, 0.3], [0.4, 2.2, 0.4]], 0.07, 0.03)} />
          <Mesh color="#ffffff" surface={leaf()} geometry={leafGeometry()} position={[0.15, 1.2, 0.2]} rotation={[1.2, 0.3, 0]} scale={0.35} />
        </group>
      );
    case 'stone':
      return (
        <group position={p}>
          <Mesh color="#9e958b" surface={{ roughness: 0.9, normalMap: granuleNormal(3, 3), normalScale: 1 }} geometry={GEO.rock()} position={[0, 0.07, 0]} scale={[0.5, 0.15, 0.38]} rotation={[0.1, 0.4, 0.05]} />
        </group>
      );
    case 'bark':
      return (
        <group position={p} rotation={[0, -0.4, 0]}>
          <Mesh color="#ffffff" surface={bark()} geometry={GEO.bark()} position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.25, 0.9, 0.12]} />
        </group>
      );
    case 'leaf':
      return (
        <group position={[p[0], top + 0.01, p[2]]}>
          {['#5d8a2f', '#4f7f2a', '#6f9a3a'].map((c, i) => (
            <Mesh key={i} color="#ffffff" surface={leaf(c)} geometry={leafGeometry()} rotation={[0.05, i * 2.1, 0]} scale={0.6} />
          ))}
        </group>
      );
    case 'flower':
      return (
        <group position={p}>
          <Mesh color="#5d8a2f" geometry={GEO.cylinder()} position={[0, 0.5, 0]} scale={[0.025, 1, 0.025]} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Mesh key={i} color="#f29bb5" surface={{ roughness: 0.6, sheen: 0.6 }} geometry={GEO.sphere()} position={[Math.cos(i * 1.26) * 0.11, 1.02, Math.sin(i * 1.26) * 0.11]} scale={[0.09, 0.02, 0.09]} />
          ))}
          <Mesh color="#f2c14e" geometry={GEO.sphere()} position={[0, 1.04, 0]} scale={0.05} />
        </group>
      );
    case 'potPlant':
      // ミカン科などの 鉢植え
      return (
        <group position={p}>
          <Mesh color="#b8643a" surface={{ roughness: 0.9, bumpMap: grainBump(88, 64), bumpScale: 2 }} geometry={GEO.pot()} position={[0, 0.2, 0]} scale={[0.3, 0.4, 0.3]} />
          <Mesh color="#4a3426" geometry={GEO.cylinder()} position={[0, 0.41, 0]} scale={[0.27, 0.02, 0.27]} />
          <Mesh color="#ffffff" surface={bark()} geometry={GEO.cylinder()} position={[0, 0.8, 0]} scale={[0.025, 0.8, 0.025]} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Mesh key={i} color="#ffffff" surface={leaf(i % 2 ? '#3f7426' : '#4c8430')} geometry={leafGeometry()} position={[0, 0.55 + i * 0.1, 0]} rotation={[0.7, i * 1.9, 0]} scale={0.38} />
          ))}
        </group>
      );
    case 'mulberryTwig':
      return (
        <group position={p} rotation={[0, 0.3, 0]}>
          <Mesh color="#ffffff" surface={bark()} geometry={GEO.cylinder()} position={[0, 0.04, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.035, 1.2, 0.035]} />
        </group>
      );
  }
}

/** ケース中央付近（飾りと重ならない）に置く、食べ物の場所 */
export function foodSpot(slot: number): V3 {
  void slot;
  return [-0.6, 0, 0.35];
}
