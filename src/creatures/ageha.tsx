import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { leafGeometry } from '../three/Diorama';
import { GEO, mat, SURF } from '../three/materials';
import { agehaWing, grainBump, leafTexture, wrinkleBump, bandTexture } from '../three/textures';
import { larvaReach, M, useBodyMotion } from './common';
import { cachedTube, shapeGeo, bodyGeo, segmentGeo, yBody } from './geom';
import { Antenna, butterflyWingAngle, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* 出典: docs/species-research.md §2 */

/** たまご：ミカンの葉の上の、淡い黄色の まるい たまご */
export function AgehaEgg({ anim }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  const leafMat = useMemo(() => ({ ...SURF.plant(), map: leafTexture('#3f7a26'), side: THREE.DoubleSide }), []);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = Math.sin(anim.current.t * 30) * 0.06 * anim.current.shiver;
  });
  return (
    <group>
      <M geo={leafGeometry()} color="#ffffff" surface={leafMat} scale={0.9} part="egg" />
      <group ref={ref} position={[0, 0.06, 0.45]}>
        <Part geometry={GEO.sphere()} color="#efd977" surface={{ roughness: 0.3, clearcoat: 0.8 }} scale={0.06} castShadow part="egg" />
      </group>
    </group>
  );
}

/**
 * ようちゅう：1〜4 齢は 鳥のふん そっくり（こげ茶に 白い帯、とげ状の突起、ぬれたような つや）。
 * 5 齢は 黄緑で、胸に 目玉もようと 帯。さわると 頭の うしろから 橙色の 臭角が出る。
 */
export function AgehaLarva({ anim, molts }: ModelProps) {
  const segs = useRef<Array<THREE.Mesh | null>>([]);
  const osm = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const body = useBodyMotion(anim, 0.3, true);
  const fifth = molts >= 4;
  const N = 11;
  const size = 0.5 + molts * 0.17;
  const surf = useMemo(
    () => (fifth ? { roughness: 0.45, clearcoat: 0.5, bumpMap: wrinkleBump(), bumpScale: 0.4 } : { roughness: 0.25, clearcoat: 1, bumpMap: grainBump(4, 40), bumpScale: 1.5 }),
    [fifth],
  );
  const colors = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => {
        if (fifth) return i === 4 ? '#c9d9a0' : i <= 3 ? '#86b84a' : '#7fb045';
        // 白い「くら」もよう（中ほど）と おしり
        return i === 6 || i === 7 || i === N - 1 ? '#efece2' : i % 2 ? '#3e2f22' : '#4a3828';
      }),
    [fifth],
  );
  useFrame(() => {
    const a = anim.current;
    for (let i = 0; i < N; i++) {
      const m = segs.current[i];
      if (!m) continue;
      const lift = Math.max(0, Math.sin(a.gait * 2 - i * 0.8)) * 0.04 * a.walk;
      const [rx, ry] = larvaReach(a, i);
      m.position.set(rx, 0.15 + lift + ry, 0.5 - i * 0.1);
      // 胸（前から 2〜4 番目）が ふくらんでいる
      const r = 0.12 + (i >= 1 && i <= 3 ? 0.035 : 0) - (i > N - 3 ? (i - (N - 3)) * 0.025 : 0);
      m.scale.set(r, r * 0.95, r * 0.72);
    }
    // 頭と 胸あしは 先頭の 節に ついて 動く
    if (front.current) {
      const [rx, ry] = larvaReach(a, -0.6);
      front.current.position.set(rx, ry, 0);
      front.current.rotation.set(-a.rear * 0.35 - Math.abs(a.look) * 0.15, a.look * 0.45, 0);
    }
    if (osm.current) osm.current.scale.setScalar(Math.max(0.001, Math.min(1, a.bounce * 1.6 + a.spray)));
  });
  return (
    <group scale={size}>
      <group ref={body}>
        {colors.map((c, i) => (
          <Part
            key={i}
            meshRef={(m) => {
              segs.current[i] = m;
            }}
            geometry={segmentGeo()}
            color={c}
            surface={surf}
            castShadow={i % 3 === 0}
            part={fifth && i === 2 ? 'eyespot' : 'pattern'}
          >
            {!fifth && i > 0 && i < N - 1
              ? [1, -1].map((s) => <M key={s} geo={GEO.cone()} color={c} surface={surf} position={[s * 0.6, 0.75, 0]} rotation={[0, 0, -s * 0.5]} scale={[0.12, 0.3, 0.12]} />)
              : null}
          </Part>
        ))}
        {fifth ? (
          <>
            {/* 胸の 目玉もよう（本当の目ではない） */}
            {[1, -1].map((s) => (
              <group key={s} position={[s * 0.085, 0.27, 0.32]} rotation={[0, s * 0.4, 0]}>
                <M color="#e9e2b0" scale={[0.045, 0.035, 0.012]} part="eyespot" />
                <M color="#1b1712" position={[0, 0, 0.006]} scale={[0.032, 0.024, 0.01]} part="eyespot" />
                <M color="#4d6fa3" position={[0.006, 0.004, 0.012]} scale={[0.012, 0.01, 0.005]} part="eyespot" />
              </group>
            ))}
            <M geo={GEO.box()} color="#4b3a26" position={[0, 0.27, 0.2]} rotation={[0.3, 0, 0]} scale={[0.25, 0.012, 0.03]} part="pattern" />
            <M geo={GEO.box()} color="#e8ecd8" position={[0, 0.23, -0.05]} rotation={[0.1, 0, 0]} scale={[0.24, 0.012, 0.04]} part="pattern" />
          </>
        ) : null}
        <group ref={front}>
        {/* 頭 */}
        <Part geometry={GEO.sphere()} color={fifth ? '#6f9f3c' : '#2f241a'} surface={SURF.chitin(0.6)} position={[0, 0.11, 0.6]} scale={[0.075, 0.07, 0.06]} part="pattern" />
        <CompoundEye position={[0.045, 0.12, 0.63]} size={0.012} />
        <CompoundEye position={[-0.045, 0.12, 0.63]} size={0.012} />
        {/* 臭角（ふたまたの 橙色） */}
        <group ref={osm} position={[0, 0.2, 0.55]}>
          {[1, -1].map((s) => (
            <Part
              key={s}
              geometry={cachedTube(`osmR${s}`, [[0, 0, 0], [s * 0.04, 0.09, 0.02], [s * 0.11, 0.16, 0.0]], 0.022, 0.014, 10, 8)}
              color="#e8742a"
              surface={{ roughness: 0.2, clearcoat: 1, translucent: true }}
              part="osmeterium"
            />
          ))}
        </group>
        {/* 胸あし 3 対・腹あし */}
        {[0, 1, 2].map((p) => (
          <group key={p} position={[0, 0.05, 0.5 - p * 0.08]}>
            <Leg position={[0.07, 0, 0]} side={1} pair={p} spec={LARVA_LEG} color="#2b2118" anim={anim} spread={-0.5} />
            <Leg position={[-0.07, 0, 0]} side={-1} pair={p} spec={LARVA_LEG} color="#2b2118" anim={anim} spread={-0.5} />
          </group>
        ))}
        </group>
        {[0.06, -0.04, -0.14, -0.24, -0.44].map((z) =>
          [1, -1].map((s) => <M key={`${z}${s}`} color={fifth ? '#6d9d3a' : '#3e2f22'} position={[s * 0.07, 0.04, z]} scale={[0.035, 0.045, 0.04]} />),
        )}
      </group>
    </group>
  );
}

