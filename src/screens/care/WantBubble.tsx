import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '../../audio/audio';
import { actors } from '../../creatures/Actor';
import { modelFor } from '../../creatures/registry';
import { stageOf, wantOf, type Want } from '../../sim/simulate';
import type { Creature } from '../../sim/types';
import { toolAction } from '../../state/drag';
import { useGame } from '../../state/game';
import { useSettings } from '../../state/settings';
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

/** 虫の 頭の上の 画面座標（3D 側が 毎フレーム 書き、DOM 側が 読む） */
const anchor = { x: 0, y: 0, visible: false };

/** 3D 側：虫の 頭の上の 位置を 画面座標に 変換する */
export function BubbleAnchor({ creature }: { creature: Creature }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useRef(new THREE.Vector3());
  const height = modelFor(stageOf(creature).model).length * 0.9 + 0.5;
  useFrame(({ clock }) => {
    const g = actors.get(creature.id)?.group;
    if (!g) {
      anchor.visible = false;
      return;
    }
    v.current.set(g.position.x, g.position.y + height + Math.sin(clock.elapsedTime * 3) * 0.05, g.position.z).project(camera);
    anchor.x = (v.current.x * 0.5 + 0.5) * size.width;
    anchor.y = (-v.current.y * 0.5 + 0.5) * size.height;
    anchor.visible = v.current.z < 1;
  });
  useEffect(
    () => () => {
      anchor.visible = false;
    },
    [],
  );
  return null;
}

/** DOM 側：虫が いちばん してほしいことを 吹き出しの 絵で見せる（タップでも お世話できる） */
export function WantBubble({ creature }: { creature: Creature }) {
  const ref = useRef<HTMLDivElement>(null);
  const want = wantOf(creature);
  const reaction = useUi((s) => s.reaction);
  const tutorial = useUi((s) => s.tutorialStep);
  const cine = useUi((s) => s.cinematic);
  const [, force] = useState(0);

  // 毎フレーム 3D の位置に 追従させる（React の 再描画は しない）
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = ref.current;
      if (el) {
        el.style.transform = `translate(${anchor.x}px, ${anchor.y}px) translate(-50%, -100%)`;
        el.style.visibility = anchor.visible ? 'visible' : 'hidden';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // よろこびの 表示が 終わったら もとに もどす
  useEffect(() => {
    if (!reaction) return;
    const id = window.setTimeout(() => {
      useUi.getState().setReaction(null);
      force((n) => n + 1);
    }, Math.max(0, reaction.until - performance.now()));
    return () => window.clearTimeout(id);
  }, [reaction]);

  // 道具を使っている間（カメラが寄っている間）は 吹き出しを 出さない
  const show = reaction || (want && !(cine && cine.kind === 'tool'));
  return (
    <div className="bubble-anchor" ref={ref}>
      {!show ? null : reaction ? (
        <div className="want-bubble happy" data-testid="reaction-bubble">
          <Icon name="heart" />
          <span className="bubble-text">{reaction.text}</span>
        </div>
      ) : want ? (
        <>
          {tutorial === 1 ? (
            <span className="tutorial-hand bubble-hand" aria-hidden>
              👆
            </span>
          ) : null}
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
              if (useUi.getState().tutorialStep) {
                useUi.getState().setTutorialStep(0);
                useSettings.getState().set({ tutorialDone: true });
              }
              toolAction.tool = want;
              toolAction.t = 0;
              useUi.getState().setDragging(true);
              audio.play('pickup');
            }}
          >
            <Icon name={wantIcon(creature, want)} />
          </button>
        </>
      ) : null}
    </div>
  );
}
