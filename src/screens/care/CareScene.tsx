import { useEffect } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { actors } from '../../creatures/Actor';
import { SPECIES } from '../../data/species';
import { CASE } from '../../habitat/case';
import { CaseView } from '../../habitat/CaseView';
import { soilTop } from '../../habitat/Terrarium';
import type { GrowthEvent, SpeciesDef } from '../../sim/types';
import { simEvents } from '../../state/events';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { speak } from '../../text/speech';
import type { CameraShot } from '../../three/CameraRig';
import { emitParticles } from '../../three/Particles';
import { useTier } from '../../three/QualityManager';
import { QUALITY } from '../../three/quality';
import { Meadow } from '../../three/Diorama';
import { AutoTool } from './AutoTool';
import { BubbleAnchor } from './WantBubble';
import { SkyToggle } from '../../three/SkyToggle';
import { toolAction } from '../../state/drag';

export const careShot = (): CameraShot => {
  const cine = useUi.getState().cinematic;
  if (cine) {
    const [x, y, z] = cine.target;
    return { position: [x + 0.4, y + 0.9, z + 2.6], target: [x, y + 0.3, z], fov: 34 };
  }
  return {
    position: [0, CASE.h * 1.1, CASE.d / 2 + 5.2],
    target: [0, CASE.h * 0.4, 0],
    fov: 40,
    fitWidth: CASE.w + 0.5,
    orbit: { minDistance: 3.2, maxDistance: 8.5, minPolar: 0.6, maxPolar: 1.45, azimuth: 0.6 },
  };
};

export const GROW_TEXT: Record<GrowthEvent, string> = {
  hatch: 'たまごから うまれたよ！',
  molt: 'だっぴしたよ！',
  pupate: 'さなぎに なったよ！',
  cocoon: 'まゆを つくったよ！',
  eclose: 'おとなに なったよ！',
  adult: 'おとなに なったよ！',
};

/** 成長の瞬間：カメラが寄って、きらきらと音で祝う */
export function useGrowthCinematic(id: string | null) {
  useEffect(() => {
    if (!id) return;
    return simEvents.on((e) => {
      if (!('id' in e) || e.id !== id) return;
      const g = actors.get(id)?.group;
      const p = g ? g.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1, 0);
      if (e.type === 'grow' || (e.type === 'molt')) {
        const label = e.type === 'grow' ? GROW_TEXT[e.event] : GROW_TEXT.molt;
        const big = e.type === 'grow';
        audio.play(big ? 'grow' : 'sparkle');
        emitParticles('sparkle', [p.x, p.y + 0.5, p.z], big ? 40 : 18);
        speak(label);
        if (big) {
          useUi.getState().setCinematic({ kind: 'grow', target: [p.x, p.y, p.z], label, until: performance.now() + 4500 });
          window.setTimeout(() => {
            const c = useUi.getState().cinematic;
            if (c && c.kind === 'grow' && performance.now() >= c.until - 50) useUi.getState().setCinematic(null);
          }, 4600);
        } else {
          useUi.getState().setCinematic({ kind: 'grow', target: [p.x, p.y, p.z], label, until: performance.now() + 2200 });
          window.setTimeout(() => {
            const c = useUi.getState().cinematic;
            if (c && performance.now() >= c.until - 50) useUi.getState().setCinematic(null);
          }, 2300);
        }
      }
      if (e.type === 'finished') {
        audio.play('sparkle');
        speak('りっぱに いきたね');
      }
    });
  }, [id]);
}

export function CareScene({ freeze = false }: { freeze?: boolean }) {
  const id = useUi((s) => s.selectedId);
  const creature = useGame((s) => s.creatures.find((c) => c.id === id));
  const tier = useTier();
  useGrowthCinematic(id);
  if (!creature) return <Meadow radius={8} />;
  const sp = SPECIES[creature.species];
  const top = soilTop(sp);
  return (
    <group>
      <group position={[0, -0.02, 0]}>
        <Meadow radius={9} />
      </group>
      <CaseView
        creature={creature}
        detail
        sound
        outlines={QUALITY[tier].outlines}
        freeze={freeze}
        onTapCreature={
          freeze
            ? undefined
            : () => {
                // なでると ごきげんに なり、そのまま 近くで かんさつ できる
                useGame.getState().pet(creature.id);
                audio.play('bounce');
                const g = actors.get(creature.id)?.group;
                if (g) emitParticles('heart', g.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 3);
                window.setTimeout(() => {
                  if (!toolAction.tool && useUi.getState().screen === 'care') useUi.getState().go('observe');
                }, 450);
              }
        }
      />
      {!freeze ? <BubbleAnchor creature={creature} /> : null}
      {!freeze ? <SkyToggle position={[CASE.w / 2 - 0.4, CASE.h + 1.4, -0.6]} /> : null}
      <AutoTool creature={creature} sp={sp} top={top} />
    </group>
  );
}

/**
 * 何度も さわると いかくする（安全学習。罰は ない）。
 * ミイデラゴミムシ：プッと ふきだす／カマキリ・ムカデ・サソリ：からだを おおきく みせる／カミキリ：キィキィ なく
 */
const taps: number[] = [];
export function maybeThreat(id: string, threat: NonNullable<SpeciesDef['threat']>) {
  const now = performance.now();
  taps.push(now);
  while (taps.length && now - taps[0]! > 2500) taps.shift();
  if (taps.length < 3) return;
  taps.length = 0;
  const h = actors.get(id);
  if (!h?.group) return;
  h.anim.spray = 1;
  const p = h.group.position;
  if (threat.kind === 'spray') {
    const back = new THREE.Vector3(Math.sin(h.group.rotation.y), 0, Math.cos(h.group.rotation.y)).multiplyScalar(-0.55);
    audio.play('puff');
    emitParticles('smoke', [p.x + back.x, p.y + 0.25, p.z + back.z], 22, back.clone().multiplyScalar(2));
  } else if (threat.kind === 'squeak') {
    audio.play('squeak');
  } else {
    audio.play('whoosh');
  }
  // いかくの ポーズを しばらく つづける
  const hold = window.setInterval(() => {
    const a = actors.get(id)?.anim;
    if (a) a.spray = Math.max(a.spray, 0.9);
  }, 100);
  window.setTimeout(() => window.clearInterval(hold), 1800);
  speak(threat.text, true);
}
