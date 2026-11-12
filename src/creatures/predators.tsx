import { useFrame } from '@react-three/fiber';
import { useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { GEO, mat, sharedGeo, SURF } from '../three/materials';
import { barkTexture, gomadaraElytra, grainBump, mottledTexture, paint, veinWing, wrinkleBump } from '../three/textures';
import { M, useBodyMotion } from './common';
import { cachedTube, bodyGeo, mergedGeo, shapedTube, shapeGeo, shellGeo, yBody, plateGeo, segmentGeo, spindleY } from './geom';
import { Antenna, CompoundEye, Leg, LiteContext, Part, type LegSpec } from './parts';
import { BeetlePupaBody, longhornPupaAntennae, pupaLimbsGeo, type PupaDims } from './pupa';
import type { ModelProps } from './registry';

/* 出典: docs/species-research-2.md（形態は図鑑の記載と一般的な形態に基づく） */


/* ───────────── オオカマキリ ───────────── */

const MANTIS_LEG: LegSpec = { femur: 0.3, tibia: 0.3, tarsus: 0.14, thick: 0.012, tarsi: 5 };

/* カマ（捕獲脚）の 形。基節は 肩から 下へ、腿節・脛節は +Y へ のびる。とげは たたんだ とき 向かい合う がわ（+Z） */

const raptCoxaGeo = () =>
  sharedGeo('mantisCoxa', () => shapedTube([[0, 0, 0], [0, -0.09, 0.028], [0, -0.18, 0.06]], (t) => [0.011 + 0.003 * Math.sin(Math.PI * t), 0.014 + 0.005 * Math.sin(Math.PI * t)], 10, 8));

const raptFemurGeo = () =>
  mergedGeo('mantisFemur', () => {
    const parts: THREE.BufferGeometry[] = [
      shapedTube([[0, 0, 0], [0, 0.11, -0.004], [0, 0.22, 0]], (t) => [0.009 + 0.006 * Math.sin(Math.PI * t), 0.012 + 0.014 * Math.sin(Math.PI * t ** 0.8)], 14, 10),
    ];
    // 内がわの とげ：大小が 交互に ならぶ 2 列
    for (let i = 0; i < 9; i++) {
      const y = 0.045 + i * 0.019;
      const big = i % 2 === 0;
      for (const x of [-1, 1]) {
        const c = new THREE.ConeGeometry(big ? 0.0042 : 0.003, big ? 0.03 : 0.018, 5);
        c.rotateX(Math.PI / 2 - 0.35);
        c.translate(x * 0.006, y, 0.02 + 0.006 * Math.sin((Math.PI * (y - 0.02)) / 0.2));
        parts.push(c);
      }
    }
    return parts;
  });

const raptTibiaGeo = () =>
  mergedGeo('mantisTibia', () => {
    const parts: THREE.BufferGeometry[] = [
      shapedTube([[0, 0, 0], [0, 0.075, 0.002], [0, 0.15, 0]], (t) => [0.007 - 0.002 * t, 0.011 - 0.004 * t], 10, 8),
      // 先の 大きな かぎづめ
      shapedTube([[0, 0.145, 0.002], [0, 0.18, 0.008], [0, 0.198, 0.03]], (t) => [0.005 * (1 - t * 0.85), 0.006 * (1 - t * 0.85)], 8, 6),
      // ふ節（歩く ときに 地面に つく 細い 先）
      shapedTube([[0, 0.14, -0.006], [0, 0.175, -0.026], [0, 0.22, -0.036]], (t) => [0.0035 - 0.0015 * t, 0.0035 - 0.0015 * t], 6, 5),
    ];
    for (let i = 0; i < 8; i++) {
      const y = 0.025 + i * 0.015;
      for (const x of [-1, 1]) {
        const c = new THREE.ConeGeometry(0.0028, 0.016, 5);
        c.rotateX(Math.PI / 2 - 0.5);
        c.translate(x * 0.004, y, 0.014);
        parts.push(c);
      }
    }
    return parts;
  });

/** カマ（捕獲脚）：長い基節・とげの並んだ 腿節・折りたたむ 脛節 */
function RaptorialLeg({ side, color, anim }: { side: 1 | -1; color: string; anim: ModelProps['anim'] }) {
  const femur = useRef<THREE.Group>(null);
  const tibia = useRef<THREE.Group>(null);
  const surf = useMemo(() => ({ roughness: 0.5, clearcoat: 0.3 }), []);
  useFrame(() => {
    const a = anim.current;
    // ふだんは 胸の前で 折りたたむ。いかく（spray）のときは 大きく ひろげる
    const open = a.spray;
    // 身づくろい：かたほうずつ カマを 口もとへ 上げて なめる。食べる ときは 両方の カマで かかえて 口へ はこぶ
    const lick = a.groom * Math.max(0, Math.sin(a.t * 1.4 + (side > 0 ? 0 : Math.PI)));
    const hold = a.eat * (0.3 + Math.sin(a.t * 5) * 0.06);
    // 腿節は 前上がりに 立て、脛節は 腿節に そって 下へ 折りたたむ（祈るような 姿）
    if (femur.current) femur.current.rotation.x = 0.85 - open * 0.55 - lick * 0.4 - hold + a.startle * 0.15 + Math.sin(a.t * 1.3) * 0.03;
    if (tibia.current) tibia.current.rotation.x = 2.7 - open * 1.5 - lick * 0.5 + hold * 0.3;
  });
  return (
    <group position={[side * 0.05, 0, 0]}>
      {/* 基節（下へ 長く のびる） */}
      <Part geometry={raptCoxaGeo()} color={color} surface={surf} part="raptorial" />
      <group ref={femur} position={[0, -0.18, 0.06]}>
        <Part geometry={raptFemurGeo()} color={color} surface={surf} castShadow part="raptorial" />
        <group ref={tibia} position={[0, 0.22, 0]}>
          <Part geometry={raptTibiaGeo()} color={color} surface={surf} part="raptorial" />
        </group>
      </group>
    </group>
  );
}

/** 前ばねの もよう（u が 外→内、v が 先→つけね）：葉の ような こまかい 脈。前の ふちは 明るい */
function tegmenMap(base: string, edge: string) {
  return paint(`mantisTegmen:${base}`, 128, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    g.fillStyle = edge;
    g.fillRect(0, 0, s * 0.2, s);
    g.strokeStyle = 'rgba(40, 50, 20, 0.35)';
    g.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      g.moveTo(s * 0.22, (i / 26) * s);
      g.lineTo(s, (i / 26) * s + s * 0.1);
      g.stroke();
    }
    g.strokeStyle = 'rgba(40, 50, 20, 0.5)';
    g.lineWidth = 1.5;
    for (const u of [0.2, 0.45, 0.72]) {
      g.beginPath();
      g.moveTo(u * s, 0);
      g.lineTo(u * s, s);
      g.stroke();
    }
  });
}

