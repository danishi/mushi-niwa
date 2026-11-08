import { useFrame } from '@react-three/fiber';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GEO, mat, sharedGeo, SURF, type MatOpts } from '../three/materials';
import { grainBump } from '../three/textures';
import type { CreatureAnim } from './anim';
import { taperedTube } from './geom';

type V3 = [number, number, number];
type AnimRef = { current: CreatureAnim };

/** 棚に並べた小さな虫など、遠目の表示では細部を省いてドローコールを減らす */
export const LiteContext = createContext(false);

/** 1 つの部位のメッシュ。part を付けると かんさつモードで タップできる */
export function Part({
  geometry,
  color,
  surface,
  position,
  rotation,
  scale,
  part,
  children,
  castShadow = false,
  meshRef,
}: {
  geometry: THREE.BufferGeometry;
  color: string;
  surface?: MatOpts;
  position?: V3;
  rotation?: V3;
  scale?: V3 | number;
  part?: string;
  children?: ReactNode;
  castShadow?: boolean;
  meshRef?: (m: THREE.Mesh | null) => void;
}) {
  const material = useMemo(() => mat(color, surface ?? SURF.matteChitin()), [color, surface]);
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      userData={part ? { part } : undefined}
    >
      {children}
    </mesh>
  );
}

/** 複眼：黒っぽく つやのある 楕円体（デフォルメなし） */
export function CompoundEye({ position, size, color = '#1a1512', part }: { position: V3; size: [number, number, number] | number; color?: string; part?: string }) {
  const material = useMemo(() => mat(color, { ...SURF.eye(), bumpMap: grainBump(3, 96), bumpScale: 0.6 }), [color]);
  return <mesh geometry={GEO.sphere()} material={material} position={position} scale={size} userData={part ? { part } : undefined} />;
}

export interface LegSpec {
  femur: number;
  tibia: number;
  tarsus: number;
  /** 太さ（腿節のいちばん太いところ） */
  thick: number;
  /** ふ節の数 */
  tarsi?: number;
  /** すねの外側の とげ（カブトムシなど） */
  teeth?: number;
  /** 腿節を太くする（跳ぶ虫の後ろあし） */
  jumper?: boolean;
}

function legKey(s: LegSpec) {
  return `${s.femur}:${s.tibia}:${s.tarsus}:${s.thick}:${s.tarsi ?? 5}:${s.teeth ?? 0}:${s.jumper ? 1 : 0}`;
}

