import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Creature, DecorId, SpeciesDef, SubstrateId } from '../sim/types';
import { rng, Scatter } from '../three/Diorama';
import { GEO, mat, sharedGeo } from '../three/materials';
import { grainBump, leafLitterTexture, lidTexture, matTexture, paperTexture, soilTexture, woodCrossTexture } from '../three/textures';
import { CASE } from './case';
import { Decor } from './Decor';

export { CASE };

/** 土の断面（前の壁側の空洞）の奥行き */
const CAVITY = 0.9;

function substrateMap(id: SubstrateId) {
  switch (id) {
    case 'mat':
      return matTexture();
    case 'soil':
    case 'moistSoil':
      return soilTexture();
    case 'leafbed':
      return leafLitterTexture();
    case 'paper':
      return paperTexture();
    case 'wood':
      return woodCrossTexture();
  }
}

const CRUMBS: Record<SubstrateId, string[]> = {
  mat: ['#3a2618', '#4d3220', '#6b4a30', '#80603e'],
  soil: ['#5b4838', '#7a6652', '#968572'],
  moistSoil: ['#3f3328', '#5a4a3a', '#6c7a4a'],
  leafbed: ['#8a6a3c', '#a07a48', '#6f8a3a'],
  paper: [],
  wood: ['#c9a06a', '#b08850'],
};

export function soilTop(sp: SpeciesDef): number {
  return Math.max(0.06, CASE.h * sp.habitat.soilDepth);
}

/** 壁に付く水滴の数で しめりけを見せる */
function Droplets({ moisture }: { moisture: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => mat('#dceef6', { roughness: 0.0, clearcoat: 1, opacity: 0.18, envMapIntensity: 3 }), []);
  const N = 60;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = rng(42);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const x = (r() - 0.5) * (CASE.w - 0.3);
      const y = 0.3 + r() * (CASE.h - 0.5);
      const s = 0.008 + r() * r() * 0.028;
      mtx.compose(new THREE.Vector3(x, y, CASE.d / 2 + 0.006), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.25, s * 0.35));
      m.setMatrixAt(i, mtx);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(() => {
    if (ref.current) ref.current.count = Math.round(N * Math.max(0, moisture - 0.35) * 1.5);
  });
  return <instancedMesh ref={ref} args={[GEO.sphereLo(), material, N]} frustumCulled={false} />;
}

/** ふん。きれいさが下がるほど増える（スコップで消える） */
function Droppings({ clean, top, seed }: { clean: number; top: number; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => mat('#2e2117', { roughness: 0.9, bumpMap: grainBump(5, 32), bumpScale: 2 }), []);
  const N = 30;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = rng(seed);
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < N; i++) {
      q.setFromEuler(new THREE.Euler(r() * 0.4, r() * Math.PI, 0));
      mtx.compose(new THREE.Vector3((r() - 0.5) * (CASE.w - 0.6), top + 0.015, (r() - 0.5) * (CASE.d - 0.6)), q, new THREE.Vector3(0.035, 0.028, 0.055));
      m.setMatrixAt(i, mtx);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [top, seed]);
  useFrame(() => {
    if (ref.current) ref.current.count = Math.round(N * Math.max(0, 0.95 - clean));
  });
  return <instancedMesh ref={ref} args={[GEO.sphereLo(), material, N]} frustumCulled={false} castShadow />;
}

interface Props {
  sp: SpeciesDef;
  creature: Creature;
  detail: boolean;
  /** 壁の水滴（寄りのカメラでは消す） */
  droplets?: boolean;
}

