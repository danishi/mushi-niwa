import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
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
import { GEO, toon } from '../../three/toon';
import { SPECIES } from '../../data/species';

const SCALE = 0.34;
const COLS = 3;
const GAP_X = CASE.w * SCALE + 0.5;
const ROW_Y = [2.25, 0.45];

export function slotPosition(slot: number): [number, number, number] {
  const col = slot % COLS;
  const row = Math.floor(slot / COLS);
  return [(col - 1) * GAP_X, ROW_Y[row]!, 0];
}

export const gardenShot = (): CameraShot => ({ position: [0, 2.2, 8.4], target: [0, 1.55, 0], fov: 40 });

/** 「ここを見て」のマーク：お世話が必要・送り出しを待っている */
function Alert({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null);
  const mat = useMemo(() => toon(color), [color]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = CASE.h * SCALE + 0.35 + Math.sin(clock.elapsedTime * 4) * 0.06;
  });
  return (
    <group ref={ref}>
      <mesh geometry={GEO.sphere()} material={mat} scale={0.13} />
      <mesh geometry={GEO.sphere()} material={toon('#ffffff')} scale={0.05} position={[0, 0, 0.1]} />
    </group>
  );
}

function EmptySlot({ slot }: { slot: number }) {
  const ref = useRef<THREE.Group>(null);
  const mat = useMemo(() => toon('#fffaf0', { opacity: 0.55 }), []);
  const plus = useMemo(() => toon('#8bc34a'), []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2 + slot) * 0.06);
  });
  return (
    <group>
      <mesh geometry={GEO.box()} material={mat} position={[0, (CASE.h * SCALE) / 2, 0]} scale={[CASE.w * SCALE, CASE.h * SCALE, CASE.d * SCALE]} />
      <group ref={ref} position={[0, (CASE.h * SCALE) / 2, (CASE.d * SCALE) / 2 + 0.02]}>
        <mesh geometry={GEO.box()} material={plus} scale={[0.36, 0.1, 0.04]} />
        <mesh geometry={GEO.box()} material={plus} scale={[0.1, 0.36, 0.04]} />
      </group>
    </group>
  );
}

/** むしにわ：3D の棚に 6 つの虫ケース */
export function GardenScene() {
  const creatures = useGame((s) => s.creatures);
  const go = useUi((s) => s.go);
  const setPickingSlot = useUi((s) => s.setPickingSlot);
  const wood = useMemo(() => toon('#c8a27a'), []);
  const woodDark = useMemo(() => toon('#a0785a'), []);
  const hit = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), []);
  const width = GAP_X * COLS + 0.3;
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
