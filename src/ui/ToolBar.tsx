import { audio } from '../audio/audio';
import { SPECIES } from '../data/species';
import { canUseTool, stageOf } from '../sim/simulate';
import type { Creature, FoodId, ToolId } from '../sim/types';
import { drag } from '../state/drag';
import { useUi } from '../state/ui';
import { speak } from '../text/speech';
import { Icon, type IconName } from './Icon';

const FOOD_ICON: Record<FoodId, IconName> = {
  mat: 'scoop',
  jelly: 'food',
  citrusLeaf: 'leaf',
  nectar: 'sun',
  eggplant: 'food',
  aphid: 'leaf',
  mulberry: 'leaf',
  smallInsect: 'food',
  none: 'food',
};

const FOOD_LABEL: Record<FoodId, string> = {
  mat: 'あたらしい マット',
  jelly: 'こんちゅうゼリー',
  citrusLeaf: 'ミカンの は',
  nectar: 'はなの みつ',
  eggplant: 'ナス',
  aphid: 'アブラムシ',
  mulberry: 'クワの は',
  smallInsect: 'ちいさな むし',
  none: '',
};

export function toolInfo(c: Creature, tool: ToolId): { icon: IconName; label: string } {
  const st = stageOf(c);
  switch (tool) {
    case 'mist':
      return { icon: 'mist', label: 'きりふき' };
    case 'scoop':
      return { icon: 'scoop', label: 'おそうじ' };
    case 'house':
      return { icon: 'house', label: SPECIES[c.species].id === 'kabutomushi' ? 'とまりぎ' : 'かくれが' };
    case 'food':
      return { icon: FOOD_ICON[st.food], label: FOOD_LABEL[st.food] };
  }
}

function toNdc(x: number, y: number) {
  drag.ndc.x = (x / window.innerWidth) * 2 - 1;
  drag.ndc.y = -(y / window.innerHeight) * 2 + 1;
}

/** 道具の棚。ボタンを押したまま ケースへ ひっぱると、3D の道具が指についてくる */
export function ToolBar({ creature }: { creature: Creature }) {
  const tools = (['food', 'mist', 'scoop', 'house'] as ToolId[]).filter((t) => canUseTool(creature, t));
  const setDragging = useUi((s) => s.setDragging);
  if (tools.length === 0) return <div className="toolbar empty" />;
  return (
    <div className="toolbar" data-testid="toolbar">
      {tools.map((t) => {
        const info = toolInfo(creature, t);
        return (
          <button
            key={t}
            className="tool-btn"
            aria-label={info.label}
            data-testid={`tool-${t}`}
            onPointerDown={(e) => {
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* 合成イベントなど */
              }
              drag.active = true;
              drag.released = false;
              drag.tool = t;
              toNdc(e.clientX, e.clientY - 60);
              setDragging(true);
              audio.play('pickup');
              speak(info.label);
            }}
            onPointerMove={(e) => {
              if (drag.active) toNdc(e.clientX, e.clientY - 60);
            }}
            onPointerUp={() => {
              if (drag.active) drag.released = true;
            }}
            onPointerCancel={() => {
              if (drag.active) {
                drag.ndc.x = 99;
                drag.released = true;
              }
            }}
          >
            <Icon name={info.icon} />
          </button>
        );
      })}
    </div>
  );
}
