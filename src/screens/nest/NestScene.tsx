import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { newAnim } from '../../creatures/anim';
import { AlateWings, KURO_ALATE, KURO_QUEEN, KuroAnt } from '../../creatures/kurooari';
import {
  digging,
  flightReady,
  LAND_T,
  roomAnchor,
  seasonAt,
  tunnelPoints,
  type Bait,
  type Nest,
  type Room,
} from '../../sim/nest';
import { env } from '../../state/env';
import { useNest } from '../../state/nest';
import { followed, useNestView } from '../../state/nestView';
import { useUi } from '../../state/ui';
import type { CameraShot } from '../../three/CameraRig';
import { bladeGeometry, Scatter } from '../../three/Diorama';
import { emitParticles } from '../../three/Particles';
import { GEO, mat } from '../../three/materials';
import { grainBump, grassTexture, leafTexture } from '../../three/textures';
import { ANT_SCALE, ANT_Z, clearSelection, floorSpot, NestAnts, placeOnPath, selectAnt, SURF_Z } from './NestAnts';
import { nestTap } from './nestTap';
import { createFaceTexture, FACE, faceKey, humusTexture, paintFace, soilFaceTexture, worldPlane } from './nestPaint';

/** 断面の くぼみの 深さ */
const RECESS = 0.14;
const BAIT_Z = -0.2;

export const nestShot = (): CameraShot => {
  const cine = useUi.getState().cinematic;
  if (cine?.kind === 'follow') {
    const [x, y, z] = cine.target;
    return { position: [x + 0.2, y + 0.3, z + 1.5], target: [x, y, z], fov: 34, free: true };
  }
  return {
    position: [0, 0.9, 7.6],
    target: [0, -1.85, 0],
    fov: 40,
    fitWidth: FACE.x1 - FACE.x0,
    fitHeight: 5.4,
    orbit: { minDistance: 3, maxDistance: 12, minPolar: 1.1, maxPolar: 1.75, azimuth: 0.4 },
  };
};

/** 寄って 見ている アリに カメラを ついていかせる（CameraRig の あとに 動く） */
function Follow() {
  const camera = useThree((s) => s.camera);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    if (!followed.active) return;
    const d = Math.min(dt, 0.1);
    look.set(followed.x, followed.y, followed.z);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, followed.x + 0.2, 3, d);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, followed.y + 0.3, 3, d);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, followed.z + 1.5, 3, d);
    camera.lookAt(look);
  });
  return null;
}

/**
 * 夜の あかり：地面の 中は 昼も 夜も 同じ くらいの 暗さなので、夜に 空の 光が 弱く なった ぶんを
 * やわらかい 光で おぎなって 巣の 中を 見やすく する（ライトの 数は 昼も 同じに して シェーダを 作りなおさない）
 */
function NightFill() {
  const amb = useRef<THREE.AmbientLight>(null);
  const front = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const n = THREE.MathUtils.clamp(env.night, 0, 1);
    if (amb.current) amb.current.intensity = n * 1.3;
    if (front.current) front.current.intensity = n * 1.1;
  });
  return (
    <>
      <ambientLight ref={amb} color="#ffe6c4" intensity={0} />
      <directionalLight ref={front} color="#fff0d8" position={[0.5, 1.5, 8]} intensity={0} />
    </>
  );
}

/* ───────────── 地面の 断面 ───────────── */

let faceCache: (ReturnType<typeof createFaceTexture> & { material: THREE.MeshStandardMaterial }) | null = null;
function faceSurface() {
  if (!faceCache) {
    const f = createFaceTexture();
    faceCache = { ...f, material: mat('#ffffff', { map: f.texture, alphaTest: 0.5, roughness: 0.95 }) };
  }
  return faceCache;
}

