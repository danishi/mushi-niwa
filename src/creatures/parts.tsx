import { Outlines } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { GEO, OUTLINE_COLOR, toon } from '../three/toon';
import type { CreatureAnim } from './anim';
import { cachedTube } from './geom';

type V3 = [number, number, number];
type AnimRef = { current: CreatureAnim };

/** 輪郭線つきのメッシュ。part を付けるとかんさつモードでタップできる */
export function Part({
  geometry,
  color,
  position,
  rotation,
  scale,
  outline = true,
  outlines,
  part,
  emissive,
  children,
  castShadow = true,
  meshRef,
}: {
  geometry: THREE.BufferGeometry;
  color: string;
  position?: V3;
  rotation?: V3;
  scale?: V3 | number;
  outline?: boolean;
  outlines: boolean;
  part?: string;
  emissive?: string;
  children?: ReactNode;
  castShadow?: boolean;
  meshRef?: (m: THREE.Mesh | null) => void;
}) {
  const mat = useMemo(() => toon(color, emissive ? { emissive, emissiveIntensity: 0.25 } : {}), [color, emissive]);
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={mat}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      userData={part ? { part } : undefined}
    >
      {outline && outlines ? <Outlines thickness={0.045} color={OUTLINE_COLOR} /> : null}
      {children}
    </mesh>
  );
}

/** デフォルメした目：白目＋黒目＋ハイライト。寝ると閉じる */
export function Eye({ position, size = 0.1, anim, pupil = '#2b2118' }: { position: V3; size?: number; anim: AnimRef; pupil?: string }) {
  const lid = useRef<THREE.Group>(null);
  const white = useMemo(() => toon('#ffffff'), []);
  const black = useMemo(() => toon(pupil), [pupil]);
  const shine = useMemo(() => toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1.5 }), []);
  const blinkSeed = useMemo(() => Math.random() * 5, []);
  useFrame(() => {
    const a = anim.current;
    const blink = ((a.t + blinkSeed) % 4.2) < 0.12 ? 0.15 : 1;
    const open = THREE.MathUtils.lerp(1, 0.12, a.sleep) * blink;
    if (lid.current) lid.current.scale.y = open;
  });
  return (
    <group position={position}>
      <group ref={lid}>
        <mesh geometry={GEO.sphere()} material={white} scale={size} />
        <mesh geometry={GEO.sphere()} material={black} scale={size * 0.62} position={[0, 0, size * 0.48]} />
        <mesh geometry={GEO.sphereLo()} material={shine} scale={size * 0.22} position={[size * 0.25, size * 0.3, size * 0.95]} />
      </group>
    </group>
  );
}

/**
 * 2 節の脚。walk に合わせて交互（3 脚歩行）に振る。
 * side: 左 -1 / 右 +1、pair: 前 0 / 中 1 / 後 2
 */
export function Leg({
  position,
  side,
  pair,
  length = 0.4,
  thick = 0.035,
  color,
  anim,
  spread = 0.9,
  outlines,
  part,
}: {
  position: V3;
  side: 1 | -1;
  pair: number;
  length?: number;
  thick?: number;
  color: string;
  anim: AnimRef;
  spread?: number;
  outlines: boolean;
  part?: string;
}) {
  const hip = useRef<THREE.Group>(null);
  const knee = useRef<THREE.Group>(null);
  const mat = useMemo(() => toon(color), [color]);
  // 3 脚歩行：左前・右中・左後 が同じ位相
  const phase = ((pair % 2 === 0 ? 0 : Math.PI) + (side > 0 ? Math.PI : 0)) % (Math.PI * 2);
  const baseYaw = (pair - 1) * -0.55 * side;
  useFrame(() => {
    const a = anim.current;
    const g = a.gait + phase;
    const swing = Math.sin(g) * 0.45 * a.walk;
    const lift = Math.max(0, Math.cos(g)) * 0.35 * a.walk;
    const tuck = a.sleep * 0.5;
    if (hip.current) {
      hip.current.rotation.y = baseYaw + swing * side;
      hip.current.rotation.z = side * (spread * 0.6 - lift - tuck * 0.3) * -1;
    }
    if (knee.current) knee.current.rotation.z = -side * (1.1 + tuck);
  });
  const half = length / 2;
  return (
    <group ref={hip} position={position}>
      <mesh geometry={GEO.cylinder()} material={mat} position={[side * half * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[thick, half, thick]} userData={part ? { part } : undefined} castShadow>
        {outlines ? <Outlines thickness={0.6} color={OUTLINE_COLOR} /> : null}
      </mesh>
      <group ref={knee} position={[side * half, 0, 0]}>
        <mesh geometry={GEO.cylinder()} material={mat} position={[side * half * 0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[thick * 0.8, half * 1.1, thick * 0.8]} userData={part ? { part } : undefined} castShadow>
          {outlines ? <Outlines thickness={0.6} color={OUTLINE_COLOR} /> : null}
        </mesh>
      </group>
    </group>
  );
}

/** 触角。ゆらゆら揺れる。kind で先の形を変える */
export function Antenna({
  position,
  side,
  length = 0.4,
  color,
  anim,
  kind = 'thread',
  up = 0.5,
  forward = 0.6,
  part,
  outlines,
}: {
  position: V3;
  side: 1 | -1;
  length?: number;
  color: string;
  anim: AnimRef;
  kind?: 'thread' | 'club' | 'comb' | 'short';
  up?: number;
  forward?: number;
  part?: string;
  outlines: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const mat = useMemo(() => toon(color), [color]);
  const seed = useMemo(() => Math.random() * 6, []);
  const L = length;
  const geo = useMemo(
    () =>
      cachedTube(
        `ant:${kind}:${L.toFixed(2)}:${up}:${forward}`,
        [
          [0, 0, 0],
          [0.15 * L, up * 0.5 * L, forward * 0.4 * L],
          [0.3 * L, up * L, forward * 0.9 * L],
          [0.45 * L, up * 1.1 * L, forward * 1.3 * L],
        ],
        kind === 'thread' ? 0.018 : 0.025,
        kind === 'thread' ? 0.006 : 0.02,
        12,
        5,
      ),
    [kind, L, up, forward],
  );
  useFrame(() => {
    const a = anim.current;
    if (!ref.current) return;
    const sway = Math.sin(a.t * (1.5 + a.energy) + seed) * 0.15 * (0.4 + a.energy);
    ref.current.rotation.set(sway * 0.6 - a.sleep * 0.4, sway, 0);
  });
  const tip: V3 = [0.45 * L, up * 1.1 * L, forward * 1.3 * L];
  return (
    <group position={position} scale={[side, 1, 1]}>
      <group ref={ref}>
        <mesh geometry={geo} material={mat} userData={part ? { part } : undefined}>
          {outlines && kind !== 'thread' ? <Outlines thickness={0.01} color={OUTLINE_COLOR} /> : null}
        </mesh>
        {kind === 'club' || kind === 'short' ? (
          <mesh geometry={GEO.sphereLo()} material={mat} position={tip} scale={kind === 'short' ? 0.05 : 0.04} userData={part ? { part } : undefined} />
        ) : null}
        {kind === 'comb'
          ? [0.3, 0.5, 0.7, 0.9].map((t) => (
              <mesh
                key={t}
                geometry={GEO.cylinder()}
                material={mat}
                position={[tip[0] * t + 0.03, tip[1] * t, tip[2] * t]}
                rotation={[0, 0, Math.PI / 2.5]}
                scale={[0.008, 0.1 * (1 - Math.abs(t - 0.6)), 0.008]}
              />
            ))
          : null}
      </group>
    </group>
  );
}
