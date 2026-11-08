import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { actors } from '../../creatures/Actor';
import { modelFor } from '../../creatures/registry';
import { stageOf, wantOf, type Want } from '../../sim/simulate';
import type { Creature } from '../../sim/types';
import { toolAction } from '../../state/drag';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { speak } from '../../text/speech';
import { Icon, type IconName } from '../../ui/Icon';
import { toolInfo } from '../../ui/ToolBar';

const WANT_TEXT: Record<Want, string> = {
  food: 'おなか すいたよ',
  mist: 'のどが かわいたよ',
  scoop: 'おそうじ してほしいな',
  house: 'かくれる ところが ほしいな',
  pet: 'こっちを みて',
};

export function wantIcon(c: Creature, want: Want): IconName {
  return want === 'pet' ? 'heart' : toolInfo(c, want).icon;
}

/** 虫が いちばん してほしいことを、頭の上の 吹き出しで 絵にして見せる（タップでも お世話できる） */
export function WantBubble({ creature }: { creature: Creature }) {
  const group = useRef<THREE.Group>(null);
  const want = wantOf(creature);
  const height = modelFor(stageOf(creature).model).length * 0.9 + 0.5;
  useFrame(({ clock }) => {
    const g = group.current;
    const target = actors.get(creature.id)?.group;
    if (!g || !target) return;
    g.position.set(target.position.x, target.position.y + height + Math.sin(clock.elapsedTime * 3) * 0.05, target.position.z);
  });
  if (!want) return null;
  return (
    <group ref={group}>
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
        <button
          className="want-bubble"
          aria-label={WANT_TEXT[want]}
          data-testid={`want-${want}`}
          onClick={() => {
            speak(WANT_TEXT[want], true);
            if (want === 'pet') {
              useGame.getState().pet(creature.id);
              audio.play('bounce');
              return;
            }
            if (toolAction.tool) return;
            toolAction.tool = want;
            toolAction.t = 0;
            useUi.getState().setDragging(true);
            audio.play('pickup');
          }}
        >
          <Icon name={wantIcon(creature, want)} />
        </button>
      </Html>
    </group>
  );
}
