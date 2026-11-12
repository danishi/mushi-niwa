import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, SURF } from '../three/materials';
import { paint, wrinkleBump } from '../three/textures';
import { M, useBodyMotion } from './common';
import { bodyGeo, cachedTube, mergedGeo, segmentGeo, shapedTube, shapeGeo, shellGeo } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';
import { BeetlePupaBody, Chamber, pupaLimbsGeo, type PupaDims } from './pupa';
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
      {/* 土の 部屋（岸の しめった 土を まるく かためる） */}
      <Chamber color="#5d4a36" position={[0, 0.5, 0.06]} scale={[0.56, 0.46, 0.4]} seed={65} />
      {/* あおむけに 近い しせいで ねている */}
      <group ref={body} position={[0, 0.2, 0.0]} rotation={[-0.5, 0, 0]}>
        <BeetlePupaBody dims={GENGO_PUPA} color="#efe6c6" light="#f3ecd2" surface={pale} limbs={pupaLimbsGeo('gengo', GENGO_PUPA)} headWide={0.6} bodyPart="pupa" eye="#6b5a34" />
      </group>
    </group>
  );
}

/** はばが 広く 平たい（成虫と 同じ たまご形） */
const GENGO_PUPA: PupaDims = { w: 0.24, h: 0.3, d: 0.13, cy: 0.32 };

/** 前ばね・前胸の もよう（u が 左右）：こい みどりがかった 黒に、両がわの 黄色い ふちどり */
function marginMap(key: string, edge: number, male: boolean) {
  return paint(`gengo:${key}:${male}`, 256, (g, s) => {
    g.fillStyle = '#1f2a1a';
    g.fillRect(0, 0, s, s);
    // 金属の ような みどりの つや（まん中ほど 明るい）
    const sheen = g.createLinearGradient(0, 0, s, 0);
    sheen.addColorStop(0.15, 'rgba(60, 92, 54, 0)');
    sheen.addColorStop(0.5, 'rgba(60, 92, 54, 0.55)');
    sheen.addColorStop(0.85, 'rgba(60, 92, 54, 0)');
    g.fillStyle = sheen;
    g.fillRect(0, 0, s, s);
    // メスの 前ばねには こまかい しわ（たての すじ）が ある
    if (!male) {
      g.strokeStyle = 'rgba(10, 16, 8, 0.35)';
      g.lineWidth = 1;
      for (let i = 0; i < 60; i++) {
        const x = s * (0.12 + ((i * 0.618) % 1) * 0.76);
        const y = s * ((i * 0.37) % 1);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 2, y + s * 0.06);
        g.stroke();
      }
    }
    for (const u of [0, 1]) {
      const grad = g.createLinearGradient(u * s, 0, (u ? 1 - edge * 1.25 : edge * 1.25) * s, 0);
      grad.addColorStop(0, '#d8be3e');
      grad.addColorStop(0.8, '#c9a92e');
      grad.addColorStop(1, 'rgba(201, 169, 46, 0)');
      g.fillStyle = grad;
      g.fillRect(u ? (1 - edge * 1.25) * s : 0, 0, edge * 1.25 * s, s);
    }
  });
}

/** 前ばね：平たい たまご形の から。水の 抵抗が 少ない、なめらかな 流線形 */
const elytraGeo = () =>
  shellGeo('gengoElytra', [[-0.56, 0, 0.09], [-0.535, 0.1, 0.128], [-0.4, 0.225, 0.16], [-0.15, 0.285, 0.172], [0.08, 0.28, 0.168], [0.19, 0.256, 0.158]], { base: 0.052, nt: 2.3, suture: 0.003, rim: 0.02, rings: 44 });

/** 前胸：前ばねから なめらかに つづいて 前へ すぼまる */
const pronotumGeo = () => shellGeo('gengoPronotum', [[0.186, 0.256, 0.158], [0.25, 0.238, 0.15], [0.32, 0.195, 0.134], [0.366, 0.152, 0.116]], { base: 0.052, nt: 2.3, rim: 0.02, rings: 14 });

/** 頭：はばが 広く 平たい。前へ まるく すぼまる */
const headGeo = () => bodyGeo('gengoHead', [[0.35, 0.135, 0.118, 0.04], [0.4, 0.142, 0.114, 0.04], [0.45, 0.118, 0.096, 0.045], [0.486, 0.072, 0.076, 0.05], [0.502, 0, 0.06, 0.06]], { nt: 2.3 });

/** 体の 下がわ：ふねの 底の ように なめらかで、まん中が ひくい */
const underGeo = () =>
  bodyGeo('gengoUnder', [[-0.55, 0, 0.075, 0.07], [-0.5, 0.115, 0.08, 0.035], [-0.3, 0.24, 0.085, 0.008], [0, 0.265, 0.085, 0.0], [0.25, 0.225, 0.085, 0.012], [0.365, 0.14, 0.085, 0.035]], { nb: 2.5, segs: [-0.5, -0.18, 4, 0.02] });

/** うしろあし（右。つけねが 原点で +X へ のびる）：平たく ひろがった オール */
const oarGeo = () =>
  mergedGeo('gengoOar', () => [
    shapedTube([[0, 0, 0], [0.07, 0, -0.008], [0.14, 0, -0.02]], (t) => [0.02 + 0.008 * Math.sin(Math.PI * t), 0.011], 8, 8, [0, 0, 1]),
    shapedTube([[0.135, 0, -0.02], [0.2, 0, -0.03], [0.265, 0, -0.036]], (t) => [0.016 + 0.01 * t, 0.008], 8, 8, [0, 0, 1]),
    shapedTube([[0.26, 0, -0.036], [0.38, 0, -0.06], [0.52, 0, -0.1]], (t) => [0.022 * (1 - t * 0.8) + 0.002, 0.006 * (1 - t * 0.5)], 12, 8, [0, 0, 1]),
  ]);

