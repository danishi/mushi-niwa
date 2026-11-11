import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, SURF } from '../three/materials';
import { grainBump, wrinkleBump } from '../three/textures';
import { M, useBodyMotion } from './common';
import { cachedTube, pupaGeo, segmentGeo, shellGeo, shieldGeo } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research-4.md §E（ゲンゴロウ）。形は 図鑑の 記載と 一般的な 形態に もとづく */

const LARVA_LEG: LegSpec = { femur: 0.12, tibia: 0.12, tarsus: 0.08, thick: 0.01, tarsi: 2 };

/**
 * ようちゅう：ほそながい からだ。頭に 鎌の ような 大あご（中が 管に なっていて 食べものの しるを すう）。
 * おしりの 先を 水面に 出して 息を する。
 */
export function GengoLarva({ anim, molts }: ModelProps) {
  const segs = useRef<Array<THREE.Mesh | null>>([]);
  const jaws = useRef<Array<THREE.Group | null>>([]);
  const size = 1.1 + molts * 0.3;
  const surf = useMemo(() => ({ roughness: 0.45, clearcoat: 0.4, bumpMap: wrinkleBump(), bumpScale: 0.3, translucent: true }), []);
  const N = 9;
  useFrame(() => {
    const a = anim.current;
    for (let i = 0; i < N; i++) {
      const m = segs.current[i];
      if (!m) continue;
      // およぐときは からだを 上下に くねらせる
      const wave = Math.sin(a.t * 6 - i * 0.7) * 0.025 * a.walk;
      m.position.set(0, 0.12 + wave, 0.25 - i * 0.085);
      const r = i < 3 ? 0.07 : 0.075 - (i - 3) * 0.008;
      m.scale.set(r, r * 0.75, 0.06);
    }
    const snap = Math.max(a.spray, a.eat);
    jaws.current.forEach((j, k) => {
      if (j) j.rotation.y = (k === 0 ? 1 : -1) * (0.5 - snap * 0.45 + Math.sin(a.t * 8) * 0.05 * a.eat);
    });
  });
  return (
    <group scale={size}>
      {Array.from({ length: N }, (_, i) => (
        <Part
          key={i}
          meshRef={(m) => {
            segs.current[i] = m;
          }}
          geometry={segmentGeo()}
          color={i % 2 ? '#a08a5a' : '#b39c68'}
          surface={surf}
          castShadow={i % 3 === 0}
          part="body"
        />
      ))}
      {/* おしりの 先の 2 本の 毛（ここから 空気を とりいれる） */}
      {[1, -1].map((s) => (
        <M key={s} geo={GEO.cone()} color="#7a6640" position={[s * 0.015, 0.13, -0.53]} rotation={[-Math.PI / 2, 0, s * 0.2]} scale={[0.01, 0.09, 0.01]} part="tail" />
      ))}
      {/* 平たい 頭と 鎌の ような 大あご */}
      <Part geometry={GEO.sphere()} color="#8a7244" surface={SURF.chitin(0.5)} position={[0, 0.12, 0.36]} scale={[0.075, 0.035, 0.08]} castShadow part="jaws" />
      <CompoundEye position={[0.055, 0.14, 0.38]} size={0.012} />
      <CompoundEye position={[-0.055, 0.14, 0.38]} size={0.012} />
      {[1, -1].map((s, k) => (
        <group
          key={s}
          ref={(g) => {
            jaws.current[k] = g;
          }}
          position={[s * 0.04, 0.12, 0.42]}
        >
          <group scale={[s, 1, 1]}>
            <Part geometry={cachedTube('gengoJaw', [[0, 0, 0], [0.03, 0, 0.06], [0.02, 0, 0.13], [-0.025, 0, 0.17]], 0.012, 0.004, 12, 6)} color="#5e4a2a" surface={SURF.chitin(0.7)} part="jaws" />
          </group>
        </group>
      ))}
      <Antenna position={[0.03, 0.14, 0.43]} side={1} length={0.08} thick={0.004} kind="filiform" color="#6a5634" anim={anim} rotation={[0, 0.5, 0]} />
      <Antenna position={[-0.03, 0.14, 0.43]} side={-1} length={0.08} thick={0.004} kind="filiform" color="#6a5634" anim={anim} rotation={[0, 0.5, 0]} />
      {[0, 1, 2].map((p) => (
        <group key={p} position={[0, 0.1, 0.24 - p * 0.08]}>
          <Leg position={[0.06, 0, 0]} side={1} pair={p} spec={LARVA_LEG} color="#9a845a" anim={anim} spread={0.1} />
          <Leg position={[-0.06, 0, 0]} side={-1} pair={p} spec={LARVA_LEG} color="#9a845a" anim={anim} spread={0.1} />
        </group>
      ))}
    </group>
  );
}

