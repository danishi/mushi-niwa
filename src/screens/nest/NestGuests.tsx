import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { newAnim, type CreatureAnim } from '../../creatures/anim';
import { SemiNymph } from '../../creatures/cicada';
import { MODELS, type ModelProps } from '../../creatures/registry';
import { VISITOR_MODELS } from '../../creatures/visitors';
import { SPECIES } from '../../data/species';
import { VISITORS, visitorsAt, type VisitorId } from '../../data/visitors';
import { seasonAt, soilRoute, pointAlong, polyLength, type Pt } from '../../sim/nest';
import type { SpeciesId } from '../../sim/types';
import { env } from '../../state/env';
import { FLAGS } from '../../state/flags';
import { useGame } from '../../state/game';
import { useNest } from '../../state/nest';
import { useProgress } from '../../state/progress';
import { emitParticles } from '../../three/Particles';
import { sayNest } from './nestTap';

/**
 * 巣の まわりを 通る 生きもの（ユーザー要望。docs/ant-nest-research.md）。
 * - 地面の 上：ずかんに のっている 子（育てた 虫の おとな・見つけた おきゃくさん）が ときどき 通りすぎる
 * - 土の 中：ミミズ・カブトムシの 幼虫・セミの 幼虫が 巣とは 別の 道を 通る（うしろに 掘った あとが のこる）
 * タップすると 名前と 豆知識を 話して、びくっと する。ずかんの 記録は 変えない。
 */
type AnimRef = { current: CreatureAnim };

/** 地面の 上を 通らない おきゃくさん：ミミズ（土の 中）、アリの なかま（巣の アリと まぎらわしい） */
const NOT_ON_SURFACE = new Set<VisitorId>(['mimizu', 'kurooari', 'hiari', 'sashihariari', 'burudogguari', 'guntaiari', 'hakiriari']);
/** ゆっくり 歩く 子 */
const SLOW = new Set<string>(['katatsumuri', 'nanafushi', 'dangomushi', 'marukubi']);

type Passer =
  | { kind: 'species'; id: SpeciesId; name: string; facts: string[] }
  | { kind: 'visitor'; id: VisitorId; name: string; facts: string[] };

/** 地面の 上を 通る 奥行き（アリの 通り道の すぐ うしろ。奥すぎると 上の ボタンに かくれる） */
const SURFACE_Z = -0.3;
/** 大きさの はんい（ワールド単位の 体長）。ちいさすぎる 子・大きすぎる 子を そろえる */
const SURFACE_LEN: [number, number] = [0.2, 0.95];

function randomOf<T>(xs: readonly T[]): T | undefined {
  return xs[Math.floor(Math.random() * xs.length)];
}

/** 中の 体の 大きさを 測って、体長（ワールド単位）が はんいに おさまるよう 大きさを そろえる（はじめの 数フレームは かくして 測る） */
function Fit({ range, children }: { range: [number, number]; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const frames = useRef(0);
  const box = useMemo(() => new THREE.Box3(), []);
  const size = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const g = ref.current;
    if (!g || frames.current > 3) return;
    frames.current++;
    if (frames.current < 3) {
      g.visible = false;
      return;
    }
    g.scale.setScalar(1);
    g.parent?.updateWorldMatrix(true, false);
    g.traverse((o) => {
      if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).boundingBox = null;
    });
    box.setFromObject(g, true);
    box.getSize(size);
    // 向きは まだ 決まって いない ことが あるので、いちばん 長い 辺を 体長と みる（ワールド単位）
    const len = Math.max(size.x, size.y, size.z);
    let k = 1;
    if (len > range[1]) k = range[1] / len;
    else if (len > 0 && len < range[0]) k = range[0] / len;
    g.scale.setScalar(k);
    g.visible = true;
  });
  return (
    <group ref={ref} visible={false}>
      {children}
    </group>
  );
}

/* ───────────── 地面の 上 ───────────── */

