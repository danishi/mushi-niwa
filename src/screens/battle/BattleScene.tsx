import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { newAnim, type CreatureAnim } from '../../creatures/anim';
import { LiteContext } from '../../creatures/parts';
import { modelFor } from '../../creatures/registry';
import { VISITOR_MODELS } from '../../creatures/visitors';
import { BATTLE } from '../../data/battle';
import { SPECIES } from '../../data/species';
import { VISITORS, type VisitorId } from '../../data/visitors';
import { INTRO_SECONDS, type BattleEvent } from '../../sim/battle';
import type { SpeciesId } from '../../sim/types';
import { battleFx, useBattle } from '../../state/battle';
import { fitFactor, type CameraShot } from '../../three/CameraRig';
import { Meadow } from '../../three/Diorama';
import { emitParticles } from '../../three/Particles';
import { useTier } from '../../three/QualityManager';
import { QUALITY } from '../../three/quality';
import { GEO, mat } from '../../three/materials';
import { barkNormal, barkTexture, grainBump, paint } from '../../three/textures';

/**
 * むしずもう：切り株の 土俵で 押しあい。
 * 演出（ユーザー要望）: 入場 → にらみあいの アップ →「はっけよい、のこった」で ぶつかる。押すたびに ぶつかって 土けむり、
 * 技は 寄って ゆっくり、勝ったら 勝ち名乗りと 紙ふぶき。まわりで おきゃくさんの 虫が 応援する。
 * カメラは この画面が 自分で うごかす（`Director`。CameraRig の あとに 毎フレーム 上書き）。
 */
export const battleShot = (): CameraShot => ({ position: [0, 2.4, 5.0], target: [0, 0.75, 0], fov: 38 });

const STUMP_TOP = 0.6;
const RING_R = 1.32;
const SPREAD = 0.95;
/** 入場の はじめの 位置（土俵の はし） */
const ENTRY_X = 1.25;

/** 演出の 共有値（毎フレーム 変わるので React state に 入れない） */
const stage = {
  /** 力士の 位置（Director が 見る） */
  pos: { 1: new THREE.Vector3(-0.5, STUMP_TOP, 0), [-1]: new THREE.Vector3(0.5, STUMP_TOP, 0) } as Record<1 | -1, THREE.Vector3>,
  /** ぶつかりの いきおい（1 → 0） */
  lunge: { 1: 0, [-1]: 0 } as Record<1 | -1, number>,
  shake: 0,
  /** 技を 出した 側と、その 演出の 残り秒数 */
  focus: { side: 1 as 1 | -1, left: 0 },
  /** 応援の とびはね（1 → 0） */
  cheer: 0,
  /** 衝撃の 輪（1 → 0） */
  wave: 0,
  waveX: 0,
  /** 結果が 出てからの 秒数 */
  since: 0,
};

const sideOf = (who: 'player' | 'cpu'): 1 | -1 => (who === 'player' ? 1 : -1);

/* ───────────── 力士（育てた 虫） ───────────── */