function Face({ nest }: { nest: Nest }) {
  // 断面の Canvas・テクスチャ・材質は 1 つだけ 作って 画面を またいで 使う（来る たびに 作ると iPhone の Canvas の メモリが あふれる）
  const face = faceSurface();
  const key = faceKey(nest);
  useLayoutEffect(() => {
    paintFace(face.canvas, useNest.getState().nest);
    face.texture.needsUpdate = true;
  }, [key, face]);
  const faceMat = face.material;
  const soil = useMemo(() => mat('#ffffff', { map: soilFaceTexture(), roughness: 0.95 }), []);
  const back = useMemo(() => mat('#6f5a48', { map: soilFaceTexture(), roughness: 1 }), []);
  const dark = useMemo(() => new THREE.MeshBasicMaterial({ map: humusTexture(), transparent: true, depthWrite: false }), []);
  useEffect(() => () => dark.dispose(), [dark]);
  const geos = useMemo(
    () => ({
      left: worldPlane(-12, FACE.x0, -14, FACE.top),
      right: worldPlane(FACE.x1, 12, -14, FACE.top),
      bottom: worldPlane(FACE.x0, FACE.x1, -14, FACE.bottom),
      back: worldPlane(FACE.x0, FACE.x1, FACE.bottom, FACE.top),
    }),
    [],
  );
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  const w = FACE.x1 - FACE.x0;
  const h = FACE.top - FACE.bottom;
  return (
    <group>
      <mesh material={faceMat} position={[(FACE.x0 + FACE.x1) / 2, (FACE.top + FACE.bottom) / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh geometry={geos.left} material={soil} receiveShadow />
      <mesh geometry={geos.right} material={soil} receiveShadow />
      <mesh geometry={geos.bottom} material={soil} receiveShadow />
      {/* 地面の すぐ 下の 黒い 土 */}
      <mesh material={dark} position={[0, -0.22, 0.003]} renderOrder={1}>
        <planeGeometry args={[24, 0.44]} />
      </mesh>
      {/* くぼみの おく（トンネルと へやの かべ） */}
      <mesh geometry={geos.back} material={back} position={[0, 0, -RECESS]} receiveShadow />
    </group>
  );
}

const GRASS = ['#5f8f2f', '#6e9c36', '#7aa83e', '#557f29', '#8bb04a'];

/** 地面の 上（草地）。ふゆは 雪が つもる */
const Surface = memo(function Surface({ winter }: { winter: boolean }) {
  const ground = useMemo(() => mat('#ffffff', { map: grassTexture(), roughness: 0.95, bumpMap: grainBump(70, 96), bumpScale: 2 }), []);
  const grassMat = useMemo(() => mat('#ffffff', { roughness: 0.7, side: THREE.DoubleSide }), []);
  const snow = useMemo(() => mat('#f4f7fb', { roughness: 0.9 }), []);
  return (
    <group>
      {/* 草地は 断面の くぼみより 奥から（前の ふちが トンネルの 穴から 見えない ように） */}
      <mesh geometry={GEO.box()} material={ground} position={[0, -0.05, -4.64]} scale={[18, 0.1, 9]} receiveShadow />
      <group position={[0, 0, -4.6]}>
        <Scatter count={900} radius={1} rect={[18, 8]} seed={21} geometry={bladeGeometry()} material={grassMat} colors={GRASS} scale={[0.3, 0.6]} tilt={0.5} />
      </group>
      {winter ? <mesh geometry={GEO.box()} material={snow} position={[0, 0.006, -4.5]} scale={[18, 0.012, 9]} receiveShadow /> : null}
    </group>
  );
});

/** 入口の まわりの 土の 山（ほった 土が つもる）。巣を はじめた ころは 女王が 入口を ふさぐ */
function Mound({ nest }: { nest: Nest }) {
  const soil = useMemo(() => mat('#7a5e48', { roughness: 1, bumpMap: grainBump(31, 48), bumpScale: 3 }), []);
  const hole = useMemo(() => mat('#1c140e', { roughness: 1 }), []);
  const rooms = nest.rooms.filter((r) => r.dug >= 1).length;
  const sealed = nest.phase === 'founding' || nest.phase === 'landing';
  const r = 0.1 + Math.min(10, rooms) * 0.025;
  return (
    <group position={[nest.entranceX, 0, -0.07 - r * 0.6]}>
      <mesh geometry={GEO.sphere()} material={soil} scale={[r * 1.4, r * 0.45, r]} castShadow receiveShadow />
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} geometry={GEO.chunk()} material={soil} position={[Math.cos(i * 1.7) * r * 1.3, 0.01, Math.sin(i * 1.7) * r * 0.9]} scale={0.02 + (i % 3) * 0.006} />
      ))}
      {sealed ? null : <mesh geometry={GEO.sphere()} material={hole} position={[0, r * 0.38, r * 0.15]} scale={[0.05, 0.03, 0.04]} />}
    </group>
  );
}