function SurfacePasserView({ p, onGone }: { p: Passer; onGone: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const dir = useMemo(() => (Math.random() < 0.5 ? 1 : -1), []);
  const st = useRef({ x: -dir * 3.6, t: 0, startle: 0 });
  const entry = p.kind === 'species' ? MODELS[SPECIES[p.id].stages[SPECIES[p.id].stages.length - 1]!.model] : undefined;
  const flier = p.kind === 'visitor' ? VISITORS[p.id].flier : entry?.locomotion === 'flutter' || entry?.locomotion === 'swim';
  const slow = SLOW.has(p.id);
  const speed = flier ? 0.8 : slow ? 0.16 : 0.34;
  const sex = useMemo<ModelProps['sex']>(() => (Math.random() < 0.5 ? 'male' : 'female'), []);
  const lift = useMemo(() => 0.25 + Math.random() * 0.25, []);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const g = ref.current;
    const a = anim.current;
    const s = st.current;
    a.t += dt;
    s.t += dt;
    // さわると びくっと して、すこしの 間 止まる
    s.startle = Math.max(0, s.startle - dt);
    a.startle = Math.min(1, s.startle * 2);
    a.spray = p.kind === 'visitor' && VISITORS[p.id].react === 'curl' ? Math.min(1, s.startle) : 0;
    const moving = s.startle < 0.6;
    if (moving) s.x += dir * speed * dt;
    a.walk = flier ? 0 : moving ? 1 : 0;
    a.flap = flier ? 1 : 0;
    a.gait += moving ? speed * dt * 40 : 0;
    if (g) {
      g.position.set(s.x, flier ? lift + Math.sin(s.t * 2.2) * 0.08 : 0, flier ? SURFACE_Z - 0.2 : SURFACE_Z);
      g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    if (Math.abs(s.x) > 3.8) onGone();
  });
  let model: ReactNode = null;
  if (p.kind === 'species' && entry) {
    const C = entry.C;
    model = <C anim={anim} sex={sex} molts={0} outlines={false} />;
  } else if (p.kind === 'visitor') {
    const C = VISITOR_MODELS[p.id] as ComponentType<{ anim: AnimRef }>;
    model = (
      <group scale={VISITORS[p.id].scale}>
        <C anim={anim} />
      </group>
    );
  }
  return (
    <group
      ref={ref}
      position={[-dir * 3.6, 0, SURFACE_Z]}
      onClick={(e) => {
        e.stopPropagation();
        st.current.startle = 1.2;
        anim.current.bounce = 1;
        audio.play('pop');
        emitParticles('sparkle', e.point, 8);
        sayNest(`${p.name}。${randomOf(p.facts) ?? ''}`);
      }}
    >
      <group scale={0.45}>
        <Fit range={SURFACE_LEN}>{model}</Fit>
      </group>
      <mesh visible={false} position={[0, 0.12, 0]} scale={[0.4, 0.3, 0.4]}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </group>
  );
}

/** 地面の 上を ときどき 通る ずかんの 虫 */
export const SurfacePassers = memo(function SurfacePassers() {
  const [p, setP] = useState<Passer | null>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (p) return;
    const wait = (FLAGS.e2e ? 2 : key === 0 ? 8 : 20 + Math.random() * 25) * 1000;
    const id = window.setTimeout(() => {
      const n = useNest.getState().nest;
      if (n.phase !== 'empty' && seasonAt(n.t) === 'fuyu') {
        setKey((k) => k + 1);
        return;
      }
      const night = env.night > 0.5;
      const pool: Passer[] = [
        ...useGame.getState().met.map((s): Passer => ({ kind: 'species', id: s, name: SPECIES[s].name, facts: SPECIES[s].facts })),
        ...useProgress
          .getState()
          .visitors.filter((v): v is VisitorId => v in VISITORS && !NOT_ON_SURFACE.has(v as VisitorId) && visitorsAt(night).includes(v as VisitorId))
          .map((v): Passer => ({ kind: 'visitor', id: v, name: VISITORS[v].name, facts: VISITORS[v].facts })),
      ];
      // E2E 用：`window.__forcePasser = 'kabutomushi'` などで 通る 子を きめる
      const forced = FLAGS.e2e ? (window as unknown as { __forcePasser?: string }).__forcePasser : undefined;
      const pick = (forced && pool.find((x) => x.id === forced)) || randomOf(pool);
      if (pick) setP(pick);
      else setKey((k) => k + 1);
    }, wait);
    return () => window.clearTimeout(id);
  }, [p, key]);
  if (!p) return null;
  return (
    <SurfacePasserView
      key={key}
      p={p}
      onGone={() => {
        setP(null);
        setKey((k) => k + 1);
      }}
    />
  );
});