function Fighter({ species, side }: { species: SpeciesId; side: 1 | -1 }) {
  const ref = useRef<THREE.Group>(null);
  const anim = useRef<CreatureAnim>(newAnim());
  const tier = useTier();
  const st = SPECIES[species].stages[SPECIES[species].stages.length - 1]!;
  const entry = modelFor(st.model);
  const roll = useRef(0);
  const cpuBeat = useRef(0);
  const scale = 0.9 / Math.max(0.6, entry.length) + 0.25;
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useBattle.getState().state;
    const a = anim.current;
    const g = ref.current;
    if (!s || !g) return;
    a.t += dt;
    a.energy = 1;
    const mine = side === 1;
    const guard = mine ? s.playerGuard : s.cpuGuard;
    const stun = mine ? s.playerStun : s.cpuStun;
    const sp = BATTLE[species].special;
    const live = s.intro <= 0 && !s.result;
    // 相手は 押しつづけて いるので、ときどき ぐっと 体を 入れる
    if (!mine && live && stun <= 0) {
      cpuBeat.current += dt;
      if (cpuBeat.current > 0.55) {
        cpuBeat.current = 0;
        stage.lunge[-1] = Math.max(stage.lunge[-1], 0.6);
      }
    }
    stage.lunge[side] = Math.max(0, stage.lunge[side] - dt * 5);
    const lunge = Math.sin(Math.min(1, stage.lunge[side]) * Math.PI) * 0.12;
    // 押し合いの位置：meter が +1 なら 右（CPU）が台から押し出される。入場中は 土俵の はしから 歩いて くる
    const center = s.meter * SPREAD;
    let x = center - side * (0.42 * scale - lunge);
    if (s.intro > 0) {
      const walk = THREE.MathUtils.clamp((INTRO_SECONDS - s.intro) / 1.1, 0, 1);
      x = THREE.MathUtils.lerp(-side * ENTRY_X, -side * (0.42 * scale + 0.18), 1 - (1 - walk) ** 2);
    }
    g.position.x = THREE.MathUtils.damp(g.position.x, x, s.intro > 0 ? 10 : 12, dt);
    const walking = s.intro > 0 ? INTRO_SECONDS - s.intro < 1.1 : live && stun <= 0;
    a.walk = THREE.MathUtils.damp(a.walk, walking ? 1 : 0, 6, dt);
    a.gait += dt * (s.intro > 0 ? 7 : 6 + lunge * 40) * a.walk;
    // にらみあい：身を ひくくして ためる
    a.startle = s.intro > 0 && s.intro < 2.3 ? 0.8 : Math.max(0, a.startle - dt * 2);
    a.bounce = THREE.MathUtils.damp(a.bounce, 0, 6, dt);
    a.sing = THREE.MathUtils.damp(a.sing, guard > 0 || stun > 0 ? 0 : species === 'suzumushi' && (mine ? s.cpuStun : s.playerStun) > 0 ? 1 : 0, 8, dt);
    a.spray = (species === 'miidera' && (mine ? s.cpuStun : s.playerStun) > 1.5) || (species === 'marukubi' && guard > 0) ? 1 : a.spray * 0.95;
    a.shiver = stun > 0 || (!mine && s.cpuTell > 0) ? 0.6 : 0;
    // 飛ぶ・死んだふり
    const flying = guard > 0 && sp.label.includes('とぶ');
    const deadPose = guard > 0 && sp.label.includes('しんだふり');
    a.flap = THREE.MathUtils.damp(a.flap, flying || entry.locomotion === 'flutter' ? 1 : 0, 6, dt);
    // 勝った 子は ぴょんぴょん はねて よろこぶ
    const won = (s.result === 'win' && mine) || (s.result === 'lose' && !mine);
    const hop = won ? Math.abs(Math.sin(stage.since * 5)) * 0.18 : 0;
    a.rear = THREE.MathUtils.damp(a.rear, won ? 1 : 0, 4, dt);
    const y = STUMP_TOP + (flying ? 0.8 : entry.locomotion === 'flutter' ? 0.35 : 0) + hop;
    g.position.y = THREE.MathUtils.damp(g.position.y, y, won ? 20 : 5, dt);
    // 負けたほうは ころん（ケガはしない）。しばらく したら 起きあがって「がんばった」
    const lost = (s.result === 'win' && !mine) || (s.result === 'lose' && mine);
    const down = (lost && stage.since < 2.2) || deadPose;
    roll.current = THREE.MathUtils.damp(roll.current, down ? Math.PI : 0, 5, dt);
    g.rotation.set(0, side === 1 ? Math.PI / 2 : -Math.PI / 2, roll.current);
    a.sleep = deadPose ? 1 : 0;
    stage.pos[side].copy(g.position);
  });
  const Model = entry.C;
  return (
    <group ref={ref} position={[-side * ENTRY_X, STUMP_TOP, 0]} scale={scale}>
      <Model anim={anim} sex="male" molts={0} outlines={QUALITY[tier].outlines} />
    </group>
  );
}

/* ───────────── 土俵（切り株） ───────────── */

