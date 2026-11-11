import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, SURF } from '../three/materials';
import { grainBump, striaeNormal } from '../three/textures';
import { M, useBodyMotion } from './common';
import { cachedTube, loft, mergedGeo, shapedTube, pupaGeo } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research-3.md §A（オオクワガタ）、docs/species-research-4.md §A（ノコギリクワガタ）。形は 図鑑の 記載と 一般的な 形態に もとづく */

type StagKind = 'oo' | 'noko';

const FRONT: LegSpec = { femur: 0.24, tibia: 0.26, tarsus: 0.3, thick: 0.026, tarsi: 5, teeth: 3 };
const MID: LegSpec = { femur: 0.24, tibia: 0.24, tarsus: 0.28, thick: 0.026, tarsi: 5, teeth: 1 };
const HIND: LegSpec = { femur: 0.26, tibia: 0.26, tarsus: 0.3, thick: 0.026, tarsi: 5, teeth: 1 };

const rim = (p: THREE.Vector3, u: number, amount = 0.04) => {
  const k = Math.max(0, 1 - Math.min(u, 1 - u) / 0.07);
  p.x *= 1 + amount * k * k;
};
const gauss = (x: number, w: number) => Math.exp(-((x / w) ** 2));

/**
 * 大あご（右がわ。左は scale x = -1 で 反転）。オスは 太く 平たく、内がわへ 弓なりに 曲がる。
 * まん中より 先に 大きな 内歯（ないし）が 1 本、先の 近くに 小さな 歯。メスは 短く 小さい。
 */
const mandibleGeo = (male: boolean) =>
  mergedGeo(`kuwaMand:${male}`, () => {
    if (!male)
      return [
        shapedTube([[0, 0, 0], [0.036, 0.004, 0.05], [0.036, 0.008, 0.1], [0.008, 0.008, 0.135]], (t) => [0.02 - 0.012 * t, 0.03 - 0.02 * t], 12, 8, [0, 1, 0]),
        shapedTube([[0.034, 0.008, 0.075], [0.018, 0.016, 0.092], [0.006, 0.022, 0.1]], (t) => [0.008 * (1 - t * 0.7), 0.01 * (1 - t * 0.7)], 4, 6, [0, 1, 0]),
      ];
    return [
      shapedTube(
        [[0, 0, 0], [0.05, 0.006, 0.085], [0.07, 0.012, 0.185], [0.052, 0.016, 0.275], [0.006, 0.014, 0.335]],
        (t) => [THREE.MathUtils.lerp(0.03, 0.011, t ** 1.4), THREE.MathUtils.lerp(0.044, 0.012, t ** 1.2)],
        26,
        12,
        [0, 1, 0],
      ),
      // 内歯：内がわ・前・やや 上を むく
      shapedTube([[0.06, 0.012, 0.19], [0.03, 0.026, 0.225], [0.004, 0.04, 0.245]], (t) => [0.014 * (1 - t * 0.75), 0.02 * (1 - t * 0.75)], 6, 8, [0, 1, 0]),
      shapedTube([[0.04, 0.015, 0.29], [0.022, 0.02, 0.3], [0.008, 0.024, 0.302]], (t) => [0.007 * (1 - t * 0.7), 0.009 * (1 - t * 0.7)], 4, 6, [0, 1, 0]),
    ];
  });

/**
 * ノコギリクワガタの 大あご：おおきい オスは 長く 弓なりに 曲がり（うしの つのの よう）、
 * 内がわに 小さな 歯が ならぶ。メスは 短く 小さい。
 */