/** 前ばね 1 枚（右。つけねが 原点、-Z へ のびる）：細長い 葉の 形 */
const mantisTegmenGeo = () =>
  shellGeo('mantisTegmen', [[-0.6, 0.008, -0.004], [-0.56, 0.026, 0.006], [-0.4, 0.046, 0.02], [-0.2, 0.05, 0.026], [-0.04, 0.04, 0.022], [0, 0.018, 0.01]], { base: -0.03, nt: 2.2, half: true, rings: 24, radial: 12 });

/** うしろばね（右。つけねが 原点）：おうぎ形。いかくの ときだけ ひろげる */
const mantisHindWing = (sh: THREE.Shape) => {
  sh.moveTo(0, 0);
  sh.lineTo(0.5, 0.04);
  sh.bezierCurveTo(0.5, -0.2, 0.34, -0.42, 0.1, -0.5);
  sh.lineTo(0, 0);
};

function Mantis({ anim, sex, molts, adult }: ModelProps & { adult: boolean }) {
  const body = useBodyMotion(anim, 0.3);
  const head = useRef<THREE.Group>(null);
  const wings = useRef<THREE.Group>(null);
  const abdomen = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  // 緑色の個体と 褐色の個体がいる（ここでは 個体ごとに分ける）
  const color = sex === 'female' ? '#7ea044' : '#9a8a52';
  const dark = sex === 'female' ? '#5f7f32' : '#7a6a3e';
  // 複眼は 体と 同じ 色あい（昼は うすい 色で、黒い 点＝偽瞳孔が 見える）
  const eyeColor = sex === 'female' ? '#a7c46a' : '#b5a56a';
  const surf = useMemo(() => ({ roughness: 0.55, clearcoat: 0.3, bumpMap: grainBump(111, 64), bumpScale: 0.6 }), []);
  const wingMat = useMemo(
    () => mat('#ffffff', { map: tegmenMap(color, sex === 'female' ? '#93b552' : '#8fa04c'), roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.DoubleSide }),
    [color, sex],
  );
  // うしろばねは むらさきがかった こげ茶で、すじが すける
  const hindMat = useMemo(() => mat('#ffffff', { map: veinWing('#5a3442', '#2a1820', 0.9), roughness: 0.5, side: THREE.DoubleSide, opacity: 0.92 }), []);
  const size = adult ? 1.35 : 0.55 + molts * 0.12;
  useFrame(() => {
    const a = anim.current;
    // カマキリは 首を かしげて こちらを 見る
    if (head.current) {
      head.current.rotation.y = Math.sin(a.t * 0.5) * 0.5 * a.energy + a.look * 0.7;
      head.current.rotation.z = Math.sin(a.t * 0.37) * 0.15;
      head.current.rotation.x = 0.75 + a.eat * (0.25 + Math.sin(a.t * 7) * 0.08);
    }
    if (wings.current) {
      // いかく：カマを ひろげて 体を そらし、はねを 立てて うしろばねを おうぎの ように ひらく
      const open = adult ? a.spray : 0;
      wings.current.children.forEach((c, i) => {
        const s = i === 0 ? 1 : -1;
        c.rotation.y = s * open * 0.75;
        c.rotation.z = s * open * 0.55;
        c.rotation.x = open * 0.35;
        const hind = c.children[1];
        if (hind) {
          hind.visible = open > 0.03;
          hind.scale.set(s * Math.max(0.02, open), 1, 1);
        }
      });
    }
    if (abdomen.current) abdomen.current.rotation.x = adult ? 0.05 + a.spray * 0.12 : -0.45; // 幼虫は おなかを そらす
    if (lean.current) lean.current.rotation.x = -a.spray * 0.25; // いかくで 上体を そらす
  });
  return (
    <group scale={size}>
      <group ref={body}>
        {/* 腹 */}
        <group ref={abdomen} position={[0, 0.17, -0.02]}>
          <Part geometry={yBody('mantisAbdomen', [[-1, 0, 0, 0], [-0.92, 0.2, 0.2, -0.2], [-0.45, 0.5, 0.42, -0.5], [0.2, 0.46, 0.38, -0.46], [0.8, 0.3, 0.3, -0.3], [1, 0.2, 0.2, -0.2]], { segs: [-0.95, 0.9, 7, 0.06], nb: 2.4 })} color={color} surface={surf} position={[0, 0, -0.22]} rotation={[Math.PI / 2, 0, 0]} scale={[0.07, 0.36, 0.055]} castShadow part="body" />
          {/* おしりの 先の 尾毛 */}
          {[1, -1].map((s) => (
            <Part key={s} geometry={cachedTube(`mantisCercus${s}`, [[0, 0, 0], [s * 0.012, 0.004, -0.03], [s * 0.03, 0.006, -0.055]], 0.005, 0.002, 6, 5)} color={dark} position={[s * 0.012, 0.0, -0.39]} />
          ))}
          {adult ? (
            <group ref={wings} position={[0, 0.046, 0.0]}>
              {[1, -1].map((s) => (
                <group key={s}>
                  <mesh geometry={mantisTegmenGeo()} material={wingMat} scale={[s, 1, 1]} castShadow userData={{ part: 'wings' }} />
                  <mesh geometry={shapeGeo('mantisHind', mantisHindWing)} material={hindMat} position={[0, -0.004, -0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[s, 1, 1]} visible={false} userData={{ part: 'wings' }} />
                </group>
              ))}
            </group>
          ) : null}
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
                <CompoundEye position={[0, 0, 0]} size={[0.025, 0.034, 0.027]} color={eyeColor} part="eyes" />
                <M color="#1a1a14" surface={SURF.eye()} position={[0, 0, 0.026]} scale={0.007} part="eyes" />
              </group>
            ))}
            {/* ひたいの 3 つの 単眼と、下向きの 口 */}
            {[-0.012, 0, 0.012].map((x) => (
              <M key={x} color="#c9b060" surface={SURF.eye()} position={[x, 0.034 - Math.abs(x) * 0.6, 0.038]} scale={0.005} />
            ))}
            <M color={dark} surface={surf} position={[0, -0.07, 0.045]} scale={[0.016, 0.02, 0.012]} part="head" />
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
  // 背板は 白地に インスタンスの 色を かける（頭の すぐ 後ろの 1 節だけ、頭と 同じ とび色）
  const tergMat = useMemo(() => mat('#ffffff', { roughness: 0.32, clearcoat: 1, bumpMap: grainBump(131, 64), bumpScale: 0.4 }), []);
  const legMat = useMemo(() => mat(young ? '#d9b46a' : '#e4b13c', { roughness: 0.45, clearcoat: 0.4 }), [young]);
  // あし：つけねから 外へ のび、ひざで 下へ まがって、とがった つめで 地面に つく
  const legGeo = useMemo(
    () =>
      mergedGeo('centLeg', () => [
        shapedTube([[0, 0, 0], [0.045, 0.014, 0], [0.09, 0.004, 0], [0.118, -0.03, 0]], (t) => [0.0095 - 0.005 * t, 0.0085 - 0.0045 * t], 12, 6, [0, 0, 1]),
        shapedTube([[0.116, -0.027, 0], [0.126, -0.043, 0], [0.128, -0.058, 0]], (t) => [0.004 * (1 - t * 0.8), 0.004 * (1 - t * 0.8)], 5, 5, [0, 0, 1]),
      ]),
    [],
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);
  useLayoutEffect(() => {
    if (legs.current) legs.current.count = lite ? 0 : SEGMENTS * 2;
    const T = tergites.current;
    if (!T) return;
    const c = new THREE.Color();
    for (let i = 0; i < SEGMENTS; i++) T.setColorAt(i, c.set(i === 0 ? (young ? '#c7754a' : '#c2401f') : young ? '#4a4a3a' : i % 2 ? '#1e2a26' : '#222e2a'));
    if (T.instanceColor) T.instanceColor.needsUpdate = true;
  }, [lite, young]);
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
      // 見回す ときは 前の 数節を 持ち上げて 左右に ふる
      const front = Math.max(0, 1 - i / 6);
      const lookX = a.look * 0.09 * front * front;
      const rise = (a.rear * 0.07 + Math.abs(a.look) * 0.03) * front * front;
      tmp.p.set(x + lookX, 0.05 + rise, z);
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
        tmp.p.set(x + lookX + side * w * 0.9, 0.045 + rise, z);
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
    if (head.current) {
      head.current.rotation.x = -a.spray * 0.5 - a.rear * 0.3 + Math.sin(a.t * 2) * 0.03;
      head.current.rotation.y = a.look * 0.5 + Math.cos(a.gait * 0.8 + 0.45) * 0.2 * a.walk;
      // 胴の 先頭の 節に ついて 動く（歩く ときの くねり・見回す ときの 持ち上げ）
      head.current.position.set(
        Math.sin(a.gait * 0.8 + 0.45) * 0.035 * a.walk + a.look * 0.11,
        0.05 + a.rear * 0.085 + Math.abs(a.look) * 0.035,
        0.47,
      );
    }
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

