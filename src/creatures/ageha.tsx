import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { leafGeometry } from '../three/Diorama';
import { GEO, toon } from '../three/toon';
import { M, Shine, useBodyMotion } from './common';
import { cachedTube, shapeGeo } from './geom';
import { Antenna, Eye, Leg, Part } from './parts';
import type { ModelProps } from './registry';

/** たまご：ミカンの葉の上の黄色い丸いたまご */
export function AgehaEgg({ anim, outlines }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = Math.sin(anim.current.t * 30) * 0.08 * anim.current.shiver;
  });
  return (
    <group>
      <M geo={leafGeometry()} color="#4f8a2b" scale={0.9} part="egg" />
      <group ref={ref} position={[0, 0.08, 0.45]}>
        <Part geometry={GEO.sphere()} color="#f2d65c" scale={0.08} outlines={outlines} part="egg" />
      </group>
    </group>
  );
}

/**
 * ようちゅう：1〜4 齢は鳥のふんのような白黒、5 齢は黄緑で目玉もよう。
 * さわると頭の後ろから橙色の臭角（しゅうかく）がにゅっと出る。
 */
export function AgehaLarva({ anim, outlines, molts }: ModelProps) {
  const segs = useRef<Array<THREE.Mesh | null>>([]);
  const osm = useRef<THREE.Group>(null);
  const body = useBodyMotion(anim, 0.3);
  const fifth = molts >= 4;
  const N = 8;
  const size = 0.55 + molts * 0.16;
  const colors = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => {
        if (fifth) return i === 1 || i === 2 ? '#a5cf4c' : '#8cc63f';
        // 鳥のふん模様：黒褐色に白い帯（中ほどと後ろ）
        return i === 3 || i === N - 1 ? '#f4f1e8' : i % 2 ? '#3d2f27' : '#4a3a30';
      }),
    [fifth],
  );
  useFrame(() => {
    const a = anim.current;
    for (let i = 0; i < N; i++) {
      const m = segs.current[i];
      if (!m) continue;
      const lift = Math.max(0, Math.sin(a.gait * 2 - i * 0.8)) * 0.05 * a.walk;
      m.position.set(0, 0.16 + lift, 0.42 - i * 0.12);
      const r = 0.13 + (i === 1 || i === 2 ? 0.03 : 0) - (i > N - 3 ? (i - (N - 3)) * 0.02 : 0);
      m.scale.set(r, r * 0.95, r * 0.75);
    }
    if (osm.current) {
      // 臭角：タップした直後だけ出る
      const out = Math.min(1, a.bounce * 1.6 + a.spray);
      osm.current.scale.setScalar(Math.max(0.001, out));
    }
  });
  return (
    <group scale={size}>
      <group ref={body}>
        {colors.map((c, i) => (
          <Part
            key={i}
            meshRef={(m) => {
              segs.current[i] = m;
            }}
            geometry={GEO.sphere()}
            color={c}
            outlines={outlines}
            outline={i % 2 === 0}
            part={fifth && i === 1 ? 'eyespot' : 'pattern'}
          />
        ))}
        {fifth ? (
          <>
            {[1, -1].map((s) => (
              <group key={s} position={[s * 0.1, 0.27, 0.33]}>
                <M color="#2b2118" scale={[0.035, 0.03, 0.04]} part="eyespot" />
                <M color="#f6e7a1" scale={[0.05, 0.04, 0.05]} position={[0, -0.005, -0.004]} part="eyespot" />
              </group>
            ))}
            <M geo={GEO.box()} color="#3d5a1f" position={[0, 0.26, 0.24]} scale={[0.22, 0.02, 0.02]} part="pattern" />
          </>
        ) : null}
        {/* 頭 */}
        <Part geometry={GEO.sphere()} color={fifth ? '#7fb236' : '#3d2f27'} position={[0, 0.12, 0.53]} scale={[0.09, 0.08, 0.07]} outlines={outlines} part="pattern" />
        <Eye position={[0.05, 0.15, 0.58]} size={0.03} anim={anim} />
        <Eye position={[-0.05, 0.15, 0.58]} size={0.03} anim={anim} />
        {/* 臭角（二また・橙色） */}
        <group ref={osm} position={[0, 0.22, 0.48]}>
          {[1, -1].map((s) => (
            <Part
              key={s}
              geometry={cachedTube(`osm${s}`, [[0, 0, 0], [s * 0.04, 0.08, 0.02], [s * 0.1, 0.15, 0.0]], 0.025, 0.015, 8, 6)}
              color="#f39c34"
              outlines={outlines}
              part="osmeterium"
            />
          ))}
        </group>
        {/* 胸あし 3 対 */}
        {[0, 1, 2].map((p) => (
          <group key={p} position={[0, 0.06, 0.42 - p * 0.08]}>
            <Leg position={[0.08, 0, 0]} side={1} pair={p} length={0.08} thick={0.018} color="#2b2118" anim={anim} outlines={false} />
            <Leg position={[-0.08, 0, 0]} side={-1} pair={p} length={0.08} thick={0.018} color="#2b2118" anim={anim} outlines={false} />
          </group>
        ))}
        <Shine position={[0.04, 0.3, 0.2]} scale={[0.04, 0.02, 0.1]} anim={anim} />
      </group>
    </group>
  );
}

