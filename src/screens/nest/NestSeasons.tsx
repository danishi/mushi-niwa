import { useFrame } from '@react-three/fiber';
import { memo, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { mergedGeo, petalGeo } from '../../creatures/geom';
import type { Season } from '../../sim/nest';
import { leafGeometry, Scatter } from '../../three/Diorama';
import { GEO, mat } from '../../three/materials';
import { grainBump, leafTexture } from '../../three/textures';

/**
 * 地面の 上の 季節（ユーザー要望）：はるは 桜の 花びらが まい、なつは ひまわりが 咲き、
 * あきは 落ち葉が つもって ふり、ふゆは 雪が つもって ふる。
 * 季節が かわると ふわっと 大きく なって あらわれる。どれも 断面より 奥（z < 0）で、土の 中には 落ちない。
 */

/** ふってくる ものの はんい（地面の 上、断面の ふちより 奥） */
const AREA = { x0: -4.2, x1: 4.2, y0: 0, y1: 2.6, z0: -2.6, z1: -0.12 };

/** 季節が かわった ときに 下から のびて あらわれる（ひまわり） */
function Appear({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const k = useRef(0);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || k.current >= 1) return;
    k.current = Math.min(1, k.current + Math.min(dt, 0.1) / 1.6);
    const e = 1 - (1 - k.current) ** 3;
    g.scale.setScalar(Math.max(0.001, e));
  });
  return (
    <group ref={ref} scale={0.001}>
      {children}
    </group>
  );
}

/** ふわふわ ふってくる 小さな もの（花びら・葉・雪）。InstancedMesh 1 つ */
function Drift({
  count,
  geometry,
  material,
  colors,
  size,
  fall,
  sway,
  spin,
  seed,
  active,
}: {
  /** 季節で ない 間は 動かさない */
  active: boolean;
  count: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  colors?: string[];
  size: [number, number];
  fall: number;
  sway: number;
  spin: number;
  seed: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const st = useMemo(() => {
    let s = seed * 7919 + 13;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    return Array.from({ length: count }, () => ({
      p: new THREE.Vector3(AREA.x0 + rnd() * (AREA.x1 - AREA.x0), AREA.y0 + rnd() * (AREA.y1 - AREA.y0), AREA.z0 + rnd() * (AREA.z1 - AREA.z0)),
      ph: rnd() * Math.PI * 2,
      sp: 0.7 + rnd() * 0.6,
      sc: size[0] + rnd() * (size[1] - size[0]),
      rot: new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6),
      rnd,
    }));
  }, [count, seed, size]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !colors) return;
    const c = new THREE.Color();
    st.forEach((_, i) => mesh.setColorAt(i, c.set(colors[i % colors.length]!)));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [colors, st]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }, rawDt) => {
    const mesh = ref.current;
    if (!mesh || !active) return;
    const dt = Math.min(rawDt, 0.1);
    const t = clock.elapsedTime;
    for (let i = 0; i < st.length; i++) {
      const o = st[i]!;
      o.p.y -= fall * o.sp * dt;
      o.p.x += Math.sin(t * 1.3 * o.sp + o.ph) * sway * dt;
      o.p.z += Math.cos(t * 0.9 * o.sp + o.ph) * sway * 0.4 * dt;
      o.rot.x += spin * o.sp * dt;
      o.rot.z += spin * 0.7 * dt;
      // 地面に とどいたら 上から また ふってくる
      if (o.p.y < AREA.y0 + 0.01) {
        o.p.set(AREA.x0 + o.rnd() * (AREA.x1 - AREA.x0), AREA.y1, AREA.z0 + o.rnd() * (AREA.z1 - AREA.z0));
      }
      o.p.z = Math.min(AREA.z1, Math.max(AREA.z0, o.p.z));
      q.setFromEuler(o.rot);
      sc.setScalar(o.sc);
      m.compose(o.p, q, sc);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />;
}

/* ───────────── はる：桜の 花びら ───────────── */

const SAKURA = ['#f9d3e0', '#f6c1d4', '#fbe3ec', '#f3b4c9'];

function Spring({ active }: { active: boolean }) {
  const petal = useMemo(() => mat('#ffffff', { roughness: 0.6, side: THREE.DoubleSide, translucent: true }), []);
  return (
    <group>
      <Drift count={90} geometry={petalGeo()} material={petal} colors={SAKURA} size={[0.04, 0.055]} fall={0.22} sway={0.35} spin={2.2} seed={3} active={active} />
      {/* 地面に つもった 花びら */}
      <group position={[0, 0.004, -1.4]}>
        <Scatter count={160} radius={1} rect={[8.4, 2.4]} seed={41} geometry={petalGeo()} material={petal} colors={SAKURA} scale={[0.04, 0.055]} stretchY={0.4} tilt={0.2} />
      </group>
    </group>
  );
}

/* ───────────── なつ：ひまわり ───────────── */

/** ひまわりの 花びら（黄色。2 重の 輪を 1 つの 形に まとめる。前が +Z） */
const sunflowerPetalsGeo = () =>
  mergedGeo('sunflowerPetals', () => {
    const out: THREE.BufferGeometry[] = [];
    for (let ring = 0; ring < 2; ring++) {
      const n = 18;
      for (let i = 0; i < n; i++) {
        const g = petalGeo().clone();
        g.scale(0.03, 0.01, 0.075);
        g.translate(0, 0, 0.075 + 0.06);
        g.rotateX(-Math.PI / 2);
        g.rotateZ(((i + ring * 0.5) / n) * Math.PI * 2);
        g.translate(0, 0, -ring * 0.006);
        out.push(g);
      }
    }
    return out;
  });

/** ひまわりの 葉（ハート形に ちかい 大きな 葉。茎から 横へ） */
function Sunflower({ x, z, h, tilt }: { x: number; z: number; h: number; tilt: number }) {
  const stem = useMemo(() => mat('#5c8a2e', { roughness: 0.7 }), []);
  const leaf = useMemo(() => mat('#ffffff', { map: leafTexture('#4f8a2a'), roughness: 0.6, side: THREE.DoubleSide }), []);
  const petals = useMemo(() => mat('#f6c21c', { roughness: 0.55, side: THREE.DoubleSide }), []);
  const disc = useMemo(() => mat('#4a2c14', { roughness: 0.9, bumpMap: grainBump(9, 64), bumpScale: 4 }), []);
  const head = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (head.current) head.current.rotation.z = Math.sin(clock.elapsedTime * 0.8 + x) * 0.04;
  });
  return (
    <group position={[x, 0, z]} rotation={[0, tilt, 0]}>
      {/* なつに なると にょきっと のびて 咲く */}
      <Appear>
      <mesh geometry={GEO.cylinder()} material={stem} position={[0, h / 2, 0]} scale={[0.018, h, 0.018]} castShadow />
      {[0.3, 0.55].map((k, i) => (
        <mesh key={k} geometry={leafGeometry()} material={leaf} position={[0, h * k, 0]} rotation={[0.35, i % 2 ? 1.6 : -1.6, 0]} scale={0.24} />
      ))}
      {/* 花は すこし 下を むいて こちらへ */}
      <group ref={head} position={[0, h, 0.02]} rotation={[-0.25, 0, 0]} scale={0.8}>
        <mesh geometry={sunflowerPetalsGeo()} material={petals} castShadow />
        <mesh geometry={GEO.cylinder()} material={disc} rotation={[Math.PI / 2, 0, 0]} scale={[0.13, 0.03, 0.13]} position={[0, 0, 0.004]} />
      </group>
      </Appear>
    </group>
  );
}