const nokoMandibleGeo = (male: boolean) =>
  mergedGeo(`nokoMand:${male}`, () => {
    if (!male)
      return [shapedTube([[0, 0, 0], [0.034, 0.004, 0.045], [0.032, 0.008, 0.09], [0.008, 0.008, 0.12]], (t) => [0.018 - 0.01 * t, 0.026 - 0.018 * t], 12, 8, [0, 1, 0])];
    const teeth = [0.14, 0.2, 0.26, 0.31, 0.36].map((z, i) => {
      const x = 0.075 + Math.sin((z / 0.45) * Math.PI) * 0.02 - z * 0.08;
      const len = i === 1 ? 0.035 : 0.02;
      return shapedTube([[x, 0.03 + z * 0.08, z], [x - len, 0.035 + z * 0.08, z + 0.01]], (t) => [0.007 * (1 - t * 0.7), 0.009 * (1 - t * 0.7)], 3, 6, [0, 1, 0]);
    });
    return [
      shapedTube(
        [[0, 0, 0], [0.065, 0.025, 0.11], [0.095, 0.05, 0.24], [0.08, 0.07, 0.36], [0.025, 0.075, 0.44]],
        (t) => [THREE.MathUtils.lerp(0.026, 0.009, t ** 1.3), THREE.MathUtils.lerp(0.038, 0.011, t ** 1.2)],
        28,
        12,
        [0, 1, 0],
      ),
      ...teeth,
    ];
  });

function Mandible({ male, side, anim, x, kind, color }: { male: boolean; side: 1 | -1; anim: ModelProps['anim']; x: number; kind: StagKind; color: string }) {
  const ref = useRef<THREE.Group>(null);
  const shell = useMemo(() => SURF.chitin(1), []);
  useFrame(() => {
    const a = anim.current;
    if (!ref.current) return;
    // ふだんは ほぼ とじて いて、いかく（spray）の ときに 大きく ひらく
    const open = 0.08 + a.spray * 0.45 + Math.sin(a.t * 0.8) * 0.02 * a.energy;
    ref.current.rotation.y = side * open;
  });
  return (
    <group position={[side * x, -0.01, 0.13]} scale={[side, 1, 1]}>
      <group ref={ref}>
        <Part geometry={kind === 'noko' ? nokoMandibleGeo(male) : mandibleGeo(male)} color={color} surface={shell} castShadow part="mandibles" />
      </group>
    </group>
  );
}

/** 前ばね：平たく、両がわが ほぼ 平行な 長だ円。背中は 平らで 両わきが まるく 落ちる */
const elytraGeo = () =>
  loft(
    'kuwaElytra',
    [
      { z: -0.57, w: 0, top: 0.155, mid: 0.15 },
      { z: -0.56, w: 0.075, top: 0.185, mid: 0.15, nt: 2.4 },
      { z: -0.51, w: 0.165, top: 0.232, mid: 0.15, nt: 2.6 },
      { z: -0.43, w: 0.215, top: 0.26, mid: 0.15, nt: 2.8 },
      { z: -0.3, w: 0.236, top: 0.272, mid: 0.15, nt: 2.9 },
      { z: -0.1, w: 0.238, top: 0.276, mid: 0.15, nt: 2.9 },
      { z: 0.0, w: 0.228, top: 0.27, mid: 0.15, nt: 2.8 },
      { z: 0.04, w: 0.205, top: 0.25, mid: 0.15, nt: 2.6 },
    ],
    {
      arc: 'top',
      rings: 46,
      radial: 44,
      displace: (p, u) => {
        p.y -= 0.006 * gauss(p.x, 0.005);
        p.y += 0.006 * gauss(Math.abs(p.x) - 0.17, 0.04) * gauss(p.z + 0.0, 0.05);
        rim(p, u, 0.035);
      },
    },
  );