/** 地面の 上の えさ：あまい みつ（葉っぱの 上の しずく）、ちいさな むし */
function BaitModel({ bait }: { bait: Bait }) {
  const leaf = useMemo(() => mat('#ffffff', { map: leafTexture('#5d8f34'), roughness: 0.6, side: THREE.DoubleSide }), []);
  const syrup = useMemo(() => mat('#e8a33a', { roughness: 0.08, clearcoat: 1, opacity: 0.85 }), []);
  const bug = useMemo(() => mat('#a8743e', { roughness: 0.45, clearcoat: 0.5, bumpMap: grainBump(15, 32), bumpScale: 1 }), []);
  const ref = useRef<THREE.Group>(null);
  const k = Math.max(0.35, bait.left / (bait.kind === 'sugar' ? 6 : 4));
  useFrame((_, dt) => {
    const g = ref.current;
    if (g) g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, k, 4, Math.min(dt, 0.1)));
  });
  return (
    <group position={[bait.x, 0.005, BAIT_Z]} scale={1.6}>
      {bait.kind === 'sugar' ? (
        <>
          <mesh geometry={GEO.sphere()} material={leaf} scale={[0.16, 0.01, 0.1]} rotation={[0, 0.4, 0]} receiveShadow />
          <group ref={ref}>
            <mesh geometry={GEO.sphere()} material={syrup} position={[0, 0.02, 0]} scale={[0.07, 0.025, 0.05]} />
          </group>
        </>
      ) : (
        <group ref={ref}>
          {[0, 1].map((i) => (
            <mesh key={i} geometry={GEO.capsule()} material={bug} position={[-0.04 + i * 0.08, 0.025, i * 0.03]} rotation={[Math.PI / 2, 0, 0.6 + i]} scale={[0.035, 0.07, 0.035]} castShadow />
          ))}
        </group>
      )}
    </group>
  );
}

/* ───────────── へやの 中の もの ───────────── */

const rngFor = (seed: number) => {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

/** へやの 床に つみ上げる 小さな もの（InstancedMesh 1 つ） */
function Pile({
  room,
  count,
  geometry,
  material,
  size,
  seed,
  max = 24,
  lie = false,
}: {
  room: Room | undefined;
  count: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  size: [number, number, number];
  seed: number;
  max?: number;
  lie?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = room ? Math.min(max, count) : 0;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !room) return;
    const r = rngFor(seed + room.id * 7);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3(...size);
    const floor = room.y - room.h / 2;
    for (let i = 0; i < n; i++) {
      // 床の まん中に 山の ように よせる
      const row = Math.floor(i / 7);
      const x = room.x + (r() - 0.5) * room.w * (0.55 - row * 0.12);
      p.set(x, floor + size[1] * (1 + row * 1.6), ANT_Z + (r() - 0.5) * 0.06);
      e.set(lie ? Math.PI / 2 : 0, r() * Math.PI * 2, lie ? 0 : (r() - 0.5) * 0.6);
      q.setFromEuler(e);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }, [n, room?.id, room?.x, room?.y, seed]);
  if (!room) return null;
  return <instancedMesh ref={ref} args={[geometry, material, max]} frustumCulled={false} castShadow />;
}

