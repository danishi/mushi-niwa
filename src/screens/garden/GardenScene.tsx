import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { CASE } from '../../habitat/case';
import { CaseView } from '../../habitat/CaseView';
import { conditionOf } from '../../sim/simulate';
import { MAX_SLOTS } from '../../sim/simulate';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { speak } from '../../text/speech';
import type { CameraShot } from '../../three/CameraRig';
import { Meadow } from '../../three/Diorama';
import { emitParticles } from '../../three/Particles';
import { GEO, mat } from '../../three/materials';
import { barkTexture, signTexture, woodTexture } from '../../three/textures';
import { SPECIES } from '../../data/species';
import { GardenVisitors } from './Visitors';

const SCALE = 0.34;
const COLS = 3;
const GAP_X = CASE.w * SCALE + 0.5;
const ROW_Y = [2.25, 0.45];

export function slotPosition(slot: number): [number, number, number] {
  const col = slot % COLS;
  const row = Math.floor(slot / COLS);
  return [(col - 1) * GAP_X, ROW_Y[row]!, 0];
}

/**
 * 棚の 手前に ならべる 入口（ずかん・クイズ・すもう）の 置き方。下の 段の ケースに 重ならず、
 * まん中下の「あたらしい むし」ボタンとも 重ならない 所に おく。
 * - 縦長: 下に 草地が 広く あくので 手前に 大きめに
 * - 横長: 棚の 手前の 低い 所に 小さめに
 * - とても 横長（スマホ 横向き）: 下が せまいので 棚の 左右の あいた 所に
 */
function portalLayout(aspect: number, width: number): { scale: number; at: [number, number, number][] } {
  if (aspect < 1) {
    return { scale: 1.3, at: [[-0.34 * width, 0, 4.4], [-0.12 * width, 0, 4.4], [0.31 * width, 0, 4.4]] };
  }
  if (aspect > 1.7) {
    const side = width / 2;
    return { scale: 1.05, at: [[-side - 0.35, 0, 1.7], [-side - 0.7, 0, 0.4], [side + 0.5, 0, 1.2]] };
  }
  return { scale: 1, at: [[-0.31 * width, 0, 2.9], [-0.15 * width, 0, 2.9], [0.29 * width, 0, 2.9]] };
}

export const gardenShot = (): CameraShot => ({
  position: [0, 2.6, 8.4],
  target: [0, 1.15, 0.9],
  fov: 40,
  fitWidth: GAP_X * COLS + 0.6,
  // 棚の 上から 手前の 入口まで（横長画面でも 入口が 切れない）
  fitHeight: 4.3,
});

/** 「ここを見て」のマーク：お世話が必要・送り出しを待っている */
function Alert({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null);
  const material = useMemo(() => mat(color), [color]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = CASE.h * SCALE + 0.35 + Math.sin(clock.elapsedTime * 4) * 0.06;
  });
  return (
    <group ref={ref}>
      <mesh geometry={GEO.sphere()} material={material} scale={0.13} />
      <mesh geometry={GEO.sphere()} material={mat('#ffffff')} scale={0.05} position={[0, 0, 0.1]} />
    </group>
  );
}

function EmptySlot({ slot }: { slot: number }) {
  const ref = useRef<THREE.Group>(null);
  const material = useMemo(() => mat('#fffaf0', { opacity: 0.55 }), []);
  const plus = useMemo(() => mat('#8bc34a'), []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2 + slot) * 0.06);
  });
  return (
    <group>
      <mesh geometry={GEO.box()} material={material} position={[0, (CASE.h * SCALE) / 2, 0]} scale={[CASE.w * SCALE, CASE.h * SCALE, CASE.d * SCALE]} />
      <group ref={ref} position={[0, (CASE.h * SCALE) / 2, (CASE.d * SCALE) / 2 + 0.02]}>
        <mesh geometry={GEO.box()} material={plus} scale={[0.36, 0.1, 0.04]} />
        <mesh geometry={GEO.box()} material={plus} scale={[0.1, 0.36, 0.04]} />
      </group>
    </group>
  );
}

