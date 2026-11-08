import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { leafGeometry } from '../three/Diorama';
import { GEO, mat, SURF } from '../three/materials';
import { fuzzTexture, grainBump, leafTexture, wrinkleBump } from '../three/textures';
import { M, useBodyMotion } from './common';
import { domeGeo } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* ───────────── ナナホシテントウ（docs/species-research.md §4） ───────────── */

function useLeafSurface(color = '#4f8a2b') {
  return useMemo(() => ({ ...SURF.plant(), map: leafTexture(color), side: THREE.DoubleSide }), [color]);
}

/** たまご：葉に 立てて まとめて産む、黄色い 細長い たまご */
export function TentouEgg({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  const leaf = useLeafSurface();
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = Math.sin(anim.current.t * 30) * 0.05 * anim.current.shiver;
  });
  return (
    <group>
      <M geo={leafGeometry()} color="#ffffff" surface={leaf} scale={0.9} part="egg" />
      <group ref={ref} position={[0, 0.02, 0.45]}>
        {Array.from({ length: 18 }, (_, i) => (
          <Part
            key={i}
            geometry={GEO.capsule()}
            color="#f0b93a"
            surface={{ roughness: 0.3, clearcoat: 0.7 }}
            position={[Math.cos(i * 2.4) * 0.03 * Math.sqrt(i), 0.035, Math.sin(i * 2.4) * 0.03 * Math.sqrt(i)]}
            scale={[0.018, 0.035, 0.018]}
            part="egg"
          />
        ))}
      </group>
    </group>
  );
}

const T_LARVA_LEG: LegSpec = { femur: 0.1, tibia: 0.1, tarsus: 0.04, thick: 0.012, tarsi: 1 };

/** ようちゅう：親とは まったく ちがう 細長い形。黒っぽい灰色に とげとげ、だいだい色の もよう */
export function TentouLarva({ anim, molts }: ModelProps) {
  const body = useBodyMotion(anim, 0.4);
  const size = 0.55 + molts * 0.15;
  const skin = useMemo(() => ({ roughness: 0.7, bumpMap: grainBump(41, 64), bumpScale: 1.2 }), []);
  const N = 8;
  return (
    <group scale={size}>
      <group ref={body}>
        {Array.from({ length: N }, (_, i) => {
          const z = 0.32 - i * 0.09;
          const r = 0.09 + (i >= 1 && i <= 3 ? 0.02 : 0) - (i > 4 ? (i - 4) * 0.015 : 0);
          // 腹の 1 節目と 4 節目に だいだい色の もよう
          const orange = i === 3 || i === 6;
          return (
            <group key={i} position={[0, 0.1, z]}>
              <Part geometry={GEO.sphere()} color="#33373c" surface={skin} scale={[r * 1.25, r * 0.75, r * 0.6]} castShadow={i % 2 === 0} part="body" />
              {[1, -1].map((s) => (
                <M key={s} geo={GEO.cone()} color={orange ? '#e8842a' : '#1f2124'} position={[s * r * 0.9, r * 0.5, 0]} rotation={[0, 0, -s * 0.7]} scale={[0.02, 0.05, 0.02]} part="body" />
              ))}
              {orange ? [1, -1].map((s) => <M key={`o${s}`} color="#e8842a" position={[s * r * 0.6, r * 0.55, 0]} scale={0.03} part="body" />) : null}
            </group>
          );
        })}
        <Part geometry={GEO.sphere()} color="#1b1c1e" surface={SURF.chitin(0.6)} position={[0, 0.1, 0.42]} scale={[0.06, 0.045, 0.05]} part="body" />
        <CompoundEye position={[0.04, 0.12, 0.45]} size={0.012} />
        <CompoundEye position={[-0.04, 0.12, 0.45]} size={0.012} />
        {[0, 1, 2].map((p) => (
          <group key={p} position={[0, 0.07, 0.32 - p * 0.08]}>
            <Leg position={[0.08, 0, 0]} side={1} pair={p} spec={T_LARVA_LEG} color="#1b1c1e" anim={anim} spread={0.2} part="legs" />
            <Leg position={[-0.08, 0, 0]} side={-1} pair={p} spec={T_LARVA_LEG} color="#1b1c1e" anim={anim} spread={0.2} part="legs" />
          </group>
        ))}
      </group>
    </group>
  );
}

