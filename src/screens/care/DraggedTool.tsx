import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { CASE } from '../../habitat/case';
import { Decor } from '../../habitat/Decor';
import { FoodModel } from '../../habitat/Food';
import { houseFor } from '../../habitat/Terrarium';
import { stageOf } from '../../sim/simulate';
import type { Creature, SpeciesDef, ToolId } from '../../sim/types';
import { drag, foodPositions } from '../../state/drag';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { speak } from '../../text/speech';
import { emitParticles } from '../../three/Particles';
import { GEO, toon } from '../../three/toon';

function MistBottle() {
  const body = useMemo(() => toon('#7ec8e3', { opacity: 0.85 }), []);
  const cap = useMemo(() => toon('#fffaf0'), []);
  return (
    <group rotation={[0, 0, -0.5]}>
      <mesh geometry={GEO.cylinder()} material={body} scale={[0.16, 0.42, 0.16]} />
      <mesh geometry={GEO.cylinder()} material={cap} position={[0, 0.28, 0]} scale={[0.07, 0.14, 0.07]} />
      <mesh geometry={GEO.box()} material={cap} position={[0.08, 0.34, 0]} scale={[0.16, 0.05, 0.05]} />
    </group>
  );
}

function Scoop() {
  const wood = useMemo(() => toon('#c8a27a'), []);
  const blade = useMemo(() => toon('#9ccc65'), []);
  return (
    <group rotation={[0.9, 0, 0]}>
      <mesh geometry={GEO.cylinder()} material={wood} position={[0, 0.3, 0]} scale={[0.03, 0.45, 0.03]} />
      <mesh geometry={GEO.sphere()} material={blade} position={[0, 0, 0]} scale={[0.17, 0.05, 0.22]} />
    </group>
  );
}

const HOVER: Record<ToolId, number> = { mist: 1.0, scoop: 0.25, food: 0.5, house: 0.5 };

/**
 * ドラッグ中の道具を 3D で表示し、ケースの上で使う。
 * - きりふき・スコップ: ケースの上でなぞっている間、少しずつ効く
 * - ごはん・おうち: ケースの上で はなすと置ける
 */
export function DraggedTool({ creature, sp, top }: { creature: Creature; sp: SpeciesDef; top: number }) {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const want = useMemo(() => new THREE.Vector3(), []);
  const ground = useMemo(() => new THREE.Vector3(), []);
  const caseBox = useMemo(
    () => new THREE.Box3(new THREE.Vector3(-CASE.w / 2, 0, -CASE.d / 2), new THREE.Vector3(CASE.w / 2, CASE.h + 0.3, CASE.d / 2)),
    [],
  );
  const used = useRef({ tool: null as ToolId | null, timer: 0, count: 0, shown: false });
  const stage = stageOf(creature);
  // ドラッグ開始・終了で道具の見た目を切り替えるために購読する
  useUi((s) => s.dragging);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = group.current;
    if (!g) return;
    const u = used.current;
    if (!drag.active && !drag.released) {
      g.visible = false;
      u.shown = false;
      return;
    }
    const tool = drag.tool!;
    if (u.tool !== tool) {
      u.tool = tool;
      u.count = 0;
      u.timer = 0;
    }
    // 指の先からの光線が ケースの箱に当たっていれば「ケースの上」
    ray.setFromCamera(new THREE.Vector2(drag.ndc.x, drag.ndc.y), camera);
    const over = ray.ray.intersectBox(caseBox, hit) !== null;
    if (over) {
      // 床（土の表面）との交点を、道具を使う場所にする（箱の中に収める）
      plane.constant = -top;
      if (ray.ray.intersectPlane(plane, ground)) {
        ground.x = THREE.MathUtils.clamp(ground.x, -CASE.w / 2 + 0.35, CASE.w / 2 - 0.35);
        ground.z = THREE.MathUtils.clamp(ground.z, -CASE.d / 2 + 0.35, CASE.d / 2 - 0.35);
      } else ground.set(hit.x, top, 0);
      want.set(ground.x, top + HOVER[tool], ground.z);
    } else {
      want.copy(ray.ray.origin).addScaledVector(ray.ray.direction, camera.position.length() * 0.7);
    }
    if (!u.shown) pos.copy(want);
    pos.lerp(want, 1 - Math.exp(-dt * 18));
    u.shown = true;
    g.visible = true;
    g.position.copy(pos);
    drag.over = over;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, over ? 1.15 : 1, 10, dt));
    const game = useGame.getState();

    if (drag.active && over && (tool === 'mist' || tool === 'scoop')) {
      u.timer -= dt;
      if (u.timer <= 0) {
        u.timer = 0.3;
        if (game.useTool(creature.id, tool, 0.35)) {
          u.count++;
          if (tool === 'mist') {
            audio.play('mist');
            emitParticles('mist', [pos.x + 0.2, pos.y + 0.1, pos.z], 10, new THREE.Vector3(0.4, -1.2, 0));
          } else {
            audio.play('scoop');
            emitParticles('dust', [ground.x, top + 0.05, ground.z], 8);
          }
        }
      }
    }

    if (drag.released) {
      drag.released = false;
      drag.active = false;
      drag.over = false;
      useUi.getState().setDragging(false);
      if (!over) {
        audio.play('drop');
        return;
      }
      if (tool === 'food' || tool === 'house') {
        if (game.useTool(creature.id, tool)) {
          if (tool === 'food') foodPositions.set(creature.id, [ground.x, top, ground.z]);
          audio.play('pop');
          emitParticles('sparkle', [ground.x, top + 0.3, ground.z], 16);
          speak(tool === 'food' ? 'ごはん どうぞ' : 'おうち できたよ');
          if (tool === 'food' && stage.food === 'mat') emitParticles('dust', [ground.x, top + 0.1, ground.z], 14);
        } else {
          audio.play('nope');
        }
      } else if (u.count > 0) {
        audio.play('sparkle');
        emitParticles('sparkle', [0, top + 0.6, 0.4], 14);
        emitParticles('heart', [0, top + 0.8, 0.4], 4);
        speak('ありがとう');
      }
      u.count = 0;
    }
  });

  const tool = drag.tool;
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
