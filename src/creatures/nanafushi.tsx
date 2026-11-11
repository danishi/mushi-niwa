import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO } from '../three/materials';
import { grainBump } from '../three/textures';
import { M } from './common';
import { cachedTube } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research-4.md §C（ナナフシモドキ）。形は 図鑑の 記載と 一般的な 形態に もとづく */

/** たまご：植物の たねに そっくりな 茶色の たまご。はしに ふた（卵蓋）が ある */
export function NanafushiEgg({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = Math.sin(anim.current.t * 30) * 0.08 * anim.current.shiver;
  });
  const eggs: Array<[number, number, number]> = [
    [0, 0, 0],
    [0.16, 0, 0.08],
    [-0.12, 0, 0.12],
  ];
  return (
    <group position={[0, 0, 0.3]}>
      {eggs.map(([x, y, z], i) => (
        <group key={i} ref={i === 0 ? ref : undefined} position={[x, y + 0.05, z]} rotation={[0, i * 1.1, Math.PI / 2]}>
          <Part geometry={GEO.capsule()} color="#5a4130" surface={{ roughness: 0.6, bumpMap: grainBump(37, 32), bumpScale: 1.5 }} scale={[0.045, 0.06, 0.04]} castShadow={i === 0} part="egg" />
          <M geo={GEO.cylinder()} color="#3a2a1e" position={[0, 0.075, 0]} scale={[0.035, 0.012, 0.035]} part="lid" />
        </group>
      ))}
    </group>
  );
}

const LEG = (scale: number): LegSpec => ({ femur: 0.3 * scale, tibia: 0.32 * scale, tarsus: 0.12 * scale, thick: 0.01 * scale + 0.004, tarsi: 5 });

/**
 * からだは 細長い 枝の よう。はねは なく、しょっかくは みじかい。
 * 前あしを まっすぐ 前へ そろえて のばすと、ますます 枝に 見える。
 * いかく（spray）：かちんと かたまる（死んだ ふり）。
 */
function Stick({ anim, sex, molts, adult }: ModelProps & { adult: boolean }) {
  const sway = useRef<THREE.Group>(null);
  const frontL = useRef<THREE.Group>(null);
  const frontR = useRef<THREE.Group>(null);
  const male = sex === 'male';
  const scale = adult ? (male ? 0.9 : 1) : 0.5 + molts * 0.08;
  // オスは 茶色で 細い。メスは みどりか 茶色（ここでは みどり）
  const color = adult && male ? '#6b5236' : '#7c9a4c';
  const dark = adult && male ? '#5a4430' : '#6a8740';
  const surf = useMemo(() => ({ roughness: 0.7, clearcoat: 0.15, bumpMap: grainBump(43, 128), bumpScale: 0.8 }), []);
  const spec = useMemo(() => LEG(1), []);
  const thick = male && adult ? 0.024 : 0.032;
  useFrame(() => {
    const a = anim.current;
    // 死んだふり（spray）：あしを からだに そわせて かちんと かたまる
    if (sway.current) sway.current.rotation.x = -a.spray * 0.04;
    // 前あしは ふだん 前へ そろえ、歩くときは 下へ おろす
    const reach = Math.max(a.spray, Math.max(0, 1 - a.walk * 1.5));
    for (const [ref, s] of [
      [frontL, -1],
      [frontR, 1],
    ] as const) {
      if (ref.current) ref.current.rotation.y = -s * (0.2 + reach * 0.95);
    }
  });
  return (
    <group scale={scale}>
      <group ref={sway}>
        {/* 胸と 腹：1 本の 細長い 棒（つなぎめに すこし ふくらみ） */}
        <Part
          geometry={cachedTube(`stick${male && adult ? 'm' : 'f'}`, [[0, 0.16, 0.6], [0, 0.16, 0.2], [0, 0.16, -0.3], [0, 0.17, -0.8], [0, 0.2, -1.0]], thick, thick * 0.6, 24, 8)}
          color={color}
          surface={surf}
          castShadow
          part="body"
        />
        {[0.3, 0.1, -0.15, -0.4, -0.65].map((z) => (
          <M key={z} geo={GEO.sphere()} color={dark} surface={surf} position={[0, 0.16, z]} scale={[thick * 1.15, thick * 1.1, 0.03]} />
        ))}
        {/* おしりの 先（尾毛） */}
        {[1, -1].map((s) => (
          <M key={s} geo={GEO.cone()} color={dark} position={[s * 0.012, 0.2, -1.03]} rotation={[-Math.PI / 2, 0, s * 0.3]} scale={[0.008, 0.05, 0.008]} />
        ))}
        {/* 頭 */}
        <Part geometry={GEO.capsule()} color={color} surface={surf} position={[0, 0.17, 0.66]} rotation={[Math.PI / 2, 0, 0]} scale={[thick * 1.1, 0.07, thick * 1.1]} part="head" />
        <CompoundEye position={[0.025, 0.18, 0.7]} size={0.012} color="#4a3a20" part="head" />
        <CompoundEye position={[-0.025, 0.18, 0.7]} size={0.012} color="#4a3a20" part="head" />
        {/* みじかい しょっかく */}
        <Antenna position={[0.01, 0.18, 0.72]} side={1} length={0.12} thick={0.005} kind="filiform" color={dark} anim={anim} rotation={[0, 0.1, 0]} part="antenna" />
        <Antenna position={[-0.01, 0.18, 0.72]} side={-1} length={0.12} thick={0.005} kind="filiform" color={dark} anim={anim} rotation={[0, 0.1, 0]} part="antenna" />
        {/* 前あし（前へ のばす） */}
        <group ref={frontR} position={[0.02, 0.16, 0.55]}>
          <Leg position={[0, 0, 0]} side={1} pair={0} spec={spec} color={color} anim={anim} spread={0.05} yaw={0.01} part="legs" />
        </group>
        <group ref={frontL} position={[-0.02, 0.16, 0.55]}>
          <Leg position={[0, 0, 0]} side={-1} pair={0} spec={spec} color={color} anim={anim} spread={0.05} yaw={0.01} part="legs" />
        </group>
        <Leg position={[0.02, 0.16, 0.15]} side={1} pair={1} spec={spec} color={color} anim={anim} spread={0.15} part="legs" />
        <Leg position={[-0.02, 0.16, 0.15]} side={-1} pair={1} spec={spec} color={color} anim={anim} spread={0.15} part="legs" />
        <Leg position={[0.02, 0.16, -0.12]} side={1} pair={2} spec={spec} color={color} anim={anim} spread={0.15} part="legs" />
        <Leg position={[-0.02, 0.16, -0.12]} side={-1} pair={2} spec={spec} color={color} anim={anim} spread={0.15} part="legs" />
      </group>
    </group>
  );
}

export function NanafushiNymph(p: ModelProps) {
  return <Stick {...p} adult={false} />;
}
export function NanafushiAdult(p: ModelProps) {
  return <Stick {...p} adult />;
}