/** さなぎ：糸（帯糸）で枝にかかった緑の帯蛹 */
export function AgehaPupa({ anim, outlines, sex }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  // 緑と褐色がある（個体ごと。ここでは性別で見た目を分けて代用）
  const color = sex === 'male' ? '#8ab64a' : '#b08d5a';
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = Math.sin(anim.current.t * 30) * 0.05 * anim.current.shiver;
  });
  return (
    <group>
      <M geo={GEO.cylinder()} color="#8d6e63" position={[0, 0.75, -0.12]} rotation={[0.25, 0, 0]} scale={[0.05, 1.5, 0.05]} />
      <group ref={ref} position={[0, 0.7, 0.02]} rotation={[0.3, 0, 0]}>
        <Part geometry={GEO.sphere()} color={color} scale={[0.15, 0.42, 0.13]} outlines={outlines} part="color" />
        <Part geometry={GEO.cone()} color={color} position={[0, 0.48, 0.02]} scale={[0.09, 0.16, 0.06]} outlines={outlines} part="color" />
        <M geo={GEO.box()} color="#f2f0e6" position={[0, 0.08, -0.08]} rotation={[0.3, 0, 0]} scale={[0.34, 0.012, 0.012]} part="girdle" />
        <Eye position={[0.05, 0.48, 0.08]} size={0.025} anim={anim} />
        <Eye position={[-0.05, 0.48, 0.08]} size={0.025} anim={anim} />
      </group>
    </group>
  );
}

const foreWing = (s: THREE.Shape) => {
  s.moveTo(0, 0);
  s.bezierCurveTo(0.25, 0.2, 0.7, 0.45, 0.95, 0.42);
  s.bezierCurveTo(0.9, 0.2, 0.7, 0.02, 0.4, -0.1);
  s.lineTo(0, -0.05);
};
const hindWing = (s: THREE.Shape) => {
  s.moveTo(0, -0.05);
  s.bezierCurveTo(0.35, -0.05, 0.6, -0.25, 0.55, -0.5);
  s.lineTo(0.5, -0.72); // 尾状突起
  s.lineTo(0.42, -0.52);
  s.bezierCurveTo(0.3, -0.6, 0.1, -0.45, 0, -0.2);
};