/** 頭胸部の 背板：前が せまい 台形。まん中の こぶに 1 対の 目 */
const carapaceGeo = () =>
  bodyGeo(
    'scorpCarapace',
    [[-0.072, 0.064, 0.026, -0.02], [-0.04, 0.067, 0.034, -0.026], [0.02, 0.054, 0.032, -0.024], [0.06, 0.038, 0.022, -0.02], [0.074, 0.02, 0.006, -0.012]],
    {
      nt: 2.8,
      nb: 3.2,
      extra: (p) => {
        // 目の のる こぶと、その 後ろの たての みぞ
        if (p.y > 0) p.y += 0.006 * Math.exp(-((p.x / 0.014) ** 2) - ((p.z - 0.02) / 0.02) ** 2) - 0.003 * Math.exp(-((p.x / 0.006) ** 2)) * (p.z < 0 ? 1 : 0);
      },
    },
  );

/** ハサミの 手（掌節）と 動かない 指。つけねが 原点で +Z へ のびる。マダラサソリの ハサミは 細長い */
const chelaGeo = () =>
  mergedGeo('scorpChela', () => [
    shapedTube([[0, 0, -0.006], [0, 0, 0.035], [0.002, 0, 0.074]], (t) => [0.0095 + 0.0065 * Math.sin(Math.PI * t ** 0.9), 0.008 + 0.005 * Math.sin(Math.PI * t ** 0.9)], 12, 10, [1, 0, 0]),
    shapedTube([[0.007, 0, 0.066], [0.011, 0, 0.11], [0.004, 0, 0.152]], (t) => [0.0058 * (1 - t * 0.75), 0.005 * (1 - t * 0.75)], 10, 7, [1, 0, 0]),
  ]);

