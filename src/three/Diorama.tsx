import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, toon } from './toon';

/** 決定的な疑似乱数（毎回同じ配置にしてチラつきを防ぐ） */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface ScatterProps {
  count: number;
  radius: number;
  seed: number;
  y?: number;
  geometry: THREE.BufferGeometry;
  colors: string[];
  scale: [number, number];
  /** 縦長にする（草など） */
  stretchY?: number;
  /** 半径方向の内側をあける */
  innerRadius?: number;
  /** 四角形に撒く（ケース用） */
  rect?: [number, number];
}

/** InstancedMesh で小物をまとめて 1 ドローコールで描く */
export function Scatter({
  count,
  radius,
  seed,
  y = 0,
  geometry,
  colors,
  scale,
  stretchY = 1,
  innerRadius = 0,
  rect,
}: ScatterProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => toon('#ffffff'), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const r = rng(seed);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      if (rect) {
        p.set((r() - 0.5) * rect[0], y, (r() - 0.5) * rect[1]);
      } else {
        const a = r() * Math.PI * 2;
        const d = innerRadius + Math.sqrt(r()) * (radius - innerRadius);
        p.set(Math.cos(a) * d, y, Math.sin(a) * d);
      }
      const k = scale[0] + r() * (scale[1] - scale[0]);
      s.set(k, k * stretchY, k);
      e.set((r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.3);
      q.setFromEuler(e);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(colors[Math.floor(r() * colors.length)]!));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, radius, seed, y, colors, scale, stretchY, innerRadius, rect]);
  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />;
}

const leafShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.35, 0.25, 0.35, 0.75, 0, 1);
  s.bezierCurveTo(-0.35, 0.75, -0.35, 0.25, 0, 0);
  return s;
})();

let leafGeo: THREE.BufferGeometry | null = null;
export function leafGeometry() {
  if (!leafGeo) {
    leafGeo = new THREE.ShapeGeometry(leafShape, 6);
    leafGeo.rotateX(-Math.PI / 2);
    leafGeo.translate(0, 0.01, 0.5);
  }
  return leafGeo;
}

const GRASS = ['#9ccc65', '#8bc34a', '#aed581', '#7cb342'];
const LEAVES = ['#c5a46e', '#d9a066', '#b5835a', '#e0b97a', '#9ccc65'];
const PEBBLES = ['#d7ccc8', '#bcaaa4', '#e8dccb'];

/** 丸い原っぱ（タイトルなど屋外用） */
export function Meadow({ radius = 7 }: { radius?: number }) {
  const ground = useMemo(() => toon('#c8e6a0'), []);
  const soil = useMemo(() => toon('#a1887f'), []);
  return (
    <group>
      <mesh geometry={GEO.cylinder()} material={ground} scale={[radius, 0.3, radius]} position={[0, -0.15, 0]} receiveShadow />
      <mesh geometry={GEO.cylinder()} material={soil} scale={[radius * 1.01, 0.6, radius * 1.01]} position={[0, -0.6, 0]} />
      <Scatter count={260} radius={radius - 0.2} innerRadius={1.6} seed={7} geometry={GEO.cone()} colors={GRASS} scale={[0.12, 0.22]} stretchY={3} y={0.15} />
      <Scatter count={40} radius={radius - 0.3} seed={11} geometry={leafGeometry()} colors={LEAVES} scale={[0.3, 0.55]} y={0.005} />
      <Scatter count={24} radius={radius - 0.3} seed={3} geometry={GEO.sphereLo()} colors={PEBBLES} scale={[0.06, 0.14]} stretchY={0.6} y={0.02} />
    </group>
  );
}
