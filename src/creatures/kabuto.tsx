import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { GEO } from '../three/toon';
import { M, Shine, useBodyMotion } from './common';
import { cachedTube, elytronGeo } from './geom';
import { Antenna, Eye, Leg, Part } from './parts';
import type { ModelProps } from './registry';

const LARVA = '#f1e6cf';
const LARVA_TAIL = '#b9ad9c';
const LARVA_HEAD = '#c9772f';

/** カブトムシの幼虫：C 字に丸まった白い いもむし（気門・あし付き） */
export function KabutoLarva({ anim, outlines, molts }: ModelProps) {
  const segs = useRef<Array<THREE.Mesh | null>>([]);
  const head = useRef<THREE.Group>(null);
  const body = useBodyMotion(anim, 0.5);
  const N = 9;
  // 齢が進むほど大きくなる（1→3 齢）
  const size = 0.95 + molts * 0.2;
  useFrame(() => {
    const a = anim.current;
    const curl = 0.06 * Math.sin(a.t * (0.8 + a.energy)) + a.walk * 0.12 * Math.sin(a.gait * 2);
    const R = 0.34;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const ang = THREE.MathUtils.lerp(0.4 * Math.PI, -1.0 * Math.PI + curl * 3, u);
      const m = segs.current[i];
      if (!m) continue;
      m.position.set(0, 0.4 + R * Math.sin(ang), R * Math.cos(ang));
      const wave = 1 + 0.06 * Math.sin(a.gait * 3 - i * 0.9) * a.walk;
      const r = (0.17 + 0.07 * Math.sin(u * Math.PI * 0.9)) * wave;
      m.scale.set(r * 1.05, r, r);
    }
    const h = segs.current[0];
    if (h && head.current) {
      head.current.position.set(0, h.position.y + 0.08, h.position.z + 0.12);
      head.current.rotation.x = -0.4 + a.eat * 0.4 * Math.sin(a.t * 9);
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
            color={i > N - 4 ? LARVA_TAIL : LARVA}
            outlines={outlines}
            outline={i % 2 === 0}
            part={i >= 2 && i <= 6 ? 'spiracle' : 'body'}
          >
            {/* 気門（体の横の小さな穴） */}
            {i >= 2 && i <= 6 ? (
              <>
                <M color="#7a4a24" position={[0.93, 0.15, 0]} scale={[0.05, 0.14, 0.1]} part="spiracle" />
                <M color="#7a4a24" position={[-0.93, 0.15, 0]} scale={[0.05, 0.14, 0.1]} part="spiracle" />
              </>
            ) : null}
          </Part>
        ))}
        <group ref={head}>
          <Part geometry={GEO.sphere()} color={LARVA_HEAD} scale={[0.17, 0.15, 0.15]} outlines={outlines} part="head" />
          <M color="#3b2414" position={[0.06, -0.07, 0.12]} rotation={[0.6, 0, 0.3]} scale={[0.03, 0.06, 0.03]} geo={GEO.cone()} part="head" />
          <M color="#3b2414" position={[-0.06, -0.07, 0.12]} rotation={[0.6, 0, -0.3]} scale={[0.03, 0.06, 0.03]} geo={GEO.cone()} part="head" />
          <Eye position={[0.08, 0.05, 0.11]} size={0.045} anim={anim} />
          <Eye position={[-0.08, 0.05, 0.11]} size={0.045} anim={anim} />
          {/* 胸の短いあし 3 対 */}
          {[0, 1, 2].map((p) => (
            <group key={p} position={[0, -0.12, -0.08 - p * 0.1]}>
              <Leg position={[0.08, 0, 0]} side={1} pair={p} length={0.16} thick={0.022} color="#d9a066" anim={anim} outlines={false} part="legs" />
              <Leg position={[-0.08, 0, 0]} side={-1} pair={p} length={0.16} thick={0.022} color="#d9a066" anim={anim} outlines={false} part="legs" />
            </group>
          ))}
        </group>
        <Shine position={[0.12, 0.62, 0.05]} scale={[0.05, 0.03, 0.09]} anim={anim} />
      </group>
    </group>
  );
}

/** カブトムシのさなぎ：蛹室（土の部屋）の中で立っている */
export function KabutoPupa({ anim, outlines, sex }: ModelProps) {
  const body = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    if (body.current) {
      // さなぎも ときどき おなかを くねっと動かす
      body.current.rotation.z = Math.sin(a.t * 0.7) > 0.97 ? Math.sin(a.t * 20) * 0.05 : 0;
      body.current.rotation.x = a.shiver * Math.sin(a.t * 30) * 0.05;
    }
  });
  const male = sex === 'male';
  return (
    <group>
      {/* 蛹室 */}
      <M color="#5a3d2b" position={[0, 0.62, -0.05]} scale={[0.42, 0.7, 0.3]} part="chamber" />
      <group ref={body} position={[0, 0.2, 0.05]}>
        <Part geometry={GEO.sphere()} color="#d39a55" position={[0, 0.42, 0]} scale={[0.26, 0.42, 0.22]} outlines={outlines} part="body" />
        {[0.15, 0.27, 0.39].map((y) => (
          <M key={y} color="#b97a3a" geo={GEO.cylinder()} position={[0, y, 0]} scale={[0.255 - (0.4 - y) * 0.1, 0.012, 0.215]} />
        ))}
        <Part geometry={GEO.sphere()} color="#d8a464" position={[0, 0.88, 0.04]} scale={[0.2, 0.17, 0.18]} outlines={outlines} part="body" />
        {male ? (
          <Part
            geometry={cachedTube('pupaHorn', [[0, 0, 0], [0, 0.12, 0.08], [0, 0.26, 0.1], [0, 0.36, 0.06]], 0.06, 0.04)}
            color="#d8a464"
            position={[0, 0.98, 0.1]}
            outlines={outlines}
            part="horn"
          />
        ) : null}
        <Eye position={[0.09, 0.9, 0.16]} size={0.035} anim={anim} />
        <Eye position={[-0.09, 0.9, 0.16]} size={0.035} anim={anim} />
      </group>
    </group>
  );
}