function Chambers({ nest }: { nest: Nest }) {
  const dug = nest.rooms.filter((r) => r.dug >= 1);
  const find = (u: Room['use']) => dug.find((r) => r.use === u);
  const queenRoom = find('queen') ?? dug[0];
  const nursery = find('brood') ?? queenRoom;
  const foodRoom = find('food');
  const trashRoom = find('trash');
  const m = useMemo(
    () => ({
      egg: mat('#f6f0dc', { roughness: 0.35, translucent: true }),
      larva: mat('#f1e6c8', { roughness: 0.5, translucent: true }),
      cocoon: mat('#d9bb8a', { roughness: 0.85, bumpMap: grainBump(44, 32), bumpScale: 1 }),
      syrup: mat('#e8a33a', { roughness: 0.08, clearcoat: 1, opacity: 0.9 }),
      bug: mat('#9a6a3a', { roughness: 0.5 }),
      trash: mat('#3b2f27', { roughness: 1 }),
    }),
    [],
  );
  const count = (stage: string, alate?: boolean) => nest.brood.filter((b) => b.stage === stage && (alate === undefined || b.alate === alate)).length;
  // 子の いる へや（タップで せわを 手つだう）
  const broodRooms = [...new Set([count('egg') > 0 ? queenRoom : undefined, count('larva') + count('pupa') > 0 ? nursery : undefined])].filter((r): r is Room => !!r);
  return (
    <group>
      {broodRooms.map((r) => (
        <mesh
          key={r.id}
          visible={false}
          position={[r.x, r.y, 0.02]}
          onClick={(e) => {
            e.stopPropagation();
            nestTap.groom([e.point.x, r.y - r.h / 2 + 0.08, 0.04]);
          }}
        >
          <boxGeometry args={[r.w, r.h + 0.06, 0.05]} />
        </mesh>
      ))}
      {nest.phase === 'founding' && queenRoom ? <DigMarker room={queenRoom} color="#ffb3c7" /> : null}
      {/* たまごは 女王の そば、幼虫と まゆは 子どもの へや（育ちかたで 分けて おく） */}
      <Pile room={queenRoom} count={count('egg')} geometry={GEO.sphereLo()} material={m.egg} size={[0.017, 0.017, 0.025]} seed={1} />
      <Pile room={nursery} count={count('larva')} geometry={GEO.capsule()} material={m.larva} size={[0.028, 0.032, 0.028]} seed={2} lie />
      <Pile room={nursery} count={count('pupa', false)} geometry={GEO.capsule()} material={m.cocoon} size={[0.03, 0.042, 0.03]} seed={3} lie />
      <Pile room={nursery} count={count('pupa', true)} geometry={GEO.capsule()} material={m.cocoon} size={[0.04, 0.056, 0.04]} seed={4} max={6} lie />
      <Pile room={foodRoom} count={Math.ceil(nest.sugar)} geometry={GEO.sphereLo()} material={m.syrup} size={[0.034, 0.022, 0.03]} seed={5} max={12} />
      <Pile room={foodRoom} count={Math.ceil(nest.protein)} geometry={GEO.capsule()} material={m.bug} size={[0.026, 0.045, 0.026]} seed={6} max={10} lie />
      <Pile room={trashRoom} count={Math.ceil(nest.trash * 2)} geometry={GEO.chunk()} material={m.trash} size={[0.026, 0.02, 0.026]} seed={7} max={16} />
    </group>
  );
}

/** ほっている 所・タップしてほしい へやの しるし（ふわふわ 光る わ） */
function DigMarker({ room, color = '#ffe08a' }: { room: Room; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }), [color]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const k = 1 + Math.sin(clock.elapsedTime * 4) * 0.08;
    m.scale.set((room.w / 2) * k, (room.h / 2) * k, 1);
    material.opacity = 0.45 + Math.sin(clock.elapsedTime * 4) * 0.25;
  });
  return (
    <mesh ref={ref} material={material} position={[room.x, room.y, 0.01]}>
      <ringGeometry args={[0.9, 1, 40]} />
    </mesh>
  );
}

/* ───────────── 女王・羽アリ ───────────── */

const queenAnim = { current: newAnim() };

