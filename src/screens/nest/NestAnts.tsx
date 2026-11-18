import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { newAnim, type CreatureAnim } from '../../creatures/anim';
import { KURO_MAJOR, KURO_WORKER, KuroAnt, NestAnt } from '../../creatures/kurooari';
import {
  digging,
  flightReady,
  partOf,
  pointAlong,
  polyLength,
  roomById,
  route,
  seasonAt,
  tunnelPoints,
  TUNNEL_W,
  type Nest,
  type NestNode,
  type Pt,
  type Room,
} from '../../sim/nest';
import { useNest } from '../../state/nest';
import { followed, useNestView, type AntInfo } from '../../state/nestView';
import { useUi } from '../../state/ui';
import { speak } from '../../text/speech';
import { emitParticles } from '../../three/Particles';

/** 画面に 出す はたらきアリの 数（本当の 数は もっと 多くても 14 匹まで） */
export const MAX_VISIBLE = 14;
/** くぼみの 中で アリが 歩く 奥行き・地面の 上で 歩く 奥行き */
export const ANT_Z = -0.07;
export const SURF_Z = -0.08;
export const ANT_SCALE = 0.55;

export type Carry = 'none' | 'sugar' | 'bug' | 'soil' | 'trash';
type Job = 'forage' | 'carryFood' | 'dig' | 'dump' | 'nurse' | 'rest' | 'trash' | 'sleep' | 'guard';

export const JOB_TEXT: Record<Job, string> = {
  forage: 'えさを さがしに いくよ',
  carryFood: 'えさを すに はこんでいるよ',
  dig: 'つちを ほって へやを つくっているよ',
  dump: 'ほった つちを そとに すてにいくよ',
  nurse: 'たまごや ようちゅうの せわを しているよ',
  rest: 'すこし やすんでいるよ',
  trash: 'たべのこしを ごみの へやに はこんでいるよ',
  sleep: 'ふゆの あいだ じっと しているよ',
  guard: 'はねアリが とびたつのを まもっているよ',
};

interface Agent {
  id: number;
  major: boolean;
  /** いる 場所（道の 出発点） */
  node: NestNode;
  /** node の 場所から いまの 場所までの 道（へやの 外の 行きどまり＝ほっている トンネルの 先 など） */
  back: Pt[];
  p: Pt;
  path: Pt[];
  len: number;
  d: number;
  speed: number;
  wait: number;
  job: Job;
  carry: Carry;
  /** 着いたら する こと */
  then: ((a: Agent, n: Nest) => void) | null;
  anim: { current: CreatureAnim };
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  /** 持ち物が 変わった（見た目の 作りなおし） */
  rev: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** へやの 床の 上の ばらばらな 場所 */
export function floorSpot(r: Room, k = Math.random()): Pt {
  return { x: r.x + (k - 0.5) * r.w * 0.5, y: r.y - r.h / 2 + TUNNEL_W / 2 };
}

const dedupe = (pts: Pt[]) => pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y) > 1e-5);

function goTo(a: Agent, n: Nest, target: NestNode, extra: Pt[] = []) {
  const pts = dedupe([a.p, ...a.back, ...route(n, a.node, target), ...extra]);
  a.path = pts.length > 1 ? pts : [a.p, a.p];
  a.len = polyLength(a.path);
  a.d = 0;
  a.node = target;
  a.back = [];
}

const dugRooms = (n: Nest) => n.rooms.filter((r) => r.dug >= 1);
const roomOf = (n: Nest, use: Room['use']) => dugRooms(n).find((r) => r.use === use);

function setJob(a: Agent, job: Job, carry: Carry = a.carry) {
  a.job = job;
  if (carry !== a.carry) {
    a.carry = carry;
    a.rev++;
  }
  const v = useNestView.getState();
  if (v.selected === a.id) v.setInfo({ kind: a.major ? 'major' : 'worker', job: JOB_TEXT[job] });
}

