import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mat, SURF } from '../three/materials';
import { grainBump, paint } from '../three/textures';
import { useBodyMotion } from './common';
import { bodyGeo, cachedTube, shellGeo } from './geom';
import { Antenna, CompoundEye, JumpLeg, Leg, Part, type JumpLegSpec, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research.md §3 */

const BODY = '#231a13';
const FORE: LegSpec = { femur: 0.13, tibia: 0.14, tarsus: 0.1, thick: 0.014, tarsi: 3 };
const MID: LegSpec = { femur: 0.13, tibia: 0.14, tarsus: 0.1, thick: 0.014, tarsi: 3 };

/** 長い後ろあし：太い腿節と 細い すね（白っぽい 帯は 省き、すねを 少し 明るく） */
const HIND: JumpLegSpec = { knee: [0.06, 0.13, -0.26], foot: [0.03, -0.245, -0.11], thick: [0.03, 0.046], shin: 0.011, tarsus: 0.1 };

/**
 * 前ばねの もよう（u が 左右、v が 前後）。うすい こげ茶の まくに 太い 脈。
 * オスは 音を ひびかせる まるい「かがみ」と、ななめの 脈（やすり）が ある。
 */
function tegmenMap(male: boolean) {
  return paint(`suzuTegmen:${male}`, 256, (g, s) => {
    g.fillStyle = '#5b4a38';
    g.fillRect(0, 0, s, s);
    // 左右の はねを 同じ もようで 描く（まん中で 重なる）
    for (const flip of [1, -1]) {
      const X = (u: number) => s * (0.5 + flip * u * 0.5);
      const Y = (v: number) => s * (1 - v);
      const line = (pts: Array<[number, number]>, w: number) => {
        g.lineWidth = w;
        g.beginPath();
        pts.forEach(([u, v], i) => (i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v))));
        g.stroke();
      };
      // 明るい まく（脈に かこまれた 室）
      g.fillStyle = 'rgba(190, 168, 128, 0.55)';
      if (male) {
        g.beginPath();
        g.ellipse(X(0.42), Y(0.36), s * 0.14, s * 0.13, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(X(0.4), Y(0.72), s * 0.13, s * 0.1, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = '#1f1610';
      g.lineCap = 'round';
      // ふちと たての 脈
      line([[0.02, 0.98], [0.03, 0.5], [0.05, 0.05]], 3);
      line([[0.9, 0.9], [0.95, 0.5], [0.8, 0.08], [0.4, 0.02]], 4);
      line([[0.62, 0.95], [0.68, 0.55], [0.6, 0.12]], 3);
      if (male) {
        // かがみを かこむ 脈と、ななめの 脈
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(X(0.42), Y(0.36), s * 0.14, s * 0.13, 0, 0, Math.PI * 2);
        g.stroke();
        line([[0.18, 0.38], [0.66, 0.34]], 2);
        for (let i = 0; i < 5; i++) line([[0.08, 0.92 - i * 0.07], [0.6, 0.78 - i * 0.05]], 2.2);
        line([[0.05, 0.56], [0.66, 0.56]], 3.5);
        for (let i = 0; i < 4; i++) line([[0.1 + i * 0.14, 0.2], [0.2 + i * 0.14, 0.06]], 1.6);
      } else {
        for (let i = 0; i < 6; i++) line([[0.12 + i * 0.13, 0.95], [0.16 + i * 0.12, 0.05]], 2);
        for (let i = 0; i < 9; i++) line([[0.05, 0.1 + i * 0.1], [0.9, 0.06 + i * 0.1]], 1);
      }
    }
  });
}

/** 前ばね（つけねが 原点）。オスは はらより はばが 広い たまご形、メスは 細い */
const tegmenGeo = (male: boolean) => {
  const w = male ? 1 : 0.62;
  return shellGeo(
    `suzuTegmen:${male}`,
    [
      [-0.43, 0.03 * w, 0.004],
      [-0.41, 0.09 * w, 0.014],
      [-0.33, 0.165 * w, 0.03],
      [-0.2, 0.19 * w, 0.038],
      [-0.08, 0.165 * w, 0.034],
      [-0.01, 0.11 * w, 0.02],
      [0.02, 0.05 * w, 0.006],
    ],
    { base: 0, nt: 2.6, rings: 28, radial: 24 },
  );
};

/** 頭：小さく まるい。口は 下向き */
const headGeo = () =>
  bodyGeo(
    'suzuHead',
    [
      [-0.065, 0.045, 0.045, -0.035],
      [-0.03, 0.07, 0.066, -0.058],
      [0.02, 0.07, 0.06, -0.07],
      [0.055, 0.05, 0.03, -0.072],
      [0.072, 0, -0.02, -0.04],
    ],
    { nt: 2.2 },
  );

function Cricket({ anim, sex, adult, size }: ModelProps & { adult: boolean; size: number }) {
  const body = useBodyMotion(anim, 0.4);
  const wings = useRef<THREE.Group>(null);
  const male = sex === 'male';
  const chitin = useMemo(() => ({ ...SURF.chitin(0.5), bumpMap: grainBump(33, 96), bumpScale: 0.6 }), []);
  const hindSurf = useMemo(() => ({ ...SURF.matteChitin(), bumpMap: grainBump(31, 64), bumpScale: 0.6 }), []);
  const wingMat = useMemo(
    () => mat('#ffffff', { map: tegmenMap(male), roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2, opacity: 0.92, side: THREE.DoubleSide }),
    [male],
  );
  useFrame(() => {
    const a = anim.current;
    if (wings.current) {
      // 鳴くとき：前ばねを 体に対して 立てて、すばやく こすり合わせる
      wings.current.rotation.x = -a.sing * 1.2 - a.startle * 0.08;
      wings.current.position.y = 0.2 + a.sing * 0.02;
      wings.current.rotation.z = a.sing * Math.sin(a.t * 80) * 0.05;
    }
  });
  return (
    <group scale={size}>
      <group ref={body}>
        {/* 腹・胸・頭（やや 平たい 体） */}
        <Part geometry={bodyGeo('suzuAbdomen', [[-0.325, 0, 0.13, 0.13], [-0.305, 0.05, 0.165, 0.095], [-0.2, 0.1, 0.2, 0.06], [-0.08, 0.112, 0.21, 0.055], [0.05, 0.1, 0.2, 0.065], [0.1, 0.085, 0.19, 0.08]], { segs: [-0.31, 0.06, 7, 0.05], nb: 2.5 })} color={BODY} surface={chitin} castShadow part="body" />
        <Part geometry={bodyGeo('suzuPronotum', [[0.05, 0.085, 0.2, 0.085], [0.09, 0.102, 0.226, 0.08], [0.15, 0.098, 0.226, 0.085], [0.2, 0.082, 0.215, 0.095], [0.218, 0.06, 0.2, 0.11]], { nt: 2.7 })} color={BODY} surface={chitin} castShadow part="body" />
        <Part geometry={headGeo()} color="#2c2219" surface={chitin} position={[0, 0.155, 0.235]} part="antenna" />
        <CompoundEye position={[0.058, 0.175, 0.265]} size={[0.018, 0.025, 0.022]} color="#3b3026" />
        <CompoundEye position={[-0.058, 0.175, 0.265]} size={[0.018, 0.025, 0.022]} color="#3b3026" />
        {/* 口もとの 小さな ひげ（小あごひげ） */}
        {[1, -1].map((s) => (
          <Part key={s} geometry={cachedTube(`suzuPalp${s}`, [[0, 0, 0], [s * 0.012, -0.03, 0.02], [s * 0.01, -0.055, 0.012]], 0.006, 0.004, 6, 5)} color="#b8ab94" position={[s * 0.025, 0.11, 0.285]} />
        ))}
        {/* からだの 2 倍以上ある 長い触角（白っぽく、根元は 黒い） */}
        <Antenna position={[0.03, 0.2, 0.3]} side={1} length={0.95} thick={0.008} kind="filiform" color="#d9cfbf" anim={anim} rotation={[0.45, 0.55, 0]} part="antenna" />
        <Antenna position={[-0.03, 0.2, 0.3]} side={-1} length={0.95} thick={0.008} kind="filiform" color="#d9cfbf" anim={anim} rotation={[0.45, 0.55, 0]} part="antenna" />
        {/* 前あし（すねに 耳）・中あし */}
        <Leg position={[0.06, 0.1, 0.16]} side={1} pair={0} spec={FORE} color={BODY} anim={anim} part={adult ? 'ear' : undefined} />
        <Leg position={[-0.06, 0.1, 0.16]} side={-1} pair={0} spec={FORE} color={BODY} anim={anim} part={adult ? 'ear' : undefined} />
        <Leg position={[0.07, 0.1, 0.05]} side={1} pair={1} spec={MID} color={BODY} anim={anim} />
        <Leg position={[-0.07, 0.1, 0.05]} side={-1} pair={1} spec={MID} color={BODY} anim={anim} />
        {[1, -1].map((s) => (
          <JumpLeg key={s} position={[s * 0.085, 0.125, -0.06]} side={s as 1 | -1} spec={HIND} color={BODY} shinColor="#3a2c20" surface={hindSurf} anim={anim} part="hindleg" />
        ))}
        {/* 尾角（おしりの 2 本の 長い 毛） */}
        {[1, -1].map((s) => (
          <Part key={s} geometry={cachedTube(`suzuCercus${s}`, [[0, 0, 0], [s * 0.03, 0.02, -0.1], [s * 0.075, 0.025, -0.2]], 0.009, 0.002, 10, 5)} color="#c9bfae" position={[s * 0.03, 0.125, -0.3]} />
        ))}
        {adult && !male ? (
          <Part geometry={cachedTube('sOvi', [[0, 0, 0], [0, 0, -0.15], [0, -0.01, -0.32]], 0.012, 0.007, 8, 6)} color="#17110c" surface={SURF.chitin(0.8)} position={[0, 0.12, -0.32]} part="ovipositor" />
        ) : null}
        {adult ? (
          <group ref={wings} position={[0, 0.2, 0.07]}>
            {/* オスの前ばねは 幅が広く、ここを こすって 鳴く。メスは 細い */}
            <mesh geometry={tegmenGeo(male)} material={wingMat} castShadow userData={{ part: 'wings' }} />
          </group>
        ) : null}
      </group>
    </group>
  );
}

export function SuzuNymph(p: ModelProps) {
  return <Cricket {...p} adult={false} size={0.55 + p.molts * 0.1} />;
}

export function SuzuAdult(p: ModelProps) {
  return <Cricket {...p} adult size={1.2} />;
}