/** タップで入る 3D の入口（ボタンを 減らすため）。ふわふわ ゆれて 気づかせる */
function Portal({
  position,
  onTap,
  label,
  hit,
  children,
}: {
  position: [number, number, number];
  onTap: () => void;
  label: string;
  /** タップの 当たり判定（幅・高さ）。後ろの ケースへの タップを うばわないよう 見た目に 合わせる */
  hit: [number, number];
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.abs(Math.sin(clock.elapsedTime * 2 + position[0])) * 0.08;
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.8 + position[0]) * 0.25;
    }
  });
  return (
    <group
      ref={ref}
      position={position}
      userData={{ portal: label }}
      onClick={(e) => {
        e.stopPropagation();
        audio.play('pop');
        speak(label);
        emitParticles('sparkle', [position[0], position[1] + 0.6, position[2]], 12);
        onTap();
      }}
    >
      {children}
      <mesh visible={false} position={[0, hit[1] / 2, 0]} scale={[hit[0], hit[1], 0.8]}>
        <boxGeometry />
      </mesh>
    </group>
  );
}

/** ずかんの 本 */
function BookModel() {
  const cover = useMemo(() => mat('#4f7f2a', { roughness: 0.7 }), []);
  const cover2 = useMemo(() => mat('#c8762f', { roughness: 0.7 }), []);
  const pages = useMemo(() => mat('#f4efe2', { roughness: 0.9 }), []);
  return (
    <group rotation={[-0.25, 0, 0]}>
      <mesh geometry={GEO.box()} material={pages} position={[0, 0.32, 0]} scale={[0.5, 0.62, 0.12]} castShadow />
      <mesh geometry={GEO.box()} material={cover} position={[-0.13, 0.33, 0.07]} rotation={[0, -0.35, 0]} scale={[0.27, 0.66, 0.02]} castShadow />
      <mesh geometry={GEO.box()} material={cover2} position={[0.13, 0.33, 0.07]} rotation={[0, 0.35, 0]} scale={[0.27, 0.66, 0.02]} castShadow />
    </group>
  );
}

/** むしずもうの 切り株の 土俵 */
function StumpModel() {
  const wood = useMemo(() => mat('#ffffff', { map: barkTexture(), roughness: 0.95 }), []);
  const ring = useMemo(() => mat('#ffffff', { map: woodTexture(), roughness: 0.8 }), []);
  const bug = useMemo(() => mat('#3a1d10', { roughness: 0.35, clearcoat: 1 }), []);
  return (
    <group>
      <mesh geometry={GEO.cylinder()} material={wood} position={[0, 0.18, 0]} scale={[0.42, 0.36, 0.42]} castShadow />
      <mesh geometry={GEO.cylinder()} material={ring} position={[0, 0.365, 0]} scale={[0.4, 0.01, 0.4]} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={GEO.sphere()} material={bug} position={[s * 0.12, 0.42, 0]} scale={[0.1, 0.06, 0.07]} castShadow />
      ))}
    </group>
  );
}

/** むしクイズの 立てふだ */
export function SignModel() {
  const post = useMemo(() => mat('#ffffff', { map: barkTexture(), roughness: 0.95 }), []);
  const board = useMemo(() => mat('#ffffff', { map: signTexture('？', 'クイズ'), roughness: 0.85 }), []);
  const edge = useMemo(() => mat('#a47148', { roughness: 0.9 }), []);
  return (
    <group>
      <mesh geometry={GEO.cylinder()} material={post} position={[0, 0.3, -0.07]} scale={[0.045, 0.6, 0.045]} castShadow />
      <mesh geometry={GEO.box()} material={edge} position={[0, 0.66, -0.01]} scale={[0.6, 0.6, 0.04]} castShadow />
      <mesh position={[0, 0.66, 0.012]} material={board}>
        <planeGeometry args={[0.54, 0.54]} />
      </mesh>
    </group>
  );
}