/** 前胸の 背板：横に 広く、角が まるい。両わきに ふちどり、前は 頭を うける ように 浅く えぐれる */
const pronotumGeo = () =>
  loft(
    'kuwaPronotum',
    [
      { z: 0.012, w: 0.2, top: 0.24, mid: 0.15, nt: 2.6 },
      { z: 0.045, w: 0.246, top: 0.266, mid: 0.15, nt: 3 },
      { z: 0.13, w: 0.258, top: 0.27, mid: 0.15, nt: 3.1 },
      { z: 0.2, w: 0.25, top: 0.262, mid: 0.15, nt: 3 },
      { z: 0.24, w: 0.225, top: 0.246, mid: 0.15, nt: 2.8 },
      { z: 0.262, w: 0.19, top: 0.215, mid: 0.15, nt: 2.5 },
    ],
    {
      arc: 'top',
      rings: 26,
      radial: 40,
      displace: (p, u) => {
        rim(p, u, 0.06);
        // 前の ふちは まん中が 後ろへ 下がる
        if (p.z > 0.2) p.z -= 0.018 * gauss(p.x, 0.12) * ((p.z - 0.2) / 0.06);
      },
    },
  );

const undersideGeo = () =>
  loft(
    'kuwaUnder',
    [
      { z: -0.55, w: 0.08, top: 0.17, bottom: 0.125, mid: 0.15, nb: 2.4 },
      { z: -0.46, w: 0.19, top: 0.18, bottom: 0.095, mid: 0.15, nb: 3 },
      { z: -0.25, w: 0.226, top: 0.18, bottom: 0.082, mid: 0.15, nb: 3.2 },
      { z: 0.0, w: 0.222, top: 0.18, bottom: 0.08, mid: 0.15, nb: 3.2 },
      { z: 0.15, w: 0.235, top: 0.18, bottom: 0.086, mid: 0.15, nb: 3 },
      { z: 0.245, w: 0.18, top: 0.18, bottom: 0.1, mid: 0.15, nb: 2.6 },
      { z: 0.262, w: 0, top: 0.15, bottom: 0.15, mid: 0.15 },
    ],
    {
      rings: 34,
      radial: 28,
      displace: (p) => {
        if (p.y < 0.13 && p.z < -0.1) p.y -= 0.004 * Math.cos((p.z * Math.PI * 2) / 0.085);
      },
    },
  );

/** 頭（首の 関節を 原点に した 座標）。オスは はばひろい 四角形で、まん中が 浅く くぼむ */
const headGeo = (male: boolean) => {
  const w = male ? 0.2 : 0.14;
  return loft(
    `kuwaHead:${male}`,
    [
      { z: -0.05, w: w * 0.8, top: 0.05, bottom: -0.06, nt: 2.6, nb: 2.6 },
      { z: -0.01, w, top: 0.058, bottom: -0.07, nt: 3.2, nb: 2.8 },
      { z: 0.07, w: w * 1.02, top: 0.055, bottom: -0.07, nt: 3.4, nb: 2.8 },
      { z: 0.115, w: w * 0.9, top: 0.04, bottom: -0.062, nt: 3, nb: 2.6 },
      { z: 0.14, w: w * 0.62, top: 0.018, bottom: -0.05, nt: 2.4 },
      { z: 0.15, w: 0, top: -0.015, bottom: -0.015 },
    ],
    {
      rings: 20,
      radial: 30,
      displace: (p) => {
        if (p.y > 0) p.y -= 0.012 * gauss(p.x, w * 0.45) * gauss(p.z - 0.07, 0.06);
      },
    },
  );
};

/**
 * 成虫：からだは 平たく 黒い。前ばねは つやが あり、メスは たての すじ（点刻の 列）が はっきり。
 * 頭は 大きく 平ら、オスは 頭が とくに はばひろい。触角は「く」の 字に まがり、先が くしの よう。
 */
export function KuwaAdult(p: ModelProps) {
  return <Stag {...p} kind="oo" />;
}

/**
 * ノコギリクワガタ：赤みの ある 茶色（メスは 黒っぽい）。オスは 頭が 大きく、
 * 大あごが 長く 曲がって 内がわに 小さな 歯が ならぶ。
 */
export function NokoAdult(p: ModelProps) {
  return <Stag {...p} kind="noko" />;
}

