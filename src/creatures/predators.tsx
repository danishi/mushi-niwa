import { useFrame } from '@react-three/fiber';
import { useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GEO, mat, sharedGeo, SURF } from '../three/materials';
import { barkTexture, gomadaraElytra, grainBump, mottledTexture, wrinkleBump } from '../three/textures';
import { M, useBodyMotion } from './common';
import { cachedTube, bodyGeo, shellGeo, yBody, plateGeo, segmentGeo } from './geom';
import { Antenna, CompoundEye, Leg, LiteContext, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research-2.md（形態は図鑑の記載と一般的な形態に基づく） */


/* ───────────── オオカマキリ ───────────── */

const MANTIS_LEG: LegSpec = { femur: 0.3, tibia: 0.3, tarsus: 0.14, thick: 0.012, tarsi: 5 };

/** カマ（捕獲脚）：長い基節・とげの並んだ 腿節・折りたたむ 脛節 */
function RaptorialLeg({ side, color, anim }: { side: 1 | -1; color: string; anim: ModelProps['anim'] }) {
  const femur = useRef<THREE.Group>(null);
  const tibia = useRef<THREE.Group>(null);
  const surf = useMemo(() => ({ roughness: 0.5, clearcoat: 0.3 }), []);
  const spine = useMemo(() => mat('#3b3a24', { roughness: 0.5 }), []);
  useFrame(() => {
    const a = anim.current;
    // ふだんは 胸の前で 折りたたむ。いかく（spray）のときは 大きく ひろげる
    const open = a.spray;
    // 腿節は 前上がりに 立て、脛節は 腿節に そって 下へ 折りたたむ（祈るような 姿）
    if (femur.current) femur.current.rotation.x = 0.85 - open * 0.55 + Math.sin(a.t * 1.3) * 0.03;
    if (tibia.current) tibia.current.rotation.x = 2.7 - open * 1.5;
  });
  return (
    <group position={[side * 0.05, 0, 0]}>
      {/* 基節（下へ 長く のびる） */}
      <Part geometry={GEO.capsule()} color={color} surface={surf} position={[0, -0.09, 0.03]} rotation={[0.3, 0, 0]} scale={[0.028, 0.16, 0.028]} part="raptorial" />
      <group ref={femur} position={[0, -0.18, 0.06]}>
        <Part geometry={GEO.capsule()} color={color} surface={surf} position={[0, 0.11, 0]} scale={[0.026, 0.18, 0.032]} castShadow part="raptorial" />
        {/* 腿節の 内側の とげ */}
        {[0.05, 0.1, 0.15, 0.2].map((y) => (
          <mesh key={y} geometry={GEO.cone()} material={spine} position={[0, y, -0.03]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.007, 0.03, 0.007]} />
        ))}
        <group ref={tibia} position={[0, 0.22, 0]}>
          <Part geometry={GEO.capsule()} color={color} surface={surf} position={[0, 0.08, 0]} scale={[0.018, 0.12, 0.02]} part="raptorial" />
          <mesh geometry={GEO.cone()} material={spine} position={[0, 0.18, 0]} scale={[0.008, 0.04, 0.008]} />
        </group>
      </group>
    </group>
  );
}