/** 次に する ことを えらぶ（巣の 状態から） */
function plan(a: Agent, n: Nest, all: Agent[]) {
  const rooms = dugRooms(n);
  if (rooms.length === 0) return;
  const r = Math.random();
  if (seasonAt(n.t) === 'fuyu') {
    // ふゆは いちばん 深い へやで じっと する
    const deep = rooms.reduce((x, y) => (y.y < x.y ? y : x));
    setJob(a, 'sleep', 'none');
    goTo(a, n, { room: deep.id }, [floorSpot(deep)]);
    a.then = (b) => (b.wait = 3 + Math.random() * 3);
    return;
  }
  if (flightReady(n) && r < 0.5) {
    setJob(a, 'guard', 'none');
    goTo(a, n, { surface: n.entranceX + (Math.random() - 0.5) * 1.2 });
    a.then = (b) => (b.wait = 1 + Math.random() * 2);
    return;
  }
  const count = (j: Job) => all.filter((x) => x.job === j).length;
  const dig = digging(n);
  if (dig && dig.parent >= 0 && count('dig') + count('dump') < 3 && r < 0.6) {
    const parent = roomById(n, dig.parent);
    if (parent && parent.dug >= 1) {
      setJob(a, 'dig', 'none');
      const front = partOf(tunnelPoints(n, dig), Math.min(1, dig.dug * 2));
      goTo(a, n, { room: parent.id }, front);
      a.then = (b) => {
        b.back = [...front].reverse();
        b.wait = 1.6;
        b.anim.current.eat = 1;
        b.then = (c, m) => {
          setJob(c, 'dump', 'soil');
          const side = Math.random() < 0.5 ? -1 : 1;
          goTo(c, m, { surface: m.entranceX + side * (0.2 + Math.random() * 0.1) });
          c.then = (e) => {
            emitParticles('dust', [e.pos.x, 0.03, e.pos.z], 5);
            setJob(e, 'dump', 'none');
          };
        };
      };
      return;
    }
  }
  if (n.baits.length > 0 && count('forage') < Math.min(4, n.baits.length * 2) && r < 0.85) {
    const bait = n.baits[Math.floor(Math.random() * n.baits.length)]!;
    setJob(a, 'forage', 'none');
    goTo(a, n, { surface: bait.x + (Math.random() - 0.5) * 0.14 });
    a.then = (b, m0) => {
      // 着く 前に えさが なくなっていたら、ほかの ことを する
      if (!m0.baits.some((x) => x.id === bait.id)) {
        setJob(b, 'rest', 'none');
        return;
      }
      b.wait = 1.4;
      b.anim.current.eat = 1;
      b.then = (c, m) => {
        setJob(c, 'carryFood', bait.kind);
        const store = roomOf(m, 'food') ?? roomOf(m, 'queen') ?? dugRooms(m)[0]!;
        goTo(c, m, { room: store.id }, [floorSpot(store)]);
        c.then = (e) => {
          e.wait = 0.8;
          setJob(e, 'carryFood', 'none');
        };
      };
    };
    return;
  }
  const trashRoom = roomOf(n, 'trash');
  const food = roomOf(n, 'food');
  if (trashRoom && food && n.trash >= 1 && r < 0.12) {
    setJob(a, 'trash', 'none');
    goTo(a, n, { room: food.id }, [floorSpot(food)]);
    a.then = (b, m) => {
      setJob(b, 'trash', 'trash');
      goTo(b, m, { room: trashRoom.id }, [floorSpot(trashRoom)]);
      b.then = (c) => setJob(c, 'trash', 'none');
    };
    return;
  }
  if (n.brood.length > 0 && r < 0.75) {
    const nursery = roomOf(n, 'brood') ?? roomOf(n, 'queen') ?? rooms[0]!;
    setJob(a, 'nurse', 'none');
    goTo(a, n, { room: nursery.id }, [floorSpot(nursery)]);
    a.then = (b) => {
      b.wait = 2.5 + Math.random() * 2.5;
      b.anim.current.eat = 0.6;
    };
    return;
  }
  const room = rooms[Math.floor(Math.random() * rooms.length)]!;
  setJob(a, 'rest', 'none');
  goTo(a, n, { room: room.id }, [floorSpot(room)]);
  a.then = (b) => (b.wait = 2 + Math.random() * 4);
}