/** 女王：はねの ある 女王が おりてきて はねを おとし、穴を ほって へやに 入る（landing）。そのあとは 女王の へやに いる */
function Queen({ nest }: { nest: Nest }) {
  const ref = useRef<THREE.Group>(null);
  const wingsRef = useRef<THREE.Group>(null);
  const clock = useRef<number | null>(null);
  const room = nest.rooms.find((r) => r.use === 'queen');
  const spot = useMemo(() => (room ? floorSpot(room, 0.35) : null), [room?.id, room?.x, room?.y]);
  const selected = useNestView((s) => s.selected === -1);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const landing = nest.phase === 'landing';
  const [wingsOn, setWingsOn] = useState(landing);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const g = ref.current;
    const a = queenAnim.current;
    a.t += dt;
    if (!g || !room || !spot) return;
    const n = useNest.getState().nest;
    if (n.phase === 'landing') {
      clock.current = Math.max(clock.current ?? n.landT, n.landT);
      clock.current += dt;
      const t = Math.min(clock.current, LAND_T);
      if (t < 3.5) {
        // 空から ふわっと おりてくる
        const k = t / 3.5;
        const e = 1 - (1 - k) * (1 - k);
        pos.set(n.entranceX - 1.4 * (1 - e), 2.2 * (1 - e), SURF_Z);
        placeOnPath({ x: pos.x, y: 0 }, { x: 1, y: -0.3 }, new THREE.Vector3(), quat, 1);
        a.flap = 1;
        a.walk = 0;
      } else if (t < 6) {
        // はねを じぶんで おとす
        pos.set(n.entranceX, 0, SURF_Z);
        a.flap = 0;
        a.shiver = t < 5 ? 1 : 0;
        if (t > 4.6 && wingsOn) {
          setWingsOn(false);
          emitParticles('leaf', [n.entranceX, 0.12, SURF_Z], 4);
          audio.play('flap');
        }
      } else {
        // 穴を ほって へやへ
        a.shiver = 0;
        const path = tunnelPoints(n, room);
        const k = (t - 6) / (LAND_T - 6);
        let total = 0;
        for (let i = 1; i < path.length; i++) total += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
        let d = total * Math.min(1, k * 1.05);
        let p = path[0]!;
        let dir = { x: 0, y: -1 };
        for (let i = 1; i < path.length; i++) {
          const l = Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
          dir = { x: (path[i]!.x - path[i - 1]!.x) / (l || 1), y: (path[i]!.y - path[i - 1]!.y) / (l || 1) };
          if (d <= l) {
            p = { x: path[i - 1]!.x + dir.x * d, y: path[i - 1]!.y + dir.y * d };
            break;
          }
          d -= l;
          p = path[i]!;
        }
        placeOnPath(p, dir, pos, quat, 1 - Math.exp(-dt * 10));
        a.walk = 1;
        a.gait += dt * 12;
      }
      g.position.copy(pos);
      g.quaternion.copy(quat);
    } else {
      clock.current = null;
      if (wingsOn) setWingsOn(false);
      placeOnPath(spot, { x: 1, y: 0 }, pos, quat, 1);
      g.position.copy(pos);
      g.quaternion.copy(quat);
      a.walk = 0;
      a.flap = 0;
      // たまごを うむ ときの ふるえ と、ふゆの ねむり
      a.shiver = n.phase === 'founding' && Math.sin(a.t * 0.7) > 0.95 ? 1 : 0;
      a.sleep = THREE.MathUtils.damp(a.sleep, seasonAt(n.t) === 'fuyu' ? 1 : 0, 2, dt);
    }
    if (selected) {
      followed.x = g.position.x;
      followed.y = g.position.y + 0.04;
      followed.z = g.position.z;
    }
  });
  if (!room) return null;
  return (
    <group
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        audio.play('pop');
        const n = useNest.getState().nest;
        const job =
          n.phase === 'landing'
            ? 'はねを おとして あなを ほっているよ'
            : n.phase === 'founding'
              ? 'なにも たべずに さいしょの こどもを そだてているよ'
              : seasonAt(n.t) === 'fuyu'
                ? 'ふゆの あいだ じっと しているよ'
                : 'たまごを うんでいるよ';
        selectAnt(-1, { kind: 'queen', job }, ref.current?.position ?? new THREE.Vector3());
      }}
    >
      <group scale={ANT_SCALE * 1.35}>
        <KuroAnt anim={queenAnim} look={KURO_QUEEN} />
        <group ref={wingsRef} visible={wingsOn}>
          <AlateWings anim={queenAnim} />
        </group>
      </group>
      <mesh visible={false} position={[0, 0.05, 0]} scale={0.16}>
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </group>
  );
}

const tmpV = new THREE.Vector3();