function Wing({ side, anim }: { side: 1 | -1; anim: ModelProps['anim'] }) {
  const ref = useRef<THREE.Group>(null);
  const fore = shapeGeo('agehaFore', foreWing);
  const hind = shapeGeo('agehaHind', hindWing);
  const yellow = useMemo(() => toon('#f6d55c', { side: THREE.DoubleSide }), []);
  const black = useMemo(() => toon('#2b2118', { side: THREE.DoubleSide }), []);
  const blue = useMemo(() => toon('#5aa9e6', { side: THREE.DoubleSide }), []);
  const orange = useMemo(() => toon('#f08a4b', { side: THREE.DoubleSide }), []);
  useFrame(() => {
    const a = anim.current;
    const flap = Math.sin(a.t * 14) * 0.9 * a.flap + (1 - a.flap) * (0.5 + Math.sin(a.t * 1.5) * 0.25);
    if (ref.current) ref.current.rotation.z = side * (0.15 + flap);
  });
  return (
    <group ref={ref} position={[side * 0.03, 0.12, 0]} scale={[side, 1, 1]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={fore} material={yellow} scale={0.75} userData={{ part: 'wings' }} />
        {/* 黒い帯もよう */}
        {[0.25, 0.45, 0.65].map((x) => (
          <mesh key={x} geometry={GEO.box()} material={black} position={[x * 0.75, 0.08 + x * 0.15, 0.002]} rotation={[0, 0, 0.9]} scale={[0.03, 0.28, 0.001]} />
        ))}
        <mesh geometry={GEO.box()} material={black} position={[0.62, 0.3, 0.002]} rotation={[0, 0, -0.35]} scale={[0.1, 0.36, 0.001]} />
        <mesh geometry={hind} material={yellow} scale={0.75} userData={{ part: 'wings' }} />
        <mesh geometry={GEO.box()} material={black} position={[0.3, -0.35, 0.002]} rotation={[0, 0, 0.4]} scale={[0.12, 0.08, 0.001]} />
        <mesh geometry={GEO.sphereLo()} material={blue} position={[0.32, -0.4, 0.004]} scale={[0.03, 0.03, 0.001]} />
        <mesh geometry={GEO.sphereLo()} material={orange} position={[0.12, -0.33, 0.004]} scale={[0.035, 0.035, 0.001]} />
      </group>
    </group>
  );
}

/** 成虫：黄色に黒い帯の大きな はね。花のみつを ストローで すう */
export function AgehaAdult({ anim, outlines }: ModelProps) {
  const body = useBodyMotion(anim, 0);
  const tongue = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    if (tongue.current) tongue.current.scale.set(1, 1, 0.3 + a.eat * 1.2);
  });
  return (
    <group ref={body} position={[0, 0.3, 0]} scale={1.5}>
      <Part geometry={GEO.capsule()} color="#2b2118" rotation={[Math.PI / 2, 0, 0]} scale={[0.07, 0.35, 0.07]} outlines={outlines} part="wings" />
      <M geo={GEO.box()} color="#f6d55c" position={[0, 0.03, -0.05]} scale={[0.02, 0.04, 0.3]} />
      <Part geometry={GEO.sphere()} color="#2b2118" position={[0, 0.03, 0.25]} scale={0.065} outlines={outlines} part="proboscis" />
      <Eye position={[0.045, 0.05, 0.28]} size={0.035} anim={anim} />
      <Eye position={[-0.045, 0.05, 0.28]} size={0.035} anim={anim} />
      <group ref={tongue} position={[0, -0.01, 0.3]}>
        <M geo={GEO.cylinder()} color="#3b2e24" position={[0, -0.02, 0.06]} rotation={[Math.PI / 2.4, 0, 0]} scale={[0.008, 0.12, 0.008]} part="proboscis" />
      </group>
      <Antenna position={[0.02, 0.07, 0.28]} side={1} length={0.35} kind="club" color="#2b2118" anim={anim} outlines={outlines} up={0.6} forward={0.8} />
      <Antenna position={[-0.02, 0.07, 0.28]} side={-1} length={0.35} kind="club" color="#2b2118" anim={anim} outlines={outlines} up={0.6} forward={0.8} />
      <Wing side={1} anim={anim} />
      <Wing side={-1} anim={anim} />
      {[0, 1, 2].map((p) => (
        <group key={p} position={[0, -0.04, 0.12 - p * 0.06]}>
          <Leg position={[0.04, 0, 0]} side={1} pair={p} length={0.2} thick={0.012} color="#2b2118" anim={anim} outlines={false} part={p === 0 ? 'foreleg' : undefined} />
          <Leg position={[-0.04, 0, 0]} side={-1} pair={p} length={0.2} thick={0.012} color="#2b2118" anim={anim} outlines={false} part={p === 0 ? 'foreleg' : undefined} />
        </group>
      ))}
    </group>
  );
}