/** オールの 毛（およぐ ときに ひろがって 水を かく） */
const oarHair = (sh: THREE.Shape) => {
  sh.moveTo(0.16, 0.03);
  sh.lineTo(0.53, 0.105);
  sh.lineTo(0.5, 0.18);
  sh.bezierCurveTo(0.4, 0.16, 0.26, 0.12, 0.17, 0.075);
  sh.lineTo(0.16, 0.03);
};

const MID_LEG: LegSpec = { femur: 0.12, tibia: 0.12, tarsus: 0.1, thick: 0.014, tarsi: 5 };
/** オスの 前あし：ふ節の つけねが まるい 吸盤に なっている */
const MALE_FORE: LegSpec = { ...MID_LEG, pad: 2.6 };

/**
 * 成虫：たまごがたで 平たく、すべすべ。こい みどりがかった 黒に、むねと はねの ふちが 黄色。
 * うしろあしは 平たい オールの ようで、毛が はえ、左右 いっしょに こいで およぐ。
 * オスの 前あしには 吸盤の ついた まるい ふくらみが ある。
 */
export function GengoAdult({ anim, sex }: ModelProps) {
  const body = useBodyMotion(anim, 0);
  const oars = useRef<Array<THREE.Group | null>>([]);
  const bubble = useRef<THREE.Mesh>(null);
  const male = sex === 'male';
  const elytra = useMemo(() => ({ ...SURF.chitin(1), roughness: 0.2, normalScale: 0.12, map: marginMap('elytra', 0.075, male) }), [male]);
  const pronotum = useMemo(() => ({ ...SURF.chitin(1), roughness: 0.2, normalScale: 0.12, map: marginMap('pronotum', 0.13, true) }), []);
  const dark = useMemo(() => ({ ...SURF.chitin(1), roughness: 0.25, normalScale: 0.15 }), []);
  const hairMat = useMemo(() => mat('#a8905a', { roughness: 0.9, opacity: 0.55, side: THREE.DoubleSide }), []);
  // おしりの 先に ためた 空気の あわ（はねの 下の 空気で 息を する）
  const bubbleMat = useMemo(() => mat('#e6f2f4', { roughness: 0.05, metalness: 0.6, clearcoat: 1, opacity: 0.8 }), []);
  useFrame(() => {
    const a = anim.current;
    // 左右の うしろあしを いっしょに うごかす（平泳ぎの ように）。かく ときは 速く、もどす ときは ゆっくり
    const ph = a.t * 6.5;
    const stroke = (Math.sin(ph) + 0.25 * Math.sin(ph * 2)) * 0.55 * a.walk;
    // もどす ときは オールを ねかせて 水を きる
    const feather = Math.max(0, Math.cos(ph)) * 0.7 * a.walk;
    oars.current.forEach((g, k) => {
      if (!g) return;
      g.rotation.y = (k === 0 ? -1 : 1) * (0.9 + stroke - a.startle * 0.3);
      g.rotation.x = feather;
    });
    if (bubble.current) bubble.current.scale.setScalar(0.022 + Math.sin(a.t * 1.3) * 0.004 + (1 - a.walk) * 0.006);
  });
  return (
    <group position={[0, 0.06, 0]} scale={1.05}>
      <group ref={body}>
        {/* 前ばねと 前胸（黄色い ふちどり） */}
        <Part geometry={elytraGeo()} color="#ffffff" surface={elytra} castShadow part="elytra" />
        <Part geometry={pronotumGeo()} color="#ffffff" surface={pronotum} castShadow part="elytra" />
        <M geo={underGeo()} color="#2a2414" surface={dark} />
        {/* 頭（口の 上が 黄色い） */}
        <Part geometry={headGeo()} color="#1f2a1a" surface={dark} part="head" />
        <M color="#c9a92e" surface={dark} position={[0, 0.07, 0.492]} scale={[0.06, 0.016, 0.014]} part="head" />
        <CompoundEye position={[0.112, 0.088, 0.41]} size={[0.016, 0.02, 0.028]} part="head" />
        <CompoundEye position={[-0.112, 0.088, 0.41]} size={[0.016, 0.02, 0.028]} part="head" />
        <Antenna position={[0.06, 0.08, 0.47]} side={1} length={0.18} thick={0.005} kind="filiform" color="#8a7428" anim={anim} rotation={[0, 0.6, 0]} />
        <Antenna position={[-0.06, 0.08, 0.47]} side={-1} length={0.18} thick={0.005} kind="filiform" color="#8a7428" anim={anim} rotation={[0, 0.6, 0]} />
        <mesh ref={bubble} geometry={GEO.sphere()} material={bubbleMat} position={[0, 0.09, -0.565]} scale={0.022} />
        {/* 前あし（オスは 吸盤の ふくらみ）・中あし */}
        {[1, -1].map((s) => (
          <group key={s}>
            <Leg position={[s * 0.12, 0.05, 0.3]} side={s as 1 | -1} pair={0} spec={male ? MALE_FORE : MID_LEG} color="#6a5a22" anim={anim} part="foreleg" />
            <Leg position={[s * 0.16, 0.05, 0.12]} side={s as 1 | -1} pair={1} spec={MID_LEG} color="#6a5a22" anim={anim} />
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
              <Part geometry={oarGeo()} color="#4a4220" surface={SURF.chitin(0.6)} part="hindleg" />
              <mesh geometry={shapeGeo('gengoOarHair', oarHair)} material={hairMat} rotation={[-Math.PI / 2, 0, 0]} userData={{ part: 'hindleg' }} />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