/* ───────────── 土の 中 ───────────── */

type SoilKind = 'mimizu' | 'kabuto' | 'semi';

const SOIL: Record<SoilKind, { name: string; facts: string[]; depth: [number, number]; speed: number; len: [number, number]; burrow: number }> = {
  mimizu: {
    name: 'ミミズ',
    facts: VISITORS.mimizu.facts,
    depth: [-0.5, -3.8],
    speed: 0.2,
    len: [0.7, 0.8],
    burrow: 0.05,
  },
  kabuto: {
    name: 'カブトムシの ようちゅう',
    facts: ['ふようどを たべて、つちの なかで おおきく なるよ', 'からだの よこの ちいさな あなで いきを しているよ', 'かたい あたまと つよい あごで ふようどを たべるよ'],
    // 浅い 腐葉土の 層
    depth: [-0.5, -1.3],
    speed: 0.09,
    len: [0.38, 0.42],
    burrow: 0.11,
  },
  semi: {
    name: 'セミの ようちゅう',
    facts: [
      'セミの ようちゅうは つちの なかで なんねんも くらすよ',
      'ふとい かまの ような まえあしで、きの ねっこに そって あなを ほるよ',
      'ながい くちを きの ねっこに さして、しるを すって おおきく なるよ',
      'なつの ゆうがた つちから でて きに のぼり、よるに おとなに なるよ',
    ],
    depth: [-1.2, -3.6],
    speed: 0.08,
    len: [0.5, 0.55],
    burrow: 0.11,
  },
};

const TRAIL = 48;
const SOIL_Z = 0.02;

function SoilModel({ kind, anim }: { kind: SoilKind; anim: AnimRef }) {
  if (kind === 'semi') return <SemiNymph anim={anim} />;
  if (kind === 'kabuto') {
    const C = MODELS['kabuto-larva']!.C;
    return <C anim={anim} sex="male" molts={2} outlines={false} />;
  }
  const C = VISITOR_MODELS.mimizu as ComponentType<{ anim: AnimRef }>;
  return <C anim={anim} />;
}

const fwd = new THREE.Vector3();
const up = new THREE.Vector3();
const side = new THREE.Vector3();
const basis = new THREE.Matrix4();
const goal = new THREE.Quaternion();

