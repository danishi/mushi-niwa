import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { actors } from '../../creatures/Actor';
import { CASE } from '../../habitat/case';
import { Decor } from '../../habitat/Decor';
import { FoodModel } from '../../habitat/Food';
import { houseFor } from '../../habitat/Terrarium';
import { stageOf } from '../../sim/simulate';
import type { Creature, SpeciesDef, ToolId } from '../../sim/types';
import { foodPositions, toolAction } from '../../state/drag';
import { playEvents } from '../../state/events';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { speak } from '../../text/speech';
import { emitParticles } from '../../three/Particles';
import { GEO, mat } from '../../three/materials';

function MistBottle() {
  const body = useMemo(() => mat('#9fd3e6', { roughness: 0.15, opacity: 0.75, clearcoat: 1 }), []);
  const cap = useMemo(() => mat('#f4f4f0', { roughness: 0.4 }), []);
  return (
    <group rotation={[0, 0, -0.6]} scale={1.1}>
      <mesh geometry={GEO.cylinder()} material={body} scale={[0.16, 0.42, 0.16]} castShadow />
      <mesh geometry={GEO.cylinder()} material={cap} position={[0, 0.28, 0]} scale={[0.07, 0.14, 0.07]} />
      <mesh geometry={GEO.box()} material={cap} position={[0.08, 0.34, 0]} scale={[0.16, 0.05, 0.05]} />
    </group>
  );
}

function Scoop() {
  const wood = useMemo(() => mat('#c19a6b', { roughness: 0.7 }), []);
  const blade = useMemo(() => mat('#b8c4c8', { roughness: 0.3, metalness: 0.8 }), []);
  return (
    <group rotation={[0.9, 0, 0]}>
      <mesh geometry={GEO.cylinder()} material={wood} position={[0, 0.3, 0]} scale={[0.03, 0.45, 0.03]} castShadow />
      <mesh geometry={GEO.sphere()} material={blade} scale={[0.17, 0.04, 0.22]} castShadow />
    </group>
  );
}

const FLY_IN = 0.55;
const ACT_END = 1.8;
const DONE = 2.3;
/** 霧吹き・スコップを効かせるタイミング（秒） */
const PULSES = [0.75, 1.15, 1.55];

/** 道具を つかう あいだ 画面に出す ことば */
const ACTION_TEXT: Record<ToolId, string> = {
  mist: 'きりふきで シュッ シュッ',
  scoop: 'ふんを おそうじ',
  food: 'ごはんを おくよ',
  house: 'おうちを おくよ',
};

/** つかった あとの 虫の よろこび */
export const REACTION_TEXT: Record<ToolId, string> = {
  mist: 'しっとり！ きもちいい',
  scoop: 'ぴかぴか！ きれいに なった',
  food: 'わーい ごはんだ！',
  house: 'おうち うれしいな',
};

const ease = (x: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(x, 0, 1), 3);

/**
 * タップした道具が 手前から ケースへ飛んでいき、自動で使われる。
 * - きりふき: 虫の上で 3 回 シュッ
 * - スコップ: 土の上を 左右に そうじ
 * - ごはん・おうち: 虫の近くに そっと置く
 */