function Mantis({ anim, sex, molts, adult }: ModelProps & { adult: boolean }) {
  const body = useBodyMotion(anim, 0.3);
  const head = useRef<THREE.Group>(null);
  const wings = useRef<THREE.Group>(null);
  const abdomen = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  // 緑色の個体と 褐色の個体がいる（ここでは 個体ごとに分ける）
  const color = sex === 'female' ? '#7ea044' : '#9a8a52';
  const dark = sex === 'female' ? '#5f7f32' : '#7a6a3e';
  const surf = useMemo(() => ({ roughness: 0.55, clearcoat: 0.3, bumpMap: grainBump(111, 64), bumpScale: 0.6 }), []);
  const wingMat = useMemo(() => mat(color, { roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide, opacity: 0.95 }), [color]);
  const hindMat = useMemo(() => mat('#5a3d2c', { roughness: 0.5, side: THREE.DoubleSide, opacity: 0.85 }), []);
  const size = adult ? 1.35 : 0.55 + molts * 0.12;
  useFrame(() => {
    const a = anim.current;
    // カマキリは 首を かしげて こちらを 見る
    if (head.current) {
      head.current.rotation.y = Math.sin(a.t * 0.5) * 0.5 * a.energy;
      head.current.rotation.z = Math.sin(a.t * 0.37) * 0.15;
    }
    if (wings.current) {
      // はねは 閉じたまま（いかくは カマを ひろげて 体を そらす）
      wings.current.visible = adult;
    }
    if (abdomen.current) abdomen.current.rotation.x = adult ? 0.05 : -0.45; // 幼虫は おなかを そらす
    if (lean.current) lean.current.rotation.x = -a.spray * 0.25; // いかくで 上体を そらす
  });
  return (
    <group scale={size}>
      <group ref={body}>
        {/* 腹 */}
        <group ref={abdomen} position={[0, 0.17, -0.02]}>
          <Part geometry={yBody('mantisAbdomen', [[-1, 0, 0, 0], [-0.92, 0.2, 0.2, -0.2], [-0.45, 0.5, 0.42, -0.5], [0.2, 0.46, 0.38, -0.46], [0.8, 0.3, 0.3, -0.3], [1, 0.2, 0.2, -0.2]], { segs: [-0.95, 0.9, 7, 0.06], nb: 2.4 })} color={color} surface={surf} position={[0, 0, -0.22]} rotation={[Math.PI / 2, 0, 0]} scale={[0.07, 0.36, 0.055]} castShadow part="body" />
          <group ref={wings} position={[0, 0.045, -0.02]}>
            {[1, -1].map((s) => (
              <group key={s}>
                <mesh geometry={GEO.sphere()} material={hindMat} position={[s * 0.03, -0.005, -0.25]} scale={[0.06, 0.006, 0.28]} />
                <mesh geometry={GEO.sphere()} material={wingMat} position={[s * 0.03, 0.005, -0.24]} scale={[0.065, 0.008, 0.3]} castShadow userData={{ part: 'wings' }} />
              </group>
            ))}
          </group>
        </group>
        {/* 中胸・後胸 */}
        <Part geometry={yBody('mantisThorax', [[-1, 0.3, 0.3, -0.3], [-0.4, 0.5, 0.48, -0.5], [0.4, 0.48, 0.46, -0.48], [1, 0.28, 0.28, -0.28]])} color={color} surface={surf} position={[0, 0.17, 0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[0.05, 0.12, 0.045]} part="body" />
        {/* 長い 前胸（首）：ななめ上に 立てる */}
        <group ref={lean} position={[0, 0.17, 0.14]}>
        <group rotation={[-0.75, 0, 0]}>
          <Part geometry={yBody('mantisNeck', [[-1, 0.3, 0.3, -0.3], [-0.3, 0.36, 0.36, -0.34], [0.3, 0.52, 0.44, -0.4], [0.7, 0.5, 0.42, -0.38], [0.95, 0.3, 0.3, -0.28], [1, 0.15, 0.15, -0.15]], { nt: 2.4 })} color={dark} surface={surf} position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]} scale={[0.032, 0.32, 0.03]} castShadow part="neck" />
          {/* カマ */}
          <group position={[0, -0.01, 0.24]} rotation={[0.75, 0, 0]}>
            <RaptorialLeg side={1} color={color} anim={anim} />
            <RaptorialLeg side={-1} color={color} anim={anim} />
          </group>
          {/* 三角の 頭（よく 回る） */}
          <group ref={head} position={[0, 0.02, 0.33]} rotation={[0.75, 0, 0]}>
            <Part geometry={bodyGeo('mantisHead', [[-0.018, 0, 0, 0], [-0.01, 0.05, 0.025, -0.06], [0.015, 0.082, 0.04, -0.092], [0.04, 0.07, 0.03, -0.088], [0.056, 0, -0.02, -0.02]], { mid: 0.86, nb: 1.15, nt: 2.4 })} color={color} surface={surf} castShadow part="head" />
            {/* 大きな 複眼と 黒い 点（偽瞳孔） */}
            {[1, -1].map((s) => (
              <group key={s} position={[s * 0.065, 0.02, 0.02]}>
                <CompoundEye position={[0, 0, 0]} size={[0.03, 0.035, 0.03]} color="#a7c46a" part="eyes" />
                <M color="#1a1a14" surface={SURF.eye()} position={[0, 0, 0.026]} scale={0.007} part="eyes" />
              </group>
            ))}
            <Antenna position={[0.015, 0.03, 0.03]} side={1} length={0.35} thick={0.004} kind="filiform" color="#6f7a3a" anim={anim} rotation={[-0.4, 0.3, 0]} />
            <Antenna position={[-0.015, 0.03, 0.03]} side={-1} length={0.35} thick={0.004} kind="filiform" color="#6f7a3a" anim={anim} rotation={[-0.4, 0.3, 0]} />
          </group>
        </group>
        </group>
        {/* 中あし・後ろあし（細くて 長い） */}
        <Leg position={[0.04, 0.16, 0.08]} side={1} pair={1} spec={MANTIS_LEG} color={color} anim={anim} spread={0.5} />
        <Leg position={[-0.04, 0.16, 0.08]} side={-1} pair={1} spec={MANTIS_LEG} color={color} anim={anim} spread={0.5} />
        <Leg position={[0.04, 0.16, 0.0]} side={1} pair={2} spec={{ ...MANTIS_LEG, femur: 0.36, tibia: 0.36 }} color={color} anim={anim} spread={0.5} />
        <Leg position={[-0.04, 0.16, 0.0]} side={-1} pair={2} spec={{ ...MANTIS_LEG, femur: 0.36, tibia: 0.36 }} color={color} anim={anim} spread={0.5} />
      </group>
    </group>
  );
}

