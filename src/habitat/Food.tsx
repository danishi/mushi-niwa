import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { FoodId } from '../sim/types';
import { leafGeometry } from '../three/Diorama';
import { GEO, toon } from '../three/toon';

type V3 = [number, number, number];

function Mesh({ color, ...p }: { color: string; geometry: THREE.BufferGeometry; position?: V3; rotation?: V3; scale?: V3 | number }) {
  const m = useMemo(() => toon(color), [color]);
  return <mesh material={m} castShadow {...p} />;
}

/** 食べ物の見た目（3D のごはん）。ドラッグ中の道具にも使う */
export function FoodModel({ food }: { food: FoodId }) {
  switch (food) {
    case 'jelly':
      // 昆虫ゼリーのカップ
      return (
        <group>
          <Mesh color="#fffaf0" geometry={GEO.cylinder()} position={[0, 0.12, 0]} scale={[0.2, 0.24, 0.2]} />
          <Mesh color="#e76f51" geometry={GEO.cylinder()} position={[0, 0.245, 0]} scale={[0.18, 0.02, 0.18]} />
          <Mesh color="#f4a261" geometry={GEO.sphere()} position={[0, 0.26, 0]} scale={[0.12, 0.04, 0.12]} />
        </group>
      );
    case 'mat':
      // 新しいマット（ふかふかの腐葉土の山）
      return (
        <group>
          <Mesh color="#3b261a" geometry={GEO.sphere()} position={[0, 0.02, 0]} scale={[0.5, 0.14, 0.4]} />
          <Mesh color="#a07850" geometry={leafGeometry()} position={[0.1, 0.12, 0]} rotation={[0.2, 1, 0]} scale={0.25} />
        </group>
      );
    case 'citrusLeaf':
    case 'mulberry':
      // ミカン（サンショウ）／クワの葉の枝
      return (
        <group>
          <Mesh color="#8d6e63" geometry={GEO.cylinder()} position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.025, 0.8, 0.025]} />
          {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
            <Mesh
              key={x}
              color={food === 'mulberry' ? '#6a9e3a' : '#4f8a2b'}
              geometry={leafGeometry()}
              position={[x, 0.06, 0]}
              rotation={[0.15, i % 2 ? 0.6 : -0.6 + Math.PI, 0]}
              scale={food === 'mulberry' ? 0.55 : 0.42}
            />
          ))}
        </group>
      );
    case 'nectar':
      // 花（みつ）
      return (
        <group>
          <Mesh color="#7cb342" geometry={GEO.cylinder()} position={[0, 0.35, 0]} scale={[0.025, 0.7, 0.025]} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Mesh key={i} color="#ff8fab" geometry={GEO.sphere()} position={[Math.cos(i * 1.26) * 0.11, 0.72, Math.sin(i * 1.26) * 0.11]} scale={[0.09, 0.025, 0.09]} />
          ))}
          <Mesh color="#ffd166" geometry={GEO.sphere()} position={[0, 0.74, 0]} scale={0.05} />
        </group>
      );
    case 'eggplant':
      // ナスの輪切りを串に刺して（土に直接触れないように）
      return (
        <group>
          <Mesh color="#c8a27a" geometry={GEO.cylinder()} position={[0, 0.2, 0]} scale={[0.015, 0.4, 0.015]} />
          <Mesh color="#f3ecd2" geometry={GEO.cylinder()} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.17, 0.05, 0.17]} />
          <Mesh color="#5b2a6e" geometry={GEO.cylinder()} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.18, 0.04, 0.18]} />
        </group>
      );
    case 'aphid':
      // アブラムシのついた草（小さな緑の点々）
      return (
        <group>
          <Mesh color="#6d8b3a" geometry={GEO.cylinder()} position={[0, 0.3, 0]} scale={[0.025, 0.6, 0.025]} />
          <Mesh color="#7cb342" geometry={leafGeometry()} position={[0, 0.45, 0]} rotation={[0.8, 0.5, 0]} scale={0.3} />
          {Array.from({ length: 9 }, (_, i) => (
            <Mesh key={i} color="#a5d66b" geometry={GEO.sphereLo()} position={[0.03 * Math.cos(i * 2.4), 0.1 + i * 0.05, 0.03 * Math.sin(i * 2.4)]} scale={0.022} />
          ))}
        </group>
      );
    case 'smallInsect':
      // 小皿にのせた ちいさな むし（ミイデラゴミムシのごはん）
      return (
        <group>
          <Mesh color="#e8e2d0" geometry={GEO.cylinder()} position={[0, 0.02, 0]} scale={[0.22, 0.04, 0.22]} />
          {[0, 1, 2].map((i) => (
            <Mesh key={i} color="#b5835a" geometry={GEO.capsule()} position={[-0.08 + i * 0.08, 0.07, (i - 1) * 0.04]} rotation={[Math.PI / 2, 0, i]} scale={[0.05, 0.08, 0.05]} />
          ))}
        </group>
      );
    case 'none':
      return null;
  }
}

/** ケースに置いたごはん。量が減ると小さくなり、なくなると消える */
export function PlacedFood({ food, amount, position }: { food: FoodId; amount: number; position: V3 }) {
  const ref = useRef<THREE.Group>(null);
  const shown = useRef(0);
  useFrame((_, dt) => {
    shown.current = THREE.MathUtils.damp(shown.current, amount, 4, dt);
    const g = ref.current;
    if (!g) return;
    const k = shown.current;
    g.visible = k > 0.03;
    g.scale.setScalar(0.4 + 0.6 * Math.sqrt(k));
  });
  return (
    <group ref={ref} position={position}>
      <FoodModel food={food} />
    </group>
  );
}
