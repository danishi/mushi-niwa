import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, SURF } from '../three/materials';
import { elytraShade, grainBump, punctureNormal, striaeNormal, wrinkleBump } from '../three/textures';
import { M, useBodyMotion } from './common';
import { cachedTube, loft, mergedGeo, segmentGeo, shapedTube, pupaGeo } from './geom';
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
            geometry={segmentGeo()}
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
        <Part geometry={pupaGeo()} color="#c98b48" surface={amber} position={[0, 0.4, 0]} scale={[0.25, 0.42, 0.21]} castShadow part="body" />
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

const MALE = '#5a2616';
const FEMALE = '#2c1b12';

const FRONT: LegSpec = { femur: 0.26, tibia: 0.28, tarsus: 0.34, thick: 0.03, tarsi: 5, teeth: 3 };
const MID: LegSpec = { femur: 0.24, tibia: 0.24, tarsus: 0.28, thick: 0.028, tarsi: 5, teeth: 2 };
const HIND: LegSpec = { femur: 0.25, tibia: 0.26, tarsus: 0.3, thick: 0.03, tarsi: 5, teeth: 2 };

const gauss = (x: number, w: number) => Math.exp(-((x / w) ** 2));
/** から（arc: 'top'）の すそを 少し 外へ そらせて、ふちどり（縁）を つくる */
const rim = (p: THREE.Vector3, u: number, amount = 0.04) => {
  const k = Math.max(0, 1 - Math.min(u, 1 - u) / 0.06);
  p.x *= 1 + amount * k * k;
};

/** 前ばね：肩（かた）が はり、後ろ 3 分の 1 で いちばん 広く、おしりへ 急に 落ちる。まん中に 合わせ目の みぞ */
const elytraGeo = () =>
  loft(
    'kabutoElytra',
    [
      { z: -0.565, w: 0, top: 0.175, mid: 0.17 },
      { z: -0.556, w: 0.07, top: 0.215, mid: 0.17, nt: 2.2 },
      { z: -0.53, w: 0.155, top: 0.275, mid: 0.17, nt: 2.2 },
      { z: -0.47, w: 0.228, top: 0.345, mid: 0.17, nt: 2.2 },
      { z: -0.36, w: 0.264, top: 0.392, mid: 0.17, nt: 2.25 },
      { z: -0.22, w: 0.272, top: 0.408, mid: 0.17, nt: 2.3 },
      { z: -0.08, w: 0.263, top: 0.398, mid: 0.17, nt: 2.35 },
      { z: 0.0, w: 0.247, top: 0.372, mid: 0.17, nt: 2.3 },
      { z: 0.045, w: 0.222, top: 0.335, mid: 0.17, nt: 2.2 },
    ],
    {
      arc: 'top',
      rings: 46,
      radial: 44,
      displace: (p, u) => {
        p.y -= 0.008 * gauss(p.x, 0.006);
        // 肩と おしりの こぶ
        p.y += 0.012 * gauss(Math.abs(p.x) - 0.17, 0.05) * gauss(p.z + 0.02, 0.06);
        p.y += 0.008 * gauss(Math.abs(p.x) - 0.12, 0.05) * gauss(p.z + 0.46, 0.05);
        rim(p, u);
      },
    },
  );

/** 前胸の 背板：後ろが 広く 前へ すぼまる、まるく もり上がった たて */
const pronotumGeo = (male: boolean) =>
  loft(
    `kabutoPronotum:${male}`,
    [
      { z: -0.005, w: 0.19, top: 0.34, mid: 0.15 },
      { z: 0.03, w: 0.222, top: 0.385, mid: 0.15, nt: 2.1 },
      { z: 0.1, w: 0.232, top: male ? 0.4 : 0.385, mid: 0.15, nt: 2.1 },
      { z: 0.18, w: 0.208, top: male ? 0.375 : 0.35, mid: 0.15, nt: 2 },
      { z: 0.25, w: 0.165, top: 0.31, mid: 0.15, nt: 2 },
      { z: 0.3, w: 0.12, top: 0.25, mid: 0.15, nt: 2 },
      { z: 0.318, w: 0.09, top: 0.2, mid: 0.15, nt: 2 },
    ],
    { arc: 'top', rings: 30, radial: 36, displace: (p, u) => rim(p, u, 0.05) },
  );