/** さなぎ：おしりを 葉に はりつけた、だいだい色に 黒い点の さなぎ */
export function TentouPupa({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  const leaf = useLeafSurface();
  useFrame(() => {
    const a = anim.current;
    // さわると ぴくっと 起き上がる
    if (ref.current) ref.current.rotation.x = -0.5 + Math.sin(a.t * 25) * 0.12 * Math.max(a.shiver, a.bounce);
  });
  const surf = useMemo(() => ({ roughness: 0.4, clearcoat: 0.6 }), []);
  return (
    <group>
      <M geo={leafGeometry()} color="#ffffff" surface={leaf} scale={0.9} part="tail" />
      <group ref={ref} position={[0, 0.02, 0.32]}>
        <Part geometry={GEO.sphere()} color="#e89a3a" surface={surf} position={[0, 0.12, 0.06]} scale={[0.1, 0.12, 0.09]} castShadow part="tail" />
        {(
          [
            [0.04, 0.2, 0.12],
            [-0.04, 0.2, 0.12],
            [0, 0.14, 0.15],
            [0.06, 0.08, 0.12],
            [-0.06, 0.08, 0.12],
          ] as Array<[number, number, number]>
        ).map((p, i) => (
          <M key={i} color="#2b2118" position={p} scale={[0.02, 0.014, 0.01]} />
        ))}
        <M color="#3a2a1a" position={[0, 0.0, 0]} scale={[0.04, 0.03, 0.04]} part="tail" />
      </group>
    </group>
  );
}

/** 背中の 7 つの星（左右 3 つずつ と、まんなか前の 1 つ）。[横, 前後, 大きさ] */
const SPOTS: Array<[number, number, number]> = [
  [0, 0.86, 0.045],
  [0.45, 0.38, 0.04],
  [-0.45, 0.38, 0.04],
  [0.62, -0.12, 0.055],
  [-0.62, -0.12, 0.055],
  [0.3, -0.6, 0.04],
  [-0.3, -0.6, 0.04],
];
const T_LEG: LegSpec = { femur: 0.1, tibia: 0.1, tarsus: 0.07, thick: 0.014, tarsi: 3 };

let domeHalfGeo: THREE.SphereGeometry | null = null;
/** ドームの右半分（左右の前ばね） */
function domeHalf() {
  return domeHalfGeo ?? (domeHalfGeo = new THREE.SphereGeometry(1, 28, 16, -Math.PI / 2, Math.PI, 0, Math.PI / 2));
}

/** 成虫：つやつやの 赤い 背中に 7 つの 黒い星。前胸は 黒で、前の かどが 白い */
export function TentouAdult({ anim }: ModelProps) {
  const body = useBodyMotion(anim, 0.4);
  const shell = useRef<THREE.Group>(null);
  const red = useMemo(() => ({ roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 }), []);
  const spotMat = useMemo(() => mat('#141210', { roughness: 0.25, clearcoat: 1 }), []);
  const spots = useMemo(
    () =>
      SPOTS.map(([u, v, r]) => {
        // 楕円ドーム（横 0.22、高さ 0.18、前後 0.25）の表面に 置き、表面の向きに そろえる
        const x = u * 0.22;
        const z = v * 0.25;
        const k = Math.max(0, 1 - u * u - v * v);
        const y = 0.18 * Math.sqrt(k);
        const n = new THREE.Vector3(x / 0.22 ** 2, y / 0.18 ** 2, z / 0.25 ** 2).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        return { p: new THREE.Vector3(x, y + 0.003, z), q, r };
      }),
    [],
  );
  useFrame(() => {
    const a = anim.current;
    if (shell.current) {
      // 飛ぶときは かたい前ばねを ひらく
      const open = a.flap * 0.8;
      shell.current.children[0]!.rotation.z = open;
      shell.current.children[1]!.rotation.z = -open;
    }
  });
  return (
    <group ref={body} scale={1.4}>
      {/* 左右の前ばね。黒い星は それぞれの前ばねに くっついて いっしょに 動く */}
      <group ref={shell} position={[0, 0.07, -0.03]}>
        {[1, -1].map((s) => (
          <group key={s}>
            <group scale={[s, 1, 1]}>
              <Part geometry={domeHalf()} color="#c8102e" surface={red} scale={[0.22, 0.18, 0.25]} castShadow part="spots" />
            </group>
            {spots
              .filter((sp) => (s > 0 ? sp.p.x >= 0 : sp.p.x < 0))
              .map((sp, i) => (
                <mesh key={i} geometry={GEO.sphere()} material={spotMat} position={sp.p} quaternion={sp.q} scale={[sp.r, 0.006, sp.r * 1.05]} userData={{ part: 'spots' }} />
              ))}
          </group>
        ))}
      </group>
      {/* 前胸：黒地に 白い もよう（目のように見える） */}
      <Part geometry={GEO.sphere()} color="#141210" surface={SURF.chitin(1)} position={[0, 0.1, 0.22]} scale={[0.14, 0.07, 0.065]} part="pronotum" />
      {[1, -1].map((s) => (
        <M key={s} color="#f2efe8" surface={SURF.chitin(1)} position={[s * 0.1, 0.12, 0.25]} scale={[0.035, 0.025, 0.02]} part="pronotum" />
      ))}
      <Part geometry={GEO.sphere()} color="#141210" surface={SURF.chitin(1)} position={[0, 0.07, 0.28]} scale={[0.075, 0.045, 0.04]} part="pronotum" />
      {[1, -1].map((s) => (
        <M key={`w${s}`} color="#efe9df" position={[s * 0.035, 0.08, 0.31]} scale={[0.012, 0.01, 0.006]} />
      ))}
      <CompoundEye position={[0.055, 0.075, 0.29]} size={[0.015, 0.02, 0.018]} />
      <CompoundEye position={[-0.055, 0.075, 0.29]} size={[0.015, 0.02, 0.018]} />
      <Antenna position={[0.04, 0.07, 0.31]} side={1} length={0.08} thick={0.006} kind="clavate" color="#1a1714" anim={anim} rotation={[0, 0.6, 0]} part="antenna" />
      <Antenna position={[-0.04, 0.07, 0.31]} side={-1} length={0.08} thick={0.006} kind="clavate" color="#1a1714" anim={anim} rotation={[0, 0.6, 0]} part="antenna" />
      {[0, 1, 2].map((p) => (
        <group key={p} position={[0, 0.05, 0.16 - p * 0.1]}>
          <Leg position={[0.09, 0, 0]} side={1} pair={p} spec={T_LEG} color="#141210" anim={anim} spread={0.3} part="knee" />
          <Leg position={[-0.09, 0, 0]} side={-1} pair={p} spec={T_LEG} color="#141210" anim={anim} spread={0.3} part="knee" />
        </group>
      ))}
    </group>
  );
}

/* ───────────── カイコ（docs/species-research.md §5） ───────────── */

export function KaikoEgg({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = Math.sin(anim.current.t * 30) * 0.05 * anim.current.shiver;
  });
  return (
    <group ref={ref}>
      <M geo={GEO.box()} color="#f4efe2" surface={{ roughness: 0.95 }} position={[0, 0.005, 0]} scale={[0.8, 0.01, 0.6]} part="egg" />
      {Array.from({ length: 24 }, (_, i) => (
        <Part
          key={i}
          geometry={GEO.sphere()}
          color={i % 7 === 0 ? '#d9cf6a' : '#6f6274'}
          surface={{ roughness: 0.4, clearcoat: 0.5 }}
          position={[((i % 6) - 2.5) * 0.08, 0.018, (Math.floor(i / 6) - 1.5) * 0.08]}
          scale={[0.028, 0.016, 0.022]}
          part="egg"
        />
      ))}
    </group>
  );
}