/** 切り株の 上の 面：年輪と、土俵の 土 */
function ringTexture() {
  return paint('dohyoTop', 512, (g, s) => {
    const c = s / 2;
    g.fillStyle = '#d9b582';
    g.fillRect(0, 0, s, s);
    // 年輪
    for (let r = c; r > 4; r -= 7 + ((r * 13) % 5)) {
      g.strokeStyle = `rgba(120, 78, 40, ${0.18 + ((r * 7) % 3) * 0.06})`;
      g.lineWidth = 1.5 + ((r * 3) % 2);
      g.beginPath();
      g.ellipse(c + Math.sin(r) * 2, c + Math.cos(r * 0.7) * 2, r, r * 0.98, 0, 0, Math.PI * 2);
      g.stroke();
    }
    // まん中の 土俵（すこし 赤みの ある 土）
    const grd = g.createRadialGradient(c, c, s * 0.05, c, c, s * 0.42);
    grd.addColorStop(0, 'rgba(206, 160, 104, 0.85)');
    grd.addColorStop(1, 'rgba(206, 160, 104, 0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(c, c, s * 0.42, 0, Math.PI * 2);
    g.fill();
    // ひびわれ
    g.strokeStyle = 'rgba(90, 55, 25, 0.35)';
    g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * s * 0.3, c + Math.sin(a) * s * 0.3);
      g.lineTo(c + Math.cos(a + 0.05) * s * 0.49, c + Math.sin(a + 0.05) * s * 0.49);
      g.stroke();
    }
  });
}

/** のぼり旗の 布（ふちどりと 丸い もよう） */
function flagTexture(color: string, key: string) {
  return paint(`nobori-${key}`, 128, (g, s) => {
    g.fillStyle = color;
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#fffaf0';
    g.fillRect(0, 0, s, s * 0.08);
    g.fillRect(0, s * 0.92, s, s * 0.08);
    g.beginPath();
    g.arc(s * 0.5, s * 0.35, s * 0.18, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.arc(s * 0.5, s * 0.35, s * 0.1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255, 250, 240, 0.7)';
    for (let i = 0; i < 3; i++) g.fillRect(s * 0.42, s * (0.58 + i * 0.1), s * 0.16, s * 0.05);
  });
}

function Flag({ position, color, k }: { position: [number, number, number]; color: string; k: string }) {
  const cloth = useRef<THREE.Mesh>(null);
  const pole = useMemo(() => mat('#6b4a2a', { roughness: 0.6 }), []);
  const fabric = useMemo(() => mat('#ffffff', { map: flagTexture(color, k), roughness: 0.8, side: THREE.DoubleSide }), [color, k]);
  useFrame(({ clock }) => {
    if (cloth.current) cloth.current.rotation.y = Math.sin(clock.elapsedTime * 1.6 + position[0]) * 0.18;
  });
  return (
    <group position={position}>
      <mesh geometry={GEO.cylinder()} material={pole} position={[0, 1.1, 0]} scale={[0.03, 2.2, 0.03]} castShadow />
      <mesh geometry={GEO.box()} material={pole} position={[0.2, 2.15, 0]} scale={[0.44, 0.03, 0.03]} />
      <mesh ref={cloth} geometry={GEO.box()} material={fabric} position={[0.21, 1.45, 0]} scale={[0.4, 1.35, 0.01]} castShadow />
    </group>
  );
}

function DohyoImpl() {
  const bark = useMemo(() => mat('#ffffff', { map: barkTexture(), normalMap: barkNormal(), normalScale: 1.2, roughness: 0.95 }), []);
  const top = useMemo(() => mat('#ffffff', { map: ringTexture(), roughness: 0.9, bumpMap: grainBump(31, 64), bumpScale: 0.6 }), []);
  const straw = useMemo(() => mat('#d8c27c', { roughness: 0.85, bumpMap: grainBump(77, 48), bumpScale: 1.5 }), []);
  const rope = useMemo(() => mat('#b89a52', { roughness: 0.8 }), []);
  const line = useMemo(() => mat('#fffaf0', { roughness: 0.7 }), []);
  const root = useMemo(() => mat('#7a5a3a', { roughness: 0.9, map: barkTexture() }), []);
  const bales = 22;
  const baleRef = useRef<THREE.InstancedMesh>(null);
  const ropeRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    for (let i = 0; i < bales; i++) {
      const a = (i / bales) * Math.PI * 2;
      // 輪に そって よこたえる（たばの 軸は 円の 接線）
      const center = new THREE.Vector3(Math.cos(a) * RING_R, STUMP_TOP + 0.05, Math.sin(a) * RING_R);
      e.set(Math.PI / 2, -a, 0, 'YXZ');
      q.setFromEuler(e);
      baleRef.current?.setMatrixAt(i, m.compose(center, q, sc.set(0.15, 0.36, 0.15)));
      // たばを しばる なわ（2 本）
      const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      for (const [k, off] of [0.09, -0.09].entries()) {
        v.copy(center).addScaledVector(tangent, -off);
        ropeRef.current?.setMatrixAt(i * 2 + k, m.compose(v, q, sc.set(0.079, 0.018, 0.079)));
      }
    }
    if (baleRef.current) baleRef.current.instanceMatrix.needsUpdate = true;
    if (ropeRef.current) ropeRef.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      {/* 切り株（木の かわ） */}
      <mesh geometry={GEO.cylinder()} material={bark} position={[0, STUMP_TOP / 2, 0]} scale={[1.62, STUMP_TOP, 1.62]} castShadow receiveShadow />
      <mesh geometry={GEO.cylinder()} material={top} position={[0, STUMP_TOP + 0.004, 0]} scale={[1.56, 0.01, 1.56]} receiveShadow />
      {/* 根っこ */}
      {[0.4, 1.5, 2.6, 3.7, 4.9, 5.8].map((a) => (
        <mesh key={a} geometry={GEO.capsule()} material={root} position={[Math.cos(a) * 1.55, 0.1, Math.sin(a) * 1.55]} rotation={[0, -a, Math.PI / 2 - 0.35]} scale={[0.16, 0.5, 0.16]} castShadow />
      ))}
      {/* 俵（わらの たば）を ぐるりと ならべた 土俵の 輪（同じ 形が 多いので InstancedMesh） */}
      <instancedMesh ref={baleRef} args={[GEO.capsule(), straw, bales]} castShadow receiveShadow />
      <instancedMesh ref={ropeRef} args={[GEO.cylinder(), rope, bales * 2]} />
      {/* 仕切り線 */}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} geometry={GEO.box()} material={line} position={[x, STUMP_TOP + 0.014, 0]} scale={[0.035, 0.008, 0.36]} />
      ))}
      {/* のぼり旗 */}
      <Flag position={[-2.3, 0, -1.7]} color="#c8322a" k="red" />
      <Flag position={[2.1, 0, -1.9]} color="#2a6fb0" k="blue" />
      <Flag position={[-0.4, 0, -2.6]} color="#3a8a3a" k="green" />
    </group>
  );
}
const Dohyo = memo(DohyoImpl);

