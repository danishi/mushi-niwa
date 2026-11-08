import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, SURF } from '../three/materials';
import { grainBump } from '../three/textures';
import { M, useBodyMotion } from './common';
import { cachedTube, domeGeo } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research-3.md §A（オオクワガタ）。形は 図鑑の 記載と 一般的な 形態に もとづく */

const BLACK = '#17120f';
const LEG = '#120d0b';

const FRONT: LegSpec = { femur: 0.24, tibia: 0.26, tarsus: 0.3, thick: 0.026, tarsi: 5, teeth: 3 };
const MID: LegSpec = { femur: 0.24, tibia: 0.24, tarsus: 0.28, thick: 0.026, tarsi: 5, teeth: 1 };
const HIND: LegSpec = { femur: 0.26, tibia: 0.26, tarsus: 0.3, thick: 0.026, tarsi: 5, teeth: 1 };

/**
 * 大あご（右がわ。左は scale x = -1 で 反転）。オスは 太く 内がわへ 大きく 曲がり、
 * まん中より 先に 内歯（ないし）が 1 本 ある。メスは 短く 小さい。
 */
function Mandible({ male, side, anim }: { male: boolean; side: 1 | -1; anim: ModelProps['anim'] }) {
  const ref = useRef<THREE.Group>(null);
  const shell = useMemo(() => SURF.chitin(1), []);
  useFrame(() => {
    const a = anim.current;
    if (!ref.current) return;
    // ふだんは ほぼ とじて いて、いかく（spray）の ときに 大きく ひらく
    const open = 0.08 + a.spray * 0.45 + Math.sin(a.t * 0.8) * 0.02 * a.energy;
    ref.current.rotation.y = side * open;
  });
  const geo = male
    ? cachedTube('kuwaMandM', [[0, 0, 0], [0.06, 0.01, 0.1], [0.075, 0.02, 0.2], [0.05, 0.025, 0.29], [0.005, 0.02, 0.33]], 0.05, 0.016, 20, 8)
    : cachedTube('kuwaMandF', [[0, 0, 0], [0.04, 0.005, 0.06], [0.035, 0.01, 0.11], [0.01, 0.01, 0.14]], 0.035, 0.012, 12, 8);
  return (
    <group position={[side * 0.07, 0, 0.08]} scale={[side, 1, 1]}>
      <group ref={ref}>
        <Part geometry={geo} color={BLACK} surface={shell} castShadow part="mandibles" />
        {male ? (
          // 内歯：先から 3 分の 1 ほどの ところで 内がわ・やや 上を むく
          <M geo={GEO.cone()} color={BLACK} surface={shell} position={[0.05, 0.03, 0.21]} rotation={[0.3, 0, 1.25]} scale={[0.02, 0.06, 0.02]} part="mandibles" />
        ) : (
          <M geo={GEO.cone()} color={BLACK} surface={shell} position={[0.025, 0.012, 0.09]} rotation={[0, 0, 1.3]} scale={[0.012, 0.03, 0.012]} part="mandibles" />
        )}
      </group>
    </group>
  );
}

/**
 * 成虫：からだは 平たく 黒い。前ばねは つやが あり、メスは たての すじ（点刻の 列）が はっきり。
 * 頭は 大きく 平ら、オスは 頭が とくに はばひろい。触角は「く」の 字に まがり、先が くしの よう。
 */
