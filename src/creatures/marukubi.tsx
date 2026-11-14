import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, SURF } from '../three/materials';
import { M, useBodyMotion } from './common';
import { bodyGeo, elytronHalf } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';
import type { ModelProps } from './registry';

/* ───────────── マルクビツチハンミョウ（docs/species-research-5.md） ───────────── */

const LEG: LegSpec = { femur: 0.15, tibia: 0.15, tarsus: 0.1, thick: 0.013, tarsi: 5 };
const INK = '#141a30';

/**
 * 成虫：黒藍色の やわらかい 体。大きな 頭・せまい 前胸・根もとで 重なって 後ろへ ひらく 短い 前ばね、
 * その 後ろに はみだす 節の ある 大きな はら（メスは とくに 大きい）。後ろばねは ない（飛ばない）。
 * いかく（spray）: あしを ちぢめて 死んだ ふりを し、あしの つけねに 黄色い しずくを 出す。
 */
export function MarukubiAdult({ anim, sex }: ModelProps) {
  const body = useBodyMotion(anim, 0.5);
  const belly = useRef<THREE.Group>(null);
  const drops = useRef<THREE.Group>(null);
  const skin = useMemo(() => ({ roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: '#4a4fa0' }), []);
  // 前ばねは しわの ある にぶい つや
  const wing = useMemo(() => ({ ...SURF.granular(0.6), normalScale: 0.8 }), []);
  const head = useMemo(() => SURF.chitin(0.6), []);
  const ooze = useMemo(() => mat('#f2c230', { roughness: 0.15, clearcoat: 1, translucent: true }), []);
  const big = sex === 'female' ? 1.14 : 1;
  useFrame(() => {
    const a = anim.current;
    // はらを ゆっくり のびちぢみ（いきを している）。死んだ ふりの 間は しずかに
    if (belly.current) belly.current.scale.y = big * (1 + Math.sin(a.t * 2) * 0.025 * (1 - a.spray));
    // 死んだ ふりの 間は あしの つけねに 黄色い しずく
    if (drops.current) {
      drops.current.visible = a.spray > 0.05;
      drops.current.children.forEach((c, i) => c.scale.setScalar(0.016 * a.spray * (0.8 + 0.25 * Math.sin(a.t * 3 + i))));
    }
  });
  return (
    <group scale={1.25}>
      <group ref={body}>
        {/* 大きな はら：前ばねの 後ろへ はみだす。節ごとに くびれ */}
        <group ref={belly} scale={[big, big, big]} position={[0, 0, -0.02]}>
          <Part
            geometry={bodyGeo(
              'meloeAbdomen',
              [
                [-0.48, 0, 0.075, 0.075],
                [-0.465, 0.07, 0.13, 0.035],
                [-0.43, 0.11, 0.16, 0.025],
                [-0.33, 0.17, 0.225, 0.02],
                [-0.18, 0.185, 0.235, 0.02],
                [-0.04, 0.165, 0.2, 0.025],
                [0.06, 0.12, 0.15, 0.035],
                [0.1, 0.07, 0.1, 0.05],
                [0.115, 0, 0.075, 0.075],
              ],
              { nt: 2.2, nb: 3, segs: [-0.46, 0.06, 6, 0.06], rings: 48 },
            )}
            color={INK}
            surface={skin}
            castShadow
            part="abdomen"
          />
        </group>
        {/* 短い 前ばね：根もとで 合わさり、後ろへ ハの字に ひらく */}
        {[1, -1].map((s) => (
          <group key={s} scale={[s, 1, 1]}>
            <group position={[0.006, 0.13, -0.02]} rotation={[-0.12, -0.24, 0.16]}>
              <Part geometry={elytronHalf()} color="#232a52" surface={wing} scale={[0.115, 0.1, 0.13]} castShadow part="elytra" />
            </group>
          </group>
        ))}
        {/* せまい 前胸 */}
        <Part
          geometry={bodyGeo('meloePronotum', [[0.075, 0, 0.1, 0.1], [0.085, 0.05, 0.135, 0.05], [0.12, 0.076, 0.16, 0.045], [0.18, 0.075, 0.155, 0.05], [0.22, 0.055, 0.13, 0.06], [0.232, 0, 0.1, 0.1]], { nt: 2.2 })}
          color={INK}
          surface={head}
          castShadow
          part="head"
        />
        {/* 大きな 頭（下むき） */}
        <group position={[0, 0.11, 0.25]} rotation={[0.35, 0, 0]}>
          <Part
            geometry={bodyGeo('meloeHead', [[-0.045, 0, 0.01, 0.01], [-0.03, 0.06, 0.04, -0.035], [0.015, 0.095, 0.058, -0.05], [0.075, 0.09, 0.05, -0.045], [0.12, 0.06, 0.03, -0.03], [0.137, 0, 0, 0]], { nt: 2.3 })}
            color={INK}
            surface={head}
            castShadow
            part="head"
          />
          {[1, -1].map((s) => (
            <group key={s}>
              <CompoundEye position={[s * 0.082, 0.02, 0.06]} size={[0.016, 0.026, 0.024]} part="head" />
              {/* 大あご */}
              <M color="#14182c" surface={head} position={[s * 0.018, -0.03, 0.118]} rotation={[0, -s * 0.5, 0]} scale={[0.007, 0.006, 0.016]} part="head" />
            </group>
          ))}
          {/* じゅず状の 触角 */}
          <Antenna position={[0.05, 0.035, 0.095]} side={1} length={0.24} thick={0.008} kind="filiform" color={INK} anim={anim} rotation={[-0.5, 0.45, 0]} />
          <Antenna position={[-0.05, 0.035, 0.095]} side={-1} length={0.24} thick={0.008} kind="filiform" color={INK} anim={anim} rotation={[-0.5, 0.45, 0]} />
        </group>
        {/* あし（前は 前胸の 下、中・後ろは 前ばねの 下）。死んだ ふりで ちぢめる */}
        {(
          [
            [0.15, 0.04],
            [0.03, 0.07],
            [-0.07, 0.085],
          ] as const
        ).map(([z, x], p) => (
          <group key={p} position={[0, 0.07, z]}>
            <Leg position={[x, 0, 0]} side={1} pair={p} spec={LEG} color="#121628" anim={anim} part="legs" spread={0.28} feign />
            <Leg position={[-x, 0, 0]} side={-1} pair={p} spec={LEG} color="#121628" anim={anim} part="legs" spread={0.28} feign />
          </group>
        ))}
        {/* 黄色い しずく（あしの つけね・ひざ） */}
        <group ref={drops} visible={false}>
          {(
            [
              [0.15, 0.06],
              [0.03, 0.09],
              [-0.07, 0.105],
            ] as const
          ).flatMap(([z, x]) => [1, -1].map((s) => <mesh key={`${z}${s}`} material={ooze} position={[s * x, 0.075, z]} geometry={GEO.sphere()} />))}
        </group>
      </group>
    </group>
  );
}
