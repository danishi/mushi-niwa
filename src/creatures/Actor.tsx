import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CASE } from '../habitat/case';
import { conditionOf, stageOf } from '../sim/simulate';
import type { Creature, SpeciesDef } from '../sim/types';
import { env } from '../state/env';
import { simEvents } from '../state/events';
import { blobShadowTexture } from '../three/softShadow';
import { newAnim, type CreatureAnim } from './anim';
import { modelFor } from './registry';

type V3 = [number, number, number];

export interface ActorHandle {
  anim: CreatureAnim;
  group: THREE.Group | null;
}

/** 外から（カメラ演出・かんさつモード）虫の位置を参照するための登録簿 */
export const actors = new Map<string, ActorHandle>();

interface Props {
  creature: Creature;
  sp: SpeciesDef;
  top: number;
  foodPos: V3;
  outlines: boolean;
  /** タップしたとき（なでる・かんさつ） */
  onTap?: (e: ThreeEvent<PointerEvent>) => void;
  /** かんさつモード中はその場で止まる */
  freeze?: boolean;
}

const tmp = new THREE.Vector3();

/**
 * 虫の行動（うろうろ歩く・ごはんへ行って食べる・活動しない時間は眠る）と、
 * モデルのアニメーション状態の更新を受け持つ。
 */
export function Actor({ creature, top, foodPos, outlines, onTap, freeze }: Props) {
  const stage = stageOf(creature);
  const entry = modelFor(stage.model);
  const root = useRef<THREE.Group>(null);
  const anim = useRef<CreatureAnim>(newAnim());
  const state = useRef({
    pos: new THREE.Vector3(),
    target: new THREE.Vector3(),
    heading: 0,
    wait: 1,
    mode: 'idle' as 'idle' | 'walk' | 'eat',
    initialized: '',
  });
  const shadowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }),
    [],
  );
  const cond = conditionOf(creature);
  const live = useRef({ creature, cond });
  live.current = { creature, cond };

  const loco = entry.locomotion;
  const margin = entry.length * 0.55;
  const bounds = {
    x: CASE.w / 2 - margin,
    z: CASE.d / 2 - margin,
  };
  const burrowZ = CASE.d / 2 - 0.45;

  // 段階が変わったら初期位置を決め直す
  useEffect(() => {
    const s = state.current;
    const key = `${creature.id}:${creature.stage}`;
    if (s.initialized === key) return;
    s.initialized = key;
    if (loco === 'burrow') s.pos.set(0, 0.04, burrowZ);
    else if (loco === 'still') s.pos.set(0.6, stage.underground ? 0.02 : top, stage.underground ? burrowZ : 0.2);
    else s.pos.set(0, top, 0.3);
    s.target.copy(s.pos);
    s.heading = 0;
  }, [creature.id, creature.stage, loco, top, burrowZ, stage.underground]);

  useEffect(() => {
    const handle: ActorHandle = { anim: anim.current, group: null };
    actors.set(creature.id, handle);
    const off = simEvents.on((e) => {
      if ('id' in e && e.id === creature.id && (e.type === 'molt' || e.type === 'grow')) anim.current.shiver = 1;
    });
    return () => {
      off();
      actors.delete(creature.id);
    };
  }, [creature.id]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const a = anim.current;
    const s = state.current;
    const { creature: c, cond: cd } = live.current;
    const st = stageOf(c);
    a.t += dt;
    const energyTarget = cd === 'genki' ? 1 : cd === 'futsuu' ? 0.65 : 0.3;
    a.energy = THREE.MathUtils.damp(a.energy, energyTarget, 1.5, dt);
    const night = env.night > 0.5;
    const activeTime = st.activity === 'both' || (st.activity === 'night') === night;
    const sleepTarget = activeTime ? 0 : 0.85;
    a.sleep = THREE.MathUtils.damp(a.sleep, sleepTarget, 1, dt);
    a.bounce = THREE.MathUtils.damp(a.bounce, 0, 6, dt);
    a.shiver = Math.max(0, a.shiver - dt * 0.5);
    a.spray = Math.max(0, a.spray - dt * 1.2);

    const g = root.current;
    if (!g) return;
    const speed = entry.speed * (0.35 + 0.65 * a.energy) * (1 - a.sleep);
    const hungry = c.food > 0.02 && c.needs.hunger < 0.95 && st.food !== 'none';

    if (freeze || loco === 'still' || speed < 0.01) {
      a.walk = THREE.MathUtils.damp(a.walk, 0, 6, dt);
      a.eat = THREE.MathUtils.damp(a.eat, 0, 4, dt);
    } else {
      // 次の目的地を選ぶ
      s.wait -= dt;
      if (s.mode !== 'walk' && s.wait <= 0) {
        if (hungry && loco !== 'burrow') {
          s.target.set(foodPos[0] + 0.25, top, foodPos[2] + 0.35);
        } else if (loco === 'burrow') {
          s.target.set((Math.random() - 0.5) * 2 * (CASE.w / 2 - 0.7), 0.02 + Math.random() * Math.max(0, top - 1.05), burrowZ);
        } else {
          s.target.set((Math.random() - 0.5) * 2 * bounds.x, top, (Math.random() - 0.5) * 2 * bounds.z);
        }
        s.mode = 'walk';
      }
      if (s.mode === 'walk') {
        tmp.copy(s.target).sub(s.pos);
        const dist = tmp.length();
        if (dist < 0.05) {
          const atFood = hungry && loco !== 'burrow' && s.pos.distanceTo(new THREE.Vector3(foodPos[0] + 0.25, top, foodPos[2] + 0.35)) < 0.2;
          s.mode = atFood || (loco === 'burrow' && hungry) ? 'eat' : 'idle';
          s.wait = s.mode === 'eat' ? 4 + Math.random() * 3 : 1.5 + Math.random() * 3.5 / a.energy;
        } else {
          const step = Math.min(dist, speed * dt);
          tmp.normalize();
          s.pos.addScaledVector(tmp, step);
          a.gait += (step / Math.max(0.1, entry.length)) * 9;
          const desired = loco === 'burrow' ? (tmp.x >= 0 ? Math.PI / 2 : -Math.PI / 2) : Math.atan2(tmp.x, tmp.z);
          let diff = desired - s.heading;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          s.heading += diff * Math.min(1, dt * 4);
        }
      }
      a.walk = THREE.MathUtils.damp(a.walk, s.mode === 'walk' ? 1 : 0, 6, dt);
      a.eat = THREE.MathUtils.damp(a.eat, s.mode === 'eat' ? 1 : 0, 4, dt);
      if (s.mode === 'eat' && s.wait <= 0) s.mode = 'idle';
      if (s.mode === 'eat') s.wait -= dt;
    }
    g.position.copy(s.pos);
    g.rotation.y = s.heading;
    const h = actors.get(c.id);
    if (h) h.group = g;
  });

  const Model = entry.C;
  return (
    <group
      ref={root}
      onPointerDown={
        onTap
          ? (e) => {
              e.stopPropagation();
              anim.current.bounce = 1;
              onTap(e);
            }
          : undefined
      }
    >
      <Model anim={anim} sex={creature.sex} molts={creature.moltsDone} outlines={outlines} />
      {!stage.underground ? (
        <mesh material={shadowMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={entry.length * 0.9}>
          <planeGeometry args={[1, 1.2]} />
        </mesh>
      ) : null}
    </group>
  );
}