/* ───────────── 応援する おきゃくさん ───────────── */

/** 土俵の 後ろの 丸太の ベンチ（さじき）。前から 見て 土俵の 向こうに おきゃくさんが ならぶ */
const BENCH = { z: -2.35, y: 0.42, r: 0.42 };
const FANS: Array<{ id: VisitorId; at: [number, number]; s: number }> = [
  { id: 'kurooari', at: [-1.7, BENCH.z], s: 0.8 },
  { id: 'tonosama', at: [-0.85, BENCH.z], s: 0.85 },
  { id: 'enmakorogi', at: [0.05, BENCH.z], s: 0.85 },
  { id: 'kanabun', at: [0.9, BENCH.z], s: 0.9 },
  { id: 'dangomushi', at: [1.75, BENCH.z], s: 0.8 },
];

function Fan({ id, at, s, i }: { id: VisitorId; at: [number, number]; s: number; i: number }) {
  const ref = useRef<THREE.Group>(null);
  const anim = useRef<CreatureAnim>(newAnim());
  const Model = VISITOR_MODELS[id];
  const jump = useRef(0);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const a = anim.current;
    a.t += dt;
    // 応援：みんなで ぴょんと はねる（すこし ずつ ずれて）
    if (stage.cheer > 0.95 - i * 0.04 && jump.current <= 0) jump.current = 1;
    jump.current = Math.max(0, jump.current - dt * 2.4);
    const g = ref.current;
    if (g) g.position.y = BENCH.y + BENCH.r * 0.85 + Math.sin(jump.current * Math.PI) * 0.22;
    a.walk = jump.current > 0 ? 0.6 : 0;
    a.gait += dt * 10 * a.walk;
    a.look = Math.sin(a.t * 0.7 + i) * 0.4;
  });
  // 土俵の ほうを 向く
  const face = Math.atan2(-at[0] * 0.5, -at[1]);
  return (
    <group position={[at[0], 0, at[1]]} rotation={[0, face, 0]}>
      <group ref={ref} scale={VISITORS[id].scale * s}>
        <Model anim={anim} />
      </group>
    </group>
  );
}

