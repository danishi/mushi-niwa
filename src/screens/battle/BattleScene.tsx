import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { newAnim, type CreatureAnim } from '../../creatures/anim';
import { modelFor } from '../../creatures/registry';
import { BATTLE } from '../../data/battle';
import { SPECIES } from '../../data/species';
import type { SpeciesId } from '../../sim/types';
import { useBattle } from '../../state/battle';
import type { CameraShot } from '../../three/CameraRig';
import { Meadow } from '../../three/Diorama';
import { emitParticles } from '../../three/Particles';
import { useTier } from '../../three/QualityManager';
import { QUALITY } from '../../three/quality';
import { GEO, toon } from '../../three/toon';

export const battleShot = (): CameraShot => ({ position: [0, 2.6, 5.2], target: [0, 0.7, 0], fov: 38 });

const STUMP_TOP = 0.6;
const SPREAD = 0.95;

function Fighter({ species, side }: { species: SpeciesId; side: 1 | -1 }) {
  const ref = useRef<THREE.Group>(null);
  const anim = useRef<CreatureAnim>(newAnim());
  const tier = useTier();
  const st = SPECIES[species].stages[SPECIES[species].stages.length - 1]!;
  const entry = modelFor(st.model);
  const roll = useRef(0);
  const scale = 0.9 / Math.max(0.6, entry.length) + 0.25;
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useBattle.getState().state;
    const a = anim.current;
    const g = ref.current;
    if (!s || !g) return;
    a.t += dt;
    a.energy = 1;
    const mine = side === 1;
    const guard = mine ? s.playerGuard : s.cpuGuard;
    const stun = mine ? s.playerStun : s.cpuStun;
    const sp = BATTLE[species].special;
    // 押し合いの位置：meter が +1 なら 右（CPU）が台から押し出される
    const center = s.meter * SPREAD;
    const x = center + -side * 0.42 * scale;
    g.position.x = THREE.MathUtils.damp(g.position.x, x, 8, dt);
    a.walk = THREE.MathUtils.damp(a.walk, stun > 0 || s.result ? 0 : 1, 6, dt);
    a.gait += dt * 6 * a.walk;
    a.bounce = THREE.MathUtils.damp(a.bounce, 0, 6, dt);
    a.sing = THREE.MathUtils.damp(a.sing, guard > 0 || stun > 0 ? 0 : species === 'suzumushi' && (mine ? s.playerSpecialUsed : s.cpuSpecialUsed) && (mine ? s.cpuStun : s.playerStun) > 0 ? 1 : 0, 8, dt);
    a.spray = species === 'miidera' && (mine ? s.cpuStun : s.playerStun) > 1.5 ? 1 : a.spray * 0.95;
    a.shiver = stun > 0 ? 0.6 : 0;
    // 飛ぶ・死んだふり
    const flying = guard > 0 && sp.label.includes('とぶ');
    const deadPose = guard > 0 && sp.label.includes('しんだふり');
    a.flap = THREE.MathUtils.damp(a.flap, flying || entry.locomotion === 'flutter' ? 1 : 0, 6, dt);
    const y = STUMP_TOP + (flying ? 0.8 : entry.locomotion === 'flutter' ? 0.35 : 0);
    g.position.y = THREE.MathUtils.damp(g.position.y, y, 5, dt);
    // 負けたほうは ころん（ケガはしない）
    const lost = (s.result === 'win' && !mine) || (s.result === 'lose' && mine);
    roll.current = THREE.MathUtils.damp(roll.current, lost || deadPose ? Math.PI : 0, 5, dt);
    g.rotation.set(0, side === 1 ? Math.PI / 2 : -Math.PI / 2, roll.current);
    a.sleep = deadPose ? 1 : 0;
  });
  const Model = entry.C;
  return (
    <group ref={ref} position={[-side * 0.5, STUMP_TOP, 0]} scale={scale}>
      <Model anim={anim} sex="male" molts={0} outlines={QUALITY[tier].outlines} />
    </group>
  );
}

/** むしずもう：切り株の土俵で 押しあい */
export function BattleScene() {
  // 毎フレーム変わる meter では再描画しない（対戦相手の組み合わせと演出だけ購読）
  const pair = useBattle((b) => (b.state ? `${b.state.player}|${b.state.cpu}` : ''));
  const fx = useBattle((b) => b.fx);
  const wood = useMemo(() => toon('#a0785a'), []);
  const ring = useMemo(() => toon('#e8d3a9'), []);
  const line = useMemo(() => toon('#fffaf0'), []);
  const step = useBattle((b) => b.step);
  useFrame((_, dt) => step(Math.min(dt, 0.05)));
  useEffect(() => {
    const s = useBattle.getState().state;
    if (!fx || !s) return;
    const cx = s.meter * SPREAD;
    if (fx.kind === 'push') {
      audio.play('tap');
      emitParticles('dust', [cx, STUMP_TOP + 0.05, 0.1], 3);
    } else if (fx.kind === 'special' || fx.kind === 'cpuSpecial') {
      const who = fx.kind === 'special' ? s.player : s.cpu;
      audio.play(BATTLE[who].special.sfx);
      emitParticles(who === 'miidera' ? 'smoke' : 'sparkle', [cx, STUMP_TOP + 0.5, 0.1], 24);
    } else if (fx.kind === 'end') {
      audio.play(s.result === 'draw' ? 'bounce' : 'grow');
      emitParticles('sparkle', [0, STUMP_TOP + 0.8, 0.2], 40);
      emitParticles('heart', [0, STUMP_TOP + 0.9, 0.2], 10);
    }
  }, [fx]);
  return (
    <group>
      <Meadow radius={8} />
      <mesh geometry={GEO.cylinder()} material={wood} position={[0, STUMP_TOP / 2, 0]} scale={[1.6, STUMP_TOP, 1.6]} castShadow receiveShadow />
      <mesh geometry={GEO.cylinder()} material={ring} position={[0, STUMP_TOP + 0.005, 0]} scale={[1.5, 0.01, 1.5]} receiveShadow />
      {[0.5, 1.0].map((r) => (
        <mesh key={r} geometry={GEO.cylinder()} material={wood} position={[0, STUMP_TOP + 0.008, 0]} scale={[r, 0.008, r]} />
      ))}
      <mesh geometry={GEO.box()} material={line} position={[0, STUMP_TOP + 0.02, 0]} scale={[0.04, 0.01, 0.8]} />
      {pair ? (
        <>
          <Fighter key={`p-${pair}`} species={pair.split('|')[0] as SpeciesId} side={1} />
          <Fighter key={`c-${pair}`} species={pair.split('|')[1] as SpeciesId} side={-1} />
        </>
      ) : null}
    </group>
  );
}