export function KuwaAdult({ anim, sex }: ModelProps) {
  const body = useBodyMotion(anim);
  const headRef = useRef<THREE.Group>(null);
  const brush = useRef<THREE.Mesh>(null);
  const male = sex === 'male';
  const shell = useMemo(
    () => (male ? { ...SURF.chitin(1), bumpMap: grainBump(21, 96), bumpScale: 0.15 } : { ...SURF.chitin(0.6), bumpMap: grainBump(22, 160), bumpScale: 0.9 }),
    [male],
  );
  const dark = useMemo(() => SURF.chitin(0.9), []);
  useFrame(() => {
    const a = anim.current;
    // いかくの ときは 頭を もちあげる
    if (headRef.current) headRef.current.rotation.x = -0.05 - a.spray * 0.25 - a.eat * 0.2 + Math.sin(a.t * 0.9) * 0.02 * a.energy;
    if (brush.current) brush.current.scale.setScalar(0.4 + a.eat * 0.7);
  });
  const hw = male ? 0.2 : 0.15;
  return (
    <group ref={body}>
      {/* 前ばね（平たい ドーム）と 合わせ目、たての すじ */}
      <Part geometry={domeGeo()} color={BLACK} surface={shell} position={[0, 0.15, -0.2]} scale={[0.24, 0.15, 0.4]} castShadow part="elytra" />
      <M geo={GEO.box()} color="#060403" position={[0, 0.3, -0.2]} scale={[0.006, 0.008, 0.76]} />
      {!male
        ? [0.07, 0.14].map((x) =>
            [1, -1].map((s) => <M key={`${x}${s}`} geo={GEO.box()} color="#0b0806" position={[s * x, 0.28 - x * 0.35, -0.2]} rotation={[0, 0, -s * x * 1.6]} scale={[0.004, 0.006, 0.66]} />),
          )
        : null}
      <M color="#0e0a08" position={[0, 0.14, -0.2]} scale={[0.22, 0.06, 0.37]} />
      {/* 前胸：はばひろく 角が まるい */}
      <Part geometry={GEO.sphere()} color={BLACK} surface={dark} position={[0, 0.2, 0.2]} scale={[0.25, 0.1, 0.15]} castShadow part="elytra" />
      {/* 頭 */}
      <group ref={headRef} position={[0, 0.18, 0.38]}>
        <Part geometry={GEO.sphere()} color={BLACK} surface={dark} scale={[hw, 0.07, 0.11]} castShadow part="mandibles" />
        <CompoundEye position={[hw * 0.92, 0.0, 0.03]} size={[0.022, 0.03, 0.035]} />
        <CompoundEye position={[-hw * 0.92, 0.0, 0.03]} size={[0.022, 0.03, 0.035]} />
        <mesh ref={brush} position={[0, -0.05, 0.1]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial color="#c9782f" roughness={1} />
        </mesh>
        {/* 触角：「く」の 字（長い つけね ＋ 先の くし） */}
        <Antenna position={[hw * 0.7, -0.01, 0.08]} side={1} length={0.13} thick={0.008} kind="lamellate" color="#2a1a10" anim={anim} rotation={[0.1, 1.0, 0]} part="antenna" />
        <Antenna position={[-hw * 0.7, -0.01, 0.08]} side={-1} length={0.13} thick={0.008} kind="lamellate" color="#2a1a10" anim={anim} rotation={[0.1, 1.0, 0]} part="antenna" />
        <Mandible male={male} side={1} anim={anim} />
        <Mandible male={male} side={-1} anim={anim} />
      </group>
      {/* あし（前あしの すねに ギザギザ） */}
      <Leg position={[0.13, 0.11, 0.24]} side={1} pair={0} spec={FRONT} color={LEG} anim={anim} part="legs" />
      <Leg position={[-0.13, 0.11, 0.24]} side={-1} pair={0} spec={FRONT} color={LEG} anim={anim} part="legs" />
      <Leg position={[0.15, 0.1, 0.0]} side={1} pair={1} spec={MID} color={LEG} anim={anim} part="legs" />
      <Leg position={[-0.15, 0.1, 0.0]} side={-1} pair={1} spec={MID} color={LEG} anim={anim} part="legs" />
      <Leg position={[0.15, 0.1, -0.18]} side={1} pair={2} spec={HIND} color={LEG} anim={anim} part="legs" />
      <Leg position={[-0.15, 0.1, -0.18]} side={-1} pair={2} spec={HIND} color={LEG} anim={anim} part="legs" />
    </group>
  );
}

/** さなぎ：くち木の 中の 部屋で あおむけに 近い 姿勢。オスは 大あごの 形が もう 見える */
export function KuwaPupa({ anim, sex }: ModelProps) {
  const body = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    if (body.current) {
      body.current.rotation.z = Math.sin(a.t * 0.7) > 0.97 ? Math.sin(a.t * 20) * 0.04 : 0;
      body.current.rotation.x = Math.max(a.shiver, a.bounce) * Math.sin(a.t * 30) * 0.05;
    }
  });
  const male = sex === 'male';
  const amber = useMemo(() => ({ ...SURF.chitin(0.7), translucent: true }), []);
  return (
    <group scale={0.82}>
      {/* 蛹室（くち木の くずを 固めた 部屋） */}
      <M color="#8a6640" surface={{ roughness: 1, bumpMap: grainBump(9, 48), bumpScale: 3 }} position={[0, 0.55, -0.05]} scale={[0.42, 0.62, 0.3]} part="chamber" />
      <group ref={body} position={[0, 0.2, 0.05]}>
        <Part geometry={GEO.sphere()} color="#e8c48a" surface={amber} position={[0, 0.36, 0]} scale={[0.23, 0.36, 0.19]} castShadow part="body" />
        {[0.12, 0.2, 0.28, 0.36].map((y, i) => (
          <M key={y} color="#c99a5c" surface={amber} geo={GEO.cylinder()} position={[0, y, 0]} scale={[0.228 - (3 - i) * 0.02, 0.008, 0.19 - (3 - i) * 0.015]} />
        ))}
        <Part geometry={GEO.sphere()} color="#ecca92" surface={amber} position={[0, 0.74, 0.03]} scale={[male ? 0.22 : 0.17, 0.12, 0.15]} part="body" />
        {[1, -1].map((s) => (
          <group key={s}>
            <M color="#e9c88f" surface={amber} geo={GEO.capsule()} position={[s * 0.1, 0.52, 0.15]} rotation={[0.15, 0, s * 0.1]} scale={[0.045, 0.2, 0.045]} />
            <M color="#e9c88f" surface={amber} geo={GEO.capsule()} position={[s * 0.06, 0.4, 0.17]} rotation={[0.1, 0, -s * 0.15]} scale={[0.04, 0.18, 0.04]} />
            <M color="#d8ac6c" surface={amber} position={[s * 0.16, 0.48, 0.05]} scale={[0.06, 0.22, 0.09]} />
            {/* 大あごの もと */}
            <Part
              geometry={male ? cachedTube('kuwaPupaMand', [[0, 0, 0], [0.03, 0.06, 0.04], [0.02, 0.13, 0.05]], 0.035, 0.018, 8, 8) : cachedTube('kuwaPupaMandF', [[0, 0, 0], [0.015, 0.04, 0.03]], 0.025, 0.015, 6, 6)}
              color="#e3bb7c"
              surface={amber}
              position={[s * 0.06, 0.82, 0.1]}
              scale={[s, 1, 1]}
              part="mandibles"
            />
          </group>
        ))}
        <CompoundEye position={[0.12, 0.76, 0.1]} size={0.022} color="#6b4422" />
        <CompoundEye position={[-0.12, 0.76, 0.1]} size={0.022} color="#6b4422" />
      </group>
    </group>
  );
}