/** 小楯板（しょうじゅんばん）：前ばねの つけねの 三角 */
const scutellumGeo = () =>
  loft(
    'kabutoScutellum',
    [
      { z: -0.085, w: 0, top: 0.403, mid: 0.4 },
      { z: -0.05, w: 0.022, top: 0.403, mid: 0.394 },
      { z: 0.0, w: 0.042, top: 0.384, mid: 0.37 },
    ],
    { arc: 'top', rings: 8, radial: 10 },
  );

/** 体の 下がわ（胸・はら）。おなかは 平らで、はらには 節の だんだん */
const undersideGeo = () =>
  loft(
    'kabutoUnder',
    [
      { z: -0.545, w: 0.08, top: 0.2, bottom: 0.14, mid: 0.17, nb: 2.4 },
      { z: -0.46, w: 0.2, top: 0.22, bottom: 0.1, mid: 0.17, nb: 3 },
      { z: -0.25, w: 0.255, top: 0.22, bottom: 0.078, mid: 0.17, nb: 3.2 },
      { z: 0.0, w: 0.236, top: 0.22, bottom: 0.075, mid: 0.17, nb: 3.2 },
      { z: 0.15, w: 0.2, top: 0.22, bottom: 0.085, mid: 0.17, nb: 3 },
      { z: 0.28, w: 0.115, top: 0.2, bottom: 0.1, mid: 0.16, nb: 2.4 },
      { z: 0.312, w: 0, top: 0.15, bottom: 0.15, mid: 0.15 },
    ],
    {
      rings: 34,
      radial: 28,
      displace: (p) => {
        if (p.y < 0.15 && p.z < -0.1) p.y -= 0.005 * Math.cos((p.z * Math.PI * 2) / 0.085);
      },
    },
  );

/** 頭（首の 関節を 原点に した 座標）。前へ すぼまる 頭楯（とうじゅん） */
const headGeo = () =>
  loft(
    'kabutoHead',
    [
      { z: -0.06, w: 0.07, top: 0.04, bottom: -0.06, nb: 2.4 },
      { z: -0.02, w: 0.098, top: 0.048, bottom: -0.075, nb: 2.4 },
      { z: 0.05, w: 0.092, top: 0.032, bottom: -0.072, nb: 2.4 },
      { z: 0.105, w: 0.064, top: 0.002, bottom: -0.062, nb: 2.4 },
      { z: 0.14, w: 0.036, top: -0.02, bottom: -0.052 },
      { z: 0.152, w: 0, top: -0.036, bottom: -0.036 },
    ],
    { rings: 18, radial: 20 },
  );

const mirror = (pts: Array<[number, number, number]>, s: number): Array<[number, number, number]> => pts.map(([x, y, z]) => [x * s, y, z]);

/**
 * 頭の 角：つけねは 太く 平たく、弓なりに 立ち上がる。先は 左右に 分かれ、それぞれが もう 1 回 二またに なる。
 * （頭の 座標。1 ジオメトリ）
 */
const hornGeo = () =>
  mergedGeo('kabutoHorn', () => {
    const parts = [
      shapedTube(
        [[0, -0.01, 0.04], [0, 0.085, 0.135], [0, 0.24, 0.215], [0, 0.41, 0.248], [0, 0.545, 0.232]],
        (t) => {
          const w = THREE.MathUtils.lerp(0.06, 0.034, THREE.MathUtils.smoothstep(t, 0, 0.55)) + 0.012 * THREE.MathUtils.smoothstep(t, 0.75, 1);
          return [w, THREE.MathUtils.lerp(0.05, 0.026, THREE.MathUtils.smoothstep(t, 0, 0.7))];
        },
        28,
        12,
      ),
    ];
    for (const s of [1, -1]) {
      parts.push(
        shapedTube(mirror([[0, 0.525, 0.234], [0.05, 0.578, 0.228], [0.094, 0.612, 0.205]], s), (t) => [0.021 - 0.006 * t, 0.021 - 0.006 * t], 8, 8, [0, 0, 1]),
        shapedTube(mirror([[0.086, 0.606, 0.209], [0.108, 0.632, 0.206], [0.126, 0.662, 0.208]], s), (t) => [0.014 * (1 - t * 0.7), 0.014 * (1 - t * 0.7)], 5, 7, [0, 0, 1]),
        shapedTube(mirror([[0.086, 0.606, 0.209], [0.096, 0.634, 0.18], [0.1, 0.656, 0.146]], s), (t) => [0.014 * (1 - t * 0.7), 0.014 * (1 - t * 0.7)], 5, 7, [1, 0, 0]),
      );
    }
    return parts;
  });

