import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO } from '../three/materials';
import { grainBump } from '../three/textures';
import { M } from './common';
import { bodyGeo, yBody } from './geom';
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
  const shell = useMemo(() => ({ roughness: 0.75, bumpMap: grainBump(37, 48), bumpScale: 2.2 }), []);
  return (
    <group position={[0, 0, 0.3]}>
      {eggs.map(([x, y, z], i) => (
        <group key={i} ref={i === 0 ? ref : undefined} position={[x, y + 0.045, z]} rotation={[0, i * 1.1, Math.PI / 2 - 0.12]}>
          {/* たる形の から。よこに 白っぽい すじ（卵門板）が 1 本 */}
          <Part geometry={eggGeo()} color="#5a4130" surface={shell} castShadow={i === 0} part="egg" />
          <M geo={GEO.sphere()} color="#b9a58a" position={[0, 0, 0.041]} scale={[0.008, 0.04, 0.004]} part="egg" />
          {/* ふた（卵蓋）と、その 上の 小さな こぶ */}
          <Part geometry={lidGeo()} color="#3a2a1e" surface={shell} position={[0, 0.062, 0]} part="lid" />
          <M geo={GEO.sphere()} color="#6a4c34" position={[0, 0.075, 0]} scale={[0.008, 0.006, 0.008]} part="lid" />
        </group>
      ))}
    </group>
  );
}

/** たまごの から（Y 軸が 長い たる形。両がわが 少し 平たい） */
const eggGeo = () => once('egg', () => yBody('nanafushiEgg', [[-1, 0, 0, 0], [-0.94, 0.4, 0.34, -0.34], [-0.6, 0.86, 0.72, -0.72], [0, 1, 0.82, -0.82], [0.6, 0.9, 0.74, -0.74], [0.92, 0.66, 0.56, -0.56], [1, 0.5, 0.42, -0.42]], { nt: 2.4, nb: 2.4, rings: 20, radial: 18 }).clone().scale(0.05, 0.062, 0.05));
const eggCache = new Map<string, THREE.BufferGeometry>();
const once = (k: string, make: () => THREE.BufferGeometry) => eggCache.get(k) ?? (eggCache.set(k, make()), eggCache.get(k)!);
/** ふた：ふちが 少し はり出した うすい 円ばん */
const lidGeo = () => once('lid', () => new THREE.LatheGeometry([[0, -0.004], [0.022, -0.004], [0.027, 0], [0.025, 0.006], [0.018, 0.011], [0, 0.012]].map(([x, y]) => new THREE.Vector2(x, y)), 16));

/**
 * からだ（軸は +Z、頭が 前）。[z, 太さの 倍率] を ならべる。あしの つけねと 節の つなぎめが ふくらみ、
 * 中胸（前あしと 中あしの 間）が いちばん 長い。はらは 10 節で、先が 少し 上を 向く。
 */
const stickBodyGeo = (thick: number) => {
  const nodes: Array<[number, number]> = [
    [-1.03, 0], [-1.015, 0.42], [-0.93, 0.6], [-0.7, 0.78], [-0.4, 0.92], [-0.16, 1],
    [-0.12, 1.22], [-0.07, 0.98], [0.08, 0.92], [0.15, 1.24], [0.2, 0.94], [0.36, 0.84], [0.5, 0.96],
    [0.55, 1.26], [0.595, 0.86], [0.63, 0.98], [0.69, 1.12], [0.74, 0.86], [0.768, 0],
  ];
  return bodyGeo(
    `stick:${thick}`,
    nodes.map(([z, k]) => {
      const y = 0.16 + (z < -0.75 ? (-0.75 - z) * 0.16 : 0);
      return [z, thick * k, y + thick * k * 0.9, y - thick * k * 0.9] as [number, number, number, number];
    }),
    { segs: [-1.0, -0.16, 9, 0.07], rings: 96, radial: 14, nt: 2.2, nb: 2.2 },
  );
};

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
        {/* 頭・胸（前胸は 短く、中胸が とても 長い）・腹：節の つなぎめが ふくらむ 細長い からだ */}
        <Part geometry={stickBodyGeo(thick)} color={color} surface={surf} castShadow part="body" />
        {/* おしりの 先（尾毛） */}
        {[1, -1].map((s) => (
          <M key={s} geo={GEO.cone()} color={dark} position={[s * 0.012, 0.205, -1.03]} rotation={[-Math.PI / 2, 0, s * 0.3]} scale={[0.008, 0.05, 0.008]} />
        ))}
        {/* 頭（当たり判定用に 目と いっしょに head を 付ける） */}
        <M geo={GEO.sphere()} color={dark} surface={surf} position={[0, 0.172, 0.755]} scale={[thick * 0.55, thick * 0.4, 0.014]} part="head" />
        <CompoundEye position={[thick * 0.92, 0.172, 0.71]} size={[0.008, 0.011, 0.014]} color="#4a3a20" part="head" />
        <CompoundEye position={[-thick * 0.92, 0.172, 0.71]} size={[0.008, 0.011, 0.014]} color="#4a3a20" part="head" />
        {/* みじかい しょっかく */}
        <Antenna position={[0.01, 0.18, 0.75]} side={1} length={0.12} thick={0.005} kind="filiform" color={dark} anim={anim} rotation={[0, 0.1, 0]} part="antenna" />
        <Antenna position={[-0.01, 0.18, 0.75]} side={-1} length={0.12} thick={0.005} kind="filiform" color={dark} anim={anim} rotation={[0, 0.1, 0]} part="antenna" />
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