/** 腿節（根元→ひざ。+X 方向に伸びる） */
function femurGeo(s: LegSpec) {
  return sharedGeo(`femur:${legKey(s)}`, () => {
    const L = s.femur;
    const t = s.thick * (s.jumper ? 1.8 : 1);
    const g = taperedTube(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(L * 0.35, 0.01, 0), new THREE.Vector3(L * 0.7, 0.005, 0), new THREE.Vector3(L, 0, 0)],
      t * 0.8,
      t * 0.55,
      10,
      8,
    );
    // まんなかを少し太らせる
    const p = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = 1 + 0.35 * Math.sin((v.x / L) * Math.PI) * (s.jumper ? 1.6 : 1);
      v.y *= k;
      v.z *= k;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
}

/** 脛節＋ふ節＋つめ（ひざ→先。-Y 方向へ下りて、先は外へ） */
function lowerLegGeo(s: LegSpec) {
  return sharedGeo(`lower:${legKey(s)}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    const T = s.tibia;
    const th = s.thick * 0.75;
    parts.push(
      taperedTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02 * T, -T * 0.5, 0), new THREE.Vector3(0.05 * T, -T, 0)], th, th * 0.85, 8, 7),
    );
    // すねの外側の歯（とげ）
    for (let i = 0; i < (s.teeth ?? 0); i++) {
      const c = new THREE.ConeGeometry(th * 0.45, th * 1.6, 5);
      c.rotateZ(-Math.PI / 2);
      c.translate(th * 1.1, -T * (0.45 + i * 0.18), 0);
      parts.push(c);
    }
    // ふ節：小さな節が つらなる
    const n = s.tarsi ?? 5;
    const base = new THREE.Vector3(0.05 * T, -T, 0);
    const seg = s.tarsus / n;
    for (let i = 0; i < n; i++) {
      const sp = new THREE.SphereGeometry(1, 8, 6);
      sp.scale(seg * 0.55, th * 0.42, th * 0.42);
      const a = -1.1 + (i / n) * 0.5; // 外向きに なだらかに
      sp.rotateZ(a);
      sp.translate(base.x + Math.cos(a) * seg * (i + 0.5), base.y + Math.sin(a) * seg * (i + 0.5), 0);
      parts.push(sp);
    }
    // つめ（2 本）
    const tip = new THREE.Vector3(base.x + Math.cos(-0.6) * seg * n, base.y + Math.sin(-0.6) * seg * n, 0);
    for (const z of [-1, 1]) {
      const c = new THREE.ConeGeometry(th * 0.18, seg * 0.9, 4);
      c.rotateZ(-Math.PI / 2 - 0.9);
      c.translate(tip.x, tip.y, z * th * 0.2);
      parts.push(c);
    }
    const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
    merged.computeVertexNormals();
    return merged;
  });
}

/**
 * 写実的な脚（腿節・脛節・ふ節・つめ）。walk に合わせて 3 脚歩行で動く。
 * side: 左 -1 / 右 +1、pair: 前 0 / 中 1 / 後 2
 */
export function Leg({
  position,
  side,
  pair,
  spec,
  color,
  anim,
  spread = 0.3,
  yaw = 0,
  part,
}: {
  position: V3;
  side: 1 | -1;
  pair: number;
  spec: LegSpec;
  color: string;
  anim: AnimRef;
  /** 腿節の持ち上げ角 */
  spread?: number;
  /** 前後の向き（ラジアン、+ で前向き） */
  yaw?: number;
  part?: string;
}) {
  const hip = useRef<THREE.Group>(null);
  const knee = useRef<THREE.Group>(null);
  const lite = useContext(LiteContext);
  const material = useMemo(() => mat(color, SURF.matteChitin()), [color]);
  const phase = ((pair % 2 === 0 ? 0 : Math.PI) + (side > 0 ? Math.PI : 0)) % (Math.PI * 2);
  const defaultYaw = yaw || (1 - pair) * 0.55;
  useFrame(() => {
    const a = anim.current;
    const g = a.gait + phase;
    const swing = Math.sin(g) * 0.4 * a.walk;
    const lift = Math.max(0, Math.cos(g)) * 0.3 * a.walk;
    const tuck = a.sleep * 0.35;
    // 右側（+X）の脚として回す。左は外側の group で鏡写しにする
    if (hip.current) {
      hip.current.rotation.y = -(defaultYaw + swing);
      hip.current.rotation.z = spread + lift + tuck;
    }
    // すねは 外側へ ひらいて 地面に つく（たたむと 体の下へ）
    if (knee.current) knee.current.rotation.z = 0.7 - spread * 0.5 + lift * 0.25 - tuck * 0.8;
  });
  return (
    <group position={position} scale={[side, 1, 1]}>
      <group ref={hip}>
        <mesh geometry={femurGeo(spec)} material={material} userData={part ? { part } : undefined} />
        {lite ? null : (
          <group ref={knee} position={[spec.femur, 0, 0]}>
            <mesh geometry={lowerLegGeo(spec)} material={material} userData={part ? { part } : undefined} />
          </group>
        )}
      </group>
    </group>
  );
}

export type AntennaKind = 'filiform' | 'clubbed' | 'lamellate' | 'bipectinate' | 'clavate';

function antennaGeo(kind: AntennaKind, L: number, thick: number) {
  return sharedGeo(`ant:${kind}:${L}:${thick}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.12 * L, 0.25 * L, 0.35 * L),
      new THREE.Vector3(0.25 * L, 0.45 * L, 0.7 * L),
      new THREE.Vector3(0.38 * L, 0.55 * L, 1.0 * L),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    if (kind === 'lamellate') {
      // カブトムシ：短い柄と、先の 3 枚の板（片状部）
      parts.push(taperedTube(pts.slice(0, 3), thick, thick * 0.8, 6, 5));
      const tip = curve.getPoint(0.7);
      for (let i = 0; i < 3; i++) {
        const b = new THREE.SphereGeometry(1, 8, 6);
        b.scale(thick * 2.6, thick * 0.6, thick * 1.8);
        b.rotateZ(0.3);
        b.translate(tip.x + i * thick * 0.4, tip.y + i * thick * 0.9, tip.z + thick);
        parts.push(b);
      }
    } else {
      parts.push(taperedTube(pts, thick, kind === 'filiform' ? thick * 0.35 : thick * 0.8, 18, 5));
      if (kind === 'clubbed' || kind === 'clavate') {
        const tip = curve.getPoint(1);
        const c = new THREE.SphereGeometry(1, 10, 8);
        c.scale(thick * (kind === 'clubbed' ? 1.9 : 2.4), thick * (kind === 'clubbed' ? 1.9 : 2.4), thick * (kind === 'clubbed' ? 4 : 3));
        c.translate(tip.x, tip.y, tip.z);
        parts.push(c);
      }
      if (kind === 'bipectinate') {
        // カイコガのオス：くしのような 枝
        for (let i = 2; i < 16; i++) {
          const t = i / 16;
          const p = curve.getPoint(t);
          for (const s of [-1, 1]) {
            const br = new THREE.CylinderGeometry(thick * 0.18, thick * 0.12, L * 0.18 * Math.sin(t * Math.PI), 4);
            br.rotateZ(s * 1.0);
            br.rotateX(0.4);
            br.translate(p.x + s * L * 0.06, p.y, p.z);
            parts.push(br);
          }
        }
      }
      if (kind === 'filiform') {
        // 節の ふくらみ（スズムシなどの長い触角に）
        for (let i = 1; i < 14; i++) {
          const p = curve.getPoint(i / 14);
          const r = THREE.MathUtils.lerp(thick, thick * 0.35, i / 14) * 1.25;
          const s = new THREE.SphereGeometry(r, 5, 4);
          s.translate(p.x, p.y, p.z);
          parts.push(s);
        }
      }
    }
    const m = mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
    m.computeVertexNormals();
    return m;
  });
}