const ADULT_M = '#5b2a17';
const ADULT_F = '#3e2416';

/** カブトムシの成虫（オスは頭と胸に二またの角） */
export function KabutoAdult({ anim, outlines, sex }: ModelProps) {
  const body = useBodyMotion(anim);
  const headRef = useRef<THREE.Group>(null);
  const male = sex === 'male';
  const c = male ? ADULT_M : ADULT_F;
  useFrame(() => {
    const a = anim.current;
    if (headRef.current) headRef.current.rotation.x = -a.eat * 0.35 + Math.sin(a.t * 0.9) * 0.05 * a.energy;
  });
  const legs: Array<[number, number]> = [
    [0.3, 0],
    [0.1, 1],
    [-0.12, 2],
  ];
  return (
    <group ref={body}>
      {/* 前ばね（左右） */}
      <Part geometry={elytronGeo()} color={c} position={[0.005, 0.24, -0.18]} rotation={[0, Math.PI / 2, 0]} scale={[0.52, 0.3, 0.33]} outlines={outlines} part="elytra" />
      <Part geometry={elytronGeo()} color={c} position={[-0.005, 0.24, -0.18]} rotation={[0, -Math.PI / 2, 0]} scale={[0.52, 0.3, 0.33]} outlines={outlines} part="elytra" />
      <M color="#2b170c" geo={GEO.box()} position={[0, 0.4, -0.18]} scale={[0.012, 0.3, 0.9]} rotation={[0.12, 0, 0]} />
      <Shine position={[0.12, 0.5, -0.25]} scale={[0.08, 0.03, 0.18]} anim={anim} />
      {/* 前胸 */}
      <Part geometry={GEO.sphere()} color={c} position={[0, 0.3, 0.27]} scale={[0.3, 0.2, 0.2]} outlines={outlines} part={male ? 'chestHorn' : 'elytra'} />
      {male ? (
        <group position={[0, 0.44, 0.33]}>
          <Part geometry={cachedTube('chestHorn', [[0, 0, 0], [0, 0.03, 0.08], [0, 0.04, 0.17]], 0.045, 0.025, 8, 6)} color={c} outlines={outlines} part="chestHorn" />
          <M color={c} geo={GEO.cone()} position={[0.025, 0.04, 0.19]} rotation={[1.3, 0, -0.5]} scale={[0.02, 0.06, 0.02]} part="chestHorn" />
          <M color={c} geo={GEO.cone()} position={[-0.025, 0.04, 0.19]} rotation={[1.3, 0, 0.5]} scale={[0.02, 0.06, 0.02]} part="chestHorn" />
        </group>
      ) : null}
      {/* 頭 */}
      <group ref={headRef} position={[0, 0.24, 0.48]}>
        <Part geometry={GEO.sphere()} color={c} scale={[0.14, 0.11, 0.13]} outlines={outlines} part={male ? 'horn' : 'elytra'} />
        <Eye position={[0.1, 0.03, 0.06]} size={0.05} anim={anim} />
        <Eye position={[-0.1, 0.03, 0.06]} size={0.05} anim={anim} />
        <Antenna position={[0.07, -0.02, 0.12]} side={1} length={0.18} kind="short" color="#3a2010" anim={anim} outlines={outlines} up={0.2} forward={0.8} />
        <Antenna position={[-0.07, -0.02, 0.12]} side={-1} length={0.18} kind="short" color="#3a2010" anim={anim} outlines={outlines} up={0.2} forward={0.8} />
        {male ? (
          <group position={[0, 0.02, 0.1]}>
            <Part
              geometry={cachedTube('headHorn', [[0, 0, 0], [0, 0.1, 0.22], [0, 0.34, 0.36], [0, 0.6, 0.34]], 0.07, 0.035)}
              color={c}
              outlines={outlines}
              part="horn"
            />
            {/* 先が二また、さらに二また */}
            {[1, -1].map((s) => (
              <group key={s} position={[0, 0.6, 0.34]} rotation={[0, 0, s * 0.6]}>
                <Part geometry={cachedTube('hornFork', [[0, 0, 0], [0, 0.07, 0.02], [0, 0.12, 0.0]], 0.032, 0.018, 6, 6)} color={c} outlines={outlines} part="horn" />
                <M color={c} geo={GEO.cone()} position={[0.02, 0.13, 0]} rotation={[0, 0, -0.6]} scale={[0.015, 0.05, 0.015]} part="horn" />
                <M color={c} geo={GEO.cone()} position={[-0.02, 0.13, 0]} rotation={[0, 0, 0.6]} scale={[0.015, 0.05, 0.015]} part="horn" />
              </group>
            ))}
          </group>
        ) : null}
      </group>
      {/* あし 3 対（すねにギザギザ、先につめ） */}
      {legs.map(([z, p]) => (
        <group key={p}>
          <Leg position={[0.17, 0.2, z]} side={1} pair={p} length={0.5} thick={0.03} color="#2b170c" anim={anim} outlines={outlines} part="legs" />
          <Leg position={[-0.17, 0.2, z]} side={-1} pair={p} length={0.5} thick={0.03} color="#2b170c" anim={anim} outlines={outlines} part="legs" />
        </group>
      ))}
    </group>
  );
}
