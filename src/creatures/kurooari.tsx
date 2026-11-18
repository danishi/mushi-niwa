import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, sharedGeo, type MatOpts } from '../three/materials';
import { veinWing } from '../three/textures';
import type { CreatureAnim } from './anim';
import { abdomenZ, bodyGeo, mergedGeo, shapedTube } from './geom';
import { AntBody, type AntLook } from './visitors';

/**
 * アリの すづくりの クロオオアリ（docs/ant-nest-research.md）。
 * 遠くの はたらきアリは 部品の 少ない 軽い 形（`NestAnt`）、寄って 見る アリと 女王は `AntBody`。
 */
type AnimRef = { current: CreatureAnim };

const SHELL: MatOpts = { roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 };
const GLOSS: MatOpts = { roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3 };

/** はたらきアリ（小型）：光沢の ない 黒灰色、はらは 黒く 光る */
export const KURO_WORKER: AntLook = {
  body: '#2a2624',
  gaster: '#161212',
  head: [0.034, 0.026, 0.036],
  headZ: 0.118,
  gasterSize: [0.042, 0.037, 0.05],
  nodes: [{ z: -0.016, s: [0.012, 0.017, 0.01] }],
  jaws: 'short',
  sting: 0.001,
  leg: { femur: 0.075, tibia: 0.075, tarsus: 0.06, thick: 0.0065, tarsi: 3 },
  antenna: { length: 0.13, thick: 0.0035, kind: 'clavate' },
  eye: 0.008,
  surface: SHELL,
};

/** 大型の はたらきアリ：頭が 大きい */
export const KURO_MAJOR: AntLook = { ...KURO_WORKER, head: [0.046, 0.032, 0.044], headZ: 0.13, jaws: 'teeth' };

/** 女王：大きな はら（はねを おとした あと） */
export const KURO_QUEEN: AntLook = { ...KURO_WORKER, head: [0.038, 0.029, 0.038], gasterSize: [0.06, 0.05, 0.075], gaster: '#1a1513', surface: GLOSS };

/** 羽アリの メス（新しい 女王） */
export const KURO_ALATE: AntLook = { ...KURO_QUEEN, gasterSize: [0.052, 0.044, 0.065] };

const LEG_Y = 0.05;

/** 軽い はたらきアリの あし 1 本（腿節で 上へ、脛節で 地面へ。右がわ。左は x を 反転） */
const nestLegGeo = (pair: number) =>
  mergedGeo(`nestAntLeg${pair}`, () => {
    const fwd = (1 - pair) * 0.05;
    return [
      shapedTube(
        [
          [0, 0, 0],
          [0.05, 0.035, fwd * 0.6],
          [0.09, 0.012, fwd],
          [0.115, -0.05, fwd * 1.5],
        ],
        (t) => {
          const r = 0.007 * (1 - t * 0.55);
          return [r, r];
        },
        10,
        5,
      ),
    ];
  });

/** ひじで 曲がる 触角（右がわ） */
const nestAntennaGeo = () =>
  mergedGeo('nestAntenna', () => [
    shapedTube(
      [
        [0, 0, 0],
        [0.012, 0.04, 0.02],
        [0.02, 0.06, 0.03],
        [0.03, 0.05, 0.07],
        [0.034, 0.036, 0.1],
      ],
      (t) => {
        const r = 0.0035 * (1 - t * 0.2) + (t > 0.85 ? 0.0015 : 0);
        return [r, r];
      },
      12,
      5,
    ),
  ]);

const thoraxGeo = () =>
  bodyGeo('nestAntThorax', [[-0.05, 0, 0.006, 0.006], [-0.04, 0.011, 0.013, -0.01], [-0.02, 0.017, 0.02, -0.017], [0.005, 0.02, 0.028, -0.02], [0.03, 0.022, 0.031, -0.02], [0.05, 0.014, 0.02, -0.012], [0.058, 0, 0.006, 0.006]], { nt: 2.2 });

/**
 * 断面を 歩く はたらきアリ（部品 12 こ）。anim.walk / gait で あしを 交互に ふり、anim.eat で 頭を 下げる。
 * carry: 大あごに くわえる もの。
 */
