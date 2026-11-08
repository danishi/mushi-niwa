import { useMemo } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { actors } from '../../creatures/Actor';
import { SPECIES } from '../../data/species';
import { CaseView } from '../../habitat/CaseView';
import { partsFor } from '../../sim/simulate';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { speak } from '../../text/speech';
import type { CameraShot } from '../../three/CameraRig';
import { Meadow } from '../../three/Diorama';
import { maybeThreat } from '../care/CareScene';
import { emitParticles } from '../../three/Particles';
import { useTier } from '../../three/QualityManager';
import { QUALITY } from '../../three/quality';

/** かんさつモード：虫に寄ったカメラ。指で少し回して覗き込める */
export const observeShot = (): CameraShot => {
  const id = useUi.getState().selectedId;
  const g = id ? actors.get(id)?.group : null;
  const p = g ? g.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1, 0);
  return {
    position: [p.x + 0.3, p.y + 1.0, p.z + 2.4],
    target: [p.x, p.y + 0.3, p.z],
    fov: 32,
    orbit: { minDistance: 1.2, maxDistance: 4, minPolar: 0.35, maxPolar: 1.5, azimuth: 1.1 },
  };
};

/** タップした場所から部位を探す（メッシュか、その親の userData.part） */
function partOf(obj: THREE.Object3D | null): string | null {
  let o: THREE.Object3D | null = obj;
  while (o) {
    const p = (o.userData as { part?: string }).part;
    if (p) return p;
    o = o.parent;
  }
  return null;
}

export function findPartPosition(id: string, part: string): THREE.Vector3 | null {
  const g = actors.get(id)?.group;
  if (!g) return null;
  let found: THREE.Object3D | null = null;
  g.traverse((o) => {
    if (!found && (o.userData as { part?: string }).part === part) found = o;
  });
  return found ? (found as THREE.Object3D).getWorldPosition(new THREE.Vector3()) : null;
}

export function explainPart(id: string, part: string, at?: THREE.Vector3) {
  const c = useGame.getState().creatures.find((x) => x.id === id);
  if (!c) return;
  const info = partsFor(c).find((p) => p.id === part);
  if (!info) return;
  useUi.getState().setObservedPart(part);
  audio.play('sparkle');
  speak(`${info.label}。${info.text}`);
  const pos = at ?? findPartPosition(id, part);
  if (pos) emitParticles('sparkle', pos, 10);
}

export function ObserveScene() {
  const id = useUi((s) => s.selectedId);
  const creature = useGame((s) => s.creatures.find((c) => c.id === id));
  const tier = useTier();
  const parts = useMemo(() => (creature ? partsFor(creature).map((p) => p.id) : []), [creature]);
  if (!creature) return <Meadow radius={8} />;
  return (
    <group>
      <Meadow radius={9} />
      <CaseView
        creature={creature}
        detail
        outlines={QUALITY[tier].outlines}
        freeze
        onTapCreature={(e) => {
          const part = partOf(e.object);
          if (part && parts.includes(part)) explainPart(creature.id, part, e.point);
          else audio.play('tap');
          // 何度も さわると いかくする（さわらない ほうが いい 生きもの）
          const threat = SPECIES[creature.species].threat;
          if (threat) maybeThreat(creature.id, threat);
        }}
      />
    </group>
  );
}