/** むしにわ：3D の棚に 6 つの虫ケース */
export function GardenScene() {
  const creatures = useGame((s) => s.creatures);
  const go = useUi((s) => s.go);
  const setPickingSlot = useUi((s) => s.setPickingSlot);
  const wood = useMemo(() => mat('#ffffff', { map: woodTexture(), roughness: 0.75 }), []);
  const woodDark = useMemo(() => mat('#c9b29a', { map: woodTexture(), roughness: 0.8 }), []);
  const hit = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), []);
  const width = GAP_X * COLS + 0.3;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const pl = portalLayout(aspect, width);
  const at = (i: number) => pl.at[i]!;
  return (
    <group>
      <Meadow radius={9} />
      {/* 棚 */}
      {ROW_Y.map((y) => (
        <mesh key={y} geometry={GEO.box()} material={wood} position={[0, y - 0.08, 0]} scale={[width, 0.16, CASE.d * SCALE + 0.5]} receiveShadow castShadow />
      ))}
      {[-width / 2, width / 2].map((x) => (
        <mesh key={x} geometry={GEO.box()} material={woodDark} position={[x, 1.75, 0]} scale={[0.2, 3.5, CASE.d * SCALE + 0.5]} castShadow />
      ))}
      <mesh geometry={GEO.box()} material={woodDark} position={[0, 1.75, -(CASE.d * SCALE) / 2 - 0.3]} scale={[width, 3.5, 0.1]} />
      <GardenVisitors shelfWidth={width} shelfFront={(CASE.d * SCALE) / 2 + 0.25} />
      {/* 入口は 下の 段より 手前・低い 所に。まん中は「あたらしい むし」ボタンの 場所なので あける */}
      <group>
        <Portal position={at(0)} onTap={() => go('zukan')} label="ずかん" hit={[0.95 * pl.scale, 0.85 * pl.scale]}>
          <group scale={1.15 * pl.scale}>
            <BookModel />
          </group>
        </Portal>
        <Portal position={at(1)} onTap={() => go('quiz')} label="むしクイズ" hit={[0.8 * pl.scale, 0.95 * pl.scale]}>
          <group scale={1.05 * pl.scale}>
            <SignModel />
          </group>
        </Portal>
        <Portal position={at(2)} onTap={() => go('battle')} label="むしずもう" hit={[1.0 * pl.scale, 0.7 * pl.scale]}>
          <group scale={1.5 * pl.scale}>
            <StumpModel />
          </group>
        </Portal>
      </group>
      {Array.from({ length: MAX_SLOTS }, (_, slot) => {
        const c = creatures.find((x) => x.slot === slot);
        const p = slotPosition(slot);
        return (
          <group key={slot} position={p}>
            {c ? (
              <group scale={SCALE}>
                <CaseView creature={c} detail={false} outlines={false} />
              </group>
            ) : (
              <EmptySlot slot={slot} />
            )}
            {c && (c.finished || conditionOf(c) === 'genkiganai') ? <Alert color={c.finished ? '#ffd166' : '#ef8a8a'} /> : null}
            <mesh
              geometry={GEO.box()}
              material={hit}
              position={[0, (CASE.h * SCALE) / 2, 0]}
              scale={[CASE.w * SCALE + 0.2, CASE.h * SCALE + 0.3, CASE.d * SCALE + 0.2]}
              onClick={(e) => {
                e.stopPropagation();
                audio.play('pop');
                emitParticles('sparkle', [p[0], p[1] + 0.8, p[2] + 0.5], 10);
                if (c) {
                  speak(SPECIES[c.species].name);
                  go('care', c.id);
                } else {
                  speak('どの むしを そだてる？');
                  setPickingSlot(slot);
                }
              }}
              userData={{ slot }}
            />
          </group>
        );
      })}
    </group>
  );
}