/** さなぎ：水から あがり、岸の 土の 中に 部屋を つくって さなぎに なる */
export function GengoPupa({ anim }: ModelProps) {
  const body = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    if (body.current) body.current.rotation.z = Math.sin(a.t * 0.7) > 0.97 ? Math.sin(a.t * 20) * 0.04 : Math.max(a.shiver, a.bounce) * Math.sin(a.t * 30) * 0.05;
  });
  const pale = useMemo(() => ({ ...SURF.chitin(0.5), translucent: true }), []);
  return (
    <group scale={0.8}>
      {/* 土の 部屋 */}
      <M color="#5d4a36" surface={{ roughness: 1, bumpMap: grainBump(65, 48), bumpScale: 3 }} position={[0, 0.5, -0.05]} scale={[0.5, 0.42, 0.3]} part="chamber" />
      <group ref={body} position={[0, 0.48, 0.08]} rotation={[-Math.PI / 2 + 0.2, 0, 0]}>
        <Part geometry={pupaGeo()} color="#efe6c6" surface={pale} scale={[0.22, 0.3, 0.13]} castShadow part="pupa" />
        <M geo={GEO.sphere()} color="#e6d9b0" surface={pale} position={[0, 0.3, 0.02]} scale={[0.13, 0.08, 0.1]} part="pupa" />
        {[1, -1].map((s) => (
          <group key={s}>
            <M geo={GEO.capsule()} color="#e9dcb4" surface={pale} position={[s * 0.16, -0.05, 0.08]} rotation={[0, 0, s * 0.4]} scale={[0.03, 0.2, 0.03]} part="pupa" />
            <M color="#dccd9e" surface={pale} position={[s * 0.12, 0.08, 0.06]} scale={[0.07, 0.16, 0.06]} />
          </group>
        ))}
        <CompoundEye position={[0.07, 0.33, 0.06]} size={0.018} color="#6b5a34" />
        <CompoundEye position={[-0.07, 0.33, 0.06]} size={0.018} color="#6b5a34" />
      </group>
    </group>
  );
}

/** 前ばね：平たい たまご形の から（k で 大きさを かえて、黄色い ふちと 黒い 中を かさねる） */
const elytraGeo = (key: string, k: number, top: number) =>
  shellGeo(
    `gengo:${key}`,
    [
      [-0.56 * k, 0, top * 0.55],
      [-0.52 * k, 0.12 * k, top * 0.8],
      [-0.38 * k, 0.24 * k, top * 0.95],
      [-0.12 * k, 0.285 * k, top],
      [0.1 * k, 0.28 * k, top * 0.98],
      [0.2 * k, 0.25 * k, top * 0.9],
    ],
    { base: 0.05, nt: 2.4, suture: 0.004, rim: 0.03 },
  );

const MID_LEG: LegSpec = { femur: 0.12, tibia: 0.12, tarsus: 0.1, thick: 0.014, tarsi: 5 };

/**
 * 成虫：たまごがたで 平たく、すべすべ。こい みどりがかった 黒に、むねと はねの ふちが 黄色。
 * うしろあしは 平たい オールの ようで、毛が はえ、左右 いっしょに こいで およぐ。
 * オスの 前あしには 吸盤の ついた まるい ふくらみが ある。
 */
