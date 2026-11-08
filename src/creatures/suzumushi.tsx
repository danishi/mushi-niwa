import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, toon } from '../three/toon';
import { M, Shine, useBodyMotion } from './common';
import { cachedTube } from './geom';
import { Antenna, Eye, Leg, Part } from './parts';
import type { ModelProps } from './registry';

/** 長い後ろあし（跳ぶためのあし） */
function HindLeg({ side, anim, outlines, color }: { side: 1 | -1; anim: ModelProps['anim']; outlines: boolean; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    if (ref.current) ref.current.rotation.x = -0.3 - Math.max(0, Math.sin(a.gait)) * 0.6 * a.walk;
  });
  return (
    <group ref={ref} position={[side * 0.1, 0.14, -0.1]}>
      <Part
        geometry={cachedTube('hindFemur', [[0, 0, 0], [0.06, 0.12, -0.15], [0.08, 0.2, -0.32]], 0.05, 0.025, 8, 6)}
        color={color}
        scale={[side, 1, 1]}
        outlines={outlines}
        part="hindleg"
      />
      <M geo={GEO.cylinder()} color={color} position={[side * 0.1, 0.06, -0.42]} rotation={[0.9, 0, 0]} scale={[0.015, 0.36, 0.015]} part="hindleg" />
    </group>
  );
}

function CricketBody({ anim, outlines, sex, adult, size }: ModelProps & { adult: boolean; size: number }) {
  const body = useBodyMotion(anim, 0.4);
  const wings = useRef<THREE.Group>(null);
  const male = sex === 'male';
  const black = '#2a221c';
  const wingMat = useMemo(() => toon('#9a8466', { opacity: 0.92, side: THREE.DoubleSide }), []);
  const vein = useMemo(() => toon('#5a4636'), []);
  useFrame(() => {
    const a = anim.current;
    if (wings.current) {
      // 鳴くとき：前ばねを体に対して立て、小刻みにこすり合わせる
      const up = a.sing * 1.15;
      wings.current.rotation.x = -up;
      wings.current.position.y = 0.2 + a.sing * 0.03;
      wings.current.rotation.z = a.sing * Math.sin(a.t * 70) * 0.06;
    }
  });
  return (
    <group scale={size}>
      <group ref={body}>
        <Part geometry={GEO.sphere()} color={black} position={[0, 0.15, -0.1]} scale={[0.13, 0.1, 0.24]} outlines={outlines} part="body" />
        <Part geometry={GEO.sphere()} color={black} position={[0, 0.17, 0.14]} scale={[0.11, 0.09, 0.09]} outlines={outlines} part="body" />
        <Part geometry={GEO.sphere()} color={black} position={[0, 0.19, 0.26]} scale={0.09} outlines={outlines} part="antenna" />
        <Eye position={[0.07, 0.22, 0.31]} size={0.04} anim={anim} />
        <Eye position={[-0.07, 0.22, 0.31]} size={0.04} anim={anim} />
        <Shine position={[0.04, 0.24, -0.1]} scale={[0.04, 0.02, 0.12]} anim={anim} />
        {/* からだの 2 倍以上ある長い触角 */}
        <Antenna position={[0.04, 0.24, 0.33]} side={1} length={0.9} kind="thread" color="#3a2e24" anim={anim} outlines={outlines} up={0.25} forward={0.75} part="antenna" />
        <Antenna position={[-0.04, 0.24, 0.33]} side={-1} length={0.9} kind="thread" color="#3a2e24" anim={anim} outlines={outlines} up={0.25} forward={0.75} part="antenna" />
        {/* 前あし（すねに耳）・中あし */}
        {[0, 1].map((p) => (
          <group key={p} position={[0, 0.1, 0.14 - p * 0.12]}>
            <Leg position={[0.08, 0, 0]} side={1} pair={p} length={0.26} thick={0.016} color={black} anim={anim} outlines={false} part={p === 0 ? 'ear' : undefined} />
            <Leg position={[-0.08, 0, 0]} side={-1} pair={p} length={0.26} thick={0.016} color={black} anim={anim} outlines={false} part={p === 0 ? 'ear' : undefined} />
          </group>
        ))}
        {adult ? (
          <>
            <M color="#f2efe6" position={[0.2, 0.06, 0.16]} scale={[0.012, 0.02, 0.03]} part="ear" />
            <M color="#f2efe6" position={[-0.2, 0.06, 0.16]} scale={[0.012, 0.02, 0.03]} part="ear" />
          </>
        ) : null}
        <HindLeg side={1} anim={anim} outlines={outlines} color={black} />
        <HindLeg side={-1} anim={anim} outlines={outlines} color={black} />
        {/* 尾角 */}
        <M geo={GEO.cone()} color="#cfc6b6" position={[0.05, 0.14, -0.38]} rotation={[-1.8, 0, 0.2]} scale={[0.015, 0.14, 0.015]} />
        <M geo={GEO.cone()} color="#cfc6b6" position={[-0.05, 0.14, -0.38]} rotation={[-1.8, 0, -0.2]} scale={[0.015, 0.14, 0.015]} />
        {adult && !male ? (
          <Part geometry={cachedTube('ovipositor', [[0, 0, 0], [0, 0, -0.15], [0, -0.01, -0.3]], 0.015, 0.008, 6, 5)} color="#1f1915" position={[0, 0.14, -0.34]} outlines={outlines} part="ovipositor" />
        ) : null}
        {adult ? (
          <group ref={wings} position={[0, 0.2, 0.06]}>
            {/* オスの前ばねは幅が広く、ここをこすって鳴く */}
            <mesh geometry={GEO.sphere()} material={wingMat} position={[0, 0.02, -0.18]} scale={[male ? 0.2 : 0.12, 0.03, 0.24]} userData={{ part: 'wings' }} />
            {male
              ? [-0.1, -0.18, -0.26].map((z) => (
                  <mesh key={z} geometry={GEO.box()} material={vein} position={[0, 0.05, z]} rotation={[0, z * 6, 0]} scale={[0.3, 0.004, 0.006]} />
                ))
              : null}
          </group>
        ) : null}
      </group>
    </group>
  );
}

export function SuzuNymph(p: ModelProps) {
  return <CricketBody {...p} adult={false} size={0.55 + p.molts * 0.1} />;
}

export function SuzuAdult(p: ModelProps) {
  return <CricketBody {...p} adult size={1.15} />;
}
