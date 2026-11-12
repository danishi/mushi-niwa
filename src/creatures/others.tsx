import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { leafGeometry } from '../three/Diorama';
import { GEO, mat, SURF } from '../three/materials';
import { fuzzTexture, grainBump, leafTexture, mothWing, paint, striaeNormal, veinWing, wrinkleBump } from '../three/textures';
import { larvaReach, M, useBodyMotion } from './common';
import { bodyGeo, segmentGeo, shapeGeo, shellGeo, cocoonGeo } from './geom';
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
  const surf = useMemo(() => ({ roughness: 0.4, clearcoat: 0.6, map: tentouPupaMap() }), []);
  return (
    <group>
      <M geo={leafGeometry()} color="#ffffff" surface={leaf} scale={0.9} part="tail" />
      <group ref={ref} position={[0, 0.02, 0.32]}>
        {/* おしりの 先で 葉に つき、背中を まるめて 立つ。ぬいだ 幼虫の 皮が 根もとに 残る */}
        <group rotation={[-Math.PI / 2 + 0.5, 0, 0]}>
          <Part geometry={tentouPupaGeo()} color="#ffffff" surface={surf} position={[0, 0, 0.135]} castShadow part="tail" />
        </group>
        <M color="#2b2620" surface={{ roughness: 0.9, bumpMap: grainBump(47, 32), bumpScale: 2 }} position={[0, 0.012, -0.012]} scale={[0.045, 0.02, 0.04]} part="tail" />
      </group>
    </group>
  );
}

/** さなぎの もよう（u が まわり、v が 前後）：だいだい色に、背中の 2 列の 黒い 点 */
function tentouPupaMap() {
  return paint('tentouPupa', 128, (g, s) => {
    g.fillStyle = '#e8963a';
    g.fillRect(0, 0, s, s);
    // 胸は 少し うすい 色
    g.fillStyle = 'rgba(240, 200, 130, 0.5)';
    g.fillRect(0, 0, s, s * 0.3);
    g.fillStyle = '#2b2118';
    for (let i = 0; i < 6; i++) {
      const v = 0.14 + i * 0.13;
      const r = s * (i < 2 ? 0.035 : 0.028);
      for (const u of [0.43, 0.57]) {
        g.beginPath();
        g.ellipse(u * s, (1 - v) * s, r, r * 0.8, 0, 0, Math.PI * 2);
        g.fill();
      }
      // わきの 小さな 点
      if (i >= 2)
        for (const u of [0.33, 0.67]) {
          g.beginPath();
          g.ellipse(u * s, (1 - v) * s, r * 0.6, r * 0.5, 0, 0, Math.PI * 2);
          g.fill();
        }
    }
  });
}

/** さなぎの 体（軸は Z。おしりが -Z）：背中が 高く まるく、おなかは 平ら。はらに 節 */
const tentouPupaGeo = () =>
  bodyGeo('tentouPupa', [[-0.135, 0.012, 0.02, 0], [-0.11, 0.055, 0.075, 0], [-0.04, 0.095, 0.14, 0], [0.04, 0.102, 0.155, 0.008], [0.1, 0.08, 0.125, 0.03], [0.135, 0.04, 0.08, 0.042], [0.146, 0, 0.06, 0.06]], {
    mid: 0.25,
    nb: 3,
    segs: [-0.13, 0.02, 5, 0.05],
  });

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

/** うしろばね（右。つけねが 原点、よこへ のびる）：前ばねの 2 倍ほどの 長さ */
const tentouHindWing = (sh: THREE.Shape) => {
  sh.moveTo(0, 0.03);
  sh.bezierCurveTo(0.2, 0.1, 0.45, 0.1, 0.56, 0.02);
  sh.bezierCurveTo(0.5, -0.12, 0.25, -0.2, 0.06, -0.16);
  sh.lineTo(0, 0.03);
};

let domeHalfGeo: THREE.SphereGeometry | null = null;
/** ドームの右半分（左右の前ばね） */
function domeHalf() {
  return domeHalfGeo ?? (domeHalfGeo = new THREE.SphereGeometry(1, 28, 16, -Math.PI / 2, Math.PI, 0, Math.PI / 2));
}