function FansImpl() {
  const bark = useMemo(() => mat('#ffffff', { map: barkTexture(), normalMap: barkNormal(), normalScale: 1, roughness: 0.95 }), []);
  return (
    // 遠くの おきゃくさんは あしの 先を 省く（軽く）
    <LiteContext.Provider value={true}>
      <mesh geometry={GEO.bark()} material={bark} position={[0, BENCH.y, BENCH.z]} rotation={[0, 0, Math.PI / 2]} scale={[BENCH.r, 4.6, BENCH.r]} castShadow receiveShadow />
      {FANS.map((f, i) => (
        <Fan key={f.id} {...f} i={i} />
      ))}
    </LiteContext.Provider>
  );
}
const Fans = memo(FansImpl);

/* ───────────── しかけ：技の 合図の 光・衝撃の 輪 ───────────── */

// 画面に 来る たびに 作りなおさない（GPU の 資源を ふやさない）
const haloMat = new THREE.MeshBasicMaterial({ color: '#ff5a3c', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
const waveMat = new THREE.MeshBasicMaterial({ color: '#fff3c0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
const discGeo = new THREE.CircleGeometry(1, 40);
const ringGeo = new THREE.RingGeometry(0.8, 1, 48);

/**
 * 見えない 間も visible の まま 不透明度 0 に する（SceneWarmup の 用意は 見えて いる ものだけ。
 * visible=false だと 最初に 光った 瞬間に シェーダを 作って 止まる）
 */
function Effects() {
  const halo = useRef<THREE.Mesh>(null);
  const wave = useRef<THREE.Mesh>(null);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useBattle.getState().state;
    // 相手が 技を ためて いる 間は 足もとが 赤く 光る
    if (halo.current) {
      const tell = s ? s.cpuTell : 0;
      const p = stage.pos[-1];
      halo.current.position.set(p.x, STUMP_TOP + 0.02, p.z);
      haloMat.opacity = tell > 0 ? 0.35 + Math.sin(performance.now() / 70) * 0.25 : THREE.MathUtils.damp(haloMat.opacity, 0, 8, dt);
    }
    stage.wave = Math.max(0, stage.wave - dt * 1.8);
    if (wave.current) {
      const k = 1 - stage.wave;
      wave.current.position.set(stage.waveX, STUMP_TOP + 0.03, 0);
      wave.current.scale.setScalar(0.2 + k * 1.6);
      waveMat.opacity = stage.wave * 0.9;
    }
  });
  return (
    <>
      <mesh ref={halo} geometry={discGeo} material={haloMat} rotation={[-Math.PI / 2, 0, 0]} scale={0.55} />
      <mesh ref={wave} geometry={ringGeo} material={waveMat} rotation={[-Math.PI / 2, 0, 0]} />
    </>
  );
}

/* ───────────── カメラ（演出の 監督） ───────────── */

function Director() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const pos = useRef(new THREE.Vector3(0, 3.2, 7));
  const tgt = useRef(new THREE.Vector3(0, 0.8, 0));
  const goalP = useMemo(() => new THREE.Vector3(), []);
  const goalT = useMemo(() => new THREE.Vector3(), []);
  const first = useRef(true);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useBattle.getState().state;
    const fit = fitFactor(size.width / Math.max(1, size.height));
    const mid = (stage.pos[1].x + stage.pos[-1].x) / 2;
    // 寄る ショット：被写体を ななめ 前から
    const close = (side: 1 | -1, dist: number, height = 0.35) => {
      const p = stage.pos[side];
      goalT.set(p.x, STUMP_TOP + 0.2, p.z);
      goalP.set(p.x - side * 0.9 * dist, STUMP_TOP + height + 0.4 * dist, 2.0 * dist * fit);
    };
    let speed = 3;
    if (!s) {
      goalT.set(0, 0.75, 0);
      goalP.set(0, 2.6, 5.4 * fit);
    } else if (s.intro > 0) {
      // 入場（ひいて 回りこむ）→ 自分の 虫 → 相手の 虫 → 土俵ぜんたい
      const t = INTRO_SECONDS - s.intro;
      if (t < 1.1) {
        const a = -0.6 + t * 0.4;
        goalT.set(0, 0.7, 0);
        goalP.set(Math.sin(a) * 5 * fit, 2.2, Math.cos(a) * 5 * fit);
        speed = 2;
      } else if (t < 1.9) close(1, 0.75);
      else if (t < 2.7) close(-1, 0.75);
      else {
        goalT.set(mid, 0.75, 0);
        goalP.set(mid * 0.5, 1.6, 3.6 * fit);
        speed = 5;
      }
    } else if (s.result) {
      stage.since += dt;
      // 勝ち名乗り：勝った 虫へ 寄って ゆっくり 回る（ひきわけは まん中）
      const side: 1 | -1 | 0 = s.result === 'win' ? 1 : s.result === 'lose' ? -1 : 0;
      if (side === 0) {
        goalT.set(mid, STUMP_TOP - 0.2, 0);
        goalP.set(mid + Math.sin(stage.since * 0.3) * 1.2, 1.9, 4.2 * fit);
      } else {
        // 下に 結果の 札が 出るので、虫が 画面の 上の ほうに 来るよう すこし 下を 見る
        const p = stage.pos[side];
        const a = stage.since * 0.35 - side * 0.5;
        goalT.set(p.x, STUMP_TOP - 0.2, p.z);
        goalP.set(p.x + Math.sin(a) * 3.0 * fit, STUMP_TOP + 1.1, Math.cos(a) * 3.0 * fit);
      }
      speed = 2;
    } else if (stage.focus.left > 0) {
      // 技：出した 虫へ ぐっと 寄る
      stage.focus.left -= dt;
      close(stage.focus.side, 1.0, 0.75);
      speed = 6;
    } else {
      // 取組：ぶつかって いる ところを 追う。端に 寄るほど すこし 寄る（もうすこしで 勝負！）
      const edge = Math.abs(s.meter);
      const tell = s.cpuTell > 0 ? 0.15 : 0;
      goalT.set(mid * 0.8, 0.8, 0);
      goalP.set(mid * 0.6, 2.0 - edge * 0.3 - tell, (4.6 - edge * 0.9 - tell * 4) * fit);
    }
    if (first.current) {
      pos.current.copy(camera.position);
      first.current = false;
    }
    pos.current.x = THREE.MathUtils.damp(pos.current.x, goalP.x, speed, dt);
    pos.current.y = THREE.MathUtils.damp(pos.current.y, goalP.y, speed, dt);
    pos.current.z = THREE.MathUtils.damp(pos.current.z, goalP.z, speed, dt);
    tgt.current.x = THREE.MathUtils.damp(tgt.current.x, goalT.x, speed, dt);
    tgt.current.y = THREE.MathUtils.damp(tgt.current.y, goalT.y, speed, dt);
    tgt.current.z = THREE.MathUtils.damp(tgt.current.z, goalT.z, speed, dt);
    // ゆれ（ぶつかった ときだけ）
    stage.shake = Math.max(0, stage.shake - dt * 2.5);
    const k = stage.shake * stage.shake * 0.12;
    const now = performance.now() / 1000;
    camera.position.set(pos.current.x + Math.sin(now * 61) * k, pos.current.y + Math.sin(now * 47 + 1) * k, pos.current.z);
    camera.lookAt(tgt.current);
    stage.cheer = Math.max(0, stage.cheer - dt);
  });
  return null;
}