/** 動く 指（つけねが 原点） */
const fingerGeo = () =>
  sharedGeo('scorpFinger', () => shapedTube([[0, 0, 0], [-0.007, 0, 0.045], [0.001, 0, 0.088]], (t) => [0.0052 * (1 - t * 0.75), 0.0046 * (1 - t * 0.75)], 10, 7, [1, 0, 0]));

/** 尾の 節（長さ 1・-Z へ のびる）：角ばった つつで、先が 少し 太い。背中に 浅い みぞ */
const tailSegGeo = () =>
  bodyGeo('scorpTailSeg', [[-1, 0.3, 0.3, -0.3], [-0.9, 0.5, 0.46, -0.44], [-0.5, 0.48, 0.44, -0.42], [-0.12, 0.42, 0.4, -0.38], [0, 0.26, 0.26, -0.26]], {
    nt: 3,
    nb: 3,
    rings: 14,
    radial: 14,
    extra: (p) => {
      if (p.y > 0) p.y -= 0.09 * Math.exp(-((p.x / 0.14) ** 2));
    },
  });

/** 毒の ふくろ（ふくらんだ 節）と、まがった 毒針。針の 下に 小さな とげが 1 つ（マダラサソリの とくちょう） */
const telsonGeo = () =>
  mergedGeo('scorpTelson', () => {
    const tooth = new THREE.ConeGeometry(0.0035, 0.012, 5);
    tooth.rotateX(0.5);
    tooth.translate(0, 0.02, -0.055);
    return [
      shapedTube([[0, 0, 0.004], [0, 0.003, -0.028], [0, 0.008, -0.056]], (t) => [0.006 + 0.012 * Math.sin(Math.PI * t ** 0.8), 0.006 + 0.011 * Math.sin(Math.PI * t ** 0.8)], 12, 10, [1, 0, 0]),
      shapedTube([[0, 0.008, -0.054], [0, 0.018, -0.078], [0, 0.04, -0.088], [0, 0.056, -0.078]], (t) => [0.0048 * (1 - t * 0.88), 0.0048 * (1 - t * 0.88)], 12, 6, [1, 0, 0]),
      tooth,
    ];
  });