/** 成虫：つやつやの 赤い 背中に 7 つの 黒い星。前胸は 黒で、前の かどが 白い */
export function TentouAdult({ anim }: ModelProps) {
  const body = useBodyMotion(anim, 0.4);
  const shell = useRef<THREE.Group>(null);
  const hind = useRef<THREE.Group>(null);
  // うしろばね：前ばねより ずっと 長い、うすい まく
  const hindMat = useMemo(() => mat('#ffffff', { map: veinWing('#d9cfb8', '#5a4a36', 0.5), roughness: 0.25, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }), []);
  const red = useMemo(() => ({ ...SURF.chitin(1), roughness: 0.22, clearcoatRoughness: 0.05, normalScale: 0.15 }), []);
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
    // 飛ぶときは かたい前ばねを 上へ ひらき、たたんでいた うすい うしろばねを のばして はばたく。
    // ひまな ときにも、ときどき 前ばねを 少し ひらいて うしろばねを のばす（はねのばし）
    const open = Math.max(a.flap, a.fan * 0.55);
    if (shell.current) {
      shell.current.children.forEach((c, i) => {
        const s = i === 0 ? 1 : -1;
        c.rotation.z = s * open * 0.95;
        c.rotation.y = s * open * 0.5;
      });
    }
    if (hind.current) {
      hind.current.visible = open > 0.04;
      hind.current.children.forEach((c, i) => {
        const s = i === 0 ? 1 : -1;
        c.scale.set(s * Math.max(0.05, open), 1, 0.35 + open * 0.65);
        c.rotation.z = s * (0.15 + Math.sin(a.t * 75) * 0.6 * a.flap);
      });
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
      <group ref={hind} position={[0, 0.12, 0.08]} visible={false}>
        {[1, -1].map((s) => (
          <group key={s}>
            <mesh geometry={shapeGeo('tentouHind', tentouHindWing)} material={hindMat} rotation={[Math.PI / 2, 0, 0]} />
          </group>
        ))}
      </group>
      {/* 前胸：黒地に 白い もよう（目のように見える） */}
      <Part
        geometry={shellGeo('tentouPronotum', [[0.14, 0.13, 0.19], [0.17, 0.155, 0.185], [0.21, 0.15, 0.165], [0.25, 0.125, 0.135], [0.28, 0.09, 0.105], [0.292, 0.06, 0.085]], { base: 0.06, nt: 2.1, rim: 0.05, rings: 18 })}
        color="#141210"
        surface={SURF.chitin(1)}
        part="pronotum"
      />
      {/* 体の 下がわ（平たい 黒い おなか） */}
      <M geo={bodyGeo('tentouUnder', [[-0.275, 0.04, 0.09, 0.05], [-0.17, 0.18, 0.1, 0.03], [-0.03, 0.212, 0.1, 0.025], [0.13, 0.17, 0.1, 0.03], [0.24, 0.07, 0.09, 0.045], [0.26, 0, 0.07, 0.07]], { nb: 3 })} color="#161310" />
      {[1, -1].map((s) => (
        <M key={s} color="#f2efe8" surface={SURF.chitin(1)} position={[s * 0.098, 0.112, 0.245]} rotation={[0, s * 0.5, s * -0.5]} scale={[0.034, 0.012, 0.03]} part="pronotum" />
      ))}
      <Part geometry={GEO.sphere()} color="#141210" surface={SURF.chitin(1)} position={[0, 0.072, 0.295]} scale={[0.07, 0.04, 0.04]} part="pronotum" />
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
  const body = useBodyMotion(anim, 0.3, true);
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
      const [rx, ry] = larvaReach(a, i);
      m.position.set(rx, 0.13 + lift + ry, 0.5 - i * 0.09);
      const r = 0.12 + (i === 2 ? 0.012 : 0) - (i > N - 3 ? (i - (N - 3)) * 0.02 : 0) - (i === 0 ? 0.02 : 0);
      m.scale.set(r, r * 0.92, r * 0.7);
    }
    if (head.current) {
      // 食べるときは 頭を 左右に ふる。ひまな ときは 頭を 持ち上げて まわりを さぐる
      const [rx, ry] = larvaReach(a, -0.6);
      head.current.position.set(rx, 0.12 + ry, 0.58);
      head.current.rotation.y = Math.sin(a.t * 6) * 0.35 * a.eat + a.look * 0.45;
      head.current.rotation.x = 0.25 * a.eat - a.rear * 0.35;
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
      <Part geometry={cocoonGeo()} color="#f7f3ea" surface={silk} position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.26, 0.28, 0.26]} castShadow part="cocoon" />
      {/* まわりの けば（糸の もや） */}
      <mesh position={[0, 0.18, 0]} scale={[0.42, 0.24, 0.26]} userData={{ part: 'cocoon' }}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.25} roughness={1} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** カイコガの 前ばね：先が かぎのように とがる（鎌状）。後ろばねは 小さく まるい */