function NestAntImpl({ anim, major = false, carry = 'none' }: { anim: AnimRef; major?: boolean; carry?: 'none' | 'sugar' | 'bug' | 'soil' | 'trash' }) {
  const body = useMemo(() => mat('#2a2624', SHELL), []);
  const gaster = useMemo(() => mat('#161212', GLOSS), []);
  const legMat = useMemo(() => mat('#221e1c', { roughness: 0.6 }), []);
  const legs = useRef<Array<THREE.Mesh | null>>([]);
  const head = useRef<THREE.Group>(null);
  const abdomen = useRef<THREE.Mesh>(null);
  const antennae = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(() => {
    const a = anim.current;
    legs.current.forEach((m, i) => {
      if (!m) return;
      const pair = i >> 1;
      const side = i % 2 === 0 ? 1 : -1;
      // 三脚歩行：前・後ろの 片がわと 中の 反対がわが いっしょに 動く
      const phase = (pair % 2 === 0 ? 0 : Math.PI) + (side > 0 ? Math.PI : 0);
      m.rotation.y = side * Math.sin(a.gait * 2 + phase) * 0.4 * a.walk;
      m.rotation.z = Math.max(0, Math.cos(a.gait * 2 + phase)) * 0.25 * a.walk * side;
    });
    if (head.current) head.current.rotation.x = a.eat * (0.35 + Math.sin(a.t * 14) * 0.08) - a.sleep * 0.15;
    antennae.current.forEach((m, i) => {
      if (m) m.rotation.x = Math.sin(a.t * (5 + i) + i * 2) * 0.18 * (1 - a.sleep) + a.sleep * 0.6;
    });
    // みつを すうと はらが ふくらむ（素嚢に ためる）
    if (abdomen.current) {
      const k = carry === 'sugar' ? 1.18 : 1;
      abdomen.current.scale.set(0.044 * k, 0.038 * k, 0.052 * k);
    }
  });
  const hs: [number, number, number] = major ? [0.046, 0.034, 0.045] : [0.034, 0.027, 0.036];
  const hz = major ? 0.132 : 0.118;
  return (
    <group position={[0, 0.02, 0]}>
      <group ref={head} position={[0, 0.062, hz - 0.03]}>
        <mesh geometry={GEO.sphereLo()} material={body} position={[0, 0, 0.03]} scale={hs} castShadow />
        {[1, -1].map((s, i) => (
          <mesh key={s} ref={(m) => void (antennae.current[i] = m)} geometry={nestAntennaGeo()} material={legMat} position={[s * 0.013, 0.012, 0.055]} scale={[s, 1, 1]} />
        ))}
        {carry !== 'none' && carry !== 'sugar' ? (
          <mesh
            geometry={carry === 'bug' ? GEO.capsule() : GEO.chunk()}
            material={mat(carry === 'bug' ? '#a8743e' : carry === 'soil' ? '#6b5240' : '#3a2e26', { roughness: 0.8 })}
            position={[0, -0.012, 0.03 + hs[2] + 0.02]}
            rotation={[carry === 'bug' ? Math.PI / 2 : 0, 0, carry === 'bug' ? Math.PI / 2 : 0]}
            scale={carry === 'bug' ? [0.03, 0.05, 0.03] : 0.026}
          />
        ) : null}
      </group>
      <mesh geometry={thoraxGeo()} material={body} position={[0, 0.058, 0.04]} castShadow />
      <mesh geometry={GEO.sphereLo()} material={body} position={[0, 0.058, -0.016]} scale={[0.012, 0.017, 0.01]} />
      <mesh ref={abdomen} geometry={abdomenZ(4)} material={gaster} position={[0, 0.06, -0.075]} scale={[0.044, 0.038, 0.052]} castShadow />
      {[0, 1, 2].map((p) =>
        [1, -1].map((s) => (
          <mesh
            key={`${p}${s}`}
            ref={(m) => void (legs.current[p * 2 + (s > 0 ? 0 : 1)] = m)}
            geometry={nestLegGeo(p)}
            material={legMat}
            position={[s * 0.012, LEG_Y, 0.065 - p * 0.028]}
            scale={[s, 1, 1]}
          />
        )),
      )}
    </group>
  );
}

export const NestAnt = memo(NestAntImpl);

/** 女王・大型の アリなど 寄って 見る アリ（`AntBody`） */
export function KuroAnt({ anim, look }: { anim: AnimRef; look: AntLook }) {
  return <AntBody anim={anim} look={look} />;
}

/** 羽アリの はね（前ばね・後ろばね。とぶ ときは はばたく） */
export function AlateWings({ anim, scale = 1 }: { anim: AnimRef; scale?: number }) {
  const material = useMemo(() => mat('#ffffff', { map: veinWing('#d8d2c8', '#6a5a48', 0.45), opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, roughness: 0.25 }), []);
  const geo = sharedGeo('alateWing', () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.04, 0.03, 0.2, 0.04, 0.26, 0.012);
    s.bezierCurveTo(0.22, -0.02, 0.06, -0.025, 0, 0);
    return new THREE.ShapeGeometry(s, 12);
  });
  const flaps = useRef<Array<THREE.Group | null>>([]);
  const spreads = useRef<Array<THREE.Group | null>>([]);
  useFrame(() => {
    const a = anim.current;
    flaps.current.forEach((g, i) => {
      const sp = spreads.current[i];
      if (!g || !sp) return;
      const side = i % 2 === 0 ? 1 : -1;
      // とぶ ときは 横へ ひらいて はばたく。とまって いる ときは 体の 上に たたむ
      sp.rotation.y = side * a.flap * (Math.PI / 2 - 0.35);
      g.rotation.z = side * (0.06 + Math.sin(a.t * 70 + i) * 0.8 * a.flap + Math.sin(a.t * 3 + i) * 0.04 * (1 - a.flap));
    });
  });
  return (
    <group position={[0, 0.1, 0.05]} scale={scale}>
      {[0, 1].map((back) =>
        [1, -1].map((s, j) => (
          <group key={`${back}${s}`} ref={(g) => void (flaps.current[back * 2 + j] = g)} position={[s * 0.012, -back * 0.004, -back * 0.012]}>
            <group ref={(g) => void (spreads.current[back * 2 + j] = g)}>
              {/* 形は +X へ のびる。体に そって 後ろ（-Z）へ たたむ */}
              <group rotation={[-Math.PI / 2, 0, Math.PI / 2 + s * 0.1]} scale={[back ? 0.8 : 1, back ? 0.8 : 1, 1]}>
                <mesh geometry={geo} material={material} />
              </group>
            </group>
          </group>
        )),
      )}
    </group>
  );
}