export function GengoAdult({ anim, sex }: ModelProps) {
  const body = useBodyMotion(anim, 0);
  const oars = useRef<Array<THREE.Group | null>>([]);
  const male = sex === 'male';
  const shell = useMemo(() => ({ ...SURF.chitin(1), bumpMap: grainBump(67, 200), bumpScale: male ? 0.05 : 0.3 }), [male]);
  const YELLOW = '#c9b23c';
  const DARK = '#1f2a1a';
  useFrame(() => {
    const a = anim.current;
    // 左右の うしろあしを いっしょに うごかす（平泳ぎの ように）
    const stroke = Math.sin(a.t * 7) * 0.6 * a.walk;
    oars.current.forEach((g, k) => {
      if (g) g.rotation.y = (k === 0 ? -1 : 1) * (0.9 + stroke);
    });
  });
  return (
    <group position={[0, 0.06, 0]} scale={1.05}>
      <group ref={body}>
        {/* 前ばね（ドーム）と 黄色い ふち */}
        <Part geometry={elytraGeo('y', 1, 0.17)} color={YELLOW} surface={shell} position={[0, -0.005, 0]} part="elytra" />
        <Part geometry={elytraGeo('d', 0.95, 0.18)} color={DARK} surface={shell} position={[0, 0.004, -0.005]} castShadow part="elytra" />
        <M color="#2a2a18" position={[0, 0.05, -0.15]} scale={[0.26, 0.05, 0.38]} />
        {/* 前胸（ふちが 黄色） */}
        <Part geometry={shieldGeo()} color={YELLOW} surface={shell} position={[0, 0.1, 0.28]} scale={[0.25, 0.07, 0.11]} part="elytra" />
        <Part geometry={shieldGeo()} color={DARK} surface={shell} position={[0, 0.108, 0.28]} scale={[0.235, 0.07, 0.104]} part="elytra" />
        {/* 頭 */}
        <Part geometry={GEO.sphere()} color={DARK} surface={shell} position={[0, 0.09, 0.4]} scale={[0.13, 0.05, 0.08]} part="head" />
        <CompoundEye position={[0.1, 0.1, 0.42]} size={[0.02, 0.025, 0.03]} part="head" />
        <CompoundEye position={[-0.1, 0.1, 0.42]} size={[0.02, 0.025, 0.03]} part="head" />
        <Antenna position={[0.06, 0.1, 0.46]} side={1} length={0.18} thick={0.005} kind="filiform" color="#3a3a1c" anim={anim} rotation={[0, 0.6, 0]} />
        <Antenna position={[-0.06, 0.1, 0.46]} side={-1} length={0.18} thick={0.005} kind="filiform" color="#3a3a1c" anim={anim} rotation={[0, 0.6, 0]} />
        {/* 前あし（オスは 吸盤の ふくらみ）・中あし */}
        {[1, -1].map((s) => (
          <group key={s}>
            <Leg position={[s * 0.12, 0.05, 0.3]} side={s as 1 | -1} pair={0} spec={MID_LEG} color="#3a3a1c" anim={anim} part="foreleg" />
            {male ? <M geo={GEO.sphere()} color="#4a4824" position={[s * 0.28, 0.0, 0.42]} scale={[0.035, 0.012, 0.035]} part="foreleg" /> : null}
            <Leg position={[s * 0.16, 0.05, 0.12]} side={s as 1 | -1} pair={1} spec={MID_LEG} color="#3a3a1c" anim={anim} />
          </group>
        ))}
        {/* うしろあし：平たい オールと 毛 */}
        {[1, -1].map((s, k) => (
          <group
            key={`o${s}`}
            ref={(g) => {
              oars.current[k] = g;
            }}
            position={[s * 0.14, 0.04, -0.02]}
          >
            <group scale={[s, 1, 1]}>
              <Part geometry={GEO.box()} color="#33331a" surface={SURF.chitin(0.6)} position={[0.18, 0, 0]} scale={[0.36, 0.015, 0.06]} part="hindleg" />
              <Part geometry={GEO.box()} color="#33331a" surface={SURF.chitin(0.6)} position={[0.48, 0, -0.03]} rotation={[0, 0.3, 0]} scale={[0.28, 0.012, 0.08]} part="hindleg" />
              {/* 毛（オールを ひろく する） */}
              <M geo={GEO.box()} color="#8a7a50" surface={{ roughness: 0.9, opacity: 0.6 }} position={[0.48, 0, -0.085]} rotation={[0, 0.3, 0]} scale={[0.28, 0.004, 0.04]} part="hindleg" />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