/** 胸の 角：前へ つき出る 短い 角。先は 二また */
const chestHornGeo = () =>
  mergedGeo('kabutoChestHorn', () => {
    const parts = [shapedTube([[0, 0.33, 0.17], [0, 0.385, 0.245], [0, 0.402, 0.312]], (t) => [0.042 - 0.02 * t, 0.04 - 0.02 * t], 10, 10)];
    for (const s of [1, -1])
      parts.push(shapedTube(mirror([[0, 0.4, 0.3], [0.016, 0.41, 0.33], [0.034, 0.424, 0.352]], s), (t) => [0.016 * (1 - t * 0.75), 0.016 * (1 - t * 0.75)], 5, 7, [0, 0, 1]));
    return parts;
  });

/**
 * 成虫：オスは 頭に 先が 2 回 二またに分かれる 長い角、胸に 先が二またの 短い角。
 * 前ばねは 赤みのある 黒褐色で つやがあり、前胸と 頭は こまかい つぶつぶで つやが にぶい。メスは角がなく、全体に つやが少ない。
 */
export function KabutoAdult({ anim, sex }: ModelProps) {
  const body = useBodyMotion(anim);
  const headRef = useRef<THREE.Group>(null);
  const brush = useRef<THREE.Mesh>(null);
  const male = sex === 'male';
  const c = male ? MALE : FEMALE;
  const cDark = male ? '#2b130b' : '#22140d';
  const shell = useMemo(
    () =>
      male
        ? { ...SURF.chitin(1), map: elytraShade(1, 0.5), normalMap: striaeNormal(5, 0.4), normalScale: 0.55 }
        : { roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.5, sheenColor: '#8a6a50', map: elytraShade(2, 0.3), normalMap: punctureNormal(7, 2), normalScale: 0.9 },
    [male],
  );
  const dark = useMemo(() => SURF.granular(male ? 0.55 : 0.25), [male]);
  const under = useMemo(() => SURF.matteChitin(), []);
  useFrame(() => {
    const a = anim.current;
    if (headRef.current) headRef.current.rotation.x = 0.1 - a.eat * 0.3 + Math.sin(a.t * 0.9) * 0.03 * a.energy;
    // 樹液や ゼリーを なめる オレンジ色の ブラシのような 口
    if (brush.current) brush.current.scale.setScalar(0.5 + a.eat * 0.7);
  });
  return (
    <group ref={body}>
      <Part geometry={elytraGeo()} color={c} surface={shell} castShadow part="elytra" />
      <M geo={scutellumGeo()} color={cDark} surface={dark} />
      <M geo={undersideGeo()} color="#1d0f09" surface={under} />
      <Part geometry={pronotumGeo(male)} color={cDark} surface={dark} castShadow part={male ? 'chestHorn' : 'elytra'} />
      {male ? <Part geometry={chestHornGeo()} color={cDark} surface={dark} part="chestHorn" /> : null}
      {/* 頭 */}
      <group ref={headRef} position={[0, 0.17, 0.3]}>
        <Part geometry={headGeo()} color={cDark} surface={dark} part={male ? 'horn' : 'elytra'} />
        <CompoundEye position={[0.088, -0.005, 0.03]} size={[0.022, 0.03, 0.032]} />
        <CompoundEye position={[-0.088, -0.005, 0.03]} size={[0.022, 0.03, 0.032]} />
        <mesh ref={brush} position={[0, -0.06, 0.12]}>
          <sphereGeometry args={[0.028, 8, 6]} />
          <meshStandardMaterial color="#d48a3a" roughness={1} />
        </mesh>
        <Antenna position={[0.06, -0.035, 0.09]} side={1} length={0.12} thick={0.008} kind="lamellate" color="#3a1e10" anim={anim} rotation={[0, 0.5, 0]} />
        <Antenna position={[-0.06, -0.035, 0.09]} side={-1} length={0.12} thick={0.008} kind="lamellate" color="#3a1e10" anim={anim} rotation={[0, 0.5, 0]} />
        {male ? (
          <Part geometry={hornGeo()} color={cDark} surface={dark} castShadow part="horn" />
        ) : (
          // メスの 頭には 小さな こぶが ならぶ
          [0.035, -0.035].map((x) => <M key={x} color={cDark} surface={dark} position={[x, 0.04, 0.03]} scale={[0.02, 0.016, 0.02]} />)
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
