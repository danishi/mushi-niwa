import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, SURF } from '../three/materials';
import { grainBump, monshiroWing, veinWing } from '../three/textures';
import type { CreatureAnim } from './anim';
import { M, useBodyMotion } from './common';
import { shapeGeo } from './geom';
import { Antenna, CompoundEye, Leg, Part, type LegSpec } from './parts';

/**
 * にわに ときどき 来る「おきゃくさん」。育てる 虫より 軽い つくりにして、
 * 遠くから 見ても その 種類と わかる 形・色を 優先する（docs/visitors-research.md）。
 * anim.flap: 飛ぶ、anim.walk: 歩く、anim.spray: タップされた 反応（ダンゴムシは まるまる）
 */
type AnimRef = { current: CreatureAnim };

/* ───────────── シオカラトンボ（オス） ───────────── */

const dragonWing = (s: THREE.Shape) => {
  s.moveTo(0, 0.02);
  s.bezierCurveTo(0.3, 0.07, 0.8, 0.07, 1, 0.02);
  s.bezierCurveTo(0.9, -0.06, 0.4, -0.08, 0, -0.03);
};

function DragonWing({ anim, side, front }: { anim: AnimRef; side: 1 | -1; front: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const geo = shapeGeo('dragonWing', dragonWing);
  const material = useMemo(
    () => mat('#ffffff', { map: veinWing('#e8f1f4', '#3c4448', 0.25), opacity: 0.95, side: THREE.DoubleSide, depthWrite: false, roughness: 0.1 }),
    [],
  );
  const seed = front ? 0 : 1.4;
  useFrame(() => {
    const a = anim.current;
    if (ref.current) ref.current.rotation.z = Math.sin(a.t * 60 + seed) * 0.5 * a.flap + 0.04;
  });
  return (
    <group position={[side * 0.02, 0.05, front ? 0.07 : 0.0]} scale={[side, 1, 1]}>
      <group ref={ref}>
        <group rotation={[-Math.PI / 2, 0, front ? 0.12 : -0.12]} scale={[0.42, front ? 0.9 : 1.15, 1]}>
          <mesh geometry={geo} material={material} />
        </group>
      </group>
    </group>
  );
}

export function Shiokara({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0);
  const powder = useMemo(() => ({ roughness: 0.9, sheen: 0.6, sheenColor: '#e6f0f5' }), []);
  return (
    <group ref={body}>
      {/* 頭：大きな 複眼が 左右で くっつく */}
      <CompoundEye position={[0.03, 0.07, 0.17]} size={[0.04, 0.04, 0.038]} color="#3f8fb0" />
      <CompoundEye position={[-0.03, 0.07, 0.17]} size={[0.04, 0.04, 0.038]} color="#3f8fb0" />
      <M color="#3b3b2e" position={[0, 0.045, 0.19]} scale={[0.03, 0.025, 0.02]} />
      {/* 胸 */}
      <Part geometry={GEO.sphere()} color="#8e979c" surface={powder} position={[0, 0.05, 0.07]} scale={[0.045, 0.05, 0.075]} castShadow />
      {/* 腹：しろい 粉を ふいた みずいろ、先は 黒い */}
      <Part geometry={GEO.capsule()} color="#b9c4ca" surface={powder} position={[0, 0.05, -0.17]} rotation={[Math.PI / 2, 0, 0]} scale={[0.026, 0.3, 0.026]} castShadow />
      <M geo={GEO.capsule()} color="#1c1d1f" position={[0, 0.05, -0.36]} rotation={[Math.PI / 2, 0, 0]} scale={[0.022, 0.08, 0.022]} />
      {/* 腹の 先の 白い 尾毛 */}
      {[1, -1].map((s) => (
        <M key={s} geo={GEO.cylinder()} color="#f2f2ee" position={[s * 0.006, 0.05, -0.425]} rotation={[Math.PI / 2, 0, 0]} scale={[0.004, 0.025, 0.004]} />
      ))}
      {[1, -1].map((s) => (
        <group key={s}>
          <DragonWing anim={anim} side={s as 1 | -1} front />
          <DragonWing anim={anim} side={s as 1 | -1} front={false} />
        </group>
      ))}
    </group>
  );
}

/* ───────────── モンシロチョウ ───────────── */

const pierisFore = (s: THREE.Shape) => {
  s.moveTo(0, 0);
  s.bezierCurveTo(0.2, 0.25, 0.6, 0.5, 0.9, 0.48);
  s.bezierCurveTo(0.95, 0.25, 0.8, 0.02, 0.45, -0.1);
  s.lineTo(0, -0.04);
};
const pierisHind = (s: THREE.Shape) => {
  s.moveTo(0, -0.03);
  s.bezierCurveTo(0.35, 0.0, 0.62, -0.18, 0.55, -0.45);
  s.bezierCurveTo(0.4, -0.6, 0.1, -0.45, 0, -0.18);
};

function PierisWing({ anim, side }: { anim: AnimRef; side: 1 | -1 }) {
  const ref = useRef<THREE.Group>(null);
  const fore = shapeGeo('pierisFore', pierisFore);
  const hind = shapeGeo('pierisHind', pierisHind);
  const foreMat = useMemo(() => mat('#ffffff', { ...SURF.scales(), map: monshiroWing('fore'), side: THREE.DoubleSide }), []);
  const hindMat = useMemo(() => mat('#ffffff', { ...SURF.scales(), map: monshiroWing('hind'), side: THREE.DoubleSide }), []);
  useFrame(() => {
    const a = anim.current;
    const flap = Math.sin(a.t * 14) * 0.9 * a.flap + (1 - a.flap) * (1.2 + Math.sin(a.t * 1.3) * 0.15);
    if (ref.current) ref.current.rotation.z = 0.1 + flap;
  });
  return (
    <group position={[side * 0.02, 0.05, 0.04]} scale={[side, 1, 1]}>
      <group ref={ref}>
        <group rotation={[Math.PI / 2, 0, 0]} scale={0.55}>
          <mesh geometry={fore} material={foreMat} />
          <mesh geometry={hind} material={hindMat} position={[0, 0, 0.002]} />
        </group>
      </group>
    </group>
  );
}

export function Monshiro({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0);
  const fur = useMemo(() => ({ roughness: 0.85, sheen: 0.5, sheenColor: '#cfcab8' }), []);
  return (
    <group ref={body}>
      <Part geometry={GEO.sphere()} color="#2b2a28" surface={fur} position={[0, 0.04, 0.06]} scale={[0.035, 0.035, 0.06]} castShadow />
      <Part geometry={GEO.capsule()} color="#3a3834" surface={fur} position={[0, 0.03, -0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[0.03, 0.12, 0.03]} />
      <M color="#2b2a28" surface={fur} position={[0, 0.045, 0.13]} scale={0.026} />
      <CompoundEye position={[0.018, 0.05, 0.14]} size={0.014} color="#5b5a3a" />
      <CompoundEye position={[-0.018, 0.05, 0.14]} size={0.014} color="#5b5a3a" />
      <Antenna position={[0.01, 0.07, 0.14]} side={1} length={0.14} thick={0.004} kind="clubbed" color="#2b2a28" anim={anim} rotation={[0.2, 0.25, 0]} />
      <Antenna position={[-0.01, 0.07, 0.14]} side={-1} length={0.14} thick={0.004} kind="clubbed" color="#2b2a28" anim={anim} rotation={[0.2, 0.25, 0]} />
      <PierisWing anim={anim} side={1} />
      <PierisWing anim={anim} side={-1} />
    </group>
  );
}

/* ───────────── トノサマバッタ ───────────── */

const HOPPER_LEG: LegSpec = { femur: 0.08, tibia: 0.08, tarsus: 0.04, thick: 0.012, tarsi: 3 };

export function Tonosama({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 1);
  const hind = useRef<THREE.Group>(null);
  const skin = useMemo(() => ({ roughness: 0.6, bumpMap: grainBump(41, 64), bumpScale: 0.6 }), []);
  useFrame(() => {
    // 跳ぶ ときに 後ろあしを けりだす
    if (hind.current) hind.current.rotation.x = -anim.current.spray * 0.9;
  });
  return (
    <group ref={body} position={[0, 0.05, 0]}>
      {/* 頭（たてながで 大きめ）と 前胸 */}
      <Part geometry={GEO.sphere()} color="#6f8a3a" surface={skin} position={[0, 0.08, 0.2]} scale={[0.05, 0.065, 0.055]} castShadow />
      <CompoundEye position={[0.04, 0.1, 0.21]} size={[0.018, 0.026, 0.022]} color="#6b5b3a" />
      <CompoundEye position={[-0.04, 0.1, 0.21]} size={[0.018, 0.026, 0.022]} color="#6b5b3a" />
      <Part geometry={GEO.sphere()} color="#7b9442" surface={skin} position={[0, 0.09, 0.11]} scale={[0.055, 0.06, 0.07]} castShadow />
      {/* 腹と、たたんだ はね（茶色の まだら） */}
      <Part geometry={GEO.capsule()} color="#8a8a4a" surface={skin} position={[0, 0.06, -0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[0.05, 0.22, 0.05]} />
      <M geo={GEO.sphere()} color="#8f8650" surface={skin} position={[0, 0.1, -0.09]} scale={[0.05, 0.022, 0.2]} castShadow />
      <Antenna position={[0.015, 0.12, 0.24]} side={1} length={0.14} thick={0.006} kind="filiform" color="#6a5a35" anim={anim} rotation={[0.3, 0.2, 0]} />
      <Antenna position={[-0.015, 0.12, 0.24]} side={-1} length={0.14} thick={0.006} kind="filiform" color="#6a5a35" anim={anim} rotation={[0.3, 0.2, 0]} />
      {[0, 1].map((p) => (
        <group key={p} position={[0, 0.04, 0.14 - p * 0.06]}>
          <Leg position={[0.04, 0, 0]} side={1} pair={p} spec={HOPPER_LEG} color="#6f8a3a" anim={anim} spread={0.4} />
          <Leg position={[-0.04, 0, 0]} side={-1} pair={p} spec={HOPPER_LEG} color="#6f8a3a" anim={anim} spread={0.4} />
        </group>
      ))}
      {/* 大きな 後ろあし：太い もも が 上へ ななめに のび、ひざで すね が 下へ たたまれる */}
      <group ref={hind} position={[0, 0.07, 0.02]}>
        {[1, -1].map((s) => (
          <group key={s} position={[s * 0.055, 0, 0]} rotation={[0, s * 0.12, 0]}>
            {/* もも（腿節）：内がわに 黒い ななめの 帯 */}
            <group rotation={[0.42, 0, 0]}>
              <M geo={GEO.sphere()} color="#7b8f45" surface={skin} position={[0, 0, -0.11]} scale={[0.022, 0.032, 0.12]} castShadow />
              <M geo={GEO.sphere()} color="#2a2a20" position={[0, -0.006, -0.2]} scale={[0.012, 0.012, 0.012]} />
              {/* すね（脛節）：ひざから 前へ もどって 地面に つく */}
              <group position={[0, 0, -0.21]} rotation={[0.6, 0, 0]}>
                <M geo={GEO.cylinder()} color="#c7793a" position={[0, -0.01, 0.1]} rotation={[Math.PI / 2, 0, 0]} scale={[0.008, 0.2, 0.008]} />
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ───────────── オカダンゴムシ ───────────── */

export function Dangomushi({ anim }: { anim: AnimRef }) {
  const roll = useRef<THREE.Group>(null);
  const segs = useRef<THREE.Group>(null);
  const legGroup = useRef<THREE.Group>(null);
  const shell = useMemo(() => ({ roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3, bumpMap: grainBump(57, 64), bumpScale: 0.4 }), []);
  const legs = useMemo(() => mat('#5a5650', SURF.matteChitin()), []);
  useFrame(() => {
    const a = anim.current;
    // spray: くるんと まるまる（0 → 1）
    const k = a.spray;
    if (segs.current) {
      segs.current.children.forEach((c, i) => {
        const u = (i - 4) / 4;
        c.position.z = u * 0.09 * (1 - k * 0.6);
        c.position.y = 0.03 + (1 - Math.cos(u * k * 1.7)) * 0.07;
        c.rotation.x = -u * k * 1.5;
      });
    }
    if (roll.current) roll.current.position.y = k * 0.03;
    if (legGroup.current) legGroup.current.visible = k < 0.5;
  });
  return (
    <group ref={roll}>
      <group ref={segs}>
        {Array.from({ length: 9 }, (_, i) => {
          const u = (i - 4) / 4;
          const w = 0.085 * Math.sqrt(1 - u * u * 0.55);
          return (
            <mesh key={i} geometry={GEO.sphere()} material={mat(i === 8 ? '#3a3936' : '#4a4945', shell)} scale={[w, 0.045, 0.03]} castShadow={i === 4} />
          );
        })}
      </group>
      {/* ちいさな あし（7 対）と 短い 触角 */}
      <group ref={legGroup}>
        {Array.from({ length: 7 }, (_, i) =>
          [1, -1].map((s) => (
            <mesh key={`${i}${s}`} geometry={GEO.cylinder()} material={legs} position={[s * 0.07, 0.01, -0.08 + i * 0.026]} rotation={[0, 0, s * 1.2]} scale={[0.005, 0.03, 0.005]} />
          )),
        )}
        {[1, -1].map((s) => (
          <M key={s} geo={GEO.cylinder()} color="#3a3936" position={[s * 0.035, 0.03, 0.15]} rotation={[1.2, 0, s * -0.5]} scale={[0.006, 0.06, 0.006]} />
        ))}
      </group>
    </group>
  );
}

/* ───────────── アブラゼミ ───────────── */

const cicadaWing = (s: THREE.Shape) => {
  s.moveTo(0, 0);
  s.bezierCurveTo(0.25, 0.1, 0.8, 0.12, 1, 0.02);
  s.bezierCurveTo(0.85, -0.12, 0.35, -0.12, 0, -0.04);
};

export function Aburazemi({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0);
  const wings = useRef<THREE.Group>(null);
  const geo = shapeGeo('cicadaWing', cicadaWing);
  // はねは 茶色で すけない（アブラゼミの とくちょう）
  const wingMat = useMemo(() => mat('#ffffff', { map: veinWing('#7a5130', '#3a2414', 1), side: THREE.DoubleSide, roughness: 0.5 }), []);
  useFrame(() => {
    const a = anim.current;
    if (wings.current) {
      // とまっている ときは 背中で 屋根のように たたみ、飛ぶ ときは ひらいて はばたく
      const open = a.flap;
      wings.current.children.forEach((c, i) => {
        const s = i === 0 ? 1 : -1;
        c.rotation.y = s * open * 0.9;
        c.rotation.z = s * (0.35 + Math.sin(a.t * 50) * 0.4 * open);
      });
    }
  });
  return (
    <group ref={body}>
      {/* 頭（はばが ひろく、目が 左右に はなれる） */}
      <Part geometry={GEO.sphere()} color="#2a2420" surface={SURF.chitin(0.5)} position={[0, 0.05, 0.15]} scale={[0.055, 0.03, 0.03]} />
      <CompoundEye position={[0.055, 0.06, 0.15]} size={0.018} color="#5a4a32" />
      <CompoundEye position={[-0.055, 0.06, 0.15]} size={0.018} color="#5a4a32" />
      {/* 胸：黒地に 褐色の もよう */}
      <Part geometry={GEO.sphere()} color="#2a2420" surface={SURF.chitin(0.6)} position={[0, 0.055, 0.07]} scale={[0.055, 0.04, 0.065]} castShadow />
      <M geo={GEO.sphere()} color="#6b4a2a" position={[0, 0.088, 0.07]} scale={[0.03, 0.01, 0.04]} />
      {/* 腹 */}
      <Part geometry={GEO.sphere()} color="#2f2924" surface={SURF.chitin(0.5)} position={[0, 0.045, -0.06]} scale={[0.048, 0.04, 0.09]} />
      <group ref={wings} position={[0, 0.09, 0.09]}>
        {[1, -1].map((s) => (
          <group key={s} scale={[s, 1, 1]}>
            <group rotation={[0, Math.PI / 2, 0]}>
              <group rotation={[-Math.PI / 2, 0, 0]}>
                <mesh geometry={geo} material={wingMat} scale={[0.36, -0.75, 1]} castShadow />
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

export const VISITOR_MODELS = {
  shiokara: Shiokara,
  monshiro: Monshiro,
  tonosama: Tonosama,
  dangomushi: Dangomushi,
  aburazemi: Aburazemi,
} as const;