/** 本物の プラケースに 近い飼育ケース（透明の壁・通気スリットのある ふた・土・飾り・水滴・ふん） */
export function Terrarium({ sp, creature, detail, droplets = true }: Props) {
  const top = soilTop(sp);
  const sub = sp.habitat.substrate;
  const map = substrateMap(sub);
  // 土の色は しめりけで変わる（ケースごとに専用のマテリアル）
  const soilMat = useMemo(() => new THREE.MeshStandardMaterial({ map, roughness: 0.95, bumpMap: grainBump(3, 96), bumpScale: 2 }), [map]);
  const cavityMat = useMemo(() => new THREE.MeshStandardMaterial({ map, color: '#9a8a7a', roughness: 1 }), [map]);
  const wall = useMemo(
    () => mat('#eef7fb', { roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, opacity: 0.12, side: THREE.DoubleSide, envMapIntensity: 2.2 }),
    [],
  );
  const edge = useMemo(() => mat('#dfeef2', { roughness: 0.1, clearcoat: 1, opacity: 0.5 }), []);
  const lid = useMemo(() => mat('#ffffff', { map: lidTexture(), roughness: 0.45, clearcoat: 0.3 }), []);
  const moisture = creature.needs.moisture;
  const usesMoisture = sp.stages[creature.stage]?.decay.moisture !== undefined;
  const underground = !!sp.stages[creature.stage]?.underground;
  const wet = useMemo(() => new THREE.Color('#6a6a6a'), []);
  const dry = useMemo(() => new THREE.Color('#ffffff'), []);
  useFrame(() => {
    soilMat.color.copy(wet).lerp(dry, usesMoisture ? 1 - moisture : 0.35);
  });

  const { w, d, h } = CASE;
  return (
    <group>
      {/* 土・床材。土の中で暮らす段階は、前の壁側を断面にして 中が見えるようにする */}
      {underground ? (
        <>
          <mesh material={soilMat} geometry={GEO.box()} position={[0, top / 2, -CAVITY / 2]} scale={[w - 0.02, top, d - 0.02 - CAVITY]} receiveShadow />
          <mesh material={soilMat} geometry={GEO.box()} position={[0, top - 0.06, d / 2 - CAVITY / 2]} scale={[w - 0.02, 0.12, CAVITY - 0.02]} receiveShadow />
          <mesh material={soilMat} geometry={GEO.box()} position={[0, 0.01, d / 2 - CAVITY / 2]} scale={[w - 0.02, 0.02, CAVITY - 0.02]} receiveShadow />
          <mesh material={cavityMat} geometry={GEO.box()} position={[0, top / 2, d / 2 - CAVITY + 0.005]} scale={[w - 0.04, top - 0.14, 0.01]} receiveShadow />
        </>
      ) : (
        <mesh material={soilMat} geometry={GEO.box()} position={[0, top / 2, 0]} scale={[w - 0.02, top, d - 0.02]} receiveShadow />
      )}
      {detail && CRUMBS[sub].length ? (
        <Scatter count={140} radius={0} rect={[w - 0.2, d - 0.2]} seed={creature.slot * 7 + 1} geometry={GEO.sphereLo()} colors={CRUMBS[sub]} scale={[0.015, 0.05]} stretchY={0.45} y={top + 0.004} />
      ) : null}
      {detail && droplets ? <Droplets moisture={usesMoisture ? moisture : 0} /> : null}
      <Droppings clean={creature.needs.clean} top={top} seed={creature.slot + 3} />
      {sp.habitat.decor.map((id, i) => (
        <Decor key={id} id={id} top={top} index={i} />
      ))}
      {creature.house ? <Decor id={houseFor(sp.id)} top={top} index={9} /> : null}
      {/* 透明な プラスチックの 壁と、少し くもった 角 */}
      <mesh material={wall} geometry={GEO.box()} position={[0, h / 2, 0]} scale={[w, h, d]} renderOrder={5} />
      <mesh material={edge} geometry={edgeGeometry()} renderOrder={6} />
      {/* ふた（通気スリット）と 取っ手 */}
      <mesh material={lid} geometry={GEO.box()} position={[0, h + 0.05, 0]} scale={[w + 0.14, 0.08, d + 0.14]} castShadow />
      <mesh material={lid} geometry={GEO.box()} position={[0, h + 0.13, 0]} scale={[0.9, 0.08, 0.2]} />
    </group>
  );
}

/** 箱の 角（1 ジオメトリにまとめて 1 ドローコール） */
function edgeGeometry(): THREE.BufferGeometry {
  return sharedGeo('caseEdges', () => {
    const { w, d, h } = CASE;
    const parts: THREE.BufferGeometry[] = [];
    const add = (p: [number, number, number], sc: [number, number, number]) => {
      const g = new THREE.BoxGeometry(1, 1, 1);
      g.scale(...sc);
      g.translate(...p);
      parts.push(g);
    };
    const t = 0.035;
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) add([x, h / 2, z], [t, h, t]);
    for (const z of [-d / 2, d / 2]) add([0, 0.01, z], [w + t, t, t]);
    for (const x of [-w / 2, w / 2]) add([x, 0.01, 0], [t, t, d + t]);
    return mergeGeometries(parts)!;
  });
}

export function houseFor(id: SpeciesDef['id']) {
  const map: Record<SpeciesDef['id'], DecorId> = {
    kabutomushi: 'log',
    namiageha: 'branch',
    suzumushi: 'bark',
    nanahoshi: 'leaf',
    kaiko: 'mulberryTwig',
    miidera: 'stone',
    ookamakiri: 'branch',
    tobizumukade: 'bark',
    madarasasori: 'bark',
    gomadara: 'branch',
    ookuwagata: 'log',
  };
  return map[id];
}