/** ようちゅう：白っぽい 灰色の やわらかい体。胸の 三日月もよう（眼状紋）、おしりに 小さな 角 */
export function KaikoLarva({ anim, molts }: ModelProps) {
  const segs = useRef<Array<THREE.Mesh | null>>([]);
  const head = useRef<THREE.Group>(null);
  const body = useBodyMotion(anim, 0.3);
  const skin = useMemo(() => ({ ...SURF.softSkin(), bumpMap: wrinkleBump(), bumpScale: 0.8 }), []);
  const N = 12;
  // 4 回の脱皮で どんどん大きく（5 齢で いちばん大きい）
  const size = 0.42 + molts * 0.17;
  useFrame(() => {
    const a = anim.current;
    for (let i = 0; i < N; i++) {
      const m = segs.current[i];
      if (!m) continue;
      const lift = Math.max(0, Math.sin(a.gait * 1.5 - i * 0.7)) * 0.03 * a.walk;
      m.position.set(0, 0.13 + lift, 0.5 - i * 0.09);
      const r = 0.12 + (i === 2 ? 0.012 : 0) - (i > N - 3 ? (i - (N - 3)) * 0.02 : 0) - (i === 0 ? 0.02 : 0);
      m.scale.set(r, r * 0.92, r * 0.7);
    }
    if (head.current) {
      // 食べるときは 頭を 左右に ふる
      head.current.rotation.y = Math.sin(a.t * 6) * 0.35 * a.eat;
      head.current.rotation.x = 0.25 * a.eat;
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
            color={i % 2 ? '#ece8de' : '#e6e1d4'}
            surface={skin}
            castShadow={i % 3 === 0}
            part={i === 2 ? 'eyespot' : i >= 6 && i <= 9 ? 'prolegs' : 'spiracle'}
          >
            {i >= 3 && i <= 10 ? (
              <>
                <M color="#2b2118" position={[0.92, 0.05, 0]} scale={[0.04, 0.1, 0.07]} part="spiracle" />
                <M color="#2b2118" position={[-0.92, 0.05, 0]} scale={[0.04, 0.1, 0.07]} part="spiracle" />
              </>
            ) : null}
            {i >= 6 && i <= 9 ? (
              <>
                <M color="#ddd6c6" surface={skin} position={[0.55, -0.78, 0]} scale={[0.24, 0.24, 0.28]} part="prolegs" />
                <M color="#ddd6c6" surface={skin} position={[-0.55, -0.78, 0]} scale={[0.24, 0.24, 0.28]} part="prolegs" />
              </>
            ) : null}
          </Part>
        ))}
        {/* 眼状紋（三日月の もよう）と 腹の 半月もよう */}
        {[1, -1].map((s) => (
          <group key={s}>
            <M color="#7c7468" position={[s * 0.05, 0.235, 0.33]} rotation={[0.3, 0, s * 0.5]} scale={[0.04, 0.012, 0.02]} part="eyespot" />
            <M color="#9b9284" position={[s * 0.05, 0.225, -0.05]} rotation={[0.1, 0, s * 0.3]} scale={[0.03, 0.01, 0.018]} />
          </group>
        ))}
        <group ref={head} position={[0, 0.12, 0.58]}>
          <Part geometry={GEO.sphere()} color="#c9bda6" surface={SURF.chitin(0.4)} scale={[0.07, 0.065, 0.06]} part="ocelli" />
          {[1, -1].map((s) =>
            [0, 1, 2].map((k) => <M key={`${s}${k}`} color="#141210" surface={SURF.eye()} position={[s * 0.05, 0.01 + k * 0.012, 0.03 - k * 0.008]} scale={0.006} part="ocelli" />),
          )}
        </group>
        {/* 尾角 */}
        <M geo={GEO.cone()} color="#bfb39c" position={[0, 0.22, -0.48]} rotation={[-0.6, 0, 0]} scale={[0.018, 0.06, 0.018]} />
        {/* 胸あし */}
        {[0, 1, 2].map((p) =>
          [1, -1].map((s) => <M key={`l${p}${s}`} geo={GEO.cone()} color="#b9ab92" position={[s * 0.07, 0.03, 0.5 - p * 0.08]} rotation={[Math.PI, 0, 0]} scale={[0.015, 0.04, 0.015]} />),
        )}
      </group>
    </group>
  );
}

