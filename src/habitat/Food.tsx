import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { FoodId } from '../sim/types';
import { leafGeometry } from '../three/Diorama';
import { GEO, mat, type MatOpts } from '../three/materials';
import { barkTexture, grainBump, leafTexture, matTexture } from '../three/textures';

type V3 = [number, number, number];

function Mesh({ color, surface, ...p }: { color: string; surface?: MatOpts; geometry: THREE.BufferGeometry; position?: V3; rotation?: V3; scale?: V3 | number }) {
  const m = useMemo(() => mat(color, surface ?? { roughness: 0.7 }), [color, surface]);
  return <mesh material={m} castShadow {...p} />;
}

const leafSurf = (c: string): MatOpts => ({ map: leafTexture(c), roughness: 0.55, side: THREE.DoubleSide });

/** 食べ物の見た目（3D のごはん）。道具として運ぶときにも使う */
export function FoodModel({ food }: { food: FoodId }) {
  switch (food) {
    case 'jelly':
      // 昆虫ゼリーのカップ（とうめいな カップに、つやのある ゼリー）
      return (
        <group>
          <Mesh color="#f4f4f0" surface={{ roughness: 0.1, clearcoat: 1, opacity: 0.55 }} geometry={GEO.cylinder()} position={[0, 0.12, 0]} scale={[0.19, 0.24, 0.19]} />
          <Mesh color="#c8432a" surface={{ roughness: 0.08, clearcoat: 1, translucent: true }} geometry={GEO.cylinder()} position={[0, 0.1, 0]} scale={[0.17, 0.2, 0.17]} />
          <Mesh color="#d9d9d4" surface={{ roughness: 0.3, metalness: 0.6 }} geometry={GEO.cylinder()} position={[0.12, 0.245, 0]} rotation={[0, 0, 0.6]} scale={[0.12, 0.005, 0.18]} />
        </group>
      );
    case 'mat':
      // 新しい マット（ふかふかの 腐葉土）
      return (
        <group>
          <Mesh color="#ffffff" surface={{ map: matTexture(), roughness: 1, bumpMap: grainBump(9, 64), bumpScale: 3 }} geometry={GEO.sphere()} position={[0, 0.02, 0]} scale={[0.5, 0.14, 0.4]} />
        </group>
      );
    case 'citrusLeaf':
    case 'mulberry':
      // ミカン（サンショウ）／クワの葉の 枝
      return (
        <group>
          <Mesh color="#ffffff" surface={{ map: barkTexture(), roughness: 0.9 }} geometry={GEO.cylinder()} position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.022, 0.8, 0.022]} />
          {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
            <Mesh
              key={x}
              color="#ffffff"
              surface={leafSurf(food === 'mulberry' ? '#5a8f32' : '#3a6f22')}
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
          <Mesh color="#4f7f2a" geometry={GEO.cylinder()} position={[0, 0.35, 0]} scale={[0.02, 0.7, 0.02]} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Mesh key={i} color="#f29bb5" surface={{ roughness: 0.6, sheen: 0.7 }} geometry={GEO.sphere()} position={[Math.cos(i * 1.26) * 0.1, 0.72, Math.sin(i * 1.26) * 0.1]} scale={[0.085, 0.02, 0.085]} />
          ))}
          <Mesh color="#f2c14e" geometry={GEO.sphere()} position={[0, 0.74, 0]} scale={0.045} />
        </group>
      );
    case 'eggplant':
      // ナスの 輪切りを くしに さして（土に 直接 ふれないように）
      return (
        <group>
          <Mesh color="#c9a77a" geometry={GEO.cylinder()} position={[0, 0.2, 0]} scale={[0.012, 0.4, 0.012]} />
          <Mesh color="#efe6c8" surface={{ roughness: 0.6, bumpMap: grainBump(14, 48), bumpScale: 1 }} geometry={GEO.cylinder()} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.16, 0.05, 0.16]} />
          <Mesh color="#3e1c4f" surface={{ roughness: 0.2, clearcoat: 1 }} geometry={GEO.cylinder()} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.17, 0.04, 0.17]} />
        </group>
      );
    case 'aphid':
      // アブラムシの ついた 草（小さな 黄緑の 虫が たくさん）
      return (
        <group>
          <Mesh color="#5d7f2f" geometry={GEO.cylinder()} position={[0, 0.3, 0]} scale={[0.022, 0.6, 0.022]} />
          <Mesh color="#ffffff" surface={leafSurf('#4f8a2b')} geometry={leafGeometry()} position={[0, 0.45, 0]} rotation={[0.8, 0.5, 0]} scale={0.3} />
          {Array.from({ length: 14 }, (_, i) => (
            <Mesh key={i} color="#9ccc4a" surface={{ roughness: 0.4, translucent: true }} geometry={GEO.sphereLo()} position={[0.026 * Math.cos(i * 2.4), 0.1 + i * 0.035, 0.026 * Math.sin(i * 2.4)]} scale={[0.014, 0.012, 0.02]} />
          ))}
        </group>
      );
    case 'smallInsect':
      // 小皿に のせた 小さな 虫（ミイデラゴミムシの ごはん）
      return (
        <group>
          <Mesh color="#e8e2d0" surface={{ roughness: 0.3, clearcoat: 0.6 }} geometry={GEO.cylinder()} position={[0, 0.02, 0]} scale={[0.22, 0.04, 0.22]} />
          {[0, 1, 2].map((i) => (
            <Mesh key={i} color="#a8743e" surface={{ roughness: 0.4, clearcoat: 0.6, bumpMap: grainBump(15, 32), bumpScale: 1 }} geometry={GEO.capsule()} position={[-0.08 + i * 0.08, 0.06, (i - 1) * 0.04]} rotation={[Math.PI / 2, 0, i]} scale={[0.035, 0.08, 0.035]} />
          ))}
        </group>
      );
    case 'wood':
      // カミキリムシの 幼虫が 食べる 生きた 木の 枝（木の 断面に 足す）
      return (
        <group>
          <Mesh color="#ffffff" surface={{ map: barkTexture(), roughness: 0.95 }} geometry={GEO.cylinder()} position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.1, 0.6, 0.1]} />
          <Mesh color="#e8d0a0" geometry={GEO.cylinder()} position={[0.301, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.09, 0.005, 0.09]} />
        </group>
      );
    case 'twig':
      // 若い 枝と 葉（成虫は 樹皮を かじる）
      return (
        <group>
          <Mesh color="#7a8a4a" surface={{ roughness: 0.7 }} geometry={GEO.cylinder()} position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.025, 0.8, 0.025]} />
          {[-0.25, 0.05, 0.3].map((x, i) => (
            <Mesh key={x} color="#ffffff" surface={leafSurf('#3f7426')} geometry={leafGeometry()} position={[x, 0.06, 0]} rotation={[0.15, i % 2 ? 0.7 : -0.7 + Math.PI, 0]} scale={0.38} />
          ))}
        </group>
      );
    case 'none':
      return null;
  }
}

/** ケースに置いた ごはん。量が減ると 小さくなり、なくなると 消える */
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
