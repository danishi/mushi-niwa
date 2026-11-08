import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Creature, SpeciesDef, SubstrateId } from '../sim/types';
import { leafGeometry, rng, Scatter } from '../three/Diorama';
import { GEO, toon } from '../three/toon';
import { Decor } from './Decor';

import { CASE } from './case';

/** 土の断面（前のガラス側の空洞）の奥行き */
const CAVITY = 0.9;

export { CASE };

const SUBSTRATE: Record<SubstrateId, { wet: string; dry: string; crumbs: string[] }> = {
  mat: { wet: '#4e3426', dry: '#8a6a50', crumbs: ['#3e2a1e', '#5d4030', '#6d4c3a'] },
  soil: { wet: '#5d4636', dry: '#9a7f66', crumbs: ['#4a3628', '#6d5443'] },
  moistSoil: { wet: '#4a3a2e', dry: '#8f7a64', crumbs: ['#3b2d23', '#5a4636', '#7a8a5a'] },
  leafbed: { wet: '#6b5a3c', dry: '#a08a62', crumbs: ['#c5a46e', '#9ccc65', '#b5835a'] },
  paper: { wet: '#f4efe4', dry: '#fbf8f1', crumbs: ['#e8e2d0'] },
};

export function soilTop(sp: SpeciesDef): number {
  return Math.max(0.06, CASE.h * sp.habitat.soilDepth);
}

/** ガラスに付く水滴の数でしめりけを見せる */
function Droplets({ moisture }: { moisture: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#e6f7ff', transparent: true, opacity: 0.85, depthWrite: false }),
    [],
  );
  const N = 40;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = rng(42);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const x = (r() - 0.5) * (CASE.w - 0.3);
      const y = 0.4 + r() * (CASE.h - 0.6);
      const s = 0.025 + r() * 0.035;
      mtx.compose(new THREE.Vector3(x, y, CASE.d / 2 + 0.012), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.3, s * 0.4));
      m.setMatrixAt(i, mtx);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(() => {
    if (ref.current) ref.current.count = Math.round(N * Math.max(0, moisture - 0.35) * 1.5);
  });
  return <instancedMesh ref={ref} args={[GEO.sphereLo(), mat, N]} frustumCulled={false} />;
}

/** ふん。きれいさが下がるほど増える（スコップで消える） */
function Droppings({ clean, top, seed }: { clean: number; top: number; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => toon('#3a2a1e'), []);
  const N = 24;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = rng(seed);
    const mtx = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < N; i++) {
      q.setFromEuler(new THREE.Euler(0, r() * Math.PI, 0));
      mtx.compose(
        new THREE.Vector3((r() - 0.5) * (CASE.w - 0.6), top + 0.02, (r() - 0.5) * (CASE.d - 0.6)),
        q,
        new THREE.Vector3(0.05, 0.035, 0.075),
      );
      m.setMatrixAt(i, mtx);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [top, seed]);
  useFrame(() => {
    if (ref.current) ref.current.count = Math.round(N * Math.max(0, 0.95 - clean));
  });
  return <instancedMesh ref={ref} args={[GEO.sphereLo(), mat, N]} frustumCulled={false} />;
}

interface Props {
  sp: SpeciesDef;
  creature: Creature;
  detail: boolean;
}