/** マダラサソリ：まだら模様の 体、細長い ハサミ（触肢）、5 節の 尾と 毒針 */
function Scorpion({ anim, molts, young }: ModelProps & { young: boolean }) {
  const body = useBodyMotion(anim, 0.3);
  const tail = useRef<Array<THREE.Group | null>>([]);
  const claws = useRef<THREE.Group>(null);
  const fingers = useRef<Array<THREE.Mesh | null>>([]);
  const size = young ? 0.55 + molts * 0.12 : 1.4;
  const shell = useMemo(
    () => (young ? { roughness: 0.4, clearcoat: 0.6, translucent: true } : { map: mottledTexture(), roughness: 0.4, clearcoat: 0.7, bumpMap: grainBump(141, 64), bumpScale: 0.5 }),
    [young],
  );
  const color = young ? '#e8dcc0' : '#ffffff';
  const tip = young ? '#b89a6a' : '#3a2a1a';
  useFrame(() => {
    const a = anim.current;
    // 尾は 背中の上へ そりかえる。いかくの ときは さらに 高く。歩く ときは 少し のばし、ねむる ときは 横に ねかせる
    const curl = 0.55 + a.spray * 0.35 - a.walk * 0.1 + a.rear * 0.12 + Math.sin(a.t * 0.8) * 0.03;
    tail.current.forEach((g, i) => {
      if (!g) return;
      // 後ろへ 伸びる 節を 上へ 起こす（+ で 上向き）
      g.rotation.x = (i === 0 ? 0.45 + a.spray * 0.3 : curl) * (1 - a.sleep * 0.5);
      // 見回す ときや 歩く ときは 尾の 先も ゆれる
      g.rotation.y = (a.look * 0.25 + Math.sin(a.gait * 0.5) * 0.04 * a.walk) * (i === 0 ? 1 : 0.5) + (i === 0 ? a.sleep * 0.9 : a.sleep * 0.15);
    });
    if (claws.current) claws.current.rotation.x = -a.spray * 0.5 - a.rear * 0.25;
    // ハサミの 指：ふだんは 少し ひらき、ときどき とじる。いかく・食べる ときは 大きく うごく
    const snip = 0.22 + Math.sin(a.t * 1.1) * 0.08 + a.spray * 0.45 + a.eat * (0.2 + Math.sin(a.t * 6) * 0.25) - a.startle * 0.2;
    fingers.current.forEach((m) => {
      if (m) m.rotation.y = -snip;
    });
  });
  const widths = [0.066, 0.071, 0.075, 0.077, 0.075, 0.069, 0.058];
  return (
    <group scale={size}>
      <group ref={body}>
        {/* 頭胸部と 腹（前腹部 7 節。まん中が いちばん 広い） */}
        <Part geometry={carapaceGeo()} color={color} surface={shell} position={[0, 0.058, 0.12]} castShadow part="body" />
        {widths.map((w, i) => (
          <Part key={i} geometry={plateGeo()} color={color} surface={shell} position={[0, 0.058, 0.03 - i * 0.034]} scale={[w, 0.027 - (i === 6 ? 0.004 : 0), 0.0215]} castShadow={i % 2 === 0} part="body" />
        ))}
        {/* まん中の 目（1 対）と、前の かどの 小さな 目 */}
        <CompoundEye position={[0.01, 0.098, 0.14]} size={0.008} />
        <CompoundEye position={[-0.01, 0.098, 0.14]} size={0.008} />
        {[1, -1].map((s) =>
          [0, 1, 2].map((k) => <M key={`${s}${k}`} color="#1a1410" surface={SURF.eye()} position={[s * (0.03 + k * 0.004), 0.076, 0.178 - k * 0.008]} scale={0.0022} />),
        )}
        {/* 口の 前の 小さな はさみ（鋏角） */}
        {[1, -1].map((s) => (
          <M key={s} color={young ? '#d8c8a0' : '#b08a52'} surface={SURF.chitin(0.5)} position={[s * 0.011, 0.05, 0.196]} scale={[0.008, 0.006, 0.014]} />
        ))}
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
          {[1, -1].map((s, k) => (
            <group key={s} position={[s * 0.04, 0, 0]} rotation={[0, s * 0.5, 0]}>
              <Part geometry={spindleY()} color={color} surface={shell} position={[s * 0.04, 0, 0.03]} rotation={[Math.PI / 2, 0, s * 0.8]} scale={[0.014, 0.1, 0.014]} part="pedipalps" />
              <group position={[s * 0.09, 0, 0.09]} rotation={[0, -s * 1.1, 0]}>
                <Part geometry={spindleY()} color={color} surface={shell} position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={[0.016, 0.1, 0.016]} part="pedipalps" />
                {/* ハサミ：ふくらんだ 手と 2 本の 指（内がわの 指が 動く） */}
                <group position={[0, 0, 0.1]} scale={[s, 1, 1]}>
                  <Part geometry={chelaGeo()} color={color} surface={shell} castShadow part="pedipalps" />
                  <Part
                    meshRef={(m) => {
                      fingers.current[k] = m;
                    }}
                    geometry={fingerGeo()}
                    color={tip}
                    surface={SURF.chitin(0.6)}
                    position={[-0.007, 0, 0.066]}
                    part="pedipalps"
                  />
                </group>
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
        <group position={[0, 0, -0.004]}>
          <Part geometry={telsonGeo()} color={color === '#ffffff' ? '#c98a4a' : color} surface={SURF.chitin(0.8)} part="stinger" />
        </group>
      );
    }
    return (
      <group
        ref={(g) => {
          refs.current[i] = g;
        }}
      >
        <Part geometry={tailSegGeo()} color={color} surface={surface} scale={[0.04 - i * 0.002, 0.04 - i * 0.002, L * (i === 4 ? 1.1 : 1)]} castShadow={i === 2} part="stinger" />
        <group position={[0, 0, -L * (i === 4 ? 1.1 : 1)]}>{build(i + 1)}</group>
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
      // 木の 中を かじり すすむ ときは、前の 節を 左右に ふる
      const bite = Math.sin(a.t * 5) * 0.012 * (a.walk + a.eat) * Math.max(0, 1 - i / 4);
      m.position.set(bite, 0.13, 0.5 - i * 0.085);
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
  const limbs = pupaLimbsGeo('gomadara', LONGHORN_PUPA, (parts) => parts.push(...longhornPupaAntennae(LONGHORN_PUPA)));
  return (
    // 木の 中の 部屋で よこに なっている（おなかを 上に して 見せる）
    <group position={[0, 0.16, 0]} rotation={[-Math.PI / 2 + 0.35, 0, 0]}>
      <group ref={ref} position={[0, -0.02, 0]}>
        <BeetlePupaBody dims={LONGHORN_PUPA} color="#f1e6cf" light="#f5ecd8" surface={surf} limbs={limbs} headWide={0.62} bodyPart="pupa" eye="#8a6a44" />
      </group>
    </group>
  );
}

/** 細長い 体 */
const LONGHORN_PUPA: PupaDims = { w: 0.15, h: 0.42, d: 0.12, cy: 0 };

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
    if (head.current) {
      head.current.rotation.x = Math.sin(a.t * 30) * 0.08 * a.spray + -a.eat * 0.25 - a.rear * 0.2;
      // 見回す ときは 頭ごと 触角を 大きく ふる。木を かじる ときは 小きざみに うなずく
      head.current.rotation.y = a.look * 0.45;
      head.current.rotation.z = Math.sin(a.t * 14) * 0.03 * a.eat;
    }
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