export function MantisNymph(p: ModelProps) {
  return <Mantis {...p} adult={false} />;
}
export function MantisAdult(p: ModelProps) {
  return <Mantis {...p} adult />;
}

/** 卵鞘（らんしょう）：枝に 産みつけられた あわの かたまり。中に 何百もの たまご */
export function MantisOotheca({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  const foam = useMemo(() => ({ roughness: 1, bumpMap: grainBump(121, 96), bumpScale: 3 }), []);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = Math.sin(anim.current.t * 30) * 0.03 * anim.current.shiver;
  });
  return (
    <group ref={ref}>
      <M geo={GEO.cylinder()} color="#ffffff" surface={{ map: barkTexture(), roughness: 0.95 }} position={[0, 0.5, 0]} rotation={[0, 0, 0.15]} scale={[0.04, 1, 0.04]} castShadow />
      <Part geometry={GEO.sphere()} color="#c9a978" surface={foam} position={[0.02, 0.5, 0.06]} scale={[0.13, 0.2, 0.11]} castShadow part="ootheca" />
      {[0.38, 0.45, 0.52, 0.59].map((y) => (
        <M key={y} geo={GEO.box()} color="#a98a5c" surface={foam} position={[0.02, y, 0.16]} scale={[0.14, 0.012, 0.02]} part="ootheca" />
      ))}
    </group>
  );
}

/* ───────────── トビズムカデ ───────────── */

const SEGMENTS = 21;