function Stag({ anim, sex, kind }: ModelProps & { kind: StagKind }) {
  const body = useBodyMotion(anim);
  const headRef = useRef<THREE.Group>(null);
  const brush = useRef<THREE.Mesh>(null);
  const male = sex === 'male';
  const noko = kind === 'noko';
  const BLACK = noko ? (male ? '#5b2614' : '#2a1610') : '#17120f';
  const LEG = noko ? (male ? '#4a1e10' : '#22120c') : '#120d0b';
  const shell = useMemo(
    () =>
      noko
        ? { ...SURF.chitin(male ? 0.9 : 1), normalMap: striaeNormal(7, 0.3), normalScale: 0.3 }
        : male
          ? { ...SURF.chitin(1), normalMap: striaeNormal(7, 0.3), normalScale: 0.4 }
          : { ...SURF.chitin(0.7), normalMap: striaeNormal(7, 1), normalScale: 1 },
    [male, noko],
  );
  const dark = useMemo(() => SURF.chitin(0.85), []);
  const under = useMemo(() => SURF.matteChitin(), []);
  useFrame(() => {
    const a = anim.current;
    // いかくの ときは 頭を もちあげる
    if (headRef.current) headRef.current.rotation.x = -0.02 - a.spray * 0.25 - a.eat * 0.2 + Math.sin(a.t * 0.9) * 0.02 * a.energy;
    if (brush.current) brush.current.scale.setScalar(0.4 + a.eat * 0.7);
  });
  const hw = male ? 0.2 : 0.14;
  return (
    <group ref={body}>
      <Part geometry={elytraGeo()} color={BLACK} surface={shell} castShadow part="elytra" />
      <M geo={undersideGeo()} color={noko ? '#1a0c07' : '#0e0a08'} surface={under} />
      <Part geometry={pronotumGeo()} color={BLACK} surface={dark} castShadow part="elytra" />
      {/* 頭 */}
      <group ref={headRef} position={[0, 0.19, 0.285]}>
        <Part geometry={headGeo(male)} color={BLACK} surface={dark} castShadow part="mandibles" />
        <CompoundEye position={[hw * 0.97, 0.0, 0.05]} size={[0.02, 0.028, 0.034]} />
        <CompoundEye position={[-hw * 0.97, 0.0, 0.05]} size={[0.02, 0.028, 0.034]} />
        <mesh ref={brush} position={[0, -0.05, 0.14]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial color="#c9782f" roughness={1} />
        </mesh>
        {/* 触角：「く」の 字（長い つけね ＋ 先の くし） */}
        <Antenna position={[hw * 0.78, -0.02, 0.12]} side={1} length={0.13} thick={0.008} kind="lamellate" color="#2a1a10" anim={anim} rotation={[0.1, 1.0, 0]} part="antenna" />
        <Antenna position={[-hw * 0.78, -0.02, 0.12]} side={-1} length={0.13} thick={0.008} kind="lamellate" color="#2a1a10" anim={anim} rotation={[0.1, 1.0, 0]} part="antenna" />
        <Mandible male={male} side={1} anim={anim} x={hw * 0.42} kind={kind} color={BLACK} />
        <Mandible male={male} side={-1} anim={anim} x={hw * 0.42} kind={kind} color={BLACK} />
      </group>
      {/* あし（前あしの すねに ギザギザ） */}
      <Leg position={[0.13, 0.11, 0.2]} side={1} pair={0} spec={FRONT} color={LEG} anim={anim} part="legs" />
      <Leg position={[-0.13, 0.11, 0.2]} side={-1} pair={0} spec={FRONT} color={LEG} anim={anim} part="legs" />
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
        <Part geometry={pupaGeo()} color="#e8c48a" surface={amber} position={[0, 0.36, 0]} scale={[0.23, 0.36, 0.19]} castShadow part="body" />
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
