import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PIT } from '../habitat/case';
import { GEO, mat, SURF } from '../three/materials';
import { grainBump, sandTexture, veinWing } from '../three/textures';
import { M, useBodyMotion } from './common';
import { abdomenZ, bodyGeo, cachedTube, shapeGeo } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research-4.md §D（ウスバカゲロウ・アリジゴク）。形は 図鑑の 記載と 一般的な 形態に もとづく */

const L_LEG: LegSpec = { femur: 0.06, tibia: 0.06, tarsus: 0.03, thick: 0.014, tarsi: 1 };

/** アリジゴクの 大あご（右。左は 鏡写し）。内がわに とがった 歯が 3 本 */
function Jaw({ side, anim }: { side: 1 | -1; anim: ModelProps['anim'] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = anim.current;
    // ふだんは 大きく ひらいて まつ。さわられると パチンと とじる
    const snap = Math.max(a.spray, a.bounce);
    if (ref.current) ref.current.rotation.y = side * (0.55 - snap * 0.6);
  });
  return (
    <group position={[side * 0.04, 0, 0.06]} scale={[side, 1, 1]}>
      <group ref={ref}>
        <Part geometry={cachedTube('alJaw', [[0, 0, 0], [0.03, 0.01, 0.08], [0.02, 0.015, 0.16], [-0.02, 0.015, 0.21]], 0.016, 0.005, 14, 6)} color="#6b4a2a" surface={SURF.chitin(0.6)} castShadow part="jaws" />
        {[0.07, 0.11, 0.15].map((z) => (
          <M key={z} geo={GEO.cone()} color="#4a3220" position={[0.01, 0.012, z]} rotation={[0, 0, 1.4]} scale={[0.005, 0.025, 0.005]} part="jaws" />
        ))}
      </group>
    </group>
  );
}

/**
 * ようちゅう（アリジゴク）：すなの すりばちの 底に からだを うめて、大あごだけ 出して まつ。
 * まるい おなかに 毛が はえていて、うしろ向きに 歩く。ときどき 頭で すなを はね上げる。
 */
export function AntlionLarva({ anim, molts }: ModelProps) {
  const head = useRef<THREE.Group>(null);
  const body = useBodyMotion(anim, 0.2);
  const size = 1.4 + molts * 0.3;
  const hairy = useMemo(() => ({ roughness: 0.95, bumpMap: grainBump(61, 160), bumpScale: 3 }), []);
  useFrame(() => {
    const a = anim.current;
    // 数秒ごとに 頭を くいっと 上げて すなを とばす（すりばちを ととのえる）
    const flick = Math.max(0, Math.sin(a.t * 0.9)) ** 12;
    if (head.current) head.current.rotation.x = -flick * 0.5 - a.spray * 0.3;
  });
  return (
    // すりばちの 底まで しずめる。すなに うまって 大あごだけ 見える
    <group position={[0, -PIT.depth + 0.07, 0]} rotation={[-0.3, 0, 0]} scale={size}>
      <group ref={body}>
        <Part geometry={abdomenZ(7)} color="#7a6650" surface={hairy} position={[0, 0.0, -0.12]} scale={[0.16, 0.1, 0.18]} castShadow part="body" />
        <M geo={GEO.sphere()} color="#6a5642" surface={hairy} position={[0, 0.02, 0.03]} scale={[0.09, 0.06, 0.07]} part="body" />
        {/* 毛 */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <M key={i} geo={GEO.cone()} color="#4a3b2c" position={[Math.cos(i * 1.05) * 0.14, 0.05, -0.12 + Math.sin(i * 1.05) * 0.15]} rotation={[0, 0, Math.cos(i * 1.05) * -1.2]} scale={[0.006, 0.05, 0.006]} />
        ))}
        <group ref={head} position={[0, 0.03, 0.1]}>
          <Part geometry={GEO.sphere()} color="#8a6a44" surface={SURF.matteChitin()} scale={[0.06, 0.03, 0.06]} part="jaws" />
          <CompoundEye position={[0.045, 0.02, 0.03]} size={0.008} />
          <CompoundEye position={[-0.045, 0.02, 0.03]} size={0.008} />
          <Jaw side={1} anim={anim} />
          <Jaw side={-1} anim={anim} />
        </group>
        {[0, 1, 2].map((p) => (
          <group key={p} position={[0, -0.01, 0.04 - p * 0.05]}>
            <Leg position={[0.05, 0, 0]} side={1} pair={p} spec={L_LEG} color="#6a5642" anim={anim} spread={-0.2} />
            <Leg position={[-0.05, 0, 0]} side={-1} pair={p} spec={L_LEG} color="#6a5642" anim={anim} spread={-0.2} />
          </group>
        ))}
      </group>
    </group>
  );
}