/** 胴の節と 21 対の脚を InstancedMesh で 2 ドローコールに まとめる */
function CentipedeBody({ anim, young }: { anim: ModelProps['anim']; young: boolean }) {
  const lite = useContext(LiteContext);
  const tergites = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const tergMat = useMemo(() => mat(young ? '#4a4a3a' : '#1e2a26', { roughness: 0.32, clearcoat: 1, bumpMap: grainBump(131, 64), bumpScale: 0.4 }), [young]);
  const legMat = useMemo(() => mat(young ? '#d9b46a' : '#e4b13c', { roughness: 0.45, clearcoat: 0.4 }), [young]);
  const legGeo = useMemo(
    () =>
      sharedGeo('centLeg', () => {
        const a = new THREE.CylinderGeometry(0.008, 0.01, 0.09, 6);
        a.rotateZ(Math.PI / 2);
        a.translate(0.045, 0, 0);
        const b = new THREE.CylinderGeometry(0.004, 0.008, 0.08, 6);
        b.translate(0.09, -0.04, 0);
        return mergeGeometries([a.toNonIndexed(), b.toNonIndexed()])!;
      }),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);
  useLayoutEffect(() => {
    if (legs.current) legs.current.count = lite ? 0 : SEGMENTS * 2;
  }, [lite]);
  useFrame(() => {
    const a = anim.current;
    const T = tergites.current;
    const L = legs.current;
    if (!T || !L) return;
    for (let i = 0; i < SEGMENTS; i++) {
      // 体を 左右に くねらせながら 進む（後ろほど 遅れる 波）
      const z = 0.42 - i * 0.045;
      const x = Math.sin(a.gait * 0.8 - i * 0.45) * 0.035 * a.walk + Math.sin(a.t * 0.6 - i * 0.3) * 0.01;
      const yaw = Math.cos(a.gait * 0.8 - i * 0.45) * 0.25 * a.walk;
      const w = 0.055 - Math.abs(i - 8) * 0.0012;
      tmp.p.set(x, 0.05, z);
      tmp.e.set(0, yaw, 0);
      tmp.q.setFromEuler(tmp.e);
      tmp.s.set(w, 0.022, 0.03);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      T.setMatrixAt(i, tmp.m);
      // 脚：前から後ろへ 波のように 動く
      for (const side of [1, -1]) {
        const k = i * 2 + (side > 0 ? 0 : 1);
        const swing = Math.sin(a.gait * 3 - i * 0.7 + (side > 0 ? 0 : Math.PI)) * 0.45 * a.walk;
        const last = i === SEGMENTS - 1;
        tmp.p.set(x + side * w * 0.9, 0.045, z);
        // いかくでは いちばん うしろの 長い あしを もちあげる
        const lift = last ? a.spray * 0.9 : 0;
        tmp.e.set(0, (last ? -side * 1.2 : 0) + swing * side + yaw, side > 0 ? -0.15 + lift : Math.PI + 0.15 - lift, 'YXZ');
        tmp.q.setFromEuler(tmp.e);
        tmp.s.set(last ? 1.9 : 1, side > 0 ? 1 : -1, 1);
        tmp.m.compose(tmp.p, tmp.q, tmp.s);
        L.setMatrixAt(k, tmp.m);
      }
    }
    T.instanceMatrix.needsUpdate = true;
    L.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={tergites} args={[plateGeo(), tergMat, SEGMENTS]} castShadow frustumCulled={false} userData={{ part: 'legs' }} />
      <instancedMesh ref={legs} args={[legGeo, legMat, SEGMENTS * 2]} frustumCulled={false} userData={{ part: 'legs' }} />
    </>
  );
}

/** トビズムカデ：赤い頭（とびいろの頭）、黒っぽい胴、黄色い 21 対の脚。頭の下に 毒の あご（顎肢） */
function Centipede({ anim, molts, young }: ModelProps & { young: boolean }) {
  const head = useRef<THREE.Group>(null);
  const size = young ? 0.6 + molts * 0.1 : 1.45;
  useFrame(() => {
    const a = anim.current;
    // いかく：頭を もちあげて あごを ひらく
    if (head.current) head.current.rotation.x = -a.spray * 0.5 + Math.sin(a.t * 2) * 0.03;
  });
  const shell = useMemo(() => ({ roughness: 0.3, clearcoat: 1 }), []);
  return (
    <group scale={size}>
      <CentipedeBody anim={anim} young={young} />
      <group ref={head} position={[0, 0.05, 0.47]}>
        <Part geometry={plateGeo()} color={young ? '#c7754a' : '#c2401f'} surface={shell} scale={[0.055, 0.022, 0.05]} castShadow part="head" />
        {/* 顎肢（毒の あご） */}
        {[1, -1].map((s) => (
          <Part
            key={s}
            geometry={cachedTube(`forc${s}`, [[0, 0, 0], [s * 0.03, -0.005, 0.03], [s * 0.005, -0.008, 0.06]], 0.01, 0.004, 8, 5)}
            color="#7a2412"
            surface={shell}
            position={[s * 0.02, -0.01, 0.02]}
            part="forcipules"
          />
        ))}
        <CompoundEye position={[0.035, 0.012, 0.02]} size={0.007} />
        <CompoundEye position={[-0.035, 0.012, 0.02]} size={0.007} />
        <Antenna position={[0.02, 0.01, 0.04]} side={1} length={0.2} thick={0.006} kind="filiform" color="#d9973a" anim={anim} rotation={[0.5, 0.6, 0]} part="antenna" />
        <Antenna position={[-0.02, 0.01, 0.04]} side={-1} length={0.2} thick={0.006} kind="filiform" color="#d9973a" anim={anim} rotation={[0.5, 0.6, 0]} part="antenna" />
      </group>
    </group>
  );
}

export function CentipedeYoung(p: ModelProps) {
  return <Centipede {...p} young />;
}
export function CentipedeAdult(p: ModelProps) {
  return <Centipede {...p} young={false} />;
}

/* ───────────── マダラサソリ ───────────── */

const SCORPION_LEG: LegSpec = { femur: 0.12, tibia: 0.12, tarsus: 0.07, thick: 0.012, tarsi: 3 };

/** マダラサソリ：まだら模様の 体、細長い ハサミ（触肢）、5 節の 尾と 毒針 */
function Scorpion({ anim, molts, young }: ModelProps & { young: boolean }) {
  const body = useBodyMotion(anim, 0.3);
  const tail = useRef<Array<THREE.Group | null>>([]);
  const claws = useRef<THREE.Group>(null);
  const size = young ? 0.55 + molts * 0.12 : 1.4;
  const shell = useMemo(
    () => (young ? { roughness: 0.4, clearcoat: 0.6, translucent: true } : { map: mottledTexture(), roughness: 0.4, clearcoat: 0.7, bumpMap: grainBump(141, 64), bumpScale: 0.5 }),
    [young],
  );
  const color = young ? '#e8dcc0' : '#ffffff';
  useFrame(() => {
    const a = anim.current;
    // 尾は 背中の上へ そりかえる。いかくの ときは さらに 高く
    const curl = 0.55 + a.spray * 0.35 + Math.sin(a.t * 0.8) * 0.03;
    tail.current.forEach((g, i) => {
      // 後ろへ 伸びる 節を 上へ 起こす（+ で 上向き）
      if (g) g.rotation.x = i === 0 ? 0.45 + a.spray * 0.3 : curl;
    });
    if (claws.current) claws.current.rotation.x = -a.spray * 0.5;
  });
  return (
    <group scale={size}>
      <group ref={body}>
        {/* 頭胸部と 腹（前腹部） */}
        <Part geometry={plateGeo()} color={color} surface={shell} position={[0, 0.06, 0.12]} scale={[0.065, 0.03, 0.07]} castShadow part="body" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Part key={i} geometry={plateGeo()} color={color} surface={shell} position={[0, 0.058, 0.04 - i * 0.04]} scale={[0.07 - i * 0.002, 0.026, 0.026]} castShadow={i % 2 === 0} part="body" />
        ))}
        <CompoundEye position={[0.012, 0.09, 0.15]} size={0.009} />
        <CompoundEye position={[-0.012, 0.09, 0.15]} size={0.009} />
        {/* 櫛状板（おなかの下の くし） */}
        {[1, -1].map((s) => (
          <M key={s} geo={GEO.box()} color="#e8d8b0" position={[s * 0.03, 0.03, 0.04]} rotation={[0, s * 0.4, 0]} scale={[0.05, 0.004, 0.012]} part="pectines" />
        ))}
        {/* 尾（後腹部 5 節）と 毒針 */}
        <group position={[0, 0.06, -0.2]}>
          <TailChain refs={tail} color={color} surface={shell} />
        </group>
        {/* 触肢と ハサミ（細長い） */}
        <group ref={claws} position={[0, 0.055, 0.17]}>
          {[1, -1].map((s) => (
            <group key={s} position={[s * 0.04, 0, 0]} rotation={[0, s * 0.5, 0]}>
              <Part geometry={GEO.capsule()} color={color} surface={shell} position={[s * 0.04, 0, 0.03]} rotation={[Math.PI / 2, 0, s * 0.8]} scale={[0.014, 0.1, 0.014]} part="pedipalps" />
              <group position={[s * 0.09, 0, 0.09]} rotation={[0, -s * 1.1, 0]}>
                <Part geometry={GEO.capsule()} color={color} surface={shell} position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={[0.016, 0.1, 0.016]} part="pedipalps" />
                {/* ハサミ（細長い 2 本の 指） */}
                <Part geometry={GEO.capsule()} color={color} surface={shell} position={[0.008, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]} scale={[0.008, 0.08, 0.008]} part="pedipalps" />
                <Part geometry={GEO.capsule()} color="#3a2a1a" surface={shell} position={[-0.008, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]} scale={[0.007, 0.08, 0.007]} part="pedipalps" />
              </group>
            </group>
          ))}
        </group>
        {/* 4 対の あし */}
        {[0, 1, 2, 3].map((p) => (
          <group key={p} position={[0, 0.05, 0.14 - p * 0.06]}>
            <Leg position={[0.05, 0, 0]} side={1} pair={p % 3} spec={SCORPION_LEG} color={young ? '#e4d6b8' : '#c49a5a'} anim={anim} spread={0.45} yaw={(1.5 - p) * 0.35} />
            <Leg position={[-0.05, 0, 0]} side={-1} pair={p % 3} spec={SCORPION_LEG} color={young ? '#e4d6b8' : '#c49a5a'} anim={anim} spread={0.45} yaw={(1.5 - p) * 0.35} />
          </group>
        ))}
      </group>
    </group>
  );
}