/** まゆ：1 本の 長い糸で つくった 白い おうち（毛羽だった 表面） */
export function KaikoCocoon({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  const silk = useMemo(() => ({ roughness: 1, sheen: 1, sheenColor: '#ffffff', map: fuzzTexture(), bumpMap: grainBump(51, 128), bumpScale: 2 }), []);
  useFrame(() => {
    const a = anim.current;
    if (ref.current) ref.current.rotation.z = Math.sin(a.t * 30) * 0.03 * a.shiver;
  });
  return (
    <group ref={ref}>
      {/* まぶし（紙の しきり） */}
      <M geo={GEO.box()} color="#d9cbb0" surface={{ roughness: 0.95 }} position={[0, 0.25, -0.25]} scale={[0.9, 0.5, 0.02]} />
      <M geo={GEO.box()} color="#d9cbb0" surface={{ roughness: 0.95 }} position={[-0.45, 0.25, 0]} scale={[0.02, 0.5, 0.5]} />
      <Part geometry={GEO.capsule()} color="#f7f3ea" surface={silk} position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.26, 0.28, 0.26]} castShadow part="cocoon" />
      {/* まわりの けば（糸の もや） */}
      <mesh position={[0, 0.18, 0]} scale={[0.42, 0.24, 0.26]} userData={{ part: 'cocoon' }}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.25} roughness={1} depthWrite={false} />
      </mesh>
    </group>
  );
}

