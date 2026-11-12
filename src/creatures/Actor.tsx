import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../audio/audio';
import { CASE, WATER_LEVEL } from '../habitat/case';
import { conditionOf, stageOf } from '../sim/simulate';
import type { Creature, SpeciesDef } from '../sim/types';
import { env } from '../state/env';
import { simEvents } from '../state/events';
import { useUi } from '../state/ui';
import { emitParticles } from '../three/Particles';
import { blobShadowTexture } from '../three/softShadow';
import { newAnim, type CreatureAnim } from './anim';
import { GestureRunner } from './gestures';
import { gesturesOf, modelFor } from './registry';

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
const smooth = (k: number) => k * k * (3 - 2 * k);

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
    munch: 0,
    leave: 0,
    initialized: '',
    /** この 移動の 速さの 倍率（速歩き・ゆっくり歩き） */
    pace: 1,
    /** 歩く 途中で 立ち止まる 残り時間 */
    paused: 0,
    /** 空中の 移動（とびはね・短い 飛行）：0 = 地上、1 = とびはね、2 = 飛行 */
    air: 0 as 0 | 1 | 2,
    airT: 0,
    airDur: 1,
    airH: 0,
    airY: 0,
    airFrom: new THREE.Vector3(),
    /** 滑空と はばたきを 切りかえる までの 時間 */
    glideT: 1,
    gliding: false,
    /** さわられた 反応を もう 始めたか（1 回の タップで 1 回だけ） */
    startled: false,
    /** 後ずさりの 残り時間 */
    recoil: 0,
  });
  const gestures = useRef(new GestureRunner());
  const gestureList = gesturesOf(entry);
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
    else if (loco === 'swim') s.pos.set(0, top + (WATER_LEVEL - top) * 0.5, 0.3);
    else if (loco === 'still') s.pos.set(0.6, stage.underground ? 0.02 : top, stage.underground ? burrowZ : 0.2);
    else s.pos.set(0, top, 0.3);
    s.target.copy(s.pos);
    s.heading = 0;
    s.air = 0;
    s.airY = 0;
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
    a.startle = Math.max(0, a.startle - dt * 1.3);

    const g = root.current;
    if (!g) return;
    const speed = entry.speed * (0.35 + 0.65 * a.energy) * (1 - a.sleep);
    const hungry = c.food > 0.02 && c.needs.hunger < 0.95 && st.food !== 'none';

    const flyer = loco === 'flutter';
    const swimmer = loco === 'swim';
    // 食べ物の場所（花は上にとまる。水の中では 底の ごはんの そば）
    eatSpot.set(foodPos[0] + (flyer ? 0 : 0.25), flyer ? top + 0.78 : swimmer ? top + 0.12 : top, foodPos[2] + (flyer ? 0 : 0.35));

    const ground = loco === 'crawl' || loco === 'hop';
    // さわられた 反応（かんさつ中・ねむっている ときは びくっと するだけ）：
    // 歩く虫は 後ずさり、跳ねる虫は とびのき、およぐ虫は さっと にげ、とまっている チョウは 飛びたつ
    if (a.startle < 0.5) s.startled = false;
    else if (!s.startled) {
      s.startled = true;
      if (!freeze && speed >= 0.01 && !s.air && s.leave < 0.01) {
        if (loco === 'crawl') {
          s.recoil = 0.28;
          if (s.mode === 'idle') s.wait = Math.max(s.wait, 1);
        } else if (loco === 'hop') {
          s.target.set((Math.random() - 0.5) * 2 * bounds.x, top, (Math.random() - 0.5) * 2 * bounds.z);
          s.mode = 'walk';
          s.air = 1;
          s.airT = 0;
          s.airFrom.copy(s.pos);
          const far = s.pos.distanceTo(s.target);
          s.airDur = 0.42 + far * 0.08;
          s.airH = 0.35 + far * 0.12;
        } else if ((swimmer || flyer) && s.mode === 'idle') {
          s.wait = 0;
          gestures.current.cancel();
        }
        if (swimmer || flyer) s.pace = 1.9;
      }
    }
    if (s.recoil > 0 && !freeze) {
      s.recoil -= dt;
      const back = entry.speed * 2.2 * dt;
      s.pos.x = THREE.MathUtils.clamp(s.pos.x - Math.sin(s.heading) * back, -bounds.x, bounds.x);
      s.pos.z = THREE.MathUtils.clamp(s.pos.z - Math.cos(s.heading) * back, -bounds.z, bounds.z);
      a.gait -= (back / Math.max(0.1, entry.length)) * 9;
      a.walk = Math.max(a.walk, 0.7);
    }
    if (freeze || loco === 'still' || speed < 0.01) {
      a.walk = THREE.MathUtils.damp(a.walk, 0, 6, dt);
      a.eat = THREE.MathUtils.damp(a.eat, 0, 4, dt);
      a.glide = THREE.MathUtils.damp(a.glide, 0, 6, dt);
      a.jump = THREE.MathUtils.damp(a.jump, 0, 8, dt);
      // 飛ぶ虫は（花の 上で なければ）地面へ おりて とまる。およぐ虫は 水くさの 根もとで じっと する
      const descend = flyer && s.mode !== 'eat';
      if (descend) s.pos.y = THREE.MathUtils.damp(s.pos.y, top, 2, dt);
      a.flap = THREE.MathUtils.damp(a.flap, descend && s.pos.y > top + 0.06 ? 1 : 0, 4, dt);
      if (swimmer && !freeze) s.pos.y = THREE.MathUtils.damp(s.pos.y, top + 0.12, 1, dt);
      // 空中で 止められたら その場に おりる
      if (s.air) {
        s.air = 0;
        s.mode = 'idle';
        s.target.copy(s.pos);
      }
      s.airY = THREE.MathUtils.damp(s.airY, 0, 6, dt);
    } else {
      // 次の目的地を選ぶ（しぐさの 途中では 歩きださない）
      s.wait -= dt;
      if (s.mode !== 'walk' && s.wait <= 0 && (!gestures.current.kind || s.startled)) {
        if (hungry && loco !== 'burrow') {
          s.target.copy(eatSpot);
        } else if (loco === 'burrow') {
          s.target.set((Math.random() - 0.5) * 2 * (CASE.w / 2 - 0.7), 0.02 + Math.random() * Math.max(0, top - 1.05), burrowZ);
        } else if (swimmer) {
          // ときどき 水面へ 行って おしりの 先から 空気を とりいれる
          const breathe = Math.random() < 0.35;
          s.target.set(
            (Math.random() - 0.5) * 2 * bounds.x,
            breathe ? WATER_LEVEL - 0.1 : top + 0.2 + Math.random() * (WATER_LEVEL - top - 0.5),
            (Math.random() - 0.5) * 2 * bounds.z,
          );
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
        // 緩急：ゆっくり 歩く ことも、いそぐ ことも ある（げんきな ときほど いそぐ）
        s.pace = 0.65 + Math.random() * 0.6 + (Math.random() < 0.2 * a.energy ? 0.5 : 0);
        s.paused = 0;
        const far = s.pos.distanceTo(s.target);
        // 跳ねる虫は ときどき ぴょんと 跳ぶ。テントウムシは ときどき はねを ひろげて 短く 飛ぶ
        const leap = loco === 'hop' && far > 0.5 && Math.random() < 0.4;
        const fly = !leap && entry.shortFlight && a.energy > 0.6 && far > 0.9 && Math.random() < 0.3;
        if (leap || fly) {
          s.air = leap ? 1 : 2;
          s.airT = 0;
          s.airFrom.copy(s.pos);
          s.airDur = leap ? 0.42 + far * 0.08 : THREE.MathUtils.clamp(far / (entry.speed * 3.5), 1, 2.6);
          s.airH = leap ? 0.3 + far * 0.12 : 0.55 + Math.random() * 0.5;
        }
      }
      if (s.mode === 'walk') {
        tmp.copy(s.target).sub(s.pos);
        const dist = tmp.length();
        if (s.air) {
          // 空中：出発点から 目的地へ 山なりに うつる。飛ぶ 前に 少し ためる（はねを ひらく 間）
          const lead = s.air === 2 ? 0.35 : 0.12;
          s.airT += dt;
          const k = THREE.MathUtils.clamp((s.airT - lead) / s.airDur, 0, 1);
          tmp.copy(s.target).sub(s.airFrom);
          const desired = Math.atan2(tmp.x, tmp.z);
          let diff = desired - s.heading;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          s.heading += diff * Math.min(1, dt * 10);
          s.pos.lerpVectors(s.airFrom, s.target, s.air === 2 ? smooth(k) : k);
          s.airY = Math.sin(Math.PI * k) * s.airH;
          if (k >= 1) {
            s.air = 0;
            s.airY = 0;
            s.mode = 'idle';
            s.wait = 1 + Math.random() * 2.5;
            if (sound) emitParticles('dust', [s.pos.x, s.pos.y + 0.03, s.pos.z], 3);
          }
        } else if (dist < 0.05) {
          const atFood = hungry && loco !== 'burrow' && s.pos.distanceTo(eatSpot) < 0.2;
          s.mode = atFood || (loco === 'burrow' && hungry) ? 'eat' : 'idle';
          s.wait = s.mode === 'eat' ? 4 + Math.random() * 3 : 1.5 + (Math.random() * 3.5) / a.energy;
        } else {
          tmp.normalize();
          const desired = loco === 'burrow' ? (tmp.x >= 0 ? Math.PI / 2 : -Math.PI / 2) : Math.atan2(tmp.x, tmp.z);
          let diff = desired - s.heading;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          // 地面を 歩く 虫は、大きく 向きを 変える ときは その場で 足ぶみして 回ってから 進む
          const turning = ground && Math.abs(diff) > 0.8;
          // ときどき 立ち止まって ようすを うかがう（びくっと した ときも 止まる）
          if (ground && s.paused <= 0 && Math.random() < dt * 0.22) s.paused = 0.35 + Math.random() * 0.8;
          if (a.startle > 0.5) s.paused = Math.max(s.paused, 0.5);
          s.paused = Math.max(0, s.paused - dt);
          const go = turning || s.paused > 0 ? 0 : 1;
          const step = Math.min(dist, speed * s.pace * (flyer ? 2.2 : swimmer ? 1.6 : 1) * dt * go);
          s.pos.addScaledVector(tmp, step);
          a.gait += (step / Math.max(0.1, entry.length)) * 9 + (turning && s.paused <= 0 ? dt * 5 : 0);
          s.heading += diff * Math.min(1, dt * (turning ? 5 : 4));
        }
      }
      const moving = s.mode === 'walk' && s.paused <= 0 && !s.air;
      // およぐ虫は 水面で 息を するあいだも ゆっくり あしを うごかす
      a.walk = THREE.MathUtils.damp(a.walk, moving && !flyer ? 1 : swimmer ? 0.25 : 0, 6, dt);
      const airborne = s.air === 2 || (flyer && (s.mode === 'walk' || s.pos.y > top + 0.05));
      a.flap = THREE.MathUtils.damp(a.flap, airborne ? 1 : 0, s.air === 2 ? 10 : 6, dt);
      a.jump = THREE.MathUtils.damp(a.jump, s.air === 1 ? 1 : 0, 14, dt);
      // 滑空：はばたきの 合間に はねを 止めて すべる ように 飛ぶ（オオムラサキが とくい）
      if (flyer && entry.glide && s.mode === 'walk') {
        s.glideT -= dt;
        if (s.glideT <= 0) {
          s.gliding = !s.gliding && Math.random() < entry.glide;
          s.glideT = s.gliding ? 0.5 + Math.random() * 0.8 : 0.7 + Math.random() * 1.2;
        }
      } else s.gliding = false;
      a.glide = THREE.MathUtils.damp(a.glide, s.gliding ? 1 : 0, 7, dt);
      a.eat = THREE.MathUtils.damp(a.eat, s.mode === 'eat' ? 1 : 0, 4, dt);
      // 食べているあいだは もぐもぐ（音と かけら）
      if (s.mode === 'eat' && sound) {
        s.munch -= dt;
        if (s.munch <= 0) {
          s.munch = 0.9;
          audio.play('munch');
          emitParticles('dust', [s.pos.x + Math.sin(s.heading) * 0.3, s.pos.y + 0.15, s.pos.z + Math.cos(s.heading) * 0.3], 4);
        }
      }
      if (s.mode === 'eat' && s.wait <= 0) s.mode = 'idle';
      if (s.mode === 'eat') s.wait -= dt;
    }

    // ひまな ときの しぐさ（手入れ・見回す・背のび・ゆれる・はねを ひろげる）。かんさつ中も する
    const resting = freeze ? s.mode !== 'eat' : s.mode === 'idle';
    const perched = !flyer || s.pos.y < top + 0.06;
    gestures.current.update(dt, a, gestureList, resting && perched && a.sleep < 0.3 && a.startle < 0.1 && a.spray < 0.1 && speed >= 0.01);

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
    hop.y += s.airY;
    // 滑空の 間は 少しずつ 高さを 落とす
    if (flyer) hop.y += Math.sin(a.t * 3) * 0.04 * a.flap * (1 - a.glide) - a.glide * 0.05;
    if (swimmer) hop.y += Math.sin(a.t * 1.7) * 0.02;
    // およぐ虫の かたむき：のぼる・くだるときは 頭を 上下に、水面では おしりを 上に
    let pitch = 0;
    if (swimmer) {
      const atSurface = s.pos.y > WATER_LEVEL - 0.25;
      const climb = s.mode === 'walk' ? THREE.MathUtils.clamp((s.target.y - s.pos.y) * 1.2, -0.6, 0.6) : 0;
      pitch = atSurface && s.mode !== 'walk' ? 0.45 : -climb;
    }

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
    g.rotation.order = 'YXZ';
    g.rotation.y = s.heading;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, pitch, 3, dt);
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
              anim.current.startle = 1;
              onTap(e);
            }
          : undefined
      }
    >
      <Model anim={anim} sex={creature.sex} molts={creature.moltsDone} outlines={outlines} />
      {!stage.underground && loco !== 'swim' ? (
        <mesh ref={shadowRef} material={shadowMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={entry.length * 0.9}>
          <planeGeometry args={[1, 1.2]} />
        </mesh>
      ) : null}
    </group>
  );
}