/** 尾の 5 節（ひとつずつ 曲がる）と 毒針 */
function TailChain({ refs, color, surface }: { refs: { current: Array<THREE.Group | null> }; color: string; surface: Record<string, unknown> }) {
  const L = 0.06;
  const build = (i: number): ReactNode => {
    if (i >= 5) {
      return (
        <group position={[0, 0, -0.01]}>
          <Part geometry={GEO.sphere()} color={color} surface={surface} position={[0, 0, -0.03]} scale={[0.02, 0.018, 0.03]} part="stinger" />
          <Part geometry={GEO.cone()} color="#5a2a12" surface={SURF.chitin(1)} position={[0, 0.01, -0.065]} rotation={[-2.2, 0, 0]} scale={[0.008, 0.04, 0.008]} part="stinger" />
        </group>
      );
    }
    return (
      <group
        ref={(g) => {
          refs.current[i] = g;
        }}
      >
        <Part geometry={GEO.capsule()} color={color} surface={surface} position={[0, 0, -L / 2]} rotation={[Math.PI / 2, 0, 0]} scale={[0.02 - i * 0.001, L * 0.9, 0.018 - i * 0.001]} castShadow={i === 2} part="stinger" />
        <group position={[0, 0, -L]}>{build(i + 1)}</group>
      </group>
    );
  };
  return <>{build(0)}</>;
}

