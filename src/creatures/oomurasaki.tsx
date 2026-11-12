import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { leafGeometry } from '../three/Diorama';
import { GEO, mat, SURF } from '../three/materials';
import { grainBump, leafTexture, oomurasakiWing, wrinkleBump } from '../three/textures';
import { larvaReach, M, useBodyMotion } from './common';
import { abdomenY, cachedTube, pupaGeo, segmentGeo, shapeGeo } from './geom';
import { Antenna, butterflyWingAngle, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research-4.md §B（オオムラサキ）。形は 図鑑の 記載と 一般的な 形態に もとづく */

/** たまご：エノキの 葉の 上に うみつけられた、うすい みどりの まるい たまごの かたまり */
export function OomurasakiEgg({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  const leafMat = useMemo(() => ({ ...SURF.plant(), map: leafTexture('#4b7a2c'), side: THREE.DoubleSide }), []);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = Math.sin(anim.current.t * 30) * 0.05 * anim.current.shiver;
  });
  const eggs: Array<[number, number]> = [
    [0, 0],
    [0.07, 0.02],
    [-0.07, 0.01],
    [0.03, 0.07],
    [-0.04, 0.07],
    [0.02, -0.06],
    [-0.05, -0.06],
    [0.09, -0.04],
  ];
  return (
    <group>
      <M geo={leafGeometry()} color="#ffffff" surface={leafMat} scale={0.95} part="egg" />
      <group ref={ref} position={[0, 0.05, 0.42]}>
        {eggs.map(([x, z], i) => (
          <Part key={i} geometry={GEO.sphere()} color="#cfe0a2" surface={{ roughness: 0.35, clearcoat: 0.8 }} position={[x, 0, z]} scale={[0.032, 0.036, 0.032]} castShadow={i === 0} part="egg" />
        ))}
      </group>
    </group>
  );
}

/**
 * ようちゅう：ナメクジの ような みどりの からだ。頭に えだわかれした 2 本の つの、
 * せなかに 4 対の とっき、おしりは ふたまた。
 * （冬ごしの 体色の 変化は 出典で 確かめられなかったので 色は 変えない）
 */