/** さなぎ：すなの 中に、すなつぶを 糸で つづった まるい まゆを つくり、その 中で さなぎに なる */
export function AntlionCocoon({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  const sandMat = useMemo(() => ({ map: sandTexture(), roughness: 1, bumpMap: grainBump(63, 64), bumpScale: 4 }), []);
  useFrame(() => {
    const a = anim.current;
    if (ref.current) ref.current.rotation.z = Math.sin(a.t * 30) * 0.05 * Math.max(a.shiver, a.bounce);
  });
  return (
    <group ref={ref} position={[0, 0.3, 0]}>
      <Part geometry={GEO.sphere()} color="#ffffff" surface={sandMat} scale={0.22} castShadow part="cocoon" />
      {/* まゆの 中の さなぎ（前の 窓から すけて 見える） */}
      <M geo={GEO.sphere()} color="#d8c9a4" surface={{ roughness: 0.6, translucent: true }} position={[0, 0, 0.12]} scale={[0.07, 0.06, 0.12]} part="pupa" />
    </group>
  );
}

/** ほそながい とうめいな はね（4 まい とも にた 形） */
const wingShape = (s: THREE.Shape) => {
  s.moveTo(0, 0);
  s.bezierCurveTo(0.2, 0.06, 0.8, 0.07, 1.0, 0.02);
  s.bezierCurveTo(0.95, -0.05, 0.6, -0.09, 0, -0.04);
};

function NetWing({ side, front, anim }: { side: 1 | -1; front: boolean; anim: ModelProps['anim'] }) {
  const ref = useRef<THREE.Group>(null);
  const geo = shapeGeo('usubaWing', wingShape);
  const material = useMemo(() => mat('#ffffff', { map: veinWing('#dfe6e8', '#3a3a34', 0.35), roughness: 0.2, opacity: 0.75, side: THREE.DoubleSide }), []);
  useFrame(() => {
    const a = anim.current;
    // とまっているときは はねを 屋根の ように せなかに たたむ。ふわふわと よわく とぶ
    const rest = (1 - a.flap) * (1 - a.fan * 0.6);
    // rotation.y は +x（横）から うしろへ たおす 角度。z は 屋根の かたむき
    if (ref.current) {
      ref.current.rotation.z = -0.3 * rest + (Math.sin(a.t * 10 + (front ? 0 : 1.2)) * 0.6 * (1 - a.glide) + 0.2) * a.flap + a.fan * (1 - a.flap) * 0.15;
      ref.current.rotation.y = rest * (front ? 1.42 : 1.52) + (1 - rest) * (front ? -0.15 : 0.2);
    }
  });
  return (
    <group position={[side * 0.02, 0.05, front ? 0.1 : 0.05]} scale={[side, 1, 1]}>
      <group ref={ref}>
        <group rotation={[Math.PI / 2, 0, 0]} scale={front ? 0.78 : 0.74}>
          <mesh geometry={geo} material={material} userData={{ part: 'wings' }} />
        </group>
      </group>
    </group>
  );
}

const A_LEG: LegSpec = { femur: 0.08, tibia: 0.09, tarsus: 0.05, thick: 0.007, tarsi: 5 };

/** むね：前胸は 細い くび、はねの つく 中胸・後胸は もり上がる */
const thoraxGeo = () => bodyGeo('usubaThorax', [[0.03, 0.02, 0.05, 0.012], [0.06, 0.034, 0.072, 0.0], [0.105, 0.036, 0.074, -0.002], [0.14, 0.026, 0.058, 0.006], [0.17, 0.018, 0.046, 0.014], [0.185, 0.014, 0.04, 0.018]], { nt: 2.2 });

/** はら：細長い つつ。節の くびれが あり、先へ 少し 下がる */
const abdomenGeo = () =>
  bodyGeo('usubaAbdomen', [[-0.5, 0, 0.018, 0.018], [-0.49, 0.009, 0.026, 0.008], [-0.4, 0.013, 0.034, 0.008], [-0.2, 0.015, 0.042, 0.012], [-0.02, 0.017, 0.048, 0.014], [0.04, 0.02, 0.05, 0.012]], { segs: [-0.49, 0.03, 8, 0.1], rings: 60, radial: 12 });

/** 頭：よこに 広く、左右に はり出した 大きな 複眼 */
const headGeo = () => bodyGeo('usubaHead', [[0.175, 0.016, 0.046, 0.016], [0.195, 0.034, 0.058, 0.01], [0.215, 0.032, 0.054, 0.008], [0.232, 0.018, 0.04, 0.012], [0.24, 0, 0.026, 0.02]], { nt: 2.2 });

/**
 * 成虫（ウスバカゲロウ）：トンボに にた ほそい からだに、うすい 4 まいの はね。しょっかくは みじかくて 先が ふくらむ。
 * とまる ときは はねを 屋根の ように たたみ、ふわふわと よわく 飛ぶ。
 */
export function UsubaAdult({ anim }: ModelProps) {
  const body = useBodyMotion(anim, 0);
  const tail = useRef<THREE.Group>(null);
  const surf = useMemo(() => ({ roughness: 0.6, clearcoat: 0.2, bumpMap: grainBump(69, 64), bumpScale: 0.5 }), []);
  useFrame(() => {
    const a = anim.current;
    // 飛ぶ ときは 長い はらを 少し たらし、ゆっくり ゆらす
    if (tail.current) tail.current.rotation.x = a.flap * (0.12 + Math.sin(a.t * 5) * 0.04) - a.rear * 0.2;
  });
  return (
    <group position={[0, 0.12, 0]} scale={1.4}>
      <group ref={body}>
        <Part geometry={thoraxGeo()} color="#3f382e" surface={surf} castShadow part="body" />
        <group ref={tail} position={[0, 0.03, 0.04]}>
          <Part geometry={abdomenGeo()} color="#3a342c" surface={surf} position={[0, -0.03, -0.04]} castShadow part="body" />
        </group>
        <Part geometry={headGeo()} color="#4a4034" surface={surf} part="eyes" />
        <CompoundEye position={[0.034, 0.036, 0.208]} size={[0.02, 0.022, 0.022]} color="#3a3a30" part="eyes" />
        <CompoundEye position={[-0.034, 0.036, 0.208]} size={[0.02, 0.022, 0.022]} color="#3a3a30" part="eyes" />
        <Antenna position={[0.012, 0.055, 0.232]} side={1} length={0.11} thick={0.004} kind="clavate" color="#2a2620" anim={anim} rotation={[0.3, 0.3, 0]} part="antenna" />
        <Antenna position={[-0.012, 0.055, 0.232]} side={-1} length={0.11} thick={0.004} kind="clavate" color="#2a2620" anim={anim} rotation={[0.3, 0.3, 0]} part="antenna" />
        <NetWing side={1} front anim={anim} />
        <NetWing side={-1} front anim={anim} />
        <NetWing side={1} front={false} anim={anim} />
        <NetWing side={-1} front={false} anim={anim} />
        {[0, 1, 2].map((p) => (
          <group key={p} position={[0, 0.005, 0.16 - p * 0.035]}>
            <Leg position={[0.02, 0, 0]} side={1} pair={p} spec={A_LEG} color="#4a4236" anim={anim} />
            <Leg position={[-0.02, 0, 0]} side={-1} pair={p} spec={A_LEG} color="#4a4236" anim={anim} />
          </group>
        ))}
      </group>
    </group>
  );
}