const K_LEG: LegSpec = { femur: 0.1, tibia: 0.1, tarsus: 0.08, thick: 0.016, tarsi: 5 };

/** 成虫：白い 毛に おおわれた ずんぐりした ガ。くしのような 触角。はねは あるが 飛べない */
export function KaikoAdult({ anim }: ModelProps) {
  const body = useBodyMotion(anim, 0.4);
  const wings = useRef<THREE.Group>(null);
  const fur = useMemo(() => ({ roughness: 1, sheen: 1, sheenColor: '#ffffff', map: fuzzTexture(), bumpMap: grainBump(61, 128), bumpScale: 2 }), []);
  const wingMat = useMemo(() => mat('#ffffff', { roughness: 0.9, sheen: 0.8, map: fuzzTexture(), side: THREE.DoubleSide }), []);
  useFrame(() => {
    const a = anim.current;
    // 歩くときに はねを こまかく ふるわせる（飛べない）
    if (wings.current) {
      const buzz = Math.sin(a.t * 45) * 0.12 * (a.walk + a.bounce);
      wings.current.children[0]!.rotation.z = 0.3 + buzz;
      wings.current.children[1]!.rotation.z = -0.3 - buzz;
    }
  });
  return (
    <group ref={body} scale={1.3}>
      <Part geometry={GEO.sphere()} color="#efe9dc" surface={fur} position={[0, 0.15, -0.06]} scale={[0.11, 0.1, 0.22]} castShadow part="wings" />
      {[-0.02, -0.1, -0.18].map((z) => (
        <M key={z} geo={GEO.cylinder()} color="#d9d0bd" surface={fur} position={[0, 0.15, z]} rotation={[Math.PI / 2, 0, 0]} scale={[0.105, 0.006, 0.09]} />
      ))}
      <Part geometry={GEO.sphere()} color="#f3eee3" surface={fur} position={[0, 0.18, 0.14]} scale={0.1} castShadow part="mouth" />
      <Part geometry={GEO.sphere()} color="#e9e2d2" surface={fur} position={[0, 0.16, 0.24]} scale={[0.06, 0.055, 0.05]} part="mouth" />
      <CompoundEye position={[0.045, 0.17, 0.26]} size={0.022} color="#1a1715" />
      <CompoundEye position={[-0.045, 0.17, 0.26]} size={0.022} color="#1a1715" />
      <Antenna position={[0.03, 0.21, 0.25]} side={1} length={0.2} thick={0.007} kind="bipectinate" color="#5a5146" anim={anim} rotation={[-0.3, 0.4, 0]} part="antenna" />
      <Antenna position={[-0.03, 0.21, 0.25]} side={-1} length={0.2} thick={0.007} kind="bipectinate" color="#5a5146" anim={anim} rotation={[-0.3, 0.4, 0]} part="antenna" />
      <group ref={wings} position={[0, 0.22, 0.06]}>
        {[1, -1].map((s) => (
          <group key={s}>
            <mesh geometry={GEO.sphere()} material={wingMat} position={[s * 0.18, 0, -0.08]} rotation={[0, s * 0.35, 0]} scale={[0.2, 0.015, 0.16]} castShadow userData={{ part: 'wings' }} />
          </group>
        ))}
      </group>
      {[0, 1, 2].map((p) => (
        <group key={p} position={[0, 0.09, 0.1 - p * 0.08]}>
          <Leg position={[0.05, 0, 0]} side={1} pair={p} spec={K_LEG} color="#d6ccb8" anim={anim} />
          <Leg position={[-0.05, 0, 0]} side={-1} pair={p} spec={K_LEG} color="#d6ccb8" anim={anim} />
        </group>
      ))}
    </group>
  );
}

/* ───────────── ミイデラゴミムシ（docs/species-research.md §6） ───────────── */

const M_LEG: LegSpec = { femur: 0.18, tibia: 0.18, tarsus: 0.14, thick: 0.014, tarsi: 5 };

