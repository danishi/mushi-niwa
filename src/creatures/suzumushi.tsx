import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, SURF } from '../three/materials';
import { cricketWing, grainBump } from '../three/textures';
import { M, useBodyMotion } from './common';
import { cachedTube } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research.md §3 */

const BODY = '#231a13';
const FORE: LegSpec = { femur: 0.13, tibia: 0.14, tarsus: 0.1, thick: 0.014, tarsi: 3 };
const MID: LegSpec = { femur: 0.13, tibia: 0.14, tarsus: 0.1, thick: 0.014, tarsi: 3 };

/** 長い後ろあし：太い腿節と、白っぽい帯のある すね */
function HindLeg({ side, anim }: { side: 1 | -1; anim: ModelProps['anim'] }) {
  const ref = useRef<THREE.Group>(null);
  const surf = useMemo(() => ({ ...SURF.matteChitin(), bumpMap: grainBump(31, 64), bumpScale: 0.6 }), []);
  useFrame(() => {
    const a = anim.current;
    if (ref.current) ref.current.rotation.x = -0.25 - Math.max(0, Math.sin(a.gait)) * 0.55 * a.walk;
  });
  return (
    <group ref={ref} position={[side * 0.09, 0.12, -0.08]} scale={[side, 1, 1]}>
      <Part geometry={cachedTube('sHindFemur', [[0, 0, 0], [0.05, 0.1, -0.13], [0.07, 0.17, -0.3]], 0.045, 0.02, 12, 8)} color={BODY} surface={surf} castShadow part="hindleg" />
      <M geo={GEO.cylinder()} color={BODY} position={[0.085, 0.08, -0.4]} rotation={[0.95, 0, 0]} scale={[0.012, 0.34, 0.012]} part="hindleg" />
      <M geo={GEO.cylinder()} color="#d8cfbf" position={[0.08, 0.14, -0.32]} rotation={[0.95, 0, 0]} scale={[0.014, 0.05, 0.014]} part="hindleg" />
    </group>
  );
}

function Cricket({ anim, sex, adult, size }: ModelProps & { adult: boolean; size: number }) {
  const body = useBodyMotion(anim, 0.4);
  const wings = useRef<THREE.Group>(null);
  const male = sex === 'male';
  const chitin = useMemo(() => ({ ...SURF.chitin(0.5), bumpMap: grainBump(33, 96), bumpScale: 0.6 }), []);
  const wingMat = useMemo(() => mat('#ffffff', { map: cricketWing(), roughness: 0.35, clearcoat: 0.6, opacity: 0.88, side: THREE.DoubleSide }), []);
  useFrame(() => {
    const a = anim.current;
    if (wings.current) {
      // 鳴くとき：前ばねを 体に対して 立てて、すばやく こすり合わせる
      wings.current.rotation.x = -a.sing * 1.2;
      wings.current.position.y = 0.17 + a.sing * 0.02;
      wings.current.rotation.z = a.sing * Math.sin(a.t * 80) * 0.05;
    }
  });
  return (
    <group scale={size}>
      <group ref={body}>
        {/* 腹・胸・頭（やや 平たい 体） */}
        <Part geometry={GEO.sphere()} color={BODY} surface={chitin} position={[0, 0.13, -0.1]} scale={[0.11, 0.08, 0.22]} castShadow part="body" />
        <Part geometry={GEO.sphere()} color={BODY} surface={chitin} position={[0, 0.15, 0.13]} scale={[0.1, 0.075, 0.08]} castShadow part="body" />
        <Part geometry={GEO.sphere()} color="#2c2219" surface={chitin} position={[0, 0.16, 0.24]} scale={[0.075, 0.07, 0.07]} part="antenna" />
        <CompoundEye position={[0.06, 0.18, 0.27]} size={[0.018, 0.025, 0.022]} color="#3b3026" />
        <CompoundEye position={[-0.06, 0.18, 0.27]} size={[0.018, 0.025, 0.022]} color="#3b3026" />
        {/* からだの 2 倍以上ある 長い触角（白っぽく、根元は 黒い） */}
        <Antenna position={[0.03, 0.2, 0.3]} side={1} length={0.95} thick={0.008} kind="filiform" color="#d9cfbf" anim={anim} rotation={[0.45, 0.55, 0]} part="antenna" />
        <Antenna position={[-0.03, 0.2, 0.3]} side={-1} length={0.95} thick={0.008} kind="filiform" color="#d9cfbf" anim={anim} rotation={[0.45, 0.55, 0]} part="antenna" />
        {/* 前あし（すねに 耳）・中あし */}
        <Leg position={[0.06, 0.1, 0.16]} side={1} pair={0} spec={FORE} color={BODY} anim={anim} part={adult ? 'ear' : undefined} />
        <Leg position={[-0.06, 0.1, 0.16]} side={-1} pair={0} spec={FORE} color={BODY} anim={anim} part={adult ? 'ear' : undefined} />
        <Leg position={[0.07, 0.1, 0.05]} side={1} pair={1} spec={MID} color={BODY} anim={anim} />
        <Leg position={[-0.07, 0.1, 0.05]} side={-1} pair={1} spec={MID} color={BODY} anim={anim} />
        {adult ? (
          <>
            <M color="#efe9dc" position={[0.15, 0.04, 0.2]} scale={[0.008, 0.016, 0.02]} part="ear" />
            <M color="#efe9dc" position={[-0.15, 0.04, 0.2]} scale={[0.008, 0.016, 0.02]} part="ear" />
          </>
        ) : null}
        <HindLeg side={1} anim={anim} />
        <HindLeg side={-1} anim={anim} />
        {/* 尾角 */}
        {[1, -1].map((s) => (
          <M key={s} geo={GEO.cone()} color="#c9bfae" position={[s * 0.04, 0.12, -0.38]} rotation={[-1.75, 0, s * 0.2]} scale={[0.01, 0.16, 0.01]} />
        ))}
        {adult && !male ? (
          <Part geometry={cachedTube('sOvi', [[0, 0, 0], [0, 0, -0.15], [0, -0.01, -0.32]], 0.012, 0.007, 8, 6)} color="#17110c" surface={SURF.chitin(0.8)} position={[0, 0.12, -0.32]} part="ovipositor" />
        ) : null}
        {adult ? (
          <group ref={wings} position={[0, 0.17, 0.08]}>
            {/* オスの前ばねは 幅が広く、ここを こすって 鳴く。メスは 細い */}
            <mesh geometry={GEO.sphere()} material={wingMat} position={[0, 0.015, -0.17]} scale={[male ? 0.17 : 0.1, 0.02, 0.23]} castShadow userData={{ part: 'wings' }} />
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