/** 触角。ゆっくり揺れて まわりを さぐる */
export function Antenna({
  position,
  side,
  length,
  thick = 0.012,
  kind,
  color,
  anim,
  rotation = [0, 0, 0],
  part,
  bands,
}: {
  position: V3;
  side: 1 | -1;
  length: number;
  thick?: number;
  /** 節の つけねの 色の帯（ゴマダラカミキリの 白い しまなど） */
  bands?: string;
  kind: AntennaKind;
  color: string;
  anim: AnimRef;
  rotation?: V3;
  part?: string;
}) {
  const ref = useRef<THREE.Group>(null);
  const material = useMemo(() => mat(color, SURF.matteChitin()), [color]);
  const seed = useMemo(() => Math.random() * 6, []);
  useFrame(() => {
    const a = anim.current;
    if (!ref.current) return;
    const sway = Math.sin(a.t * (1.2 + a.energy * 1.5) + seed) * 0.12 * (0.3 + a.energy);
    ref.current.rotation.set(rotation[0] + sway * 0.5 - a.sleep * 0.3, rotation[1] + sway, rotation[2]);
  });
  return (
    <group position={position} scale={[side, 1, 1]}>
      <group ref={ref}>
        <mesh geometry={antennaGeo(kind, length, thick)} material={material} userData={part ? { part } : undefined} />
        {bands ? <mesh geometry={bandsGeo(length, thick)} material={bandMat(bands)} /> : null}
      </group>
    </group>
  );
}

function bandMat(color: string) {
  return mat(color, { roughness: 0.6 });
}

/** 触角に そった 帯（小さな 球を まとめて 1 ジオメトリ） */
function bandsGeo(L: number, thick: number) {
  return sharedGeo(`bands:${L}:${thick}`, () => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.12 * L, 0.25 * L, 0.35 * L),
      new THREE.Vector3(0.25 * L, 0.45 * L, 0.7 * L),
      new THREE.Vector3(0.38 * L, 0.55 * L, 1.0 * L),
    ]);
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 10; i++) {
      const t = 0.12 + i * 0.085;
      const p = curve.getPoint(t);
      const r = THREE.MathUtils.lerp(thick, thick * 0.35, t) * 1.45;
      const sp = new THREE.SphereGeometry(r, 6, 5);
      sp.translate(p.x, p.y, p.z);
      parts.push(sp.toNonIndexed());
    }
    return mergeGeometries(parts)!;
  });
}