export function OomurasakiLarva({ anim, molts }: ModelProps) {
  const segs = useRef<Array<THREE.Mesh | null>>([]);
  const head = useRef<THREE.Group>(null);
  const body = useBodyMotion(anim, 0.3, true);
  const size = 0.55 + molts * 0.13;
  const base = '#7fae4a';
  const light = '#a8cc6c';
  const surf = useMemo(() => ({ roughness: 0.6, clearcoat: 0.25, bumpMap: wrinkleBump(), bumpScale: 0.5 }), []);
  const N = 10;
  useFrame(() => {
    const a = anim.current;
    for (let i = 0; i < N; i++) {
      const m = segs.current[i];
      if (!m) continue;
      const lift = Math.max(0, Math.sin(a.gait * 2 - i * 0.8)) * 0.035 * a.walk;
      const [rx, ry] = larvaReach(a, i);
      m.position.set(rx, 0.13 + lift + ry, 0.42 - i * 0.095);
      // まん中が いちばん ふとく、前と うしろに むかって ほそくなる
      const k = 1 - Math.abs(i - 3.5) / 6.5;
      const r = 0.06 + k * 0.08;
      m.scale.set(r, r * 0.95, r * 0.75);
    }
    // いかく：頭を もちあげて つのを ふる
    if (head.current) {
      const [rx, ry] = larvaReach(a, -0.6);
      head.current.position.set(rx, 0.14 + ry, 0.52);
      head.current.rotation.x = -a.spray * 0.5 - a.eat * 0.15 - a.rear * 0.35;
      head.current.rotation.y = a.look * 0.45;
      head.current.rotation.z = Math.sin(a.t * 12) * 0.12 * a.spray;
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
            color={i % 2 ? base : light}
            surface={surf}
            castShadow={i % 3 === 0}
            part="body"
          >
            {/* せなかの とっき（2〜5 ばんめの 節） */}
            {i >= 2 && i <= 5 ? <M geo={GEO.cone()} color={'#c7dc8a'} surface={surf} position={[0, 0.95, 0]} rotation={[-0.3, 0, 0]} scale={[0.22, 0.4, 0.22]} part="body" /> : null}
          </Part>
        ))}
        {/* よこの うすい すじ */}
        {[1, -1].map((s) => (
          <M key={s} geo={GEO.box()} color={'#d9e8a8'} position={[s * 0.1, 0.11, 0.0]} rotation={[0, s * 0.05, 0]} scale={[0.008, 0.012, 0.7]} />
        ))}
        {/* おしりの ふたまた */}
        {[1, -1].map((s) => (
          <M key={`t${s}`} geo={GEO.cone()} color={base} surface={surf} position={[s * 0.03, 0.12, -0.5]} rotation={[-Math.PI / 2 - 0.1, 0, s * 0.35]} scale={[0.025, 0.12, 0.025]} part="tail" />
        ))}
        {/* 頭と 2 本の えだわかれした つの */}
        <group ref={head} position={[0, 0.14, 0.52]}>
          <Part geometry={GEO.sphere()} color={'#6f9e3f'} surface={SURF.chitin(0.4)} scale={[0.07, 0.075, 0.06]} part="horns" />
          <CompoundEye position={[0.04, -0.01, 0.04]} size={0.01} />
          <CompoundEye position={[-0.04, -0.01, 0.04]} size={0.01} />
          {[1, -1].map((s) => (
            <group key={s} position={[s * 0.035, 0.05, 0]} rotation={[-0.5, 0, -s * 0.35]}>
              <Part geometry={cachedTube('omHorn', [[0, 0, 0], [0, 0.08, 0.01], [0, 0.16, -0.01]], 0.014, 0.008, 8, 6)} color={'#5f8f36'} surface={surf} part="horns" />
              {[0.05, 0.1, 0.14].map((y) => (
                <M key={y} geo={GEO.cone()} color={'#5f8f36'} position={[0.012, y, 0]} rotation={[0, 0, -1.1]} scale={[0.006, 0.03, 0.006]} />
              ))}
            </group>
          ))}
        </group>
        {/* 胸あし・腹あし */}
        {[0, 1, 2].map((p) => (
          <group key={p} position={[0, 0.05, 0.42 - p * 0.07]}>
            <Leg position={[0.05, 0, 0]} side={1} pair={p} spec={LARVA_LEG} color="#4b6a2a" anim={anim} spread={-0.5} />
            <Leg position={[-0.05, 0, 0]} side={-1} pair={p} spec={LARVA_LEG} color="#4b6a2a" anim={anim} spread={-0.5} />
          </group>
        ))}
        {[0.05, -0.05, -0.15, -0.25, -0.42].map((z) =>
          [1, -1].map((s) => <M key={`${z}${s}`} color={base} position={[s * 0.06, 0.04, z]} scale={[0.03, 0.04, 0.035]} />),
        )}
      </group>
    </group>
  );
}

const LARVA_LEG: LegSpec = { femur: 0.035, tibia: 0.035, tarsus: 0.02, thick: 0.01, tarsi: 1 };