export function ScorpionYoung(p: ModelProps) {
  return <Scorpion {...p} young />;
}
export function ScorpionAdult(p: ModelProps) {
  return <Scorpion {...p} young={false} />;
}

/* ───────────── ゴマダラカミキリ ───────────── */

/** 幼虫（テッポウムシ）：木の中に すむ 乳白色の 細長い 幼虫。胸が 平たく ふくらみ、あしは ほとんど ない */
export function GomadaraLarva({ anim, molts }: ModelProps) {
  const segs = useRef<Array<THREE.Mesh | null>>([]);
  const body = useBodyMotion(anim, 0.3);
  const skin = useMemo(() => ({ ...SURF.softSkin(), bumpMap: wrinkleBump(), bumpScale: 1 }), []);
  const N = 12;
  const size = 0.7 + molts * 0.15;
  useFrame(() => {
    const a = anim.current;
    for (let i = 0; i < N; i++) {
      const m = segs.current[i];
      if (!m) continue;
      const wave = 1 + 0.06 * Math.sin(a.gait * 2 - i * 0.8) * a.walk;
      const r = i === 1 ? 0.14 : i === 0 ? 0.1 : 0.1 - (i > N - 3 ? (i - (N - 3)) * 0.02 : 0);
      m.position.set(0, 0.13, 0.5 - i * 0.085);
      m.scale.set(r * 1.25 * wave, r * 0.8, r * 0.6);
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
            color={i === 1 ? '#f2e2bf' : '#f4ead6'}
            surface={skin}
            castShadow={i % 3 === 0}
            part={i <= 1 ? 'prothorax' : 'body'}
          />
        ))}
        <Part geometry={GEO.sphere()} color="#8a5a2a" surface={SURF.chitin(0.8)} position={[0, 0.12, 0.6]} scale={[0.06, 0.04, 0.04]} part="mandibles" />
        {[1, -1].map((s) => (
          <M key={s} geo={GEO.cone()} color="#1b120a" surface={SURF.chitin(1)} position={[s * 0.025, 0.11, 0.64]} rotation={[1.5, 0, s * 0.3]} scale={[0.012, 0.035, 0.012]} part="mandibles" />
        ))}
      </group>
    </group>
  );
}

