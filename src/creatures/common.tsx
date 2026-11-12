import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, SURF, type MatOpts } from '../three/materials';
import type { CreatureAnim } from './anim';

type V3 = [number, number, number];

/**
 * 体全体の 動き：呼吸・タップしたときの ぴくっ・脱皮前の ふるえ・食べるときの うなずき、
 * 歩く ときの 左右の ゆれ、しぐさ（背のび・見回す・風に ゆれる まね）、びくっ と した ときの 身がまえ。
 * amount は 歩く ときの ゆれの 大きさ（飛ぶ 虫は 0）。soft は 節が つらなる 幼虫（背のび・見回しは 節ごとに 動かす）。
 */
export function useBodyMotion(anim: { current: CreatureAnim }, amount = 1, soft = false) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    const g = ref.current;
    if (!g) return;
    const breathe = Math.sin(a.t * (1 + a.energy)) * 0.012 * (1 - a.sleep * 0.5);
    const twitch = a.bounce;
    const step = Math.sin(a.gait) * a.walk * amount;
    // 枝や 葉が 風に ゆれる ように、ゆっくり 前後・左右に ゆれる
    const rock = Math.sin(a.t * 2.3) * a.sway;
    // やわらかい 幼虫は 体ごと かたむけず、前の 節だけを 持ち上げる（larvaReach）
    const rear = soft ? 0 : a.rear;
    const look = soft ? 0 : a.look;
    g.scale.set(1 + breathe, 1 + breathe - twitch * 0.04, 1 + breathe);
    g.position.x = rock * 0.018;
    g.position.y = Math.abs(Math.sin(a.gait * 2)) * 0.012 * a.walk * amount + twitch * 0.03 + rear * 0.035 - a.startle * 0.012 - a.sleep * 0.01 * amount;
    g.rotation.x = -a.eat * 0.1 * Math.max(0.3, Math.sin(a.t * 8) * 0.5 + 0.5) - rear * 0.24 + a.startle * 0.05 + rock * 0.03;
    g.rotation.y = step * 0.045 + look * 0.3;
    g.rotation.z = Math.sin(a.t * 40) * 0.04 * a.shiver + step * 0.025 + rock * 0.06;
  });
  return ref;
}

/**
 * 幼虫が 頭を 持ち上げて 左右に ふる（足場や 葉を さがす）ときの、節 i（0 が 頭がわ）の ずれ [横, 上]。
 * 前から span 節ぶんだけが 動き、後ろは 地面に ついた まま。
 */
export function larvaReach(a: CreatureAnim, i: number, span = 4): [number, number] {
  const f = Math.max(0, 1 - i / span);
  const k = f * f;
  return [a.look * 0.1 * k, (a.rear * 0.11 + Math.abs(a.look) * 0.045) * k];
}

/** 小さな メッシュ（材質は色と表面プリセットから共有） */
export function M({
  geo = GEO.sphere(),
  color,
  surface,
  position,
  rotation,
  scale,
  part,
  castShadow = false,
}: {
  geo?: THREE.BufferGeometry;
  color: string;
  surface?: MatOpts;
  position?: V3;
  rotation?: V3;
  scale?: V3 | number;
  part?: string;
  castShadow?: boolean;
}) {
  const material = useMemo(() => mat(color, surface ?? SURF.matteChitin()), [color, surface]);
  return (
    <mesh
      geometry={geo}
      material={material}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      userData={part ? { part } : undefined}
    />
  );
}
