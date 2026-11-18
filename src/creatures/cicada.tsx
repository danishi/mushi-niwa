import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, SURF } from '../three/materials';
import type { CreatureAnim } from './anim';
import { M, useBodyMotion } from './common';
import { bodyGeo, mergedGeo, shapedTube } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';

/**
 * セミの 幼虫（アブラゼミの 終齢幼虫を 想定。docs/ant-nest-research.md）。
 * 茶色い からだ、太い 鎌の ような 前あしで 土を ほる。むねの 上に はねの もと（翅芽）。
 * +Z が 前。体長 約 0.36（ワールド単位）。anim.walk / gait で 前あしを かき、spray で 身を ちぢめる。
 */
type AnimRef = { current: CreatureAnim };

const SKIN = { roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.45 };
const LEG: LegSpec = { femur: 0.07, tibia: 0.075, tarsus: 0.035, thick: 0.011, tarsi: 2 };

/** 前あし（右）：太い 腿節に とげ、すねは 先が くまでの ように わかれる */
const foreLegGeo = () =>
  mergedGeo('cicadaForeLeg', () => {
    const femur = shapedTube(
      [
        [0, 0, 0],
        [0.03, -0.006, 0.02],
        [0.05, -0.02, 0.045],
      ],
      (t) => [0.017 * (1 - t * 0.3), 0.013 * (1 - t * 0.3)],
      10,
      8,
    );
    const tibia = shapedTube(
      [
        [0.05, -0.02, 0.045],
        [0.045, -0.035, 0.075],
        [0.035, -0.045, 0.1],
      ],
      (t) => [0.011 * (1 - t * 0.4), 0.008],
      10,
      7,
    );
    // 腿節の 下の とげ と、すねの 先の くまで
    const spikes = [
      [0.025, -0.02, 0.022],
      [0.038, -0.03, 0.036],
      [0.04, -0.05, 0.088],
      [0.032, -0.055, 0.098],
      [0.024, -0.052, 0.104],
    ].map(([x, y, z]) =>
      shapedTube(
        [
          [x!, y! + 0.008, z!],
          [x!, y!, z! + 0.004],
          [x! - 0.002, y! - 0.007, z! + 0.009],
        ],
        (t) => {
          const r = 0.0045 * (1 - t) + 0.0006;
          return [r, r];
        },
        4,
        5,
      ),
    );
    return [femur, tibia, ...spikes];
  });

const headGeo = () =>
  bodyGeo('cicadaNymphHead', [[0.1, 0.03, 0.03, -0.02], [0.12, 0.05, 0.045, -0.03], [0.15, 0.048, 0.04, -0.03], [0.175, 0.03, 0.025, -0.022], [0.185, 0, 0.01, -0.01]], { nt: 2.2, nb: 2 });

const thoraxGeo = () =>
  bodyGeo('cicadaNymphThorax', [[-0.01, 0.045, 0.05, -0.03], [0.02, 0.062, 0.07, -0.038], [0.06, 0.065, 0.075, -0.04], [0.1, 0.055, 0.06, -0.034], [0.115, 0.04, 0.04, -0.026]], { nt: 2.4, nb: 2 });

const abdomenGeo = () =>
  bodyGeo(
    'cicadaNymphAbdomen',
    [[-0.2, 0, 0.012, -0.004], [-0.185, 0.025, 0.03, -0.02], [-0.14, 0.055, 0.052, -0.034], [-0.07, 0.068, 0.06, -0.04], [-0.01, 0.06, 0.052, -0.034], [0.01, 0.045, 0.04, -0.026]],
    { nt: 2.2, nb: 2.2, segs: [-0.19, 0.0, 7, 0.08] },
  );

/** はねの もと（翅芽）：むねの 横から 後ろへ のびる 平たい ふくらみ */
const wingPadGeo = () =>
  mergedGeo('cicadaWingPad', () => [
    shapedTube(
      [
        [0, 0, 0.05],
        [0.012, -0.01, 0.0],
        [0.016, -0.025, -0.045],
      ],
      (t) => [0.022 * (1 - t * 0.5), 0.008],
      10,
      8,
      [0, 1, 0],
    ),
  ]);

export function SemiNymph({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0.6, false);
  const fore = useRef<Array<THREE.Group | null>>([]);
  const skin = useMemo(() => ({ ...SKIN, normalMap: SURF.granular().normalMap, normalScale: 0.35 }), []);
  const legMat = useMemo(() => mat('#7a4f28', SURF.matteChitin()), []);
  useFrame(() => {
    const a = anim.current;
    // 前あしで 土を かきわける（左右 交互）。さわると 前あしを ちぢめて 身を まもる
    fore.current.forEach((g, i) => {
      if (!g) return;
      const s = i === 0 ? 1 : -1;
      const dig = Math.sin(a.gait * 1.5 + i * Math.PI) * 0.45 * a.walk;
      g.rotation.x = dig - a.spray * 0.6 - a.startle * 0.3;
      g.rotation.y = s * (0.1 + Math.max(0, dig) * 0.25);
    });
  });
  return (
    <group position={[0, 0.045, 0]}>
      <group ref={body}>
        <Part geometry={headGeo()} color="#7e5430" surface={skin} castShadow />
        {[1, -1].map((s) => (
          <group key={s}>
            <CompoundEye position={[s * 0.047, 0.026, 0.135]} size={[0.016, 0.017, 0.02]} color="#4a2c1a" />
            <Antenna position={[s * 0.02, 0.02, 0.17]} side={s as 1 | -1} length={0.05} thick={0.0028} kind="filiform" color="#8a5a2c" anim={anim} rotation={[0.3, 0.6, 0]} />
          </group>
        ))}
        {/* 口（ストローの ような 口を むねの 下に たたむ） */}
        <M geo={GEO.capsule()} color="#7a4a24" position={[0, -0.03, 0.09]} rotation={[1.3, 0, 0]} scale={[0.008, 0.06, 0.008]} />
        <Part geometry={thoraxGeo()} color="#87592f" surface={skin} castShadow />
        {[1, -1].map((s) => (
          <mesh key={s} geometry={wingPadGeo()} material={mat('#5e3d1e', SKIN)} position={[s * 0.05, 0.035, 0.0]} scale={[s, 1, 1]} rotation={[0, 0, -s * 0.5]} />
        ))}
        <Part geometry={abdomenGeo()} color="#94673a" surface={skin} castShadow />
        {/* 太い 前あし */}
        {[1, -1].map((s, i) => (
          <group key={s} ref={(g) => void (fore.current[i] = g)} position={[s * 0.035, -0.02, 0.09]}>
            <mesh geometry={foreLegGeo()} material={legMat} scale={[s, 1, 1]} castShadow />
          </group>
        ))}
        {[1, 2].map((p) =>
          [1, -1].map((s) => <Leg key={`${p}${s}`} position={[s * 0.04, -0.025, 0.07 - p * 0.04]} side={s as 1 | -1} pair={p} spec={LEG} color="#7a4f28" anim={anim} spread={0.15} />),
        )}
      </group>
    </group>
  );
}