/** さなぎ：木の中の 部屋で、長い 触角を 体に まきつけた 白い さなぎ */
export function GomadaraPupa({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  const surf = useMemo(() => ({ roughness: 0.5, translucent: true }), []);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = Math.sin(anim.current.t * 30) * 0.04 * Math.max(anim.current.shiver, anim.current.bounce);
  });
  return (
    <group ref={ref} position={[0, 0.14, 0]}>
      <Part geometry={GEO.capsule()} color="#f1e6cf" surface={surf} rotation={[Math.PI / 2, 0, 0]} scale={[0.15, 0.45, 0.12]} castShadow part="pupa" />
      <Part geometry={GEO.sphere()} color="#efe2c6" surface={surf} position={[0, 0, 0.33]} scale={[0.1, 0.09, 0.08]} part="pupa" />
      {/* 体に まきつけた 触角 */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 0.02, 0.0]} rotation={[Math.PI / 2, 0, 0]} userData={{ part: 'pupa' }}>
          <torusGeometry args={[0.16, 0.012, 6, 24, Math.PI * 1.3]} />
          <meshStandardMaterial color="#e8d8b8" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

const G_LEG: LegSpec = { femur: 0.22, tibia: 0.22, tarsus: 0.14, thick: 0.016, tarsi: 4 };