/** 横長の 画面でも 花が 見える 高さ（地面の 上は 画面の 上の はしまで あまり 高く ない） */
const SUNFLOWERS = [
  { x: -2.45, z: -0.8, h: 0.42, tilt: 0.2 },
  { x: -1.7, z: -1.2, h: 0.55, tilt: -0.1 },
  { x: 1.55, z: -1.1, h: 0.5, tilt: 0.15 },
  { x: 2.35, z: -0.75, h: 0.4, tilt: -0.2 },
  { x: 3.15, z: -1.3, h: 0.58, tilt: 0.1 },
  { x: -3.3, z: -1.25, h: 0.52, tilt: -0.15 },
];

function Summer({ active }: { active: boolean }) {
  return (
    <group>
      {SUNFLOWERS.map((s) => (
        <Sunflower key={`${s.x}${active}`} {...s} />
      ))}
    </group>
  );
}

/* ───────────── あき：落ち葉 ───────────── */

const AUTUMN = ['#c4462a', '#d9772b', '#e0a63a', '#a8582a', '#c99a3a'];

function Autumn({ active }: { active: boolean }) {
  const leaf = useMemo(() => mat('#ffffff', { map: leafTexture('#d8d8d8'), roughness: 0.75, side: THREE.DoubleSide }), []);
  return (
    <group>
      <Drift count={22} geometry={leafGeometry()} material={leaf} colors={AUTUMN} size={[0.13, 0.2]} fall={0.3} sway={0.45} spin={1.6} seed={5} active={active} />
      <group position={[0, 0.006, -1.4]}>
        <Scatter count={150} radius={1} rect={[8.4, 2.4]} seed={43} geometry={leafGeometry()} material={leaf} colors={AUTUMN} scale={[0.14, 0.24]} tilt={0.25} />
      </group>
    </group>
  );
}

/* ───────────── ふゆ：雪 ───────────── */

function Winter({ active }: { active: boolean }) {
  const flake = useMemo(() => mat('#ffffff', { roughness: 0.9, emissive: '#ffffff', emissiveIntensity: 0.25 }), []);
  return <Drift count={90} geometry={GEO.sphereLo()} material={flake} size={[0.02, 0.032]} fall={0.28} sway={0.25} spin={0} seed={7} active={active} />;
}

const SEASONS: Season[] = ['haru', 'natsu', 'aki', 'fuyu'];
const DECOR: Record<Season, (p: { active: boolean }) => ReactNode> = { haru: Spring, natsu: Summer, aki: Autumn, fuyu: Winter };

/** 季節ごとの 地面の 上の ようす */
export const SeasonDecor = memo(function SeasonDecor({ season }: { season: Season }) {
  return (
    <group>
      {SEASONS.map((s) => {
        const active = s === season;
        const C = DECOR[s];
        // ほかの 季節も 置いて おく（画面を ひらいた ときに シェーダを まとめて 用意し、季節が かわった ときに 固まらない）。
        // 季節で ない 間は 土の ずっと 下に しまう
        return (
          <group key={s} position={[0, active ? 0 : -60, 0]}>
            <C active={active} />
          </group>
        );
      })}
    </group>
  );
});

/** 季節ごとの 草の 色（あきは 黄みどり、ふゆは 枯れ草） */
export const GRASS_BY_SEASON: Record<Season, string[]> = {
  haru: ['#6fa23a', '#7db244', '#8bbd4e', '#5e9330', '#9cc85a'],
  natsu: ['#5f8f2f', '#6e9c36', '#7aa83e', '#557f29', '#8bb04a'],
  aki: ['#8a9a3a', '#a3a245', '#b59a48', '#7d8a34', '#c2a855'],
  fuyu: ['#9a8a5a', '#a89a6a', '#8c7c50', '#b0a274', '#7e7048'],
};