const LARVA_LEG: LegSpec = { femur: 0.04, tibia: 0.04, tarsus: 0.02, thick: 0.012, tarsi: 1 };

/** さなぎ：胸を 糸（帯糸）で 枝に かけた「帯蛹」。頭に 2 本の 突起、胸に 背の とがり */
export function AgehaPupa({ anim, sex }: ModelProps) {
  const ref = useRef<THREE.Group>(null);
  // 緑と褐色がある（まわりの環境で変わる。ここでは 個体ごとに分ける）
  const color = sex === 'male' ? '#a3bd5a' : '#a58a5f';
  const surf = useMemo(() => ({ roughness: 0.5, clearcoat: 0.4, bumpMap: grainBump(17, 64), bumpScale: 0.8 }), []);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = Math.sin(anim.current.t * 30) * 0.04 * Math.max(anim.current.shiver, anim.current.bounce);
  });
  return (
    <group>
      <M geo={GEO.cylinder()} color="#7a5a43" surface={{ roughness: 0.9 }} position={[0, 0.75, -0.12]} rotation={[0.25, 0, 0]} scale={[0.05, 1.5, 0.05]} castShadow />
      <group ref={ref} position={[0, 0.7, 0.02]} rotation={[0.3, 0, 0]}>
        {/* 角ばった 体：せなかの 胸が とがり、おなかがわは はねの 形に ふくらむ。おしりの 先で 枝に とまる */}
        <Part geometry={agehaPupaGeo()} color={color} surface={surf} scale={0.4} castShadow part="color" />
        {/* 頭の 2 本の 突起 */}
        {[1, -1].map((s) => (
          <Part key={s} geometry={cachedTube(`agehaPupaHorn${s}`, [[0, 0, 0], [s * 0.012, 0.045, 0.004], [s * 0.035, 0.085, 0.012]], 0.028, 0.006, 8, 7)} color={color} surface={surf} position={[s * 0.035, 0.37, 0.0]} part="color" />
        ))}
        {/* はねの 形が すじに なって 見える */}
        {[1, -1].map((s) => (
          <M key={`w${s}`} color={sex === 'male' ? '#b5cc6f' : '#b39a6e'} surface={surf} position={[s * 0.07, 0.05, -0.085]} rotation={[0.15, 0, s * 0.2]} scale={[0.07, 0.19, 0.05]} />
        ))}
        {/* 帯糸 */}
        <mesh position={[0, 0.1, -0.03]} rotation={[0.3, 0, 0]} userData={{ part: 'girdle' }}>
          <torusGeometry args={[0.16, 0.004, 4, 24, Math.PI]} />
          <meshStandardMaterial color="#efece2" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * さなぎの 体（半径 1・Y 軸。上が 頭）。yBody は 背中が -Z に なるので、ここでは「上」を おなかがわ（枝の ほう）、
 * 「下」を せなかがわ（手前）と して 使う。胸の せなかに とがった こぶ。
 */
const agehaPupaGeo = () =>
  yBody(
    'agehaPupa',
    [
      [-1, 0.02, 0.02, -0.02],
      [-0.82, 0.13, 0.13, -0.13],
      [-0.42, 0.27, 0.3, -0.25],
      [0, 0.35, 0.43, -0.29],
      [0.35, 0.36, 0.4, -0.33],
      [0.6, 0.31, 0.3, -0.4],
      [0.8, 0.26, 0.25, -0.27],
      [0.95, 0.22, 0.2, -0.2],
      [1, 0.15, 0.13, -0.13],
    ],
    {
      segs: [-0.96, -0.12, 5, 0.06],
      rings: 48,
      nt: 2.3,
      nb: 1.8,
      extra: (p) => {
        // せなかの まん中の かど（胸の とがり）
        if (p.y < 0) p.y -= 0.13 * Math.exp(-((p.x / 0.11) ** 2) - ((p.z - 0.58) / 0.13) ** 2);
      },
    },
  );

const foreWing = (s: THREE.Shape) => {
  s.moveTo(0, 0);
  s.bezierCurveTo(0.25, 0.22, 0.7, 0.48, 0.98, 0.44);
  s.bezierCurveTo(0.95, 0.2, 0.75, 0.0, 0.42, -0.12);
  s.lineTo(0, -0.05);
};
const hindWing = (s: THREE.Shape) => {
  s.moveTo(0, -0.04);
  s.bezierCurveTo(0.38, -0.02, 0.64, -0.24, 0.6, -0.5);
  s.lineTo(0.56, -0.76); // 尾状突起
  s.lineTo(0.47, -0.54);
  s.bezierCurveTo(0.32, -0.62, 0.1, -0.46, 0, -0.2);
};

function Wing({ side, anim }: { side: 1 | -1; anim: ModelProps['anim'] }) {
  const ref = useRef<THREE.Group>(null);
  const fore = shapeGeo('agehaFore2', foreWing);
  const hind = shapeGeo('agehaHind2', hindWing);
  const foreMat = useMemo(() => mat('#ffffff', { ...SURF.scales(), map: agehaWing('fore'), side: THREE.DoubleSide }), []);
  const hindMat = useMemo(() => mat('#ffffff', { ...SURF.scales(), map: agehaWing('hind'), side: THREE.DoubleSide }), []);
  useFrame(() => {
    const a = anim.current;
    // ひらひらと こまかく はばたき、ときどき 短く 滑空する
    if (ref.current) ref.current.rotation.z = butterflyWingAngle(a, 13, 0.95);
  });
  return (
    <group position={[side * 0.02, 0.06, 0.06]} scale={[side, 1, 1]}>
      <group ref={ref}>
        <group rotation={[Math.PI / 2, 0, 0]} scale={0.9}>
          <mesh geometry={fore} material={foreMat} castShadow userData={{ part: 'wings' }} />
          <mesh geometry={hind} material={hindMat} castShadow position={[0, 0, 0.002]} userData={{ part: 'wings' }} />
        </group>
      </group>
    </group>
  );
}

const ADULT_LEG: LegSpec = { femur: 0.12, tibia: 0.13, tarsus: 0.12, thick: 0.01, tarsi: 5 };

/** 成虫：淡い黄色に 黒い すじ と 帯の はね。ゼンマイのように 巻いた 口で 花のみつを すう */
export function AgehaAdult({ anim }: ModelProps) {
  const body = useBodyMotion(anim, 0);
  const tongue = useRef<THREE.Group>(null);
  const coil = useMemo(
    () =>
      cachedTube(
        'proboscisCoil',
        Array.from({ length: 14 }, (_, i) => {
          const a = i * 0.6;
          const r = 0.035 * (1 - i / 16);
          return [0, -Math.sin(a) * r, Math.cos(a) * r] as [number, number, number];
        }),
        0.006,
        0.004,
        30,
        4,
      ),
    [],
  );
  const coilMat = useMemo(() => mat('#3b2e24', { roughness: 0.4 }), []);
  useFrame(() => {
    const a = anim.current;
    if (tongue.current) {
      tongue.current.children[0]!.visible = a.eat < 0.3;
      tongue.current.children[1]!.visible = a.eat >= 0.3;
    }
  });
  const fur = useMemo(() => ({ roughness: 0.75, sheen: 0.5, sheenColor: '#4a3e2c', bumpMap: grainBump(23, 96), bumpScale: 1 }), []);
  const thorax = useMemo(() => ({ ...fur, map: bandTexture('agehaThorax', '#1f1915', [[0.4, 0.045, '#e8d27a'], [0.6, 0.045, '#e8d27a'], [0.25, 0.08, '#cdb968'], [0.75, 0.08, '#cdb968']]) }), [fur]);
  const abdomen = useMemo(() => ({ ...fur, map: bandTexture('agehaAbdomen', '#241d17', [[0.22, 0.13, '#e3cb72'], [0.78, 0.13, '#e3cb72'], [0, 0.12, '#d8c98a'], [1, 0.12, '#d8c98a']]) }), [fur]);
  return (
    <group position={[0, 0.3, 0]} scale={1.45}>
    <group ref={body}>
      {/* 胸（黒い 毛に 黄色の すじ）と、節の ある 細い 腹（わきに 黄色の 帯） */}
      <Part
        geometry={bodyGeo('agehaThorax', [[-0.02, 0.03, 0.05, -0.02], [0.02, 0.06, 0.082, -0.04], [0.1, 0.068, 0.088, -0.045], [0.17, 0.055, 0.075, -0.035], [0.2, 0.03, 0.05, -0.01]], {})}
        color="#ffffff"
        surface={thorax}
        castShadow
        part="wings"
      />
      <Part
        geometry={bodyGeo('agehaAbdomen', [[-0.34, 0, 0, 0], [-0.32, 0.022, 0.02, -0.02], [-0.22, 0.042, 0.04, -0.04], [-0.1, 0.052, 0.05, -0.05], [-0.02, 0.05, 0.05, -0.045], [0.02, 0.035, 0.04, -0.03]], { segs: [-0.33, 0, 7, 0.07] })}
        color="#ffffff"
        surface={abdomen}
        part="wings"
      />
      {/* 頭 */}
      <Part geometry={GEO.sphere()} color="#1f1915" surface={fur} position={[0, 0.02, 0.22]} scale={0.045} part="proboscis" />
      <CompoundEye position={[0.032, 0.03, 0.235]} size={0.022} color="#3a2f22" />
      <CompoundEye position={[-0.032, 0.03, 0.235]} size={0.022} color="#3a2f22" />
      <group ref={tongue} position={[0, -0.01, 0.255]}>
        <mesh geometry={coil} material={coilMat} userData={{ part: 'proboscis' }} />
        <M geo={GEO.cylinder()} color="#3b2e24" position={[0, -0.05, 0.05]} rotation={[Math.PI / 2.6, 0, 0]} scale={[0.004, 0.14, 0.004]} part="proboscis" />
      </group>
      <Antenna position={[0.015, 0.06, 0.24]} side={1} length={0.32} thick={0.006} kind="clubbed" color="#1f1915" anim={anim} rotation={[0.2, 0.25, 0]} />
      <Antenna position={[-0.015, 0.06, 0.24]} side={-1} length={0.32} thick={0.006} kind="clubbed" color="#1f1915" anim={anim} rotation={[0.2, 0.25, 0]} />
      <Wing side={1} anim={anim} />
      <Wing side={-1} anim={anim} />
      {[0, 1, 2].map((p) => (
        <group key={p} position={[0, -0.03, 0.15 - p * 0.05]}>
          <Leg position={[0.03, 0, 0]} side={1} pair={p} spec={ADULT_LEG} color="#1f1915" anim={anim} part={p === 0 ? 'foreleg' : undefined} />
          <Leg position={[-0.03, 0, 0]} side={-1} pair={p} spec={ADULT_LEG} color="#1f1915" anim={anim} part={p === 0 ? 'foreleg' : undefined} />
        </group>
      ))}
    </group>
    </group>
  );
}
