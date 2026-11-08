import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../audio/audio';
import { CASE } from '../habitat/case';
import { conditionOf, stageOf } from '../sim/simulate';
import type { Creature, SpeciesDef } from '../sim/types';
import { env } from '../state/env';
import { simEvents } from '../state/events';
import { useUi } from '../state/ui';
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

const lastPose = new Map<string, { pos: THREE.Vector3; heading: number; stage: number }>();

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
  /** 鳴き声などの音を出す（お世話画面だけ） */
  sound?: boolean;
}

const tmp = new THREE.Vector3();
const eatSpot = new THREE.Vector3();
const hop = new THREE.Vector3();

/**
 * 虫の行動（うろうろ歩く・ごはんへ行って食べる・活動しない時間は眠る）と、
 * モデルのアニメーション状態の更新を受け持つ。
 */
export function Actor({ creature, top, foodPos, outlines, onTap, freeze, sound = false }: Props) {
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
    chirpTimer: 0,
    leave: 0,
    initialized: '',
  });
  const shadowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }),
    [],
  );
  const shadowRef = useRef<THREE.Mesh>(null);
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
    // 画面を切り替えても同じ場所から続ける（お世話→かんさつ）
    const last = lastPose.get(creature.id);
    if (last && last.stage === creature.stage) {
      s.pos.copy(last.pos);
      s.target.copy(last.pos);
      s.heading = last.heading;
      return;
    }
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

    const flyer = loco === 'flutter';
    // 食べ物の場所（花は上にとまる）
    eatSpot.set(foodPos[0] + (flyer ? 0 : 0.25), flyer ? top + 0.78 : top, foodPos[2] + (flyer ? 0 : 0.35));

    if (freeze || loco === 'still' || speed < 0.01) {
      a.walk = THREE.MathUtils.damp(a.walk, 0, 6, dt);
      a.eat = THREE.MathUtils.damp(a.eat, 0, 4, dt);
      a.flap = THREE.MathUtils.damp(a.flap, 0, 4, dt);
      // 眠っている飛ぶ虫は地面へおりる
      if (flyer && !freeze) s.pos.y = THREE.MathUtils.damp(s.pos.y, top, 2, dt);
    } else {
      // 次の目的地を選ぶ
      s.wait -= dt;
      if (s.mode !== 'walk' && s.wait <= 0) {
        if (hungry && loco !== 'burrow') {
          s.target.copy(eatSpot);
        } else if (loco === 'burrow') {
          s.target.set((Math.random() - 0.5) * 2 * (CASE.w / 2 - 0.7), 0.02 + Math.random() * Math.max(0, top - 1.05), burrowZ);
        } else if (flyer) {
          const perch = Math.random() < 0.35;
          s.target.set(
            (Math.random() - 0.5) * 2 * bounds.x,
            perch ? top : top + 0.6 + Math.random() * (CASE.h - top - 1.1),
            (Math.random() - 0.5) * 2 * bounds.z,
          );
        } else {
          s.target.set((Math.random() - 0.5) * 2 * bounds.x, top, (Math.random() - 0.5) * 2 * bounds.z);
        }
        s.mode = 'walk';
      }
      if (s.mode === 'walk') {
        tmp.copy(s.target).sub(s.pos);
        const dist = tmp.length();
        if (dist < 0.05) {
          const atFood = hungry && loco !== 'burrow' && s.pos.distanceTo(eatSpot) < 0.2;
          s.mode = atFood || (loco === 'burrow' && hungry) ? 'eat' : 'idle';
          s.wait = s.mode === 'eat' ? 4 + Math.random() * 3 : 1.5 + (Math.random() * 3.5) / a.energy;
        } else {
          const step = Math.min(dist, speed * (flyer ? 2.2 : 1) * dt);
          tmp.normalize();
          s.pos.addScaledVector(tmp, step);
          a.gait += (step / Math.max(0.1, entry.length)) * 9;
          const desired = loco === 'burrow' ? (tmp.x >= 0 ? Math.PI / 2 : -Math.PI / 2) : Math.atan2(tmp.x, tmp.z);
          let diff = desired - s.heading;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          s.heading += diff * Math.min(1, dt * 4);
        }
      }
      const moving = s.mode === 'walk';
      a.walk = THREE.MathUtils.damp(a.walk, moving && !flyer ? 1 : 0, 6, dt);
      a.flap = THREE.MathUtils.damp(a.flap, flyer && (moving || s.pos.y > top + 0.05) ? 1 : 0, 6, dt);
      a.eat = THREE.MathUtils.damp(a.eat, s.mode === 'eat' ? 1 : 0, 4, dt);
      if (s.mode === 'eat' && s.wait <= 0) s.mode = 'idle';
      if (s.mode === 'eat') s.wait -= dt;
    }

    // スズムシのオスは夜に鳴く（はねを立ててこすり合わせる）
    const singer = st.id === 'adult' && c.species === 'suzumushi' && c.sex === 'male';
    const singing = singer && night && cd !== 'genkiganai' && s.mode !== 'walk' && (a.t % 6) < 4;
    a.sing = THREE.MathUtils.damp(a.sing, singing ? 1 : 0, 8, dt);
    if (singing && sound) {
      s.chirpTimer -= dt;
      if (s.chirpTimer <= 0) {
        s.chirpTimer = 0.55;
        audio.play('chirp');
      }
    }

    // 跳ねる虫は歩くたびに ぴょんと跳ぶ
    hop.copy(s.pos);
    if (loco === 'hop') hop.y += Math.abs(Math.sin(a.gait * 0.35)) * 0.22 * a.walk;
    if (flyer) hop.y += Math.sin(a.t * 3) * 0.04 * a.flap;

    // 送り出し：ふわっと浮かんで 小さくなり、もりへ かえっていく
    const ui = useUi.getState();
    const leaving = ui.cinematic?.kind === 'farewell' && ui.selectedId === c.id;
    s.leave = THREE.MathUtils.damp(s.leave, leaving ? 1 : 0, leaving ? 0.9 : 6, dt);
    if (s.leave > 0.001) {
      hop.y += s.leave * 2.2;
      hop.z -= s.leave * 0.8;
      a.flap = Math.max(a.flap, s.leave);
      a.walk = Math.max(a.walk, s.leave);
      a.gait += dt * 6 * s.leave;
    }
    g.scale.setScalar(1 - s.leave * 0.7);
    g.position.copy(hop);
    g.rotation.y = s.heading;
    if (shadowRef.current) shadowRef.current.position.y = top - hop.y + 0.012;
    const h = actors.get(c.id);
    if (h) h.group = g;
    const lp = lastPose.get(c.id);
    if (lp) {
      lp.pos.copy(s.pos);
      lp.heading = s.heading;
      lp.stage = c.stage;
    } else lastPose.set(c.id, { pos: s.pos.clone(), heading: s.heading, stage: c.stage });
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
        <mesh ref={shadowRef} material={shadowMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={entry.length * 0.9}>
          <planeGeometry args={[1, 1.2]} />
        </mesh>
      ) : null}
    </group>
  );
}
