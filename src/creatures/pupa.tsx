import { useMemo } from 'react';
import * as THREE from 'three';
import { GEO, mat, sharedGeo } from '../three/materials';
import { grainBump } from '../three/textures';
import { M } from './common';
import { mergedGeo, pupaGeo, shapedTube } from './geom';
import { CompoundEye, Part } from './parts';

/**
 * 甲虫の さなぎ（裸蛹）の 共通部品。体は Y 軸に 立ち、おなかが +Z を 向く。
 * 成虫の 形が もう できていて、あし・はね・触角を おなかがわに たたんでいる。
 */
export interface PupaDims {
  /** 胴の 半分の はば・半分の 高さ・半分の 厚み */
  w: number;
  h: number;
  d: number;
  /** 胴の 中心の 高さ */
  cy: number;
}

type P3 = [number, number, number];

/** たたんだ はね（左右 2 枚）と 3 対の あし。1 ジオメトリに まとめる */
export function pupaLimbsGeo(key: string, { w: W, h: H, d: D, cy }: PupaDims, extra: (parts: THREE.BufferGeometry[]) => void = () => {}) {
  return mergedGeo(`pupaLimbs:${key}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const sx of [1, -1]) {
      // はね：胸の よこから おなかがわへ まわりこむ、うすい 葉の 形
      parts.push(
        shapedTube(
          [
            [sx * W * 0.9, cy + H * 0.6, -D * 0.05],
            [sx * W * 1.02, cy + H * 0.22, D * 0.36],
            [sx * W * 0.7, cy - H * 0.12, D * 0.84],
            [sx * W * 0.32, cy - H * 0.3, D * 0.98],
          ],
          (t) => [W * 0.075 * (1 - 0.4 * t), W * (0.3 - 0.17 * t)],
          14,
          10,
          [sx * 0.75, 0, 0.66],
        ),
      );
      // あし：もも を 外へ、すね を 内へ 折りかえし、ふ節を まん中へ そろえて 下げる
      for (let i = 0; i < 3; i++) {
        const y = cy + H * (0.74 - i * 0.21);
        const z = D * (1.0 - i * 0.03);
        parts.push(
          shapedTube(
            [
              [sx * W * 0.1, y, z + D * 0.04],
              [sx * W * 0.6, y + H * 0.09, z - D * 0.12],
              [sx * W * 0.72, y - H * 0.05, z - D * 0.17],
              [sx * W * 0.26, y - H * 0.2, z + D * 0.03],
              [sx * W * 0.13, y - H * 0.4, z + D * 0.05],
            ],
            (t) => {
              const r = W * (0.105 - 0.05 * t);
              return [r, r];
            },
            18,
            7,
          ),
        );
      }
    }
    extra(parts);
    return parts;
  });
}

/** カブトムシの オスの 角：頭から 前上へ のびる 太い 角（先が ふくらむ）と、胸の 短い 角 */
export function kabutoPupaHorns({ w: W, h: H, d: D, cy }: PupaDims): THREE.BufferGeometry[] {
  const k = (t: number) => THREE.MathUtils.smoothstep(t, 0.72, 1);
  return [
    shapedTube(
      [
        [0, cy + H * 1.1, D * 0.7],
        [0, cy + H * 1.3, D * 1.35],
        [0, cy + H * 1.62, D * 1.62],
        [0, cy + H * 1.92, D * 1.38],
      ],
      (t) => [W * (0.2 - 0.07 * t + 0.1 * k(t)), W * (0.17 - 0.06 * t)],
      18,
      10,
    ),
    shapedTube(
      [
        [0, cy + H * 1.0, -D * 0.05],
        [0, cy + H * 1.16, D * 0.3],
        [0, cy + H * 1.2, D * 0.62],
      ],
      (t) => [W * (0.13 - 0.05 * t), W * (0.11 - 0.04 * t)],
      10,
      8,
    ),
  ];
}

/** クワガタの 大あご：さなぎでは おなかがわへ 折りまげて たたんでいる。オスは 長い */
export function stagPupaMandibles({ w: W, h: H, d: D, cy }: PupaDims, male: boolean): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const sx of [1, -1]) {
    const pts: P3[] = male
      ? [
          [sx * W * 0.34, cy + H * 1.08, D * 0.8],
          [sx * W * 0.52, cy + H * 0.9, D * 1.14],
          [sx * W * 0.36, cy + H * 0.64, D * 1.24],
          [sx * W * 0.16, cy + H * 0.5, D * 1.22],
        ]
      : [
          [sx * W * 0.2, cy + H * 1.04, D * 0.86],
          [sx * W * 0.24, cy + H * 0.94, D * 1.06],
          [sx * W * 0.12, cy + H * 0.86, D * 1.1],
        ];
    out.push(shapedTube(pts, (t) => [W * (male ? 0.13 - 0.07 * t : 0.08 - 0.04 * t), W * (male ? 0.11 - 0.06 * t : 0.07 - 0.035 * t)], 14, 8));
  }
  return out;
}

/** カミキリムシの 長い 触角：体の よこを 下がり、おなかがわで くるりと まいて おさめる */
export function longhornPupaAntennae({ w: W, h: H, d: D, cy }: PupaDims): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const sx of [1, -1]) {
    out.push(
      shapedTube(
        [
          [sx * W * 0.4, cy + H * 1.02, D * 0.55],
          [sx * W * 0.98, cy + H * 0.6, D * 0.2],
          [sx * W * 1.08, cy - H * 0.05, D * 0.3],
          [sx * W * 0.9, cy - H * 0.5, D * 0.62],
          [sx * W * 0.5, cy - H * 0.62, D * 0.9],
          [sx * W * 0.2, cy - H * 0.42, D * 1.02],
          [sx * W * 0.34, cy - H * 0.2, D * 1.08],
          [sx * W * 0.52, cy - H * 0.32, D * 1.04],
        ],
        (t) => {
          const r = W * (0.075 - 0.04 * t) * (1 + 0.18 * Math.abs(Math.sin(t * Math.PI * 11)));
          return [r, r];
        },
        56,
        7,
      ),
    );
  }
  return out;
}

/**
 * さなぎの 部屋（蛹室）：土や 木くずを かためた たまご形の 部屋。
 * 中の さなぎが 見えるよう、奥の 半分だけを くぼみと して 見せる（半径 1・前が あいている）。
 */
export function chamberGeo(): THREE.BufferGeometry {
  return sharedGeo('pupaChamber', () => {
    const g = new THREE.SphereGeometry(1, 28, 18, Math.PI, Math.PI);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const k = 1 + 0.035 * Math.sin(x * 9 + y * 4) * Math.sin(y * 7 + 1) + 0.02 * Math.sin(z * 13 + x * 5);
      p.setXYZ(i, x * k, y * k, z * k);
    }
    g.computeVertexNormals();
    return g;
  });
}

/** 蛹室の くぼみ（内がわは 外より 少し 暗く、なめらかに ぬり固めて ある） */
export function Chamber({ color, position, scale, part = 'chamber', seed = 7 }: { color: string; position: P3; scale: P3; part?: string; seed?: number }) {
  const outer = useMemo(() => mat(color, { roughness: 1, bumpMap: grainBump(seed, 48), bumpScale: 3 }), [color, seed]);
  // 前から 見えるのは 面の 裏がわ（くぼみの 内がわ）なので、内がわ用は BackSide で 描く
  const inner = useMemo(() => mat(new THREE.Color(color).multiplyScalar(0.72), { roughness: 0.9, bumpMap: grainBump(seed + 1, 24), bumpScale: 1.2, side: THREE.BackSide }), [color, seed]);
  return (
    <group position={position} scale={scale}>
      <mesh geometry={chamberGeo()} material={outer} userData={{ part }} />
      <mesh geometry={chamberGeo()} material={inner} scale={0.95} userData={{ part }} />
    </group>
  );
}

/**
 * 甲虫の さなぎの 体：節の ある はら＋胸（pupaGeo）、もり上がった 前胸、うつむいた 頭、たたんだ はねと あし。
 * limbs には `pupaLimbsGeo` の 結果（角・大あご・触角を 足した もの）を わたす。
 */
export function BeetlePupaBody({
  dims,
  color,
  light,
  surface,
  limbs,
  headWide = 0.7,
  bodyPart = 'body',
  limbPart,
  eye = '#6b4422',
}: {
  dims: PupaDims;
  color: string;
  /** はね・あしの 色（体より 少し 明るい） */
  light: string;
  surface: Record<string, unknown>;
  limbs: THREE.BufferGeometry;
  /** 頭の はば（胴の はばに 対する 割合） */
  headWide?: number;
  bodyPart?: string;
  /** はね・あし・角の 部位名（省略すると 体と 同じ） */
  limbPart?: string;
  eye?: string;
}) {
  const { w: W, h: H, d: D, cy } = dims;
  return (
    <>
      <Part geometry={pupaGeo()} color={color} surface={surface} position={[0, cy, 0]} scale={[W, H, D]} castShadow part={bodyPart} />
      {/* 前胸（せなかがわに もり上がる）と、おなかがわへ うつむいた 頭 */}
      <M geo={GEO.sphere()} color={color} surface={surface} position={[0, cy + H * 0.8, -D * 0.2]} scale={[W * 0.98, H * 0.42, D * 0.92]} part={bodyPart} />
      <M geo={GEO.sphere()} color={light} surface={surface} position={[0, cy + H * 1.0, D * 0.32]} scale={[W * headWide, H * 0.34, D * 0.72]} part={limbPart ?? bodyPart} />
      <Part geometry={limbs} color={light} surface={surface} castShadow part={limbPart ?? bodyPart} />
      <CompoundEye position={[W * headWide * 0.8, cy + H * 1.0, D * 0.62]} size={W * 0.1} color={eye} />
      <CompoundEye position={[-W * headWide * 0.8, cy + H * 1.0, D * 0.62]} size={W * 0.1} color={eye} />
    </>
  );
}
