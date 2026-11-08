import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, SURF } from '../three/materials';
import { grainBump, wrinkleBump } from '../three/textures';
import { M, useBodyMotion } from './common';
import { cachedTube, domeGeo } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research.md §1（形態は図鑑の記載と一般的な形態に基づく） */

const SKIN = '#efe6d2';
const GUT = '#8a8174';
const HEAD = '#b4652a';
const SPIRACLE = '#a8642e';

/**
 * 幼虫（3 齢まで）：C 字に曲がった 乳白色の体。しわのある 半透明の皮ふ、
 * 体の横に 気門が並び、おしりの方は 中の ふんが透けて 灰色に見える。頭は つやのある だいだい色。
 */
export function KabutoLarva({ anim, molts }: ModelProps) {
  const segs = useRef<Array<THREE.Mesh | null>>([]);
  const head = useRef<THREE.Group>(null);
  const body = useBodyMotion(anim, 0.4);
  const skin = useMemo(() => ({ ...SURF.softSkin(), bumpMap: wrinkleBump(), bumpScale: 1.2 }), []);
  const gut = useMemo(() => ({ ...SURF.softSkin(), bumpMap: wrinkleBump(), bumpScale: 1 }), []);
  const N = 11;
  const size = 0.95 + molts * 0.2;
  useFrame(() => {
    const a = anim.current;
    // 土の中では ほとんど動かない。ときどき からだを くねらせる
    const curl = 0.05 * Math.sin(a.t * (0.5 + a.energy * 0.6)) + a.walk * 0.1 * Math.sin(a.gait * 2);
    const R = 0.33;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const ang = THREE.MathUtils.lerp(0.45 * Math.PI, -1.05 * Math.PI + curl * 3, u);
      const m = segs.current[i];
      if (!m) continue;
      m.position.set(0, 0.4 + R * Math.sin(ang), R * Math.cos(ang));
      m.rotation.x = -ang;
      const wave = 1 + 0.05 * Math.sin(a.gait * 3 - i * 0.9) * a.walk;
      // 胸は細め、腹の後ろほど太い
      const r = (0.13 + 0.09 * Math.min(1, u * 1.6) + (u > 0.75 ? 0.02 : 0)) * wave;
      m.scale.set(r * 1.08, r, r * 0.78);
    }
    const h = segs.current[0];
    if (h && head.current) {
      head.current.position.set(0, h.position.y + 0.06, h.position.z + 0.11);
      head.current.rotation.x = -0.5 + a.eat * 0.35 * Math.sin(a.t * 9);
    }
  });
  return (
    <group scale={size}>
      <group ref={body}>
        {Array.from({ length: N }, (_, i) => (
          <Part
            key={i}
            meshRef={(m) => {
              segs.current[i] = m;
            }}
            geometry={GEO.sphere()}
            color={i >= N - 3 ? GUT : SKIN}
            surface={i >= N - 3 ? gut : skin}
            castShadow={i % 3 === 0}
            part={i >= 2 && i <= 9 ? 'spiracle' : 'body'}
          >
            {i >= 2 && i <= 9 ? (
              <>
                <M color={SPIRACLE} position={[0.93, 0.05, 0]} scale={[0.05, 0.16, 0.1]} part="spiracle" />
                <M color={SPIRACLE} position={[-0.93, 0.05, 0]} scale={[0.05, 0.16, 0.1]} part="spiracle" />
              </>
            ) : null}
          </Part>
        ))}
        <group ref={head}>
          <Part geometry={GEO.sphere()} color={HEAD} surface={SURF.chitin(0.8)} scale={[0.15, 0.13, 0.12]} castShadow part="head" />
          {/* 大あご */}
          {[1, -1].map((s) => (
            <M key={s} geo={GEO.cone()} color="#24140b" surface={SURF.chitin(1)} position={[s * 0.05, -0.08, 0.1]} rotation={[0.9, 0, s * 0.35]} scale={[0.028, 0.08, 0.028]} part="head" />
          ))}
          {/* 短い触角 */}
          {[1, -1].map((s) => (
            <M key={`a${s}`} geo={GEO.cylinder()} color="#c98a4a" position={[s * 0.1, -0.02, 0.08]} rotation={[0.8, 0, s * 0.6]} scale={[0.008, 0.06, 0.008]} part="head" />
          ))}
          {/* 胸あし 3 対（毛の生えた 短い あし） */}
          {[0, 1, 2].map((p) => (
            <group key={p} position={[0, -0.13, -0.06 - p * 0.1]}>
              <Leg position={[0.08, 0, 0]} side={1} pair={p} spec={LARVA_LEG} color="#d7a46b" anim={anim} spread={-0.4} part="legs" />
              <Leg position={[-0.08, 0, 0]} side={-1} pair={p} spec={LARVA_LEG} color="#d7a46b" anim={anim} spread={-0.4} part="legs" />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

const LARVA_LEG: LegSpec = { femur: 0.07, tibia: 0.07, tarsus: 0.03, thick: 0.016, tarsi: 1 };

/** さなぎ：蛹室（土の部屋）の中で 立っている、あめ色の 裸蛹。あし・はねが体に そって見える */
export function KabutoPupa({ anim, sex }: ModelProps) {
  const body = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    if (body.current) {
      // さなぎも さわられると おなかを ぴくっと動かす
      body.current.rotation.z = Math.sin(a.t * 0.7) > 0.97 ? Math.sin(a.t * 20) * 0.04 : 0;
      body.current.rotation.x = Math.max(a.shiver, a.bounce) * Math.sin(a.t * 30) * 0.05;
    }
  });
  const male = sex === 'male';
  const amber = useMemo(() => ({ ...SURF.chitin(0.7), translucent: true }), []);
  return (
    <group scale={0.82}>
      {/* 蛹室（土を固めて つくった 部屋） */}
      <M color="#3d2a1e" surface={{ roughness: 1, bumpMap: grainBump(7, 48), bumpScale: 3 }} position={[0, 0.62, -0.05]} scale={[0.42, 0.7, 0.3]} part="chamber" />
      <group ref={body} position={[0, 0.2, 0.05]}>
        <Part geometry={GEO.sphere()} color="#c98b48" surface={amber} position={[0, 0.4, 0]} scale={[0.25, 0.42, 0.21]} castShadow part="body" />
        {[0.12, 0.22, 0.32, 0.42].map((y, i) => (
          <M key={y} color="#a86a30" surface={amber} geo={GEO.cylinder()} position={[0, y, 0]} scale={[0.248 - (3 - i) * 0.02, 0.008, 0.21 - (3 - i) * 0.015]} />
        ))}
        <Part geometry={GEO.sphere()} color="#d29a58" surface={amber} position={[0, 0.84, 0.03]} scale={[0.21, 0.17, 0.18]} part="body" />
        {/* たたまれた あしと はね（体の前に そって見える） */}
        {[1, -1].map((s) => (
          <group key={s}>
            <M color="#d9a868" surface={amber} geo={GEO.capsule()} position={[s * 0.1, 0.58, 0.17]} rotation={[0.15, 0, s * 0.1]} scale={[0.05, 0.22, 0.05]} />
            <M color="#d9a868" surface={amber} geo={GEO.capsule()} position={[s * 0.06, 0.45, 0.19]} rotation={[0.1, 0, -s * 0.15]} scale={[0.045, 0.2, 0.045]} />
            <M color="#c48a46" surface={amber} position={[s * 0.18, 0.55, 0.06]} scale={[0.07, 0.24, 0.1]} />
          </group>
        ))}
        {male ? (
          <Part
            geometry={cachedTube('pupaHornR', [[0, 0, 0], [0, 0.1, 0.1], [0, 0.24, 0.12], [0, 0.34, 0.06]], 0.055, 0.035)}
            color="#d6a160"
            surface={amber}
            position={[0, 0.95, 0.1]}
            part="horn"
          />
        ) : null}
        <CompoundEye position={[0.1, 0.86, 0.12]} size={0.025} color="#6b4422" />
        <CompoundEye position={[-0.1, 0.86, 0.12]} size={0.025} color="#6b4422" />
      </group>
    </group>
  );
}

const MALE = '#4a2214';
const FEMALE = '#2c1b12';

const FRONT: LegSpec = { femur: 0.26, tibia: 0.28, tarsus: 0.34, thick: 0.028, tarsi: 5, teeth: 3 };
const MID: LegSpec = { femur: 0.24, tibia: 0.24, tarsus: 0.28, thick: 0.028, tarsi: 5, teeth: 2 };
const HIND: LegSpec = { femur: 0.25, tibia: 0.26, tarsus: 0.3, thick: 0.03, tarsi: 5, teeth: 2 };

/**
 * 成虫：オスは 頭に 先が 2 回 二またに分かれる 長い角、胸に 先が二またの 短い角。
 * 前ばねは 赤みのある 黒褐色で つやがある。メスは角がなく、やや つやが少ない。
 */
export function KabutoAdult({ anim, sex }: ModelProps) {
  const body = useBodyMotion(anim);
  const headRef = useRef<THREE.Group>(null);
  const brush = useRef<THREE.Mesh>(null);
  const male = sex === 'male';
  const c = male ? MALE : FEMALE;
  const shell = useMemo(
    () => (male ? { ...SURF.chitin(1), bumpMap: grainBump(12, 96), bumpScale: 0.3 } : { roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: '#8a6a50', bumpMap: grainBump(13, 128), bumpScale: 0.8 }),
    [male],
  );
  const dark = useMemo(() => SURF.chitin(male ? 0.9 : 0.3), [male]);
  useFrame(() => {
    const a = anim.current;
    if (headRef.current) headRef.current.rotation.x = 0.1 - a.eat * 0.3 + Math.sin(a.t * 0.9) * 0.03 * a.energy;
    // 樹液や ゼリーを なめる オレンジ色の ブラシのような 口
    if (brush.current) brush.current.scale.setScalar(0.5 + a.eat * 0.7);
  });
  return (
    <group ref={body}>
      {/* 前ばね（左右）と 合わせ目 */}
      <Part geometry={domeGeo()} color={c} surface={shell} position={[0, 0.17, -0.2]} scale={[0.27, 0.24, 0.37]} castShadow part="elytra" />
      <M geo={GEO.box()} color="#1a0c06" position={[0, 0.405, -0.2]} scale={[0.006, 0.01, 0.7]} />
      {/* はらの下側 */}
      <M color="#2a170e" position={[0, 0.16, -0.2]} scale={[0.25, 0.08, 0.35]} />
      {/* 前胸 */}
      <Part geometry={GEO.sphere()} color={c} surface={dark} position={[0, 0.25, 0.2]} scale={[0.26, 0.17, 0.19]} castShadow part={male ? 'chestHorn' : 'elytra'} />
      {male ? (
        <group position={[0, 0.39, 0.3]}>
          <Part geometry={cachedTube('kChestHorn', [[0, 0, 0], [0, 0.03, 0.08], [0, 0.03, 0.17]], 0.04, 0.022, 8, 8)} color={c} surface={dark} part="chestHorn" />
          {[1, -1].map((s) => (
            <M key={s} geo={GEO.cone()} color={c} surface={dark} position={[s * 0.022, 0.035, 0.19]} rotation={[1.4, 0, -s * 0.5]} scale={[0.016, 0.05, 0.016]} part="chestHorn" />
          ))}
        </group>
      ) : null}
      {/* 頭 */}
      <group ref={headRef} position={[0, 0.17, 0.4]}>
        <Part geometry={GEO.sphere()} color={c} surface={dark} scale={[0.12, 0.08, 0.11]} part={male ? 'horn' : 'elytra'} />
        <CompoundEye position={[0.1, 0.02, 0.02]} size={[0.025, 0.035, 0.035]} />
        <CompoundEye position={[-0.1, 0.02, 0.02]} size={[0.025, 0.035, 0.035]} />
        <mesh ref={brush} position={[0, -0.06, 0.11]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color="#d48a3a" roughness={1} />
        </mesh>
        <Antenna position={[0.07, -0.02, 0.1]} side={1} length={0.12} thick={0.008} kind="lamellate" color="#3a1e10" anim={anim} rotation={[0, 0.5, 0]} />
        <Antenna position={[-0.07, -0.02, 0.1]} side={-1} length={0.12} thick={0.008} kind="lamellate" color="#3a1e10" anim={anim} rotation={[0, 0.5, 0]} />
        {male ? (
          <group position={[0, 0.02, 0.09]}>
            <Part
              geometry={cachedTube('kHeadHorn2', [[0, 0, 0], [0, 0.1, 0.15], [0, 0.32, 0.26], [0, 0.58, 0.28], [0, 0.76, 0.2]], 0.065, 0.03, 24, 10)}
              color={c}
              surface={dark}
              castShadow
              part="horn"
            />
            {/* 先が二また、それぞれ さらに二また */}
            {[1, -1].map((s) => (
              <group key={s} position={[0, 0.76, 0.2]} rotation={[-0.7, 0, s * 0.55]}>
                <Part geometry={cachedTube('kFork', [[0, 0, 0], [0, 0.06, 0.01], [0, 0.11, 0]], 0.028, 0.018, 8, 8)} color={c} surface={dark} part="horn" />
                {[1, -1].map((t) => (
                  <M key={t} geo={GEO.cone()} color={c} surface={dark} position={[0, 0.13, t * 0.018]} rotation={[t * 0.5, 0, 0]} scale={[0.012, 0.05, 0.012]} part="horn" />
                ))}
              </group>
            ))}
          </group>
        ) : (
          <M geo={GEO.cone()} color={c} surface={dark} position={[0, 0.07, 0.05]} scale={[0.02, 0.04, 0.02]} />
        )}
      </group>
      {/* あし（すねに ギザギザの歯、先に するどい つめ） */}
      <Leg position={[0.13, 0.12, 0.24]} side={1} pair={0} spec={FRONT} color="#1c100a" anim={anim} part="legs" />
      <Leg position={[-0.13, 0.12, 0.24]} side={-1} pair={0} spec={FRONT} color="#1c100a" anim={anim} part="legs" />
      <Leg position={[0.15, 0.11, 0.0]} side={1} pair={1} spec={MID} color="#1c100a" anim={anim} part="legs" />
      <Leg position={[-0.15, 0.11, 0.0]} side={-1} pair={1} spec={MID} color="#1c100a" anim={anim} part="legs" />
      <Leg position={[0.15, 0.11, -0.16]} side={1} pair={2} spec={HIND} color="#1c100a" anim={anim} part="legs" />
      <Leg position={[-0.15, 0.11, -0.16]} side={-1} pair={2} spec={HIND} color="#1c100a" anim={anim} part="legs" />
    </group>
  );
}