const fwd = new THREE.Vector3();
const up = new THREE.Vector3();
const side = new THREE.Vector3();
const basis = new THREE.Matrix4();
const goal = new THREE.Quaternion();

/** 折れ線の 上の 点を 3D の 位置と 向きに（くぼみの 中では 床・かべに 足を つける） */
export function placeOnPath(p: Pt, dir: Pt, pos: THREE.Vector3, quat: THREE.Quaternion | null, k = 1) {
  // 横から 見た アリ：前が 進む 向き、上は 道に 直角で 上がわ
  const ux = dir.x >= 0 ? -dir.y : dir.y;
  const uy = dir.x >= 0 ? dir.x : -dir.x;
  const under = smooth(0, -0.1, p.y);
  pos.set(p.x - ux * (TUNNEL_W / 2 - 0.012) * under, p.y - uy * (TUNNEL_W / 2 - 0.012) * under, SURF_Z + (ANT_Z - SURF_Z) * under);
  if (!quat) return;
  fwd.set(dir.x, dir.y, 0).normalize();
  up.set(ux, uy, 0).normalize();
  side.crossVectors(up, fwd);
  basis.makeBasis(side, up, fwd);
  goal.setFromRotationMatrix(basis);
  quat.slerp(goal, k);
}

function makeAgent(id: number, major: boolean, n: Nest): Agent {
  const home = roomOf(n, 'brood') ?? roomOf(n, 'queen') ?? dugRooms(n)[0] ?? n.rooms[0]!;
  const p = floorSpot(home);
  const a: Agent = {
    id,
    major,
    node: { room: home.id },
    back: [],
    p,
    path: [p, p],
    len: 0,
    d: 0,
    speed: (major ? 0.3 : 0.36) * (0.85 + Math.random() * 0.3),
    wait: 0.5 + Math.random(),
    job: 'rest',
    carry: 'none',
    then: null,
    anim: { current: newAnim() },
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    rev: 0,
  };
  placeOnPath(p, { x: Math.random() < 0.5 ? 1 : -1, y: 0 }, a.pos, a.quat, 1);
  return a;
}

function AntActorImpl({ agent }: { agent: Agent }) {
  const ref = useRef<THREE.Group>(null);
  const [rev, setRev] = useState(agent.rev);
  const selected = useNestView((s) => s.selected === agent.id);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.position.copy(agent.pos);
    g.quaternion.copy(agent.quat);
    if (agent.rev !== rev) setRev(agent.rev);
    if (selected) {
      followed.x = agent.pos.x;
      followed.y = agent.pos.y + 0.03;
      followed.z = agent.pos.z;
    }
  });
  return (
    <group ref={ref}>
      <group scale={agent.major ? ANT_SCALE * 1.15 : ANT_SCALE}>
        {selected ? <KuroAnt anim={agent.anim} look={agent.major ? KURO_MAJOR : KURO_WORKER} /> : <NestAnt anim={agent.anim} major={agent.major} carry={agent.carry} />}
      </group>
      {/* タップの 当たり（見た目より 大きめ。前の 板より 手前まで とどく） */}
      <mesh
        visible={false}
        position={[0, 0.04, 0]}
        scale={0.13}
        onClick={(e) => {
          e.stopPropagation();
          audio.play('pop');
          const info: AntInfo = { kind: agent.major ? 'major' : 'worker', job: JOB_TEXT[agent.job] };
          selectAnt(agent.id, info, agent.pos);
        }}
      >
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </group>
  );
}
const AntActor = memo(AntActorImpl);