const kaikoFore = (s: THREE.Shape) => {
  s.moveTo(0, 0.02);
  s.bezierCurveTo(0.12, 0.08, 0.28, 0.08, 0.4, 0.02);
  s.bezierCurveTo(0.36, -0.02, 0.35, -0.1, 0.3, -0.2);
  s.bezierCurveTo(0.2, -0.17, 0.08, -0.12, 0, -0.06);
};
const kaikoHind = (s: THREE.Shape) => {
  s.moveTo(0, -0.04);
  s.bezierCurveTo(0.1, -0.06, 0.22, -0.12, 0.24, -0.2);
  s.bezierCurveTo(0.2, -0.3, 0.08, -0.3, 0, -0.16);
};

const K_LEG: LegSpec = { femur: 0.1, tibia: 0.1, tarsus: 0.08, thick: 0.016, tarsi: 5 };

/** 成虫：白い 毛に おおわれた ずんぐりした ガ。くしのような 触角。はねは あるが 飛べない */
export function KaikoAdult({ anim }: ModelProps) {
  const body = useBodyMotion(anim, 0.4);
  const wings = useRef<THREE.Group>(null);
  const fur = useMemo(() => ({ roughness: 1, sheen: 1, sheenColor: '#ffffff', map: fuzzTexture(), bumpMap: grainBump(61, 128), bumpScale: 2 }), []);
  const wingMat = useMemo(() => mat('#ffffff', { roughness: 0.9, sheen: 0.8, map: mothWing([0, -0.2, 0.4, 0.07]), side: THREE.DoubleSide }), []);
  const hindMat = useMemo(() => mat('#f6f1e6', { roughness: 0.9, sheen: 0.8, map: mothWing([0, -0.3, 0.24, -0.04]), side: THREE.DoubleSide }), []);
  useFrame(() => {
    const a = anim.current;
    // 歩くときに はねを こまかく ふるわせる（飛べない）
    if (wings.current) {
      const buzz = Math.sin(a.t * 45) * (0.12 * (a.walk + a.bounce) + 0.3 * a.fan);
      const lift = 0.14 + a.fan * 0.3 - a.sleep * 0.1;
      wings.current.children[0]!.rotation.z = lift + buzz;
      wings.current.children[1]!.rotation.z = -lift - buzz;
    }
  });
  return (
    <group ref={body} scale={1.3}>
      {/* ふとい はら（節の くびれ）と、もこもこの 胸 */}
      <Part
        geometry={bodyGeo('kaikoAbdomen', [[-0.29, 0, 0.15, 0.15], [-0.27, 0.05, 0.19, 0.11], [-0.18, 0.1, 0.24, 0.065], [-0.05, 0.112, 0.25, 0.055], [0.05, 0.095, 0.24, 0.07], [0.09, 0.07, 0.22, 0.09]], { segs: [-0.27, 0.05, 6, 0.07] })}
        color="#efe9dc"
        surface={fur}
        castShadow
        part="wings"
      />
      <Part geometry={GEO.sphere()} color="#f3eee3" surface={fur} position={[0, 0.18, 0.14]} scale={0.1} castShadow part="mouth" />
      <Part geometry={GEO.sphere()} color="#e9e2d2" surface={fur} position={[0, 0.16, 0.24]} scale={[0.06, 0.055, 0.05]} part="mouth" />
      <CompoundEye position={[0.045, 0.17, 0.26]} size={0.022} color="#1a1715" />
      <CompoundEye position={[-0.045, 0.17, 0.26]} size={0.022} color="#1a1715" />
      <Antenna position={[0.03, 0.21, 0.25]} side={1} length={0.2} thick={0.007} kind="bipectinate" color="#5a5146" anim={anim} rotation={[-0.3, 0.4, 0]} part="antenna" />
      <Antenna position={[-0.03, 0.21, 0.25]} side={-1} length={0.2} thick={0.007} kind="bipectinate" color="#5a5146" anim={anim} rotation={[-0.3, 0.4, 0]} part="antenna" />
      <group ref={wings} position={[0, 0.22, 0.06]}>
        {[1, -1].map((s) => (
          <group key={s}>
            <group scale={[s, 1, 1]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh geometry={shapeGeo('kaikoFore', kaikoFore)} material={wingMat} castShadow userData={{ part: 'wings' }} />
              <mesh geometry={shapeGeo('kaikoHind', kaikoHind)} material={hindMat} position={[0, 0, 0.004]} userData={{ part: 'wings' }} />
            </group>
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

/** 前ばねの もよう：黒地に、肩の だいだい黄色の 紋と、後ろの 波うつ 帯 */
function miideraMap() {
  return paint('miidera', 256, (g, s) => {
    g.fillStyle = '#141110';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#e59a17';
    for (const u of [0.27, 0.73]) {
      g.beginPath();
      g.ellipse(u * s, s * 0.2, s * 0.085, s * 0.1, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = 0.1 + (i / 40) * 0.8;
      g.lineTo(u * s, s * (0.6 + 0.035 * Math.sin(u * 50)));
    }
    for (let i = 40; i >= 0; i--) {
      const u = 0.1 + (i / 40) * 0.8;
      g.lineTo(u * s, s * (0.7 + 0.035 * Math.sin(u * 44 + 1)));
    }
    g.fill();
    // ふちの 細い 黄色
    g.fillRect(0, 0, s * 0.025, s);
    g.fillRect(s * 0.975, 0, s * 0.025, s);
  });
}

/**
 * 成虫：だいだい黄色の 頭と 細い 前胸（黒い もよう）、黒い 前ばねに だいだい黄色の 紋と 帯。
 * 前ばねには たての すじ。長い あしで すばやく 歩く。おしりから「プッ」と ふきだす。
 */
export function MiideraAdult({ anim }: ModelProps) {
  const body = useBodyMotion(anim, 0.6);
  const tail = useRef<THREE.Group>(null);
  const elytra = useMemo(() => ({ ...SURF.chitin(0.8), map: miideraMap(), normalMap: striaeNormal(4, 1.6), normalScale: 1 }), []);
  const yellow = useMemo(() => SURF.chitin(0.8), []);
  useFrame(() => {
    const a = anim.current;
    // 噴射のとき おしりを くいっと向ける
    if (tail.current) {
      tail.current.rotation.x = -a.spray * 0.45 - a.startle * 0.15;
      tail.current.rotation.y = Math.sin(a.gait) * 0.05 * a.walk;
    }
  });
  return (
    <group ref={body} scale={1.3}>
      <group ref={tail}>
        {/* 前ばね：細長く、後ろが 切れたように 短い（おしりの 先が 出る）。たての 隆条 */}
        <Part
          geometry={shellGeo('miideraElytra', [[-0.375, 0.07, 0.125], [-0.36, 0.125, 0.16], [-0.25, 0.158, 0.19], [-0.05, 0.15, 0.188], [0.08, 0.125, 0.172], [0.135, 0.085, 0.145]], { base: 0.085, nt: 2.5, suture: 0.004, rim: 0.03 })}
          color="#ffffff"
          surface={elytra}
          castShadow
          part="elytra"
        />
        <M geo={bodyGeo('miideraUnder', [[-0.4, 0, 0.09, 0.09], [-0.37, 0.07, 0.11, 0.055], [-0.25, 0.14, 0.12, 0.035], [0, 0.135, 0.12, 0.03], [0.12, 0.08, 0.11, 0.045], [0.15, 0, 0.08, 0.08]], { nb: 2.8, segs: [-0.39, -0.05, 5, 0.03] })} color="#1c1512" />
        <M color="#c9850f" position={[0, 0.07, -0.38]} scale={[0.05, 0.035, 0.035]} part="tail" />
      </group>
      {/* 細い 前胸（くび）と 頭：だいだい黄色に 黒い もよう */}
      <Part
        geometry={bodyGeo('miideraNeck', [[0.11, 0.035, 0.125, 0.075], [0.14, 0.058, 0.148, 0.06], [0.2, 0.076, 0.155, 0.055], [0.245, 0.064, 0.148, 0.06], [0.268, 0.04, 0.135, 0.072]], { nt: 2.4, nb: 2.4 })}
        color="#e9a21b"
        surface={yellow}
        castShadow
        part="neck"
      />
      <M color="#1a1412" position={[0, 0.152, 0.19]} scale={[0.022, 0.008, 0.045]} part="neck" />
      <Part
        geometry={bodyGeo('miideraHead', [[0.25, 0.03, 0.125, 0.085], [0.28, 0.062, 0.148, 0.065], [0.325, 0.07, 0.15, 0.062], [0.365, 0.05, 0.132, 0.07], [0.39, 0.028, 0.115, 0.08], [0.4, 0, 0.098, 0.098]], { nt: 2.3 })}
        color="#eaa41f"
        surface={yellow}
        part="neck"
      />
      <M color="#1a1412" position={[0, 0.148, 0.31]} scale={[0.028, 0.008, 0.028]} part="neck" />
      <CompoundEye position={[0.064, 0.118, 0.325]} size={[0.018, 0.022, 0.022]} />
      <CompoundEye position={[-0.064, 0.118, 0.325]} size={[0.018, 0.022, 0.022]} />
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