function SoilCrawlerView({ kind, path, onGone }: { kind: SoilKind; path: Pt[]; onGone: () => void }) {
  const def = SOIL[kind];
  const ref = useRef<THREE.Group>(null);
  const trail = useRef<THREE.InstancedMesh>(null);
  const anim = useRef(newAnim());
  const st = useRef({ d: 0, startle: 0, lastDrop: -1, next: 0 });
  const len = useMemo(() => polyLength(path), [path]);
  const trailMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#24170d', transparent: true, opacity: 0.4, depthWrite: false }), []);
  useEffect(() => () => trailMat.dispose(), [trailMat]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const ages = useMemo(() => new Float32Array(TRAIL).fill(99), []);
  const spots = useMemo(() => Array.from({ length: TRAIL }, () => new THREE.Vector3()), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const g = ref.current;
    const a = anim.current;
    const s = st.current;
    a.t += dt;
    s.startle = Math.max(0, s.startle - dt);
    a.startle = Math.min(1, s.startle * 2);
    a.spray = kind === 'mimizu' || kind === 'kabuto' ? Math.min(1, s.startle) : 0;
    const moving = s.startle < 0.5;
    if (moving) s.d += def.speed * dt;
    a.walk = moving ? 1 : 0;
    a.gait += moving ? def.speed * dt * 40 : 0;
    const { p, dir } = pointAlong(path, s.d);
    if (g) {
      g.position.set(p.x, p.y, SOIL_Z);
      // 横から 見た 体：前が 進む 向き、上は 道に 直角で 上がわ
      const ux = dir.x >= 0 ? -dir.y : dir.y;
      const uy = dir.x >= 0 ? dir.x : -dir.x;
      fwd.set(dir.x, dir.y, 0).normalize();
      up.set(ux, uy, 0).normalize();
      side.crossVectors(up, fwd);
      basis.makeBasis(side, up, fwd);
      goal.setFromRotationMatrix(basis);
      g.quaternion.slerp(goal, 1 - Math.exp(-dt * 6));
    }
    // 掘った あと：通った 所に 暗い まるを のこし、だんだん 土で ふさがる（小さく なる）
    if (s.d - s.lastDrop > def.burrow * 0.35) {
      s.lastDrop = s.d;
      spots[s.next]!.set(p.x, p.y, 0.004);
      ages[s.next] = 0;
      s.next = (s.next + 1) % TRAIL;
    }
    const t = trail.current;
    if (t) {
      for (let i = 0; i < TRAIL; i++) {
        ages[i]! += dt;
        // 掘ったばかりの 所は 体より すこし 大きい 穴。時間が たつと 土で ふさがる
        const k = Math.min(1, Math.max(0, 1.4 - ages[i]! / 6)) * def.burrow;
        m.makeScale(k, k, 1).setPosition(spots[i]!);
        t.setMatrixAt(i, m);
      }
      t.instanceMatrix.needsUpdate = true;
    }
    if (s.d >= len) onGone();
  });
  return (
    <group>
      <instancedMesh ref={trail} args={[undefined, trailMat, TRAIL]} frustumCulled={false}>
        <circleGeometry args={[1, 16]} />
      </instancedMesh>
      <group
        ref={ref}
        position={[path[0]!.x, path[0]!.y, SOIL_Z]}
        onClick={(e) => {
          e.stopPropagation();
          st.current.startle = 1.4;
          anim.current.bounce = 1;
          audio.play('pop');
          emitParticles('dust', e.point, 6);
          sayNest(`${def.name}。${randomOf(def.facts) ?? ''}`);
        }}
      >
        <Fit range={def.len}>
          <SoilModel kind={kind} anim={anim} />
        </Fit>
        <mesh visible={false} scale={[0.3, 0.2, 0.3]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
      </group>
    </group>
  );
}

/** 土の 中を ときどき 通る 生きもの（ふゆは でて こない） */
export const SoilCrawlers = memo(function SoilCrawlers() {
  const [c, setC] = useState<{ kind: SoilKind; path: Pt[] } | null>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (c) return;
    const wait = (FLAGS.e2e ? 3 : key === 0 ? 12 : 25 + Math.random() * 30) * 1000;
    const id = window.setTimeout(() => {
      const n = useNest.getState().nest;
      // E2E 用：`window.__forceSoil = 'mimizu'` などで 土の 中の 子を きめる
      const forced = FLAGS.e2e ? (window as unknown as { __forceSoil?: SoilKind }).__forceSoil : undefined;
      const kind = forced ?? randomOf<SoilKind>(['mimizu', 'kabuto', 'semi'])!;
      const path = n.phase !== 'empty' && seasonAt(n.t) === 'fuyu' ? null : soilRoute(n, Math.random, SOIL[kind].depth);
      if (path) setC({ kind, path });
      else setKey((k) => k + 1);
    }, wait);
    return () => window.clearTimeout(id);
  }, [c, key]);
  if (!c) return null;
  return (
    <SoilCrawlerView
      key={key}
      kind={c.kind}
      path={c.path}
      onGone={() => {
        setC(null);
        setKey((k) => k + 1);
      }}
    />
  );
});