/* ───────────── 画面 ───────────── */

/** 取組の できごとを 音・土けむり・カメラに する */
function useBattleFx() {
  useEffect(() => {
    const timers: number[] = [];
    const off = battleFx.on((e: BattleEvent) => {
      const s = useBattle.getState().state;
      const cx = s ? s.meter * SPREAD : 0;
      switch (e.type) {
        case 'start':
          audio.play('taiko');
          audio.play('clash');
          stage.lunge[1] = stage.lunge[-1] = 1;
          stage.shake = 1;
          stage.wave = 1;
          stage.waveX = cx;
          stage.cheer = 1;
          emitParticles('dust', [cx, STUMP_TOP + 0.05, 0.1], 16);
          break;
        case 'push':
          stage.lunge[1] = 1;
          if (e.grade === 'ok') {
            audio.play('tap');
            emitParticles('dust', [cx, STUMP_TOP + 0.04, 0.1], 3);
          } else {
            audio.play('clash');
            stage.shake = Math.max(stage.shake, e.grade === 'great' ? 0.7 : 0.4);
            emitParticles('dust', [cx, STUMP_TOP + 0.04, 0.1], e.grade === 'great' ? 10 : 6);
            if (e.grade === 'great') {
              emitParticles('sparkle', [cx, STUMP_TOP + 0.35, 0.15], 8 + Math.min(10, e.combo * 2));
              if (e.combo >= 3) stage.cheer = 1;
            }
          }
          break;
        case 'tell':
          audio.play('nope');
          break;
        case 'brace':
          audio.play(e.brace === 'full' ? 'sparkle' : 'tap');
          break;
        case 'special': {
          const who = e.who === 'player' ? s?.player : s?.cpu;
          if (!who) break;
          if (e.brace === 'full') {
            audio.play('clash');
            audio.play('correct');
            stage.shake = 0.8;
            stage.wave = 1;
            stage.waveX = cx;
            stage.cheer = 1;
            emitParticles('sparkle', [cx, STUMP_TOP + 0.4, 0.1], 20);
            break;
          }
          audio.play(BATTLE[who].special.sfx);
          audio.play('cheer');
          const side = sideOf(e.who);
          stage.focus = { side, left: 1.1 };
          stage.lunge[side] = 1;
          stage.shake = 1;
          stage.wave = 1;
          stage.waveX = cx;
          stage.cheer = 1;
          const p = stage.pos[side];
          emitParticles(who === 'miidera' ? 'smoke' : who === 'marukubi' ? 'ooze' : 'sparkle', [p.x, STUMP_TOP + 0.45, 0.1], 26);
          emitParticles('dust', [cx, STUMP_TOP + 0.05, 0.1], 14);
          break;
        }
        case 'end':
          stage.since = 0;
          stage.shake = 0.8;
          stage.cheer = 1;
          audio.play('taiko');
          audio.play(e.result === 'draw' ? 'bounce' : 'cheer');
          timers.push(window.setTimeout(() => audio.play('grow'), 500));
          emitParticles('confetti', [0, STUMP_TOP + 1.6, 0.2], 60);
          timers.push(window.setTimeout(() => emitParticles('confetti', [0, STUMP_TOP + 1.8, 0.4], 50), 700));
          emitParticles('dust', [cx, STUMP_TOP + 0.05, 0.1], 18);
          break;
      }
    });
    return () => {
      off();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);
}

/** 取組ごとに 演出の 値を はじめに もどす */
function resetStage() {
  stage.pos[1].set(-ENTRY_X, STUMP_TOP, 0);
  stage.pos[-1].set(ENTRY_X, STUMP_TOP, 0);
  stage.lunge[1] = stage.lunge[-1] = 0;
  stage.shake = stage.cheer = stage.wave = stage.since = 0;
  stage.focus.left = 0;
}

/** はっけよいの 太鼓（カメラの 切りかえと そろえて、取組の 時間で 打つ） */
const TAIKO_AT = [0.1, 1.1, 1.9, 2.7];
function IntroDrums() {
  const next = useRef(0);
  useFrame(() => {
    const s = useBattle.getState().state;
    if (!s || s.intro <= 0 || next.current >= TAIKO_AT.length) return;
    if (INTRO_SECONDS - s.intro >= TAIKO_AT[next.current]!) {
      next.current++;
      audio.play('taiko');
    }
  });
  return null;
}

function Bout({ pair }: { pair: string }) {
  // 取組ごとに 作りなおす（key）ので、はじめに 演出の 値を もどす
  useMemo(() => resetStage(), []);
  useBattleFx();
  const [player, cpu] = pair.split('|') as [SpeciesId, SpeciesId];
  return (
    <>
      <IntroDrums />
      <Fighter species={player} side={1} />
      <Fighter species={cpu} side={-1} />
    </>
  );
}

export function BattleScene() {
  // 毎フレーム変わる meter では再描画しない（取組の 番号と 組み合わせだけ 購読）
  const bout = useBattle((b) => (b.state ? `${b.round}|${b.state.player}|${b.state.cpu}` : ''));
  const step = useBattle((b) => b.step);
  useFrame((_, dt) => step(Math.min(dt, 0.05)));
  const [, player, cpu] = bout.split('|');
  return (
    <group>
      <Meadow radius={8} />
      <Dohyo />
      <Fans />
      <Effects />
      <Director />
      {bout ? <Bout key={bout} pair={`${player}|${cpu}`} /> : null}
    </group>
  );
}