interface AlateState {
  id: number;
  anim: { current: ReturnType<typeof newAnim> };
  flying: number;
  male: boolean;
}

/** 羽アリ：巣の 中で 待ち、結婚飛行の ころに 地面へ 出て、タップで とびたつ */
function Alates({ nest }: { nest: Nest }) {
  const [list, setList] = useState<AlateState[]>([]);
  const nextId = useRef(1);
  const refs = useRef(new Map<number, THREE.Group>());
  const ready = flightReady(nest);
  const waiting = list.filter((a) => a.flying === 0).length;
  useEffect(() => {
    if (waiting < nest.alates) {
      const add: AlateState[] = [];
      for (let i = waiting; i < nest.alates; i++) add.push({ id: nextId.current++, anim: { current: newAnim() }, flying: 0, male: i % 2 === 1 });
      setList((l) => [...l, ...add]);
    } else if (waiting > nest.alates) {
      setList((l) => l.filter((a) => a.flying > 0).concat(l.filter((a) => a.flying === 0).slice(0, nest.alates)));
    }
  }, [nest.alates, waiting]);
  const home = nest.rooms.find((r) => r.dug >= 1 && r.use === 'rest') ?? nest.rooms.find((r) => r.dug >= 1 && r.use === 'brood') ?? nest.rooms[0];
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const n = useNest.getState().nest;
    let i = 0;
    let gone = false;
    for (const a of list) {
      const g = refs.current.get(a.id);
      const an = a.anim.current;
      an.t += dt;
      if (!g) continue;
      if (useNestView.getState().selected === 1000 + a.id) {
        g.getWorldPosition(tmpV);
        followed.x = tmpV.x;
        followed.y = tmpV.y + 0.04;
        followed.z = tmpV.z;
      }
      if (a.flying > 0) {
        a.flying += dt;
        an.flap = 1;
        g.position.x += dt * 0.5 * (a.id % 2 ? 1 : -1);
        g.position.y += dt * (0.6 + a.flying * 0.8);
        g.rotation.z = Math.sin(an.t * 3) * 0.2;
        if (a.flying > 4) gone = true;
        continue;
      }
      an.flap = 0;
      if (ready) {
        // 入口の まわりで はねを ふるわせて 待つ
        const x = n.entranceX + (i - (n.alates - 1) / 2) * 0.24;
        g.position.set(THREE.MathUtils.damp(g.position.x, x, 2, dt), 0, SURF_Z - 0.04);
        g.rotation.set(0, (i % 2 ? 1 : -1) * 0.6, 0);
        an.shiver = Math.sin(an.t * 2 + i) > 0.7 ? 0.6 : 0;
      } else if (home) {
        const p = floorSpot(home, 0.15 + (i % 6) * 0.14);
        g.position.set(p.x, home.y - home.h / 2 + 0.003, ANT_Z);
        g.rotation.set(0, i % 2 ? Math.PI / 2 : -Math.PI / 2, 0);
      }
      i++;
    }
    if (gone) setList((l) => l.filter((a) => a.flying <= 4));
  });
  return (
    <group>
      {list.map((a) => (
        <group
          key={a.id}
          ref={(g) => {
            if (g) refs.current.set(a.id, g);
            else refs.current.delete(a.id);
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (a.flying > 0) return;
            if (!useNest.getState().flyOne()) {
              audio.play('pop');
              selectAnt(1000 + a.id, { kind: 'alate', job: 'はるの おわりに とびたつのを まっているよ' }, e.object.getWorldPosition(new THREE.Vector3()));
              return;
            }
            a.flying = 0.001;
            if (useNestView.getState().selected === 1000 + a.id) clearSelection();
            audio.play('flap');
            audio.play('sparkle');
            emitParticles('sparkle', e.object.getWorldPosition(new THREE.Vector3()), 14);
          }}
        >
          <group scale={ANT_SCALE * (a.male ? 0.95 : 1.2)}>
            <KuroAnt anim={a.anim} look={a.male ? { ...KURO_ALATE, gasterSize: [0.034, 0.03, 0.05], head: [0.026, 0.022, 0.028], eye: 0.012 } : KURO_ALATE} />
            <AlateWings anim={a.anim} scale={a.male ? 0.85 : 1} />
          </group>
          <mesh visible={false} position={[0, 0.06, 0]} scale={0.16}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ───────────── シーン ───────────── */

/** アリの すづくり：地面の 断面に クロオオアリの 巣が 育っていく */
export function NestScene() {
  const nest = useNest((s) => s.nest);
  const winter = nest.phase !== 'empty' && seasonAt(nest.t) === 'fuyu';
  const dig = digging(nest);
  const hit = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), []);
  useEffect(() => () => hit.dispose(), [hit]);
  useEffect(() => () => clearSelection(), []);
  return (
    <group>
      <Follow />
      <NightFill />
      <Face nest={nest} />
      <Surface winter={winter} />
      {nest.phase !== 'empty' ? <Mound nest={nest} /> : null}
      {nest.baits.map((b) => (
        <BaitModel key={b.id} bait={b} />
      ))}
      <Chambers nest={nest} />
      {dig && dig.parent >= 0 ? <DigMarker room={dig} /> : null}
      {nest.phase !== 'empty' ? <Queen nest={nest} /> : null}
      <NestAnts workers={nest.workers} majors={nest.majors} />
      <Alates nest={nest} />
      {/* タップの 当たり：土の 面（へやを ほる）・地面の 上（えさを おく／巣の 場所を えらぶ） */}
      <mesh
        material={hit}
        position={[(FACE.x0 + FACE.x1) / 2, (FACE.top - 0.12 + FACE.bottom) / 2, 0.005]}
        onClick={(e) => {
          e.stopPropagation();
          nestTap.ground(e.point.x, e.point.y);
          emitParticles('dust', [e.point.x, e.point.y, 0.05], 4);
        }}
      >
        <planeGeometry args={[FACE.x1 - FACE.x0, FACE.top - 0.12 - FACE.bottom]} />
      </mesh>
      <mesh
        material={hit}
        position={[0, 0.35, -0.12]}
        onClick={(e) => {
          e.stopPropagation();
          nestTap.surface(e.point.x);
        }}
      >
        <planeGeometry args={[FACE.x1 - FACE.x0 + 0.4, 0.94]} />
      </mesh>
      {/* 入口の 目じるし（えらぶ 前） */}
      {nest.phase === 'empty' ? <SitePrompt /> : null}
      <RoomGlow nest={nest} />
    </group>
  );
}

/** 巣の 場所を えらぶ 前：地面の 上で 光る 点が ゆっくり ゆれて「ここを タップ」を 伝える */
function SitePrompt() {
  const ref = useRef<THREE.Group>(null);
  const material = useMemo(() => mat('#ffe08a', { emissive: '#ffd166', emissiveIntensity: 1.2 }), []);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.position.set(Math.sin(t * 0.6) * 1.2, 0.12 + Math.abs(Math.sin(t * 3)) * 0.12, SURF_Z);
  });
  return (
    <group ref={ref}>
      <mesh geometry={GEO.sphere()} material={material} scale={0.05} />
    </group>
  );
}

/** できたての へやを すこしの 間 光らせる */
function RoomGlow({ nest }: { nest: Nest }) {
  const [glow, setGlow] = useState<{ x: number; y: number; until: number } | null>(null);
  const last = useRef(nest.rooms.filter((r) => r.dug >= 1).length);
  useEffect(() => {
    const done = nest.rooms.filter((r) => r.dug >= 1);
    if (done.length > last.current) {
      const r = done[done.length - 1]!;
      const a = roomAnchor(r);
      setGlow({ x: r.x, y: r.y, until: performance.now() + 1600 });
      emitParticles('sparkle', [a.x, a.y + 0.1, 0.02], 16);
    }
    last.current = done.length;
  }, [nest.rooms]);
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0, depthWrite: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    if (!glow) return;
    const left = (glow.until - performance.now()) / 1600;
    material.opacity = Math.max(0, left) * 0.5;
    if (left <= 0) setGlow(null);
  });
  if (!glow) return null;
  return (
    <mesh ref={ref} material={material} position={[glow.x, glow.y, 0.01]} scale={[0.32, 0.15, 1]}>
      <circleGeometry args={[1, 32]} />
    </mesh>
  );
}