let striaeTex: THREE.CanvasTexture | null = null;
/** 前ばねの たてすじ（条溝）のバンプ */
function striae() {
  if (striaeTex) return striaeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  for (let x = 0; x < 64; x++) {
    const v = Math.round(128 + 120 * Math.sin((x / 64) * Math.PI * 16));
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1, 64);
  }
  striaeTex = new THREE.CanvasTexture(c);
  return striaeTex;
}

/**
 * 成虫：だいだい黄色の 頭と 細い 前胸（黒い もよう）、黒い 前ばねに だいだい黄色の 紋と 帯。
 * 前ばねには たての すじ。長い あしで すばやく 歩く。おしりから「プッ」と ふきだす。
 */
export function MiideraAdult({ anim }: ModelProps) {
  const body = useBodyMotion(anim, 0.6);
  const tail = useRef<THREE.Group>(null);
  const elytra = useMemo(() => ({ ...SURF.chitin(0.9), bumpMap: striae(), bumpScale: 1.5 }), []);
  const yellow = useMemo(() => SURF.chitin(0.8), []);
  useFrame(() => {
    const a = anim.current;
    // 噴射のとき おしりを くいっと向ける
    if (tail.current) tail.current.rotation.x = -a.spray * 0.45;
  });
  return (
    <group ref={body} scale={1.3}>
      <group ref={tail}>
        <Part geometry={domeGeo()} color="#121010" surface={elytra} position={[0, 0.09, -0.12]} scale={[0.15, 0.1, 0.27]} castShadow part="elytra" />
        {/* 肩の 紋と 後ろの 帯 */}
        {[1, -1].map((s) => (
          <M key={s} color="#e59a17" surface={yellow} position={[s * 0.08, 0.16, 0.05]} scale={[0.045, 0.02, 0.05]} part="elytra" />
        ))}
        <M color="#e59a17" surface={yellow} position={[0, 0.165, -0.18]} rotation={[-0.25, 0, 0]} scale={[0.13, 0.02, 0.045]} part="elytra" />
        <M color="#c9850f" position={[0, 0.07, -0.38]} scale={[0.05, 0.035, 0.035]} part="tail" />
      </group>
      {/* 細い 前胸（くび）と 頭：だいだい黄色に 黒い もよう */}
      <Part geometry={GEO.sphere()} color="#e9a21b" surface={yellow} position={[0, 0.1, 0.19]} scale={[0.07, 0.055, 0.08]} castShadow part="neck" />
      <M color="#1a1412" position={[0, 0.15, 0.19]} scale={[0.025, 0.012, 0.045]} part="neck" />
      <Part geometry={GEO.sphere()} color="#eaa41f" surface={yellow} position={[0, 0.1, 0.3]} scale={[0.075, 0.055, 0.075]} part="neck" />
      <M color="#1a1412" position={[0, 0.15, 0.3]} scale={[0.03, 0.012, 0.03]} part="neck" />
      <CompoundEye position={[0.06, 0.12, 0.33]} size={[0.018, 0.022, 0.022]} />
      <CompoundEye position={[-0.06, 0.12, 0.33]} size={[0.018, 0.022, 0.022]} />
      {/* 大あご */}
      {[1, -1].map((s) => (
        <M key={s} geo={GEO.cone()} color="#8a5a10" surface={yellow} position={[s * 0.025, 0.08, 0.38]} rotation={[1.4, 0, s * 0.4]} scale={[0.01, 0.04, 0.01]} />
      ))}
      <Antenna position={[0.04, 0.12, 0.35]} side={1} length={0.36} thick={0.007} kind="filiform" color="#d99018" anim={anim} rotation={[-0.25, 0.3, 0]} />
      <Antenna position={[-0.04, 0.12, 0.35]} side={-1} length={0.36} thick={0.007} kind="filiform" color="#d99018" anim={anim} rotation={[-0.25, 0.3, 0]} />
      {/* 長い あし（夜の 地面を すばやく 歩く） */}
      {[0, 1, 2].map((p) => (
        <group key={p} position={[0, 0.07, 0.19 - p * 0.13]}>
          <Leg position={[0.05, 0, 0]} side={1} pair={p} spec={M_LEG} color="#dc961c" anim={anim} part="legs" />
          <Leg position={[-0.05, 0, 0]} side={-1} pair={p} spec={M_LEG} color="#dc961c" anim={anim} part="legs" />
        </group>
      ))}
    </group>
  );
}
