import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { newAnim } from '../../creatures/anim';
import { GestureRunner, type Gesture } from '../../creatures/gestures';
import { gesturesOf, modelFor } from '../../creatures/registry';
import { VISITOR_MODELS } from '../../creatures/visitors';
import { SPECIES } from '../../data/species';
import { VISITORS, type VisitorId } from '../../data/visitors';
import type { SpeciesId } from '../../sim/types';
import { useUi } from '../../state/ui';
import type { CameraShot } from '../../three/CameraRig';
import { Meadow } from '../../three/Diorama';
import { useTier } from '../../three/QualityManager';
import { QUALITY } from '../../three/quality';
import { GEO, mat } from '../../three/materials';
import { woodTexture } from '../../three/textures';

const GUEST_GESTURES: Gesture[] = ['groom', 'look'];

export const zukanShot = (): CameraShot => ({
  // 下半分は解説シートなので、標本が画面の上半分に来るよう注視点を下げる
  position: [0, 1.5, 3.4],
  target: [0, -0.15, 0],
  fov: 40,
  orbit: { minDistance: 2, maxDistance: 5, minPolar: 0.5, maxPolar: 1.45, azimuth: Math.PI },
  // 横長画面では 説明パネルを 右に 出すので、標本を 画面の 左半分の まん中に
  wide: { position: [0, 2.0, 4.2], target: [0, 0.75, 0], shiftX: 0.23 },
});

/** 台座の上で ゆっくり回る虫（ずかんの 3D 標本） */
function Specimen() {
  const z = useUi((s) => s.zukan);
  return z ? <SpecimenView species={z.species} stage={z.stage} /> : null;
}

export function SpecimenView({ species, stage }: { species: SpeciesId; stage: number }) {
  const z = { species, stage };
  const tier = useTier();
  const spin = useRef<THREE.Group>(null);
  const fit = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const frames = useRef(0);
  const gestures = useRef(new GestureRunner());
  const st = SPECIES[z.species].stages[z.stage];
  const entry = st ? modelFor(st.model) : null;
  const flier = entry?.locomotion === 'flutter';
  useLayoutEffect(() => {
    frames.current = 0;
  }, [species, stage]);
  useFrame((_, dt) => {
    const a = anim.current;
    a.t += dt;
    a.energy = 1;
    // 台の 上では、足ぶみと しぐさ（手入れ・見回す・背のび など）を かわるがわる 見せる
    const gesturing = gestures.current.kind !== null;
    const stepping = !gesturing && Math.sin(a.t * 0.45) > 0;
    a.walk = THREE.MathUtils.damp(a.walk, stepping ? 0.6 : 0, 5, dt);
    a.gait += dt * 4 * a.walk;
    a.flap = 0;
    a.bounce = THREE.MathUtils.damp(a.bounce, 0, 6, dt);
    a.startle = Math.max(0, a.startle - dt * 1.3);
    if (entry) gestures.current.update(dt, a, gesturesOf(entry), !stepping && a.startle < 0.1);
    // チョウは はねの もようが 見えるよう、ひらきぎみに とまる
    if (flier) a.fan = Math.max(a.fan, 0.8);
    if (spin.current) spin.current.rotation.y += dt * 0.5;
    // モデルの 大きさは 種と 段階で ちがうので、外接箱から 台に おさまる 大きさに そろえる。
    // 幼虫の 節などは 最初の フレームで 位置が 決まるので、少し 待ってから 測る
    const n = ++frames.current;
    const f = fit.current;
    const g = inner.current;
    const sp = spin.current;
    if ((n === 2 || n === 12) && f && g && sp) {
      const ry = sp.rotation.y;
      sp.rotation.y = 0;
      f.scale.setScalar(1);
      g.position.set(0, 0, 0);
      sp.updateMatrixWorld(true);
      // 台座の 座標で 測る（クイズ画面など、親が 動いて いても ずれない）
      const box = new THREE.Box3().setFromObject(g).applyMatrix4(new THREE.Matrix4().copy(sp.matrixWorld).invert());
      const size = box.getSize(new THREE.Vector3());
      const c = box.getCenter(new THREE.Vector3());
      const k = Math.min(1.35 / Math.max(0.05, size.x, size.z), 0.8 / Math.max(0.05, size.y));
      g.position.set(-c.x, -box.min.y + (flier ? 0.08 / k : 0), -c.z);
      f.scale.setScalar(k);
      sp.rotation.y = ry;
    }
  });
  if (!st || !entry) return null;
  const Model = entry.C;
  return (
    <group ref={spin} position={[0, 0.62, 0]} onPointerDown={() => {
        anim.current.bounce = 1;
        anim.current.startle = 1;
      }}
    >
      <group ref={fit} scale={1.2 / Math.max(0.6, entry.length)}>
        <group ref={inner}>
          <Model key={`${z.species}-${z.stage}`} anim={anim} sex="male" molts={st.molts ?? 0} outlines={QUALITY[tier].outlines} />
        </group>
      </group>
    </group>
  );
}