/** ジオラマ風の飼育ケース（ガラス・ふた・土・飾り・水滴・ふん） */
export function Terrarium({ sp, creature, detail }: Props) {
  const top = soilTop(sp);
  const sub = SUBSTRATE[sp.habitat.substrate];
  // 土の色はしめりけで変わる（ケースごとに 1 つだけの専用マテリアル）
  const soilMat = useMemo(() => new THREE.MeshToonMaterial({ color: sub.wet, gradientMap: toon('#fff').gradientMap }), [sub.wet]);
  const glass = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
    [],
  );
  const frame = useMemo(() => toon('#7cb342'), []);
  const wetC = useMemo(() => new THREE.Color(sub.wet), [sub.wet]);
  const dryC = useMemo(() => new THREE.Color(sub.dry), [sub.dry]);
  const moisture = creature.needs.moisture;
  const underground = !!sp.stages[creature.stage]?.underground;
  const cavityMat = useMemo(() => toon('#3a271c'), []);
  const usesMoisture = sp.stages[creature.stage]?.decay.moisture !== undefined;
  useFrame(() => {
    soilMat.color.copy(wetC).lerp(dryC, usesMoisture ? 1 - moisture : 0.2);
  });

  const { w, d, h } = CASE;
  const edges: Array<{ p: [number, number, number]; s: [number, number, number] }> = [];
  for (const x of [-w / 2, w / 2])
    for (const z of [-d / 2, d / 2]) edges.push({ p: [x, h / 2, z], s: [0.06, h, 0.06] });
  for (const y of [0, h])
    for (const z of [-d / 2, d / 2]) edges.push({ p: [0, y, z], s: [w + 0.06, 0.06, 0.06] });
  for (const y of [0, h])
    for (const x of [-w / 2, w / 2]) edges.push({ p: [x, y, 0], s: [0.06, 0.06, d + 0.06] });

  return (
    <group>
      {/* 土・床材。土の中で暮らす段階は、前のガラス側を断面にして中が見えるようにする */}
      {underground ? (
        <>
          <mesh material={soilMat} geometry={GEO.box()} position={[0, top / 2, -CAVITY / 2]} scale={[w - 0.02, top, d - 0.02 - CAVITY]} receiveShadow />
          <mesh material={soilMat} geometry={GEO.box()} position={[0, top - 0.06, d / 2 - CAVITY / 2]} scale={[w - 0.02, 0.12, CAVITY - 0.02]} />
          <mesh material={soilMat} geometry={GEO.box()} position={[0, 0.01, d / 2 - CAVITY / 2]} scale={[w - 0.02, 0.02, CAVITY - 0.02]} />
          <mesh material={cavityMat} geometry={GEO.box()} position={[0, top / 2, d / 2 - CAVITY + 0.005]} scale={[w - 0.04, top - 0.14, 0.01]} />
        </>
      ) : (
        <mesh material={soilMat} geometry={GEO.box()} position={[0, top / 2, 0]} scale={[w - 0.02, top, d - 0.02]} receiveShadow />
      )}
      {detail ? (
        <>
          <Scatter
            count={sp.habitat.substrate === 'paper' ? 0 : 90}
            radius={0}
            rect={[w - 0.2, d - 0.2]}
            seed={creature.slot * 7 + 1}
            geometry={sp.habitat.substrate === 'leafbed' ? leafGeometry() : GEO.sphereLo()}
            colors={sub.crumbs}
            scale={sp.habitat.substrate === 'leafbed' ? [0.15, 0.3] : [0.03, 0.07]}
            stretchY={0.5}
            y={top + 0.005}
          />
          <Droplets moisture={usesMoisture ? moisture : 0} />
        </>
      ) : null}
      <Droppings clean={creature.needs.clean} top={top} seed={creature.slot + 3} />
      {sp.habitat.decor.map((id, i) => (
        <Decor key={id} id={id} top={top} index={i} />
      ))}
      {creature.house ? <Decor id={houseFor(sp.id)} top={top} index={9} /> : null}
      {/* ガラス（背面・左右・前面） */}
      <mesh material={glass} geometry={GEO.box()} position={[0, h / 2, 0]} scale={[w, h, d]} renderOrder={5} />
      {/* フレームとふた */}
      {edges.map((e, i) => (
        <mesh key={i} material={frame} geometry={GEO.box()} position={e.p} scale={e.s} />
      ))}
      <mesh material={frame} geometry={GEO.box()} position={[0, h + 0.05, 0]} scale={[w + 0.14, 0.08, d + 0.14]} />
      <mesh material={toon('#5d9b2f')} geometry={GEO.cylinder()} position={[0, h + 0.14, 0]} scale={[0.35, 0.1, 0.18]} />
    </group>
  );
}

export function houseFor(id: SpeciesDef['id']) {
  return ({ kabutomushi: 'log', namiageha: 'branch', suzumushi: 'bark', nanahoshi: 'leaf', kaiko: 'mulberryTwig', miidera: 'stone' } as const)[id];
}