/** さなぎ：エノキの 枝や 葉の うらに、おしりで ぶらさがる（垂蛹）。うすい みどりで、からだが たてに ひらたい */
export function OomurasakiPupa({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  const surf = useMemo(() => ({ roughness: 0.4, clearcoat: 0.6, bumpMap: grainBump(31, 64), bumpScale: 0.6 }), []);
  useFrame(() => {
    const a = anim.current;
    if (ref.current) ref.current.rotation.z = Math.sin(a.t * 1.1) * 0.03 + Math.sin(a.t * 30) * 0.05 * Math.max(a.shiver, a.bounce);
  });
  return (
    <group>
      {/* 枝と 葉 */}
      <M geo={GEO.cylinder()} color="#6d5040" surface={{ roughness: 0.9 }} position={[0, 1.15, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.04, 1.2, 0.04]} castShadow />
      <M geo={leafGeometry()} color="#ffffff" surface={{ ...SURF.plant(), map: leafTexture('#4f7d2e'), side: THREE.DoubleSide }} position={[0.3, 1.13, 0]} rotation={[0.1, 0.4, 0]} scale={0.5} />
      <group ref={ref} position={[0, 1.13, 0]}>
        {/* 尾の 先の かぎ（枝に 糸で とめる） */}
        <M geo={GEO.cylinder()} color="#5c7d3a" position={[0, -0.03, 0]} scale={[0.008, 0.06, 0.008]} part="cremaster" />
        <Part geometry={pupaGeo()} color="#a9cf86" surface={surf} position={[0, -0.28, 0]} rotation={[Math.PI, 0, 0]} scale={[0.09, 0.24, 0.15]} castShadow part="pupa" />
        {/* せなかの ふちの 白い すじ */}
        <M geo={GEO.box()} color="#e8f0d8" position={[0, -0.28, -0.14]} rotation={[0.1, 0, 0]} scale={[0.01, 0.4, 0.01]} />
        {/* はねの 形 */}
        {[1, -1].map((s) => (
          <M key={s} color="#b6d995" surface={surf} position={[s * 0.05, -0.36, 0.06]} scale={[0.05, 0.14, 0.09]} part="pupa" />
        ))}
        {/* 頭の 小さな 2 つの とっき */}
        {[1, -1].map((s) => (
          <M key={`h${s}`} geo={GEO.cone()} color="#98c278" position={[s * 0.03, -0.52, 0.02]} rotation={[Math.PI, 0, 0]} scale={[0.015, 0.04, 0.015]} part="pupa" />
        ))}
      </group>
    </group>
  );
}

const foreWing = (s: THREE.Shape) => {
  s.moveTo(0, 0);
  s.bezierCurveTo(0.25, 0.25, 0.7, 0.5, 1.0, 0.46);
  // 外がわの ふちは すこし へこむ
  s.bezierCurveTo(0.9, 0.3, 0.92, 0.12, 0.78, -0.05);
  s.bezierCurveTo(0.6, -0.12, 0.3, -0.1, 0, -0.05);
};
const hindWing = (s: THREE.Shape) => {
  s.moveTo(0, -0.04);
  s.bezierCurveTo(0.4, 0.0, 0.75, -0.2, 0.72, -0.5);
  // 波うつ ふち
  s.bezierCurveTo(0.7, -0.62, 0.55, -0.72, 0.42, -0.7);
  s.bezierCurveTo(0.25, -0.66, 0.08, -0.45, 0, -0.2);
};

function Wing({ side, anim, male }: { side: 1 | -1; anim: ModelProps['anim']; male: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const fore = shapeGeo('omFore', foreWing);
  const hind = shapeGeo('omHind', hindWing);
  const foreMat = useMemo(() => mat('#ffffff', { ...SURF.scales(), map: oomurasakiWing('fore', male), side: THREE.DoubleSide, ...(male ? { sheen: 0.35, sheenColor: '#6a52d0' } : {}) }), [male]);
  const hindMat = useMemo(() => mat('#ffffff', { ...SURF.scales(), map: oomurasakiWing('hind', male), side: THREE.DoubleSide, ...(male ? { sheen: 0.35, sheenColor: '#6a52d0' } : {}) }), [male]);
  useFrame(() => {
    const a = anim.current;
    // 力づよく はばたき、あいだに すーっと 滑空する（滑空の 切りかえは Actor が 決める）
    if (ref.current) ref.current.rotation.z = butterflyWingAngle(a, 9, 0.85);
  });
  return (
    <group position={[side * 0.02, 0.06, 0.06]} scale={[side, 1, 1]}>
      <group ref={ref}>
        <group rotation={[Math.PI / 2, 0, 0]} scale={0.95}>
          <mesh geometry={fore} material={foreMat} castShadow userData={{ part: 'wings' }} />
          <mesh geometry={hind} material={hindMat} castShadow position={[0, 0, 0.002]} userData={{ part: 'wings' }} />
        </group>
      </group>
    </group>
  );
}

const ADULT_LEG: LegSpec = { femur: 0.12, tibia: 0.13, tarsus: 0.12, thick: 0.011, tarsi: 5 };

/**
 * 成虫：おおきな チョウ。こげ茶の はねに 白と 黄色の 斑。オスは はねの 表が 青むらさきに かがやく。
 * 前あしは みじかく たたんでいて、とまるときは 4 本の あしで とまる。
 */
export function OomurasakiAdult({ anim, sex }: ModelProps) {
  const body = useBodyMotion(anim, 0);
  const tongue = useRef<THREE.Mesh>(null);
  const male = sex === 'male';
  const fur = useMemo(() => ({ roughness: 0.75, sheen: 0.5, sheenColor: '#5a4a38', bumpMap: grainBump(27, 96), bumpScale: 1 }), []);
  useFrame(() => {
    if (tongue.current) tongue.current.scale.y = 0.03 + anim.current.eat * 0.12;
  });
  return (
    <group position={[0, 0.32, 0]} scale={male ? 1.5 : 1.7}>
      <group ref={body}>
        <Part geometry={GEO.sphere()} color="#2d241c" surface={fur} position={[0, 0.02, 0.1]} scale={[0.075, 0.075, 0.12]} castShadow part="wings" />
        <Part geometry={abdomenY()} color="#3a2e22" surface={fur} position={[0, 0.0, -0.13]} rotation={[Math.PI / 2, 0, 0]} scale={[0.06, 0.2, 0.06]} part="wings" />
        <Part geometry={GEO.sphere()} color="#2d241c" surface={fur} position={[0, 0.02, 0.23]} scale={0.048} part="proboscis" />
        <CompoundEye position={[0.034, 0.03, 0.245]} size={0.024} color="#4a3a28" />
        <CompoundEye position={[-0.034, 0.03, 0.245]} size={0.024} color="#4a3a28" />
        {/* ストローの ような 口（じゅえきを すう ときに のばす） */}
        <mesh ref={tongue} position={[0, -0.04, 0.27]} rotation={[0.5, 0, 0]} userData={{ part: 'proboscis' }}>
          <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
          <meshStandardMaterial color="#3b2e24" roughness={0.4} />
        </mesh>
        <Antenna position={[0.015, 0.06, 0.25]} side={1} length={0.3} thick={0.006} kind="clubbed" color="#2a2018" anim={anim} rotation={[0.2, 0.25, 0]} />
        <Antenna position={[-0.015, 0.06, 0.25]} side={-1} length={0.3} thick={0.006} kind="clubbed" color="#2a2018" anim={anim} rotation={[0.2, 0.25, 0]} />
        <Wing side={1} anim={anim} male={male} />
        <Wing side={-1} anim={anim} male={male} />
        {/* 前あしは 小さく たたんで いる（タテハチョウの なかま）。歩くのは うしろの 4 本 */}
        {[1, -1].map((s) => (
          <M key={s} geo={GEO.capsule()} color="#3a2e22" position={[s * 0.03, -0.04, 0.17]} rotation={[0.6, 0, 0]} scale={[0.008, 0.035, 0.008]} part="foreleg" />
        ))}
        {[1, 2].map((p) => (
          <group key={p} position={[0, -0.03, 0.15 - p * 0.05]}>
            <Leg position={[0.03, 0, 0]} side={1} pair={p} spec={ADULT_LEG} color="#2d241c" anim={anim} />
            <Leg position={[-0.03, 0, 0]} side={-1} pair={p} spec={ADULT_LEG} color="#2d241c" anim={anim} />
          </group>
        ))}
      </group>
    </group>
  );
}