/**
 * にわの おきゃくさんを 台座の 上で 見せる。モデルの 大きさは 種ごとに ちがうので、
 * 外接箱から 横幅を そろえて 台の 上面に のせる。タップすると いつもの 反応（まるまる・あしを けるなど）。
 */
function GuestSpecimen({ id }: { id: VisitorId }) {
  const Model = VISITOR_MODELS[id];
  const flier = VISITORS[id].where === 'air';
  const spin = useRef<THREE.Group>(null);
  const fit = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const anim = useRef(newAnim());
  const gestures = useRef(new GestureRunner());
  useLayoutEffect(() => {
    const f = fit.current;
    const g = inner.current;
    if (!f || !g) return;
    f.scale.setScalar(1);
    g.position.set(0, 0, 0);
    f.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    const size = box.getSize(new THREE.Vector3());
    const k = 1.25 / Math.max(0.05, size.x, size.z);
    const c = box.getCenter(new THREE.Vector3());
    g.position.set(-c.x, -box.min.y + (flier ? 0.08 / k : 0), -c.z);
    f.scale.setScalar(k);
  }, [id, flier]);
  useFrame((_, dt) => {
    const a = anim.current;
    a.t += dt;
    a.energy = 1;
    // チョウ・トンボは ときどき はねを うごかす。ほかは その場で あしぶみ
    a.flap = flier ? (Math.sin(a.t * 0.8) > 0.6 ? 1 : 0) : 0;
    // 足ぶみと しぐさ（手入れ・見回す）を かわるがわる
    const stepping = !flier && gestures.current.kind === null && Math.sin(a.t * 0.45) > 0;
    a.walk = THREE.MathUtils.damp(a.walk, stepping ? 0.4 : 0, 5, dt);
    a.gait += dt * 4 * (a.walk / 0.4);
    a.startle = Math.max(0, a.startle - dt * 1.3);
    gestures.current.update(dt, a, GUEST_GESTURES, !stepping && a.flap === 0 && a.startle < 0.1 && a.spray < 0.1);
    a.spray = THREE.MathUtils.damp(a.spray, 0, 1.5, dt);
    a.bounce = THREE.MathUtils.damp(a.bounce, 0, 6, dt);
    if (spin.current) spin.current.rotation.y += dt * 0.5;
  });
  return (
    <group
      ref={spin}
      position={[0, 0.62, 0]}
      onPointerDown={() => {
        // 出典の ある 反応だけ（まるまる・ひっこむ・あしを けって はねる・ひかる）
        const r = VISITORS[id].react;
        if (r === 'curl' || r === 'hop' || r === 'warn' || id === 'hotaru') {
          anim.current.spray = 1;
          if (r === 'warn') audio.play('clack');
        }
        anim.current.bounce = 1;
        anim.current.startle = 1;
      }}
    >
      <group ref={fit}>
        <group ref={inner}>
          <Model key={id} anim={anim} />
        </group>
      </group>
    </group>
  );
}

/** 木の 台座（上面は 白く とばないよう 落ちついた 生成り色） */
export function Pedestal() {
  const wood = useMemo(() => mat('#e3c9a6', { map: woodTexture(), roughness: 0.8 }), []);
  const top = useMemo(() => mat('#b59d7c', { map: woodTexture(), roughness: 0.9 }), []);
  return (
    <>
      <mesh geometry={GEO.cylinder()} material={wood} position={[0, 0.3, 0]} scale={[0.9, 0.6, 0.9]} castShadow receiveShadow />
      <mesh geometry={GEO.cylinder()} material={top} position={[0, 0.61, 0]} scale={[0.85, 0.03, 0.85]} receiveShadow />
    </>
  );
}

export function ZukanScene() {
  // 一覧の ときは 台座を 出さない（からっぽの 台だけが 大きく 見えて しまうため）
  const open = useUi((s) => s.zukan !== null);
  const guest = useUi((s) => (s.zukan === null && s.zukanTab === 'guest' ? s.zukanGuest : null));
  return (
    <group>
      <Meadow radius={8} />
      {open || guest ? <Pedestal /> : null}
      <Specimen />
      {guest ? <GuestSpecimen key={guest} id={guest} /> : null}
    </group>
  );
}
