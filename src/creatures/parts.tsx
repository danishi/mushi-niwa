import { useFrame } from '@react-three/fiber';
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GEO, mat, sharedGeo, SURF, type MatOpts } from '../three/materials';
import { facetNormal } from '../three/textures';
import type { CreatureAnim } from './anim';
import { mergedGeo, shapedTube, taperedTube } from './geom';

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
  const material = useMemo(() => mat(color, { ...SURF.eye(), normalMap: facetNormal(), normalScale: 0.5 }), [color]);
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

/** 腿節（根元→ひざ。+X 方向に伸びる）。つけねに 基節・転節の ふくらみ、ひざに 関節 */
function femurGeo(s: LegSpec) {
  return mergedGeo(`femur:${legKey(s)}`, () => {
    const L = s.femur;
    const t = s.thick * (s.jumper ? 1.8 : 1);
    const swell = s.jumper ? 1.0 : 0.55;
    // 腿節は まん中が ふくらみ、上下に 少し 平たい。ひざの 手前で くびれる
    const femur = shapedTube(
      [[0, 0, 0], [L * 0.35, t * 0.25, 0], [L * 0.7, t * 0.15, 0], [L, 0, 0]],
      (u) => {
        const k = 0.55 + swell * 0.8 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.8 - 0.12 * THREE.MathUtils.smoothstep(u, 0.8, 1);
        return [t * k * 0.82, t * k * 1.08];
      },
      12,
      10,
      [0, 0, 1],
    );
    const coxa = new THREE.SphereGeometry(1, 12, 8);
    coxa.scale(t * 1.1, t * 0.95, t * 1.1);
    const knee = new THREE.SphereGeometry(1, 10, 8);
    knee.scale(t * 0.6, t * 0.62, t * 0.56);
    knee.translate(L, 0, 0);
    return [femur, coxa, knee];
  });
}

/**
 * 脛節＋ふ節＋つめ（ひざ→先。-Y 方向へ下りて、先は外へ）。
 * 脛節は 先へ 向かって 広がり、外がわに 歯、先に 2 本の 距（きょ）。
 * ふ節は 先が 太い 小さな 節が つらなり、最後の 節に かぎ形の つめが 2 本。
 */
function lowerLegGeo(s: LegSpec) {
  return mergedGeo(`lower:${legKey(s)}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    const T = s.tibia;
    const th = s.thick * 0.75;
    const teeth = s.teeth ?? 0;
    const flare = teeth > 0 ? 0.55 : 0.22;
    const end: [number, number, number] = [0.05 * T, -T, 0];
    parts.push(
      shapedTube(
        [[0, 0, 0], [0.02 * T, -T * 0.5, 0], end],
        (u) => [th * (0.62 + flare * u * u), th * (0.52 + 0.06 * u)],
        10,
        8,
        [1, 0, 0],
      ),
    );
    // すねの 外がわの 歯（先ほど 大きく、下・外へ 向く）
    for (let i = 0; i < teeth; i++) {
      const u = 1 - (i + 0.35) / (teeth + 0.6);
      const w = th * (0.62 + flare * u * u);
      const c = new THREE.ConeGeometry(th * 0.42, th * (1.5 + u * 0.9), 6);
      c.scale(1, 1, 0.6);
      c.rotateZ(-Math.PI / 2 - 0.5);
      c.translate(0.02 * T + 0.03 * T * u + w * 1.15, -T * u - th * 0.25, 0);
      parts.push(c);
    }
    // 先の 距
    for (const z of [-1, 1]) {
      const c = new THREE.ConeGeometry(th * 0.2, th * 1.3, 5);
      c.rotateZ(Math.PI - 0.5);
      c.translate(end[0] - th * 0.3, end[1] - th * 0.45, z * th * 0.45);
      parts.push(c);
    }
    // ふ節
    const n = s.tarsi ?? 5;
    const unit = s.tarsus / (n + 0.6);
    let x = end[0];
    let y = end[1];
    let ang = -1.15;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      const len = unit * (last ? 1.6 : 1);
      ang = -1.15 + ((i + 0.5) / n) * 0.75;
      const nx = x + Math.cos(ang) * len;
      const ny = y + Math.sin(ang) * len;
      parts.push(
        shapedTube(
          [[x, y, 0], [(x + nx) / 2, (y + ny) / 2, 0], [nx, ny, 0]],
          (u) => {
            const k = last ? 0.2 + 0.1 * u : 0.17 + 0.2 * u * u;
            return [th * k, th * k * 1.1];
          },
          4,
          7,
          [0, 0, 1],
        ),
      );
      x = nx;
      y = ny;
    }
    // つめ：外へ ひらいて 下へ 曲がる かぎ
    const cl = unit * 0.95;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    for (const z of [-1, 1]) {
      parts.push(
        shapedTube(
          [
            [x, y, 0],
            [x + dx * cl * 0.55, y + dy * cl * 0.55 + cl * 0.12, z * cl * 0.3],
            [x + dx * cl * 0.95, y + dy * cl * 0.95 - cl * 0.1, z * cl * 0.48],
            [x + dx * cl * 1.05, y + dy * cl * 1.05 - cl * 0.5, z * cl * 0.5],
          ],
          (u) => [th * 0.11 * (1 - u * 0.85), th * 0.11 * (1 - u * 0.85)],
          6,
          5,
          [0, 0, 1],
        ),
      );
    }
    return parts;
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