/** 成虫：つやのある 黒に 白い 点々。長い 触角は 白と黒の しま。胸の よこに とげ */
export function GomadaraAdult({ anim, sex }: ModelProps) {
  const body = useBodyMotion(anim, 0.5);
  const head = useRef<THREE.Group>(null);
  const elytra = useMemo(() => ({ ...SURF.chitin(1), map: gomadaraElytra() }), []);
  const black = useMemo(() => SURF.chitin(1), []);
  // オスの 触角は 体の 約 2 倍、メスは 少し 短い
  const antLen = sex === 'male' ? 1.3 : 0.95;
  useFrame(() => {
    const a = anim.current;
    // キィキィ 鳴くときは 頭と胸を こすり合わせて うなずく
    if (head.current) head.current.rotation.x = Math.sin(a.t * 30) * 0.08 * a.spray + -a.eat * 0.25;
  });
  return (
    <group ref={body}>
      {/* 前ばね：肩が 角ばり、両がわが 平行で 細長い */}
      <Part
        geometry={shellGeo('gomadaraElytra', [[-0.525, 0, 0.14], [-0.515, 0.06, 0.17], [-0.47, 0.125, 0.215], [-0.35, 0.158, 0.25], [-0.1, 0.168, 0.262], [0.1, 0.172, 0.262], [0.16, 0.166, 0.25], [0.188, 0.14, 0.225]], { base: 0.125, nt: 2.5, suture: 0.004, rim: 0.03, rings: 44 })}
        color="#ffffff"
        surface={elytra}
        castShadow
        part="elytra"
      />
      <M geo={bodyGeo('gomadaraUnder', [[-0.52, 0, 0.12, 0.12], [-0.48, 0.1, 0.14, 0.085], [-0.3, 0.15, 0.15, 0.07], [0.1, 0.16, 0.15, 0.065], [0.2, 0.12, 0.15, 0.075], [0.3, 0.07, 0.15, 0.09]], { nb: 2.8, segs: [-0.5, -0.1, 5, 0.03] })} color="#121216" surface={black} />
      {/* 前胸（よこに とげ）と 白い 点 */}
      <Part geometry={bodyGeo('gomadaraPronotum', [[0.125, 0.08, 0.232, 0.095], [0.16, 0.104, 0.246, 0.085], [0.22, 0.112, 0.248, 0.082], [0.27, 0.1, 0.238, 0.09], [0.308, 0.078, 0.222, 0.1]], { nt: 2.3 })} color="#0f0f12" surface={black} castShadow part="pronotum" />
      {[1, -1].map((s) => (
        <M key={s} geo={GEO.cone()} color="#0f0f12" surface={black} position={[s * 0.11, 0.16, 0.22]} rotation={[0, 0, -s * Math.PI / 2]} scale={[0.02, 0.05, 0.02]} part="pronotum" />
      ))}
      <group ref={head} position={[0, 0.14, 0.34]}>
        <Part geometry={bodyGeo('gomadaraHead', [[-0.07, 0.05, 0.06, -0.04], [-0.02, 0.085, 0.08, -0.07], [0.04, 0.082, 0.072, -0.08], [0.076, 0.056, 0.03, -0.082], [0.088, 0, -0.03, -0.03]], { nt: 2.3 })} color="#0f0f12" surface={black} part="mandibles" />
        <CompoundEye position={[0.06, 0.02, 0.0]} size={[0.02, 0.04, 0.03]} />
        <CompoundEye position={[-0.06, 0.02, 0.0]} size={[0.02, 0.04, 0.03]} />
        {[1, -1].map((s) => (
          <M key={s} geo={GEO.cone()} color="#1b1410" surface={black} position={[s * 0.025, -0.05, 0.07]} rotation={[1.4, 0, s * 0.35]} scale={[0.014, 0.05, 0.014]} part="mandibles" />
        ))}
        {/* 白黒の しまの 長い 触角 */}
        {[1, -1].map((s) => (
          <group key={`a${s}`} position={[s * 0.035, 0.06, 0.03]}>
            <Antenna position={[0, 0, 0]} side={s as 1 | -1} length={antLen} thick={0.009} kind="filiform" color="#1a1a1e" bands="#dfe6ee" anim={anim} rotation={[0.35, 0.45, 0]} part="antenna" />
          </group>
        ))}
      </group>
      {[0, 1, 2].map((p) => (
        <group key={p} position={[0, 0.1, 0.2 - p * 0.13]}>
          <Leg position={[0.06, 0, 0]} side={1} pair={p} spec={G_LEG} color="#16161a" anim={anim} />
          <Leg position={[-0.06, 0, 0]} side={-1} pair={p} spec={G_LEG} color="#16161a" anim={anim} />
        </group>
      ))}
    </group>
  );
}