export const ANT_NAME: Record<AntInfo['kind'], string> = {
  worker: 'はたらきアリ',
  major: 'あたまの おおきな はたらきアリ',
  queen: 'じょおうアリ',
  alate: 'はねアリ',
};

/** アリを 選んで カメラを 寄せる（もう 一度 えらぶと はなれる） */
export function selectAnt(id: number, info: AntInfo, at: THREE.Vector3) {
  const v = useNestView.getState();
  if (v.selected === id) {
    clearSelection();
    return;
  }
  v.select(id, info);
  followed.x = at.x;
  followed.y = at.y;
  followed.z = at.z;
  followed.active = true;
  speak(`${ANT_NAME[info.kind]}。${info.job}`, true);
  useUi.getState().setCinematic({ kind: 'follow', target: [at.x, at.y, at.z], label: '', until: Infinity });
}

export function clearSelection() {
  useNestView.getState().clear();
  followed.active = false;
  if (useUi.getState().cinematic) useUi.getState().setCinematic(null);
}

/** 巣の 中と 地面の 上で はたらく アリたち（見た目だけ。数と 仕事は 巣の 状態から） */
function NestAntsImpl({ workers, majors }: { workers: number; majors: number }) {
  const agents = useRef<Agent[]>([]);
  const nextId = useRef(1);
  const [list, setList] = useState<Agent[]>([]);
  const visible = Math.min(MAX_VISIBLE, workers);
  const majorShare = workers > 0 ? majors / workers : 0;

  useEffect(() => {
    const n = useNest.getState().nest;
    const cur = agents.current;
    if (cur.length < visible) {
      for (let i = cur.length; i < visible; i++) {
        const major = cur.filter((a) => a.major).length < Math.round(majorShare * visible);
        cur.push(makeAgent(nextId.current++, major, n));
      }
    } else if (cur.length > visible) cur.length = visible;
    setList([...cur]);
  }, [visible, majorShare]);

  useEffect(() => () => clearSelection(), []);

  const tmp = useMemo(() => ({ dir: { x: 1, y: 0 } as Pt }), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const n = useNest.getState().nest;
    const all = agents.current;
    for (const a of all) {
      const an = a.anim.current;
      an.t += dt;
      if (a.wait > 0) {
        a.wait -= dt;
        an.walk = THREE.MathUtils.damp(an.walk, 0, 8, dt);
        an.sleep = THREE.MathUtils.damp(an.sleep, a.job === 'sleep' ? 1 : 0, 2, dt);
        if (a.wait <= 0) an.eat = 0;
        continue;
      }
      if (a.d < a.len) {
        const winter = a.job === 'sleep';
        a.d = Math.min(a.len, a.d + a.speed * dt * (winter ? 0.6 : 1));
        const { p, dir } = pointAlong(a.path, a.d);
        a.p = p;
        tmp.dir = dir;
        placeOnPath(p, dir, a.pos, a.quat, 1 - Math.exp(-dt * 12));
        an.walk = THREE.MathUtils.damp(an.walk, 1, 8, dt);
        an.sleep = THREE.MathUtils.damp(an.sleep, 0, 4, dt);
        an.gait += a.speed * dt * 45;
        continue;
      }
      // 着いた
      const then = a.then;
      a.then = null;
      if (then) {
        then(a, n);
        if (a.wait > 0 || a.d < a.len) continue;
      }
      if (a.job === 'sleep' && seasonAt(n.t) === 'fuyu') {
        a.wait = 2;
        continue;
      }
      plan(a, n, all);
    }
  });

  return (
    <group>
      {list.map((a) => (
        <AntActor key={a.id} agent={a} />
      ))}
    </group>
  );
}

export const NestAnts = memo(NestAntsImpl);