export function AutoTool({ creature, sp, top }: { creature: Creature; sp: SpeciesDef; top: number }) {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null);
  const start = useMemo(() => new THREE.Vector3(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const spot = useMemo(() => new THREE.Vector3(), []);
  const state = useRef({ tool: null as ToolId | null, pulses: 0, placed: false, ok: 0 });
  const stage = stageOf(creature);
  useUi((s) => s.dragging); // 道具の見た目を切り替えるため

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    const st = state.current;
    const tool = toolAction.tool;
    if (!tool) {
      g.visible = false;
      return;
    }
    const game = useGame.getState();
    if (st.tool !== tool || toolAction.t === 0) {
      // 始まり：手前（カメラの下のほう）から 虫のところへ
      st.tool = tool;
      st.pulses = 0;
      st.placed = false;
      st.ok = 0;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      start.copy(camera.position).addScaledVector(dir, 2.5).add(new THREE.Vector3(0, -1.2, 0));
      const pos = actors.get(creature.id)?.group?.position;
      const cx = THREE.MathUtils.clamp(pos?.x ?? 0, -CASE.w / 2 + 0.6, CASE.w / 2 - 0.6);
      const cz = THREE.MathUtils.clamp(pos?.z ?? 0, -CASE.d / 2 + 0.5, CASE.d / 2 - 0.5);
      // 置くものは 虫の すこし前（ケースの中に収める）
      const ox = cx > 0 ? -0.7 : 0.7;
      spot.set(THREE.MathUtils.clamp(cx + ox, -CASE.w / 2 + 0.5, CASE.w / 2 - 0.5), top, THREE.MathUtils.clamp(cz + 0.2, -CASE.d / 2 + 0.5, CASE.d / 2 - 0.5));
      if (tool === 'mist') goal.set(cx + 0.35, top + 1.1, cz);
      else if (tool === 'scoop') goal.set(-CASE.w / 2 + 0.7, top + 0.15, 0.3);
      else goal.set(spot.x, top + 0.6, spot.z);
      // カメラを 使う場所に 寄せて、何が起きるか よく見せる
      const focus: [number, number, number] = tool === 'scoop' ? [0, top, 0.3] : tool === 'mist' ? [cx, top, cz] : [spot.x, top, spot.z];
      useUi.getState().setCinematic({ kind: 'tool', target: focus, label: ACTION_TEXT[tool], until: performance.now() + 3000 });
      speak(ACTION_TEXT[tool]);
    }
    toolAction.t += Math.min(rawDt, 0.25);
    const t = toolAction.t;
    g.visible = !(st.placed && (tool === 'food' || tool === 'house'));

    if (t < FLY_IN) {
      g.position.lerpVectors(start, goal, ease(t / FLY_IN));
      g.position.y += Math.sin((t / FLY_IN) * Math.PI) * 0.6;
    } else if (t < ACT_END) {
      const k = (t - FLY_IN) / (ACT_END - FLY_IN);
      if (tool === 'scoop') {
        g.position.set(THREE.MathUtils.lerp(-CASE.w / 2 + 0.7, CASE.w / 2 - 0.7, k), top + 0.15 + Math.abs(Math.sin(k * 12)) * 0.08, 0.3);
      } else if (tool === 'mist') {
        g.position.copy(goal);
        g.position.x += Math.sin(k * 8) * 0.15;
      } else {
        g.position.lerpVectors(goal, spot, ease(k * 2));
      }
      // 霧吹き・スコップは 3 回に分けて効かせる
      if ((tool === 'mist' || tool === 'scoop') && st.pulses < PULSES.length && t >= PULSES[st.pulses]!) {
        st.pulses++;
        if (game.useTool(creature.id, tool, 0.6)) {
          st.ok++;
          if (tool === 'mist') {
            audio.play('mist');
            emitParticles('mist', [g.position.x + 0.25, g.position.y + 0.1, g.position.z], 24, new THREE.Vector3(0.3, -1.6, 0));
          } else {
            audio.play('scoop');
            emitParticles('dust', [g.position.x, top + 0.05, g.position.z], 14);
            emitParticles('sparkle', [g.position.x, top + 0.2, g.position.z], 6);
          }
        }
      }
      if ((tool === 'food' || tool === 'house') && !st.placed && k >= 0.5) {
        st.placed = true;
        if (game.useTool(creature.id, tool)) {
          st.ok++;
          if (tool === 'food') foodPositions.set(creature.id, [spot.x, top, spot.z]);
          audio.play('pop');
          emitParticles('sparkle', [spot.x, top + 0.3, spot.z], 16);
          if (stage.food === 'mat') emitParticles('dust', [spot.x, top + 0.1, spot.z], 14);
        } else audio.play('nope');
      }
    } else if (t < DONE) {
      const k = (t - ACT_END) / (DONE - ACT_END);
      g.position.lerpVectors(goal, start, ease(k));
    } else {
      if (st.ok > 0) {
        playEvents.emit('care');
        audio.play('sparkle');
        const h = actors.get(creature.id);
        if (h) {
          h.anim.bounce = 1;
          if (h.group) emitParticles('heart', [h.group.position.x, h.group.position.y + 0.8, h.group.position.z], 8);
        }
        useUi.getState().setReaction({ text: REACTION_TEXT[tool], until: performance.now() + 3000 });
        speak(REACTION_TEXT[tool], true);
      }
      const cine = useUi.getState().cinematic;
      if (cine?.kind === 'tool') useUi.getState().setCinematic(null);
      toolAction.tool = null;
      toolAction.t = 0;
      st.tool = null;
      g.visible = false;
      useUi.getState().setDragging(false);
    }
  });

  const tool = toolAction.tool;
  return (
    <group ref={group} visible={false}>
      {tool === 'mist' ? <MistBottle /> : null}
      {tool === 'scoop' ? <Scoop /> : null}
      {tool === 'food' ? <FoodModel food={stage.food} /> : null}
      {tool === 'house' ? (
        <group scale={0.5}>
          <Decor id={houseFor(sp.id)} top={0} index={99} at={[0, 0, 0]} />
        </group>
      ) : null}
    </group>
  );
}
