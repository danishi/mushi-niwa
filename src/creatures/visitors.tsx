import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GEO, mat, SURF } from '../three/materials';
import { grainBump, monshiroWing, veinWing, paint, striaeNormal } from '../three/textures';
import type { CreatureAnim } from './anim';
import { M, useBodyMotion } from './common';
import { shapeGeo, taperedTube, abdomenY, abdomenZ, archGeo, bodyGeo, saddleGeo, shieldGeo, elytronHalf, spiderAbdomen, spiderLeg } from './geom';
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

/** k: はねの 大きさ、z: つけねの 前後（オニヤンマ用）、tint: はねの 地の 色 */
function DragonWing({ anim, side, front, k = 1, z = 0, tint = '#e8f1f4' }: { anim: AnimRef; side: 1 | -1; front: boolean; k?: number; z?: number; tint?: string }) {
  const ref = useRef<THREE.Group>(null);
  const geo = shapeGeo('dragonWing', dragonWing);
  const material = useMemo(
    () => mat('#ffffff', { map: veinWing(tint, '#3c4448', 0.25), opacity: 0.95, side: THREE.DoubleSide, depthWrite: false, roughness: 0.1 }),
    [tint],
  );
  const seed = front ? 0 : 1.4;
  useFrame(() => {
    const a = anim.current;
    if (ref.current) ref.current.rotation.z = Math.sin(a.t * 60 + seed) * 0.5 * a.flap + 0.04;
  });
  return (
    <group position={[side * 0.02, 0.05, (front ? 0.07 : 0.0) + z]} scale={[side, 1, 1]}>
      <group ref={ref}>
        <group rotation={[-Math.PI / 2, 0, front ? 0.12 : -0.12]} scale={[0.42 * k, (front ? 0.9 : 1.15) * k, 1]}>
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
      <Part geometry={abdomenY(9)} color="#b9c4ca" surface={powder} position={[0, 0.05, -0.17]} rotation={[Math.PI / 2, 0, 0]} scale={[0.026, 0.3, 0.026]} castShadow />
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
      <Part geometry={abdomenY(7)} color="#3a3834" surface={fur} position={[0, 0.03, -0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[0.03, 0.12, 0.03]} />
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
      <Part geometry={saddleGeo()} color="#7b9442" surface={skin} position={[0, 0.09, 0.11]} scale={[0.055, 0.06, 0.07]} castShadow />
      {/* 腹と、たたんだ はね（茶色の まだら） */}
      <Part geometry={abdomenY(8)} color="#8a8a4a" surface={skin} position={[0, 0.06, -0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[0.05, 0.22, 0.05]} />
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
            <mesh key={i} geometry={archGeo()} material={mat(i === 8 ? '#3a3936' : '#4a4945', shell)} scale={[w, 0.05, 0.03]} castShadow={i === 4} />
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
      <Part geometry={shieldGeo()} color="#2a2420" surface={SURF.chitin(0.6)} position={[0, 0.055, 0.07]} scale={[0.055, 0.04, 0.065]} castShadow />
      <M geo={GEO.sphere()} color="#6b4a2a" position={[0, 0.088, 0.07]} scale={[0.03, 0.01, 0.04]} />
      {/* 腹 */}
      <Part geometry={abdomenZ(6)} color="#2f2924" surface={SURF.chitin(0.5)} position={[0, 0.045, -0.06]} scale={[0.048, 0.04, 0.09]} />
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

/* ───────────── アキアカネ（秋の 赤い オス） ───────────── */

export function Akiakane({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0);
  const skin = useMemo(() => ({ roughness: 0.5, clearcoat: 0.3 }), []);
  return (
    <group ref={body}>
      <CompoundEye position={[0.028, 0.07, 0.17]} size={[0.036, 0.036, 0.034]} color="#7a3a22" />
      <CompoundEye position={[-0.028, 0.07, 0.17]} size={[0.036, 0.036, 0.034]} color="#7a3a22" />
      <M color="#b0572e" position={[0, 0.045, 0.19]} scale={[0.028, 0.022, 0.018]} />
      {/* 胸：ちゃいろで、よこに 黒い すじ */}
      <Part geometry={GEO.sphere()} color="#9a5a34" surface={skin} position={[0, 0.05, 0.07]} scale={[0.042, 0.048, 0.07]} castShadow />
      {[1, -1].map((s) => (
        <M key={s} geo={GEO.box()} color="#2a1a12" position={[s * 0.04, 0.05, 0.07]} rotation={[0.5, 0, 0]} scale={[0.004, 0.06, 0.008]} />
      ))}
      {/* 腹：まっかで 細く、先が すこし ふくらむ */}
      <Part geometry={abdomenY(9)} color="#c8321e" surface={skin} position={[0, 0.05, -0.18]} rotation={[Math.PI / 2, 0, 0]} scale={[0.02, 0.33, 0.022]} castShadow />
      <M geo={GEO.capsule()} color="#b52a18" surface={skin} position={[0, 0.05, -0.37]} rotation={[Math.PI / 2, 0, 0]} scale={[0.023, 0.06, 0.024]} />
      {[1, -1].map((s) => (
        <group key={s}>
          <DragonWing anim={anim} side={s as 1 | -1} front />
          <DragonWing anim={anim} side={s as 1 | -1} front={false} />
        </group>
      ))}
    </group>
  );
}

/* ───────────── ゲンジボタル（夜、おしりが ひかる） ───────────── */

export function Hotaru({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0);
  const wings = useRef<THREE.Group>(null);
  // ひかる 材質は この 子だけの もの（共有 キャッシュを 書きかえない）
  const lamp = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fff7a8', emissive: '#d8ff6a', emissiveIntensity: 1, roughness: 0.4, toneMapped: false }), []);
  const halo = useMemo(() => new THREE.MeshBasicMaterial({ color: '#d8ff6a', transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false }), []);
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const a = anim.current;
    // ゆっくり 明るく なって 消える（明滅）。タップされたら つよく ひかる
    const blink = Math.pow(Math.max(0, Math.sin(a.t * 2.4)), 2);
    const k = Math.max(blink, a.spray);
    lamp.emissiveIntensity = 0.15 + k * 2.4;
    halo.opacity = 0.05 + k * 0.35;
    if (haloRef.current) haloRef.current.scale.setScalar(0.05 + k * 0.08);
    if (wings.current) {
      wings.current.children.forEach((c, i) => {
        const s = i === 0 ? 1 : -1;
        c.rotation.z = s * (0.05 + a.flap * (0.6 + Math.sin(a.t * 40) * 0.4));
      });
    }
  });
  return (
    <group ref={body}>
      {/* 前胸：ももいろで まんなかに 黒い 十字 */}
      <Part geometry={shieldGeo()} color="#e58a8a" surface={SURF.matteChitin()} position={[0, 0.04, 0.09]} scale={[0.04, 0.018, 0.035]} castShadow />
      <M geo={GEO.box()} color="#1a1414" position={[0, 0.058, 0.09]} scale={[0.012, 0.004, 0.05]} />
      <M geo={GEO.box()} color="#1a1414" position={[0, 0.058, 0.095]} scale={[0.04, 0.004, 0.01]} />
      <M color="#1a1414" position={[0, 0.03, 0.125]} scale={[0.022, 0.02, 0.02]} />
      <CompoundEye position={[0.018, 0.032, 0.135]} size={0.012} color="#2a2a2a" />
      <CompoundEye position={[-0.018, 0.032, 0.135]} size={0.012} color="#2a2a2a" />
      <Antenna position={[0.008, 0.04, 0.14]} side={1} length={0.07} thick={0.003} kind="filiform" color="#1a1414" anim={anim} rotation={[0.2, 0.3, 0]} />
      <Antenna position={[-0.008, 0.04, 0.14]} side={-1} length={0.07} thick={0.003} kind="filiform" color="#1a1414" anim={anim} rotation={[0.2, 0.3, 0]} />
      {/* 黒い 前ばね */}
      <group ref={wings} position={[0, 0.04, 0.06]}>
        {[1, -1].map((s) => (
          <group key={s} scale={[s, 1, 1]}>
            <M geo={elytronHalf()} color="#151313" surface={SURF.matteChitin()} position={[0, -0.006, -0.07]} scale={[0.04, 0.022, 0.075]} castShadow />
          </group>
        ))}
      </group>
      {/* おしりの 発光器 */}
      <mesh geometry={GEO.sphere()} material={lamp} position={[0, 0.025, -0.07]} scale={[0.026, 0.016, 0.03]} />
      <mesh ref={haloRef} geometry={GEO.sphere()} material={halo} position={[0, 0.025, -0.07]} scale={0.05} />
    </group>
  );
}

/* ───────────── エンマコオロギ（夜、リリリと なく） ───────────── */

const CRICKET_LEG: LegSpec = { femur: 0.07, tibia: 0.07, tarsus: 0.035, thick: 0.01, tarsi: 3 };

export function Enmakorogi({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 1);
  const wing = useRef<THREE.Group>(null);
  const hind = useRef<THREE.Group>(null);
  const shell = useMemo(() => ({ roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 }), []);
  useFrame(() => {
    const a = anim.current;
    // なく ときは はねを すこし もちあげて こすりあわせる
    if (wing.current) wing.current.rotation.x = -0.15 - Math.abs(Math.sin(a.t * 30)) * 0.12 * a.sing;
    if (hind.current) hind.current.rotation.x = -a.spray * 0.9;
  });
  return (
    <group ref={body} position={[0, 0.03, 0]}>
      {/* まるい 大きな 頭。目の あいだに 白っぽい すじ（えんまさまの かお） */}
      <Part geometry={GEO.sphere()} color="#2a1c14" surface={shell} position={[0, 0.07, 0.15]} scale={[0.06, 0.055, 0.05]} castShadow />
      <M geo={GEO.box()} color="#d8c9a0" position={[0, 0.112, 0.16]} rotation={[0.6, 0, 0]} scale={[0.07, 0.006, 0.01]} />
      <CompoundEye position={[0.045, 0.085, 0.17]} size={0.016} color="#3a2a1a" />
      <CompoundEye position={[-0.045, 0.085, 0.17]} size={0.016} color="#3a2a1a" />
      <Antenna position={[0.02, 0.09, 0.19]} side={1} length={0.42} thick={0.004} kind="filiform" color="#3a2a1a" anim={anim} rotation={[0.1, 0.4, 0]} />
      <Antenna position={[-0.02, 0.09, 0.19]} side={-1} length={0.42} thick={0.004} kind="filiform" color="#3a2a1a" anim={anim} rotation={[0.1, 0.4, 0]} />
      <Part geometry={saddleGeo(0)} color="#2f2017" surface={shell} position={[0, 0.07, 0.08]} scale={[0.058, 0.045, 0.045]} />
      {/* はねは ちゃいろ */}
      <group ref={wing} position={[0, 0.1, 0.05]}>
        <Part geometry={GEO.sphere()} color="#5a3c22" surface={shell} position={[0, 0, -0.1]} scale={[0.06, 0.016, 0.12]} castShadow />
      </group>
      <Part geometry={abdomenZ(7)} color="#231710" surface={shell} position={[0, 0.06, -0.07]} scale={[0.055, 0.042, 0.13]} />
      {/* おしりの 2 本の 毛（尾毛） */}
      {[1, -1].map((s) => (
        <M key={s} geo={GEO.cylinder()} color="#3a2a1a" position={[s * 0.02, 0.07, -0.24]} rotation={[Math.PI / 2 - 0.2, 0, s * 0.2]} scale={[0.004, 0.08, 0.004]} />
      ))}
      {[0, 1].map((p) => (
        <group key={p} position={[0, 0.03, 0.1 - p * 0.06]}>
          <Leg position={[0.04, 0, 0]} side={1} pair={p} spec={CRICKET_LEG} color="#3a2618" anim={anim} spread={0.4} />
          <Leg position={[-0.04, 0, 0]} side={-1} pair={p} spec={CRICKET_LEG} color="#3a2618" anim={anim} spread={0.4} />
        </group>
      ))}
      <group ref={hind} position={[0, 0.06, 0.0]}>
        {[1, -1].map((s) => (
          <group key={s} position={[s * 0.055, 0, 0]} rotation={[0.35, s * 0.15, 0]}>
            <M color="#3a2618" position={[0, 0, -0.08]} scale={[0.022, 0.03, 0.09]} castShadow />
            <group position={[0, 0, -0.16]} rotation={[0.7, 0, 0]}>
              <M geo={GEO.cylinder()} color="#2a1a10" position={[0, -0.01, 0.07]} rotation={[Math.PI / 2, 0, 0]} scale={[0.007, 0.14, 0.007]} />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ───────────── ジョロウグモ（メス。あみの まんなかに いる） ───────────── */

const localGeo = new Map<string, THREE.BufferGeometry>();
function sharedGeoLocal(k: string, make: () => THREE.BufferGeometry) {
  let g = localGeo.get(k);
  if (!g) {
    g = make();
    localGeo.set(k, g);
  }
  return g;
}

/** ジョロウグモの あみ（にわでは 棚の 奥の 板に はる。ずかんの 台の 上では 出さない） */
export function JoroWeb() {
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: webTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide }), []);
  return (
    <mesh material={material} position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.2, 1.2]} />
    </mesh>
  );
}

let webTex: THREE.CanvasTexture | null = null;
/** あみの もよう（たて糸 と こまかい うずまき）を Canvas で かく */
function webTexture() {
  if (webTex) return webTex;
  const N = 512;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d')!;
  g.strokeStyle = 'rgba(250, 248, 236, 0.9)';
  g.lineWidth = 2.2;
  const cx = N / 2;
  const R = N * 0.48;
  const spokes = 20;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx, cx);
    g.lineTo(cx + Math.cos(a) * R, cx + Math.sin(a) * R);
    g.stroke();
  }
  g.lineWidth = 1.6;
  g.beginPath();
  for (let k = 0; k <= spokes * 12; k++) {
    const a = (k / spokes) * Math.PI * 2;
    const r = N * 0.05 + (k / (spokes * 12)) * (R - N * 0.06);
    const x = cx + Math.cos(a) * r;
    const y = cx + Math.sin(a) * r;
    if (k === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  webTex = new THREE.CanvasTexture(c);
  webTex.colorSpace = THREE.SRGBColorSpace;
  return webTex;
}

export function Jorougumo({ anim }: { anim: AnimRef }) {
  const legs = useRef<THREE.Group>(null);
  // あしは きいろと くろの しま、はらは きいろに あおぐろの よこじま
  const band = useMemo(
    () =>
      mat('#ffffff', {
        roughness: 0.5,
        map: paint('joroLeg', 64, (g, s) => {
          for (let i = 0; i < 8; i++) {
            g.fillStyle = i % 2 ? '#d8b83a' : '#1e1e1a';
            g.fillRect(0, (i / 8) * s, s, s / 8 + 1);
          }
        }),
      }),
    [],
  );
  const abdomen = useMemo(
    () => ({
      ...SURF.chitin(0.4),
      map: paint('joroAbdomen', 128, (g, s) => {
        g.fillStyle = '#e6c53a';
        g.fillRect(0, 0, s, s);
        g.fillStyle = '#2a3446';
        for (const v of [0.2, 0.42, 0.64, 0.84]) g.fillRect(s * 0.2, s * v, s * 0.6, s * 0.09);
        g.fillStyle = '#c8322a';
        g.fillRect(0, s * 0.55, s * 0.12, s * 0.4);
        g.fillRect(s * 0.88, s * 0.55, s * 0.12, s * 0.4);
      }),
    }),
    [],
  );
  useFrame(() => {
    const a = anim.current;
    if (!legs.current) return;
    // タップされたら あしを ちぢめる。ふだんは ときどき あしを うごかす
    legs.current.children.forEach((c, i) => {
      const base = c.userData.base as number;
      c.rotation.y = base * (1 - a.spray * 0.45) + Math.sin(a.t * 1.3 + i) * 0.03;
    });
  });
  const legAngles = [0.55, 0.95, 2.1, 2.55];
  const legLen = [0.32, 0.27, 0.2, 0.3];
  return (
    <group>
      {/* はら：きいろと あおぐろの しま、よこに 赤い もよう */}
      <Part geometry={spiderAbdomen()} color="#ffffff" surface={abdomen} position={[0, 0.05, -0.1]} scale={[0.06, 0.05, 0.12]} castShadow />
      <M color="#c8322a" position={[0, 0.03, -0.2]} scale={[0.03, 0.025, 0.03]} />
      {/* あたまむね */}
      <Part geometry={GEO.sphere()} color="#3a3a2e" surface={SURF.matteChitin()} position={[0, 0.04, 0.04]} scale={[0.035, 0.022, 0.045]} />
      <M color="#d8d0b0" position={[0, 0.05, 0.04]} scale={[0.02, 0.012, 0.03]} />
      {/* 8 本の 長い あし（きいろと くろの しま） */}
      <group ref={legs} position={[0, 0.04, 0.04]}>
        {[1, -1].flatMap((s) =>
          legAngles.map((ang, i) => (
            <group key={`${s}${i}`} rotation={[0, s * ang, 0]} userData={{ base: s * ang }}>
              <mesh geometry={spiderLeg()} material={band} scale={legLen[i]!} />
            </group>
          )),
        )}
      </group>
    </group>
  );
}

/* ───────────── カタツムリ（ウスカワマイマイ） ───────────── */

function shellGeo() {
  return sharedGeoLocal('snailShell', () => {
    // からの くち（大きい）から てっぺん（小さい）へ、うずまきに そって 細くなる 管
    const pts: THREE.Vector3[] = [];
    const N = 48;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const ang = t * Math.PI * 4.4;
      const r = 0.085 * Math.exp(-1.9 * t);
      pts.push(new THREE.Vector3(t * 0.04, Math.sin(ang) * r, -Math.cos(ang) * r));
    }
    const g = taperedTube(pts, 0.06, 0.006, 96, 14);
    g.computeVertexNormals();
    return g;
  });
}

export function Katatsumuri({ anim }: { anim: AnimRef }) {
  const bodyRef = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const skin = useMemo(() => ({ roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2, bumpMap: grainBump(77, 64), bumpScale: 0.6 }), []);
  useFrame(() => {
    const a = anim.current;
    // spray: からに ひっこむ
    const k = a.spray;
    if (bodyRef.current) {
      bodyRef.current.scale.set(1, 1 - k * 0.4, 1 - k * 0.75);
      bodyRef.current.position.z = -k * 0.06;
    }
    if (eyes.current) eyes.current.scale.setScalar(Math.max(0.01, 1 - k) * (1 + Math.sin(a.t * 0.9) * 0.05));
  });
  return (
    <group>
      <group ref={bodyRef}>
        {/* やわらかい からだ（あしで すべるように すすむ） */}
        <Part geometry={GEO.capsule()} color="#b8a88a" surface={skin} position={[0, 0.02, 0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[0.04, 0.2, 0.025]} castShadow />
        <M color="#b8a88a" surface={skin} position={[0, 0.045, 0.12]} scale={[0.035, 0.03, 0.04]} />
        {/* 長い 2 本（先に 目）と 短い 2 本の つの */}
        <group ref={eyes} position={[0, 0.06, 0.14]}>
          {[1, -1].map((s) => (
            <group key={s}>
              <M geo={GEO.cylinder()} color="#a8987a" surface={skin} position={[s * 0.015, 0.04, 0.02]} rotation={[0.5, 0, -s * 0.25]} scale={[0.006, 0.09, 0.006]} />
              <M color="#3a3226" position={[s * 0.027, 0.083, 0.045]} scale={0.009} />
              <M geo={GEO.cylinder()} color="#a8987a" surface={skin} position={[s * 0.012, 0.0, 0.035]} rotation={[1.2, 0, -s * 0.4]} scale={[0.005, 0.03, 0.005]} />
            </group>
          ))}
        </group>
      </group>
      {/* から：うすい きいろっぽい ちゃいろ */}
      <mesh geometry={shellGeo()} material={mat('#c9a565', { roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25, translucent: true })} position={[0, 0.1, -0.03]} castShadow />
    </group>
  );
}

/* ───────────── カナブン ───────────── */

export function Kanabun({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0.6);
  const wings = useRef<THREE.Group>(null);
  // 金属のような つや（あかがね〜みどり）
  const shell = useMemo(() => ({ roughness: 0.25, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.5, normalMap: striaeNormal(3, 0.5), normalScale: 0.5 }), []);
  useFrame(() => {
    const a = anim.current;
    if (wings.current) {
      wings.current.children.forEach((c, i) => {
        const s = i === 0 ? 1 : -1;
        c.rotation.z = s * a.flap * (0.5 + Math.sin(a.t * 45) * 0.3);
      });
    }
  });
  return (
    <group ref={body}>
      <group ref={wings} position={[0, 0.06, -0.05]}>
        {[1, -1].map((s) => (
          <group key={s} scale={[s, 1, 1]}>
            <Part geometry={elytronHalf()} color="#5f6b2a" surface={shell} position={[0, -0.03, 0]} scale={[0.098, 0.05, 0.13]} castShadow />
          </group>
        ))}
      </group>
      <Part geometry={shieldGeo()} color="#6a5a26" surface={shell} position={[0, 0.06, 0.1]} scale={[0.09, 0.045, 0.06]} castShadow />
      <M color="#4a4020" surface={shell} position={[0, 0.045, 0.165]} scale={[0.045, 0.028, 0.04]} />
      <CompoundEye position={[0.04, 0.045, 0.165]} size={0.012} />
      <CompoundEye position={[-0.04, 0.045, 0.165]} size={0.012} />
      <Antenna position={[0.03, 0.04, 0.19]} side={1} length={0.06} thick={0.004} kind="lamellate" color="#2a2010" anim={anim} rotation={[0, 0.5, 0]} />
      <Antenna position={[-0.03, 0.04, 0.19]} side={-1} length={0.06} thick={0.004} kind="lamellate" color="#2a2010" anim={anim} rotation={[0, 0.5, 0]} />
      {[0, 1, 2].map((p) =>
        [1, -1].map((s) => (
          <Leg key={`${p}${s}`} position={[s * 0.06, 0.03, 0.11 - p * 0.08]} side={s as 1 | -1} pair={p} spec={CHAFER_LEG} color="#3a3018" anim={anim} />
        )),
      )}
    </group>
  );
}

const CHAFER_LEG: LegSpec = { femur: 0.06, tibia: 0.06, tarsus: 0.06, thick: 0.01, tarsi: 4, teeth: 2 };

/* ───────────── クロオオアリ（はたらきアリ） ───────────── */

const ANT_LEG: LegSpec = { femur: 0.07, tibia: 0.07, tarsus: 0.06, thick: 0.007, tarsi: 3 };

export function Kurooari({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 1);
  const shell = useMemo(() => ({ roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3 }), []);
  return (
    <group ref={body} position={[0, 0.03, 0]}>
      {/* あたま・むね・こし（くびれ）・はら の 3 つに わかれた からだ */}
      <Part geometry={GEO.sphere()} color="#151313" surface={shell} position={[0, 0.06, 0.12]} scale={[0.04, 0.036, 0.04]} castShadow />
      <CompoundEye position={[0.034, 0.068, 0.13]} size={0.009} />
      <CompoundEye position={[-0.034, 0.068, 0.13]} size={0.009} />
      <Antenna position={[0.015, 0.08, 0.15]} side={1} length={0.12} thick={0.004} kind="clavate" color="#1a1616" anim={anim} rotation={[0.6, 0.5, 0]} />
      <Antenna position={[-0.015, 0.08, 0.15]} side={-1} length={0.12} thick={0.004} kind="clavate" color="#1a1616" anim={anim} rotation={[0.6, 0.5, 0]} />
      <Part geometry={GEO.capsule()} color="#1c1818" surface={shell} position={[0, 0.06, 0.04]} rotation={[Math.PI / 2 - 0.25, 0, 0]} scale={[0.022, 0.06, 0.022]} />
      <M color="#1c1818" surface={shell} position={[0, 0.055, -0.02]} scale={[0.014, 0.018, 0.012]} />
      <Part geometry={abdomenZ(4)} color="#191515" surface={shell} position={[0, 0.06, -0.08]} scale={[0.045, 0.04, 0.055]} castShadow />
      {[0, 1, 2].map((p) =>
        [1, -1].map((s) => (
          <Leg key={`${p}${s}`} position={[s * 0.015, 0.05, 0.07 - p * 0.03]} side={s as 1 | -1} pair={p} spec={ANT_LEG} color="#1a1616" anim={anim} spread={0.2} />
        )),
      )}
    </group>
  );
}

/* ───────────── ショウリョウバッタ（メス。とがった あたま） ───────────── */

const SLENDER_LEG: LegSpec = { femur: 0.07, tibia: 0.07, tarsus: 0.03, thick: 0.007, tarsi: 3 };

export function Shouryou({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 1);
  const hind = useRef<THREE.Group>(null);
  const skin = useMemo(() => ({ roughness: 0.6, bumpMap: grainBump(43, 64), bumpScale: 0.4 }), []);
  useFrame(() => {
    if (hind.current) hind.current.rotation.x = -anim.current.spray * 0.9;
  });
  return (
    <group ref={body} position={[0, 0.03, 0]}>
      {/* とがった 円すいの あたま。目は うしろよりに */}
      <Part geometry={GEO.cone()} color="#7fae4a" surface={skin} position={[0, 0.06, 0.27]} rotation={[Math.PI / 2 - 0.25, 0, 0]} scale={[0.03, 0.12, 0.03]} castShadow />
      <CompoundEye position={[0.022, 0.07, 0.24]} size={[0.01, 0.018, 0.016]} color="#5a6a3a" />
      <CompoundEye position={[-0.022, 0.07, 0.24]} size={[0.01, 0.018, 0.016]} color="#5a6a3a" />
      {/* 平たい 剣の ような 触角 */}
      {[1, -1].map((s) => (
        <M key={s} geo={GEO.box()} color="#6f9a40" position={[s * 0.012, 0.1, 0.3]} rotation={[0.9, s * 0.15, 0]} scale={[0.012, 0.004, 0.08]} />
      ))}
      <Part geometry={GEO.capsule()} color="#86b552" surface={skin} position={[0, 0.06, 0.14]} rotation={[Math.PI / 2, 0, 0]} scale={[0.03, 0.08, 0.03]} />
      {/* ほそながい はらと はね */}
      <Part geometry={abdomenY(8)} color="#7aa848" surface={skin} position={[0, 0.06, -0.07]} rotation={[Math.PI / 2, 0, 0]} scale={[0.028, 0.32, 0.028]} castShadow />
      <M color="#90b860" surface={skin} position={[0, 0.088, -0.07]} scale={[0.026, 0.012, 0.22]} />
      {[0, 1].map((p) => (
        <group key={p} position={[0, 0.04, 0.16 - p * 0.05]}>
          <Leg position={[0.025, 0, 0]} side={1} pair={p} spec={SLENDER_LEG} color="#7aa848" anim={anim} spread={0.4} />
          <Leg position={[-0.025, 0, 0]} side={-1} pair={p} spec={SLENDER_LEG} color="#7aa848" anim={anim} spread={0.4} />
        </group>
      ))}
      {/* とても 長い 後ろあし */}
      <group ref={hind} position={[0, 0.06, 0.07]}>
        {[1, -1].map((s) => (
          <group key={s} position={[s * 0.035, 0, 0]} rotation={[0.3, s * 0.08, 0]}>
            <M color="#7aa848" surface={skin} position={[0, 0, -0.15]} scale={[0.014, 0.02, 0.16]} castShadow />
            <group position={[0, 0, -0.3]} rotation={[0.45, 0, 0]}>
              <M geo={GEO.cylinder()} color="#6a9a3a" position={[0, -0.01, 0.14]} rotation={[Math.PI / 2, 0, 0]} scale={[0.005, 0.28, 0.005]} />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ───────────── 体の 輪の もよう（ロフトの v 方向に 色を ぬる） ───────────── */

/**
 * bodyGeo の 軸（z0 → z1）に そって 輪の 色を ぬる。ロフトは 両はしほど 細かく 輪を 置く（v と z が 比例しない）ので、
 * 行ごとに z を 計算して pick(z) の 色で ぬる。CanvasTexture は flipY なので、canvas の 上の 行が v = 1。
 */
function ringPaint(key: string, z0: number, z1: number, pick: (z: number) => string) {
  return paint(`ring:${key}`, 256, (g, s) => {
    for (let r = 0; r < s; r++) {
      const v = 1 - (r + 0.5) / s;
      const z = z0 + (z1 - z0) * (0.5 - 0.5 * Math.cos(Math.PI * v));
      g.fillStyle = pick(z);
      g.fillRect(0, r, s, 1);
    }
  });
}

/* ───────────── オニヤンマ（日本で いちばん 大きな トンボ） ───────────── */

const ONI_ABD: [number, number] = [-0.66, 0.0];
const ONI_SEGS: [number, number, number, number] = [-0.63, -0.03, 8, 0.07];

export function Oniyanma({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0);
  const abdomen = useMemo(
    () => ({
      roughness: 0.45,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
      // 黒い はらに、節ごとに 黄色い 輪（節の 前より）
      map: ringPaint('oniyanma', ONI_ABD[0], ONI_ABD[1], (z) => {
        const [a, b, n] = ONI_SEGS;
        const t = ((z - a) / (b - a)) * n;
        if (t < 0 || t > n) return '#16130f';
        const f = t - Math.floor(t);
        return f > 0.62 && f < 0.82 ? '#e2c23a' : '#16130f';
      }),
    }),
    [],
  );
  const shell = useMemo(() => ({ roughness: 0.5, clearcoat: 0.3 }), []);
  return (
    <group ref={body}>
      {/* 頭：エメラルド色の 大きな 複眼が、あたまの てっぺんで 1 点だけ くっつく。顔は 黄色 */}
      <CompoundEye position={[0.033, 0.075, 0.175]} size={[0.042, 0.04, 0.04]} color="#2f9a5e" />
      <CompoundEye position={[-0.033, 0.075, 0.175]} size={[0.042, 0.04, 0.04]} color="#2f9a5e" />
      <M color="#e0c23a" surface={shell} position={[0, 0.045, 0.2]} scale={[0.036, 0.026, 0.02]} />
      <M color="#1a1612" position={[0, 0.028, 0.205]} scale={[0.026, 0.012, 0.014]} />
      {/* 胸：黒地に 黄色の ななめの すじ（よこに 2 本ずつ・前に 2 本） */}
      <Part
        geometry={bodyGeo('oniThorax', [[-0.03, 0.02, 0.03, -0.02], [0.0, 0.045, 0.055, -0.045], [0.07, 0.05, 0.06, -0.05], [0.13, 0.035, 0.045, -0.03], [0.15, 0.018, 0.02, -0.015]], { nt: 2.2 })}
        color="#1d1915"
        surface={shell}
        position={[0, 0.05, 0]}
        castShadow
      />
      {[1, -1].map((s) =>
        [0.03, 0.085].map((z) => (
          <M key={`${s}${z}`} geo={GEO.box()} color="#e2c23a" position={[s * 0.047, 0.05, z]} rotation={[0.55, 0, 0]} scale={[0.004, 0.085, 0.012]} />
        )),
      )}
      {[1, -1].map((s) => (
        <M key={s} geo={GEO.box()} color="#e2c23a" position={[s * 0.018, 0.1, 0.11]} rotation={[0.9, 0, 0]} scale={[0.008, 0.045, 0.004]} />
      ))}
      {/* はら：太くて 長い。黒に 黄色の 輪 */}
      <Part
        geometry={bodyGeo(
          'oniAbdomen',
          [[ONI_ABD[0], 0, 0.004, -0.004], [-0.64, 0.014, 0.016, -0.014], [-0.58, 0.026, 0.026, -0.024], [-0.4, 0.026, 0.026, -0.025], [-0.2, 0.027, 0.027, -0.026], [-0.11, 0.024, 0.025, -0.023], [-0.06, 0.034, 0.035, -0.033], [-0.02, 0.03, 0.03, -0.03], [ONI_ABD[1], 0.012, 0.012, -0.012]],
          { segs: ONI_SEGS, rings: 64 },
        )}
        color="#ffffff"
        surface={abdomen}
        position={[0, 0.05, 0]}
        castShadow
      />
      {/* はねは すきとおって、つけねが すこし きいろい */}
      {[1, -1].map((s) => (
        <group key={s}>
          <DragonWing anim={anim} side={s as 1 | -1} front k={1.25} z={0.02} tint="#f1ecd6" />
          <DragonWing anim={anim} side={s as 1 | -1} front={false} k={1.25} z={0.0} tint="#f1ecd6" />
        </group>
      ))}
    </group>
  );
}

/* ───────────── ハキリアリ（はっぱを はこぶ はたらきアリ） ───────────── */

const LEAFCUTTER_LEG: LegSpec = { femur: 0.085, tibia: 0.08, tarsus: 0.06, thick: 0.006, tarsi: 3 };

const leafBit = (s: THREE.Shape) => {
  // あごで くわえる ところが 原点。はっぱの きれはしは 上（+y）へ 立ち、すこし 後ろ（+x）へ ひろがる
  s.moveTo(0, 0);
  s.bezierCurveTo(-0.14, 0.3, -0.08, 0.76, 0.24, 0.96);
  s.bezierCurveTo(0.55, 1.12, 0.8, 0.82, 0.74, 0.5);
  s.bezierCurveTo(0.68, 0.24, 0.36, 0.04, 0, 0);
};

/** はっぱの きれはしの もよう（ShapeGeometry の UV は 形の 座標そのまま：0..1） */
function leafTexture() {
  return paint('leafBit', 128, (g, s) => {
    g.fillStyle = '#5c9c38';
    g.fillRect(0, 0, s, s);
    const P = (u: number, v: number): [number, number] => [u * s, (1 - v) * s];
    g.strokeStyle = '#9cc870';
    g.lineCap = 'round';
    g.lineWidth = s * 0.03;
    g.beginPath();
    g.moveTo(...P(0.05, 0.02));
    g.lineTo(...P(0.5, 1));
    g.stroke();
    g.lineWidth = s * 0.012;
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const [x, y] = [0.05 + 0.45 * t, 0.02 + 0.98 * t];
      g.beginPath();
      g.moveTo(...P(x, y));
      g.lineTo(...P(x + 0.3, y + 0.08));
      g.moveTo(...P(x, y));
      g.lineTo(...P(x - 0.25, y + 0.12));
      g.stroke();
    }
  });
}

function Spine({ position, rotation, len = 0.03, color }: { position: [number, number, number]; rotation: [number, number, number]; len?: number; color: string }) {
  return <M geo={GEO.cone()} color={color} position={position} rotation={rotation} scale={[0.005, len, 0.005]} />;
}

export function Hakiriari({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 1);
  const leaf = useRef<THREE.Group>(null);
  const shell = useMemo(() => ({ ...SURF.granular(), roughness: 0.6 }), []);
  const leafMat = useMemo(() => mat('#ffffff', { map: leafTexture(), roughness: 0.55, side: THREE.DoubleSide, translucent: true }), []);
  const leafGeo = shapeGeo('leafBit', leafBit);
  const C = '#8c3b18';
  useFrame(() => {
    const a = anim.current;
    // 歩くと はっぱが ゆらゆら（ほのかに 旗の ように）
    if (leaf.current) {
      leaf.current.rotation.x = -0.35 + Math.sin(a.gait * 2) * 0.06 * a.walk;
      leaf.current.rotation.z = Math.sin(a.t * 1.7) * 0.05;
    }
  });
  return (
    <group ref={body} position={[0, 0.03, 0]}>
      {/* 大きな ハート形の 頭：後ろの かどに とげ */}
      <Part
        geometry={bodyGeo('attaHead', [[0.08, 0.02, 0.02, -0.015], [0.095, 0.048, 0.04, -0.028], [0.13, 0.045, 0.036, -0.03], [0.165, 0.03, 0.022, -0.02], [0.18, 0.012, 0.01, -0.01]], {
          nt: 2.4,
          // 後ろの まん中を へこませて ハート形に
          extra: (p) => {
            if (p.z < 0.1) p.z += 0.012 * Math.exp(-((p.x / 0.018) ** 2));
          },
        })}
        color={C}
        surface={shell}
        position={[0, 0.06, 0]}
        castShadow
      />
      {[1, -1].map((s) => (
        <group key={s}>
          <Spine position={[s * 0.034, 0.1, 0.09]} rotation={[-1.2, 0, -s * 0.5]} color={C} />
          <CompoundEye position={[s * 0.04, 0.07, 0.15]} size={0.007} color="#2a1810" />
          {/* 大あご（はっぱの はしを くわえる） */}
          <M color="#5a2410" surface={shell} position={[s * 0.012, 0.05, 0.185]} rotation={[0, s * 0.5, 0]} scale={[0.008, 0.008, 0.022]} />
          <Antenna position={[s * 0.016, 0.08, 0.165]} side={s as 1 | -1} length={0.14} thick={0.004} kind="filiform" color="#7a3416" anim={anim} rotation={[0.4, 0.55, 0]} />
        </group>
      ))}
      {/* むね：背中に 3 対の とげ */}
      <Part geometry={bodyGeo('attaMeso', [[-0.02, 0.01, 0.01, -0.01], [0.0, 0.018, 0.022, -0.018], [0.04, 0.02, 0.025, -0.02], [0.065, 0.016, 0.02, -0.016], [0.08, 0.01, 0.012, -0.01]])} color={C} surface={shell} position={[0, 0.065, 0]} />
      {[1, -1].map((s) =>
        (
          [
            [0.062, 0.088, -0.5],
            [0.035, 0.093, -0.2],
            [0.0, 0.087, 0.5],
          ] as const
        ).map(([z, y, tilt]) => <Spine key={`${s}${z}`} position={[s * 0.012, y, z]} rotation={[tilt, 0, -s * 0.45]} len={0.022} color={C} />),
      )}
      {/* こしの 2 つの ふし と、小さめの はら */}
      <M color={C} surface={shell} position={[0, 0.062, -0.03]} scale={[0.01, 0.012, 0.011]} />
      <M color={C} surface={shell} position={[0, 0.06, -0.048]} scale={[0.014, 0.013, 0.012]} />
      <Part geometry={abdomenZ(4)} color="#6e2c12" surface={shell} position={[0, 0.06, -0.1]} scale={[0.04, 0.036, 0.05]} castShadow />
      {[0, 1, 2].map((p) =>
        [1, -1].map((s) => (
          <Leg key={`${p}${s}`} position={[s * 0.012, 0.055, 0.06 - p * 0.028]} side={s as 1 | -1} pair={p} spec={LEAFCUTTER_LEG} color="#7a3416" anim={anim} spread={0.25} />
        )),
      )}
      {/* くわえた はっぱの きれはし（からだより 大きい） */}
      <group ref={leaf} position={[0, 0.05, 0.2]}>
        {/* 正面から 見ても はっぱと わかるよう、すこし ななめに もつ */}
        <group rotation={[0, Math.PI / 2 - 0.55, 0]} scale={0.25}>
          <mesh geometry={leafGeo} material={leafMat} castShadow />
        </group>
      </group>
    </group>
  );
}

/* ───────────── オオスズメバチ（はたらきバチ） ───────────── */

const HORNET_LEG: LegSpec = { femur: 0.07, tibia: 0.07, tarsus: 0.06, thick: 0.01, tarsi: 4 };
const HORNET_GASTER: [number, number] = [-0.3, -0.02];
const HORNET_SEGS: [number, number, number, number] = [-0.28, -0.04, 6, 0.06];

const waspWing = (s: THREE.Shape) => {
  s.moveTo(0, 0.015);
  s.bezierCurveTo(0.3, 0.08, 0.75, 0.09, 1, 0.03);
  s.bezierCurveTo(0.92, -0.04, 0.45, -0.06, 0, -0.015);
};

function HornetWing({ anim, side, fore }: { anim: AnimRef; side: 1 | -1; fore: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const geo = shapeGeo('waspWing', waspWing);
  // こはくいろに すける はね
  const material = useMemo(
    () => mat('#ffffff', { map: veinWing('#b8792c', '#4a2c12', 0.75), opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, roughness: 0.25 }),
    [],
  );
  useFrame(() => {
    const a = anim.current;
    const g = ref.current;
    if (!g) return;
    // とまって いる ときは はらの 上に 後ろむきに たたむ。とぶ ときは よこに ひらいて はばたく
    const open = a.flap;
    g.rotation.y = THREE.MathUtils.lerp(Math.PI / 2 - (fore ? 0.16 : 0.24), 0.15, open);
    g.rotation.z = open * Math.sin(a.t * 70 + (fore ? 0 : 0.6)) * 0.7 + a.spray * 0.15;
  });
  return (
    <group position={[side * 0.02, fore ? 0.108 : 0.103, fore ? 0.07 : 0.045]} scale={[side, 1, 1]}>
      <group ref={ref}>
        <group rotation={[-Math.PI / 2, 0, 0]} scale={fore ? [0.27, 0.32, 1] : [0.19, 0.24, 1]}>
          <mesh geometry={geo} material={material} />
        </group>
      </group>
    </group>
  );
}

export function Oosuzumebachi({ anim }: { anim: AnimRef }) {
  const body = useBodyMotion(anim, 0.6);
  const jaws = useRef<THREE.Group>(null);
  const gaster = useRef<THREE.Group>(null);
  const fur = useMemo(() => ({ roughness: 0.7, sheen: 0.4, sheenColor: '#8a6a3a' }), []);
  const band = useMemo(
    () => ({
      roughness: 0.5,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      // 節ごとに 前が こげちゃ、後ろが だいだいの 帯。おしりの 先は だいだい
      map: ringPaint('suzumebachi', HORNET_GASTER[0], HORNET_GASTER[1], (z) => {
        const [a, b, n] = HORNET_SEGS;
        const t = ((z - a) / (b - a)) * n;
        if (t < 1) return '#e59b25';
        if (t > n) return '#2a1a10';
        const f = t - Math.floor(t);
        const k = Math.floor(t);
        return f < (k === n - 1 ? 0.28 : 0.5) ? '#e59b25' : '#2a1a10';
      }),
    }),
    [],
  );
  useFrame(() => {
    const a = anim.current;
    // spray: 大あごを カチカチ ならして おどかす
    if (jaws.current) {
      const clack = a.spray * Math.abs(Math.sin(a.t * 22));
      jaws.current.children.forEach((c, i) => {
        c.rotation.y = (i === 0 ? 1 : -1) * (0.15 + clack * 0.55);
      });
    }
    // はらを ゆっくり のびちぢみ（いきを している）
    if (gaster.current) gaster.current.scale.z = 1 + Math.sin(a.t * 3) * 0.03;
  });
  return (
    <group ref={body} position={[0, 0.02, 0]}>
      {/* 大きな だいだいいろの 頭。目は こげちゃ、てっぺんに 3 つの 単眼 */}
      <Part geometry={GEO.sphere()} color="#e39a2a" surface={SURF.chitin(0.45)} position={[0, 0.065, 0.135]} scale={[0.056, 0.048, 0.036]} castShadow />
      {[1, -1].map((s) => (
        <group key={s}>
          <CompoundEye position={[s * 0.042, 0.075, 0.143]} size={[0.014, 0.03, 0.02]} color="#3a2414" />
          <Antenna position={[s * 0.012, 0.085, 0.165]} side={s as 1 | -1} length={0.13} thick={0.006} kind="filiform" color="#2a1a10" anim={anim} rotation={[0.2, 0.35, 0]} />
        </group>
      ))}
      {[-0.012, 0, 0.012].map((x) => (
        <M key={x} color="#3a2414" position={[x, 0.11, 0.138 - Math.abs(x) * 0.5]} scale={0.005} />
      ))}
      {/* 大あご：黒い 先の 太い あご */}
      <group ref={jaws} position={[0, 0.04, 0.16]}>
        {[1, -1].map((s) => (
          <group key={s} position={[s * 0.02, 0, 0]}>
            <M color="#e39a2a" surface={SURF.chitin(0.4)} position={[-s * 0.008, 0, 0.012]} scale={[0.01, 0.009, 0.02]} />
            <M color="#1a120c" surface={SURF.chitin(0.3)} position={[-s * 0.014, 0, 0.028]} scale={[0.008, 0.007, 0.012]} />
          </group>
        ))}
      </group>
      {/* むね：こげちゃ〜黒、こまかい 毛 */}
      <Part geometry={bodyGeo('hornetThorax', [[0.0, 0.015, 0.02, -0.015], [0.02, 0.042, 0.05, -0.04], [0.06, 0.046, 0.055, -0.045], [0.1, 0.038, 0.045, -0.035], [0.115, 0.02, 0.025, -0.018]], { nt: 2.2 })} color="#2a1d14" surface={fur} position={[0, 0.06, 0]} castShadow />
      <M color="#b0782a" surface={fur} position={[0, 0.1, 0.012]} scale={[0.016, 0.006, 0.01]} />
      {/* こしの くびれ と 帯の ある はら */}
      <M color="#2a1d14" surface={fur} position={[0, 0.058, -0.012]} scale={[0.012, 0.012, 0.014]} />
      <group ref={gaster} position={[0, 0.055, 0]}>
        <Part
          geometry={bodyGeo('hornetGaster', [[HORNET_GASTER[0], 0, 0.004, -0.004], [-0.29, 0.02, 0.02, -0.02], [-0.24, 0.045, 0.045, -0.042], [-0.14, 0.058, 0.055, -0.052], [-0.06, 0.05, 0.05, -0.045], [HORNET_GASTER[1], 0.022, 0.024, -0.02]], { segs: HORNET_SEGS, rings: 56 })}
          color="#ffffff"
          surface={band}
          castShadow
        />
      </group>
      {[1, -1].map((s) => (
        <group key={s}>
          <HornetWing anim={anim} side={s as 1 | -1} fore={false} />
          <HornetWing anim={anim} side={s as 1 | -1} fore />
        </group>
      ))}
      {[0, 1, 2].map((p) =>
        [1, -1].map((s) => (
          <Leg key={`${p}${s}`} position={[s * 0.03, 0.035, 0.09 - p * 0.03]} side={s as 1 | -1} pair={p} spec={HORNET_LEG} color="#3a2414" anim={anim} spread={0.35} />
        )),
      )}
    </group>
  );
}

export const VISITOR_MODELS = {
  shiokara: Shiokara,
  monshiro: Monshiro,
  tonosama: Tonosama,
  dangomushi: Dangomushi,
  aburazemi: Aburazemi,
  akiakane: Akiakane,
  hotaru: Hotaru,
  enmakorogi: Enmakorogi,
  jorougumo: Jorougumo,
  katatsumuri: Katatsumuri,
  kanabun: Kanabun,
  kurooari: Kurooari,
  shouryou: Shouryou,
  oniyanma: Oniyanma,
  hakiriari: Hakiriari,
  oosuzumebachi: Oosuzumebachi,
} as const;
