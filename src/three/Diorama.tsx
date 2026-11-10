import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useTier } from './QualityManager';
import { GEO, mat, sharedGeo } from './materials';
import { grainBump, grassTexture, leafTexture } from './textures';
import { rng } from './rng';

/** 決定的な疑似乱数（毎回同じ配置にしてチラつきを防ぐ） */
export { rng };

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
  material?: THREE.Material;
  /** 傾き（草の しなり） */
  tilt?: number;
}

/** InstancedMesh で 小物を まとめて 1 ドローコールで描く */
export function Scatter({ count, radius, seed, y = 0, geometry, colors, scale, stretchY = 1, innerRadius = 0, rect, material, tilt = 0.3 }: ScatterProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const fallback = useMemo(() => mat('#ffffff', { roughness: 0.85 }), []);
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
      e.set((r() - 0.5) * tilt, r() * Math.PI * 2, (r() - 0.5) * tilt);
      q.setFromEuler(e);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(colors[Math.floor(r() * colors.length)]!));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, radius, seed, y, colors, scale, stretchY, innerRadius, rect, tilt]);
  return <instancedMesh ref={ref} args={[geometry, material ?? fallback, count]} frustumCulled={false} receiveShadow />;
}

const leafShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.35, 0.25, 0.35, 0.75, 0, 1);
  s.bezierCurveTo(-0.35, 0.75, -0.35, 0.25, 0, 0);
  return s;
})();

/** 葉の形（テクスチャ用に 0..1 の UV つき、少し 反らせる） */
export function leafGeometry() {
  return sharedGeo('leaf2', () => {
    const g = new THREE.ShapeGeometry(leafShape, 8);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const yy = pos.getY(i);
      uv[i * 2] = x / 0.7 + 0.5;
      uv[i * 2 + 1] = yy;
      // 葉の ふちを すこし 持ち上げる
      pos.setZ(i, -Math.abs(x) * 0.25);
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.01, 0.5);
    g.computeVertexNormals();
    return g;
  });
}

/** 草の葉 1 枚（細長く、先が とがって しなる） */
function bladeGeometry() {
  return sharedGeo('blade', () => {
    const g = new THREE.BufferGeometry();
    const segs = 4;
    const pts: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const w = 0.04 * (1 - t);
      const bend = t * t * 0.25;
      pts.push(-w, t, bend, w, t, bend);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}

const GRASS = ['#5f8f2f', '#6e9c36', '#7aa83e', '#557f29', '#8bb04a'];
const LEAVES = ['#b07a3e', '#c48a48', '#8f6a3a', '#a8954a'];
const PEBBLES = ['#b9b0a4', '#a39a8e', '#cfc6ba', '#8e857a'];

/** 原っぱ（草地の 地面・草・落ち葉・小石）。画質に合わせて 草の量を変える */
export function Meadow({ radius = 7 }: { radius?: number }) {
  const tier = useTier();
  const ground = useMemo(() => mat('#ffffff', { map: grassTexture(), roughness: 0.95, bumpMap: grainBump(70, 96), bumpScale: 2 }), []);
  const soil = useMemo(() => mat('#5e4634', { roughness: 1, bumpMap: grainBump(71, 64), bumpScale: 3 }), []);
  const grassMat = useMemo(() => mat('#ffffff', { roughness: 0.7, side: THREE.DoubleSide }), []);
  const leafMat = useMemo(() => mat('#ffffff', { map: leafTexture('#c0a070'), roughness: 0.8, side: THREE.DoubleSide }), []);
  const stoneMat = useMemo(() => mat('#ffffff', { roughness: 0.9, bumpMap: grainBump(72, 32), bumpScale: 3 }), []);
  const blades = tier === 'high' ? 2600 : tier === 'mid' ? 1500 : 700;
  return (
    <group>
      <mesh geometry={GEO.cylinder()} material={ground} scale={[radius, 0.3, radius]} position={[0, -0.15, 0]} receiveShadow />
      <mesh geometry={GEO.cylinder()} material={soil} scale={[radius * 1.01, 0.6, radius * 1.01]} position={[0, -0.6, 0]} />
      <Scatter key={blades} count={blades} radius={radius - 0.15} innerRadius={1.4} seed={7} geometry={bladeGeometry()} material={grassMat} colors={GRASS} scale={[0.35, 0.7]} stretchY={1} y={0} tilt={0.5} />
      <Scatter count={50} radius={radius - 0.3} seed={11} geometry={leafGeometry()} material={leafMat} colors={LEAVES} scale={[0.25, 0.45]} y={0.004} tilt={0.15} />
      <Scatter count={30} radius={radius - 0.3} seed={3} geometry={GEO.sphereLo()} material={stoneMat} colors={PEBBLES} scale={[0.05, 0.13]} stretchY={0.55} y={0.02} />
    </group>
  );
}
