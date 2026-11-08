import { audio } from '../audio/audio';
import { SPECIES } from '../data/species';
import { canUseTool, stageOf } from '../sim/simulate';
import type { Creature, FoodId, ToolId } from '../sim/types';
import { toolAction } from '../state/drag';
import { useSettings } from '../state/settings';
import { useUi } from '../state/ui';
import { speak } from '../text/speech';
import { Icon, type IconName } from './Icon';

const FOOD_ICON: Record<FoodId, IconName> = {
  mat: 'bag',
  jelly: 'food',
  citrusLeaf: 'leaf',
  nectar: 'flower',
  eggplant: 'eggplant',
  aphid: 'aphid',
  mulberry: 'leaf',
  smallInsect: 'bug',
  none: 'food',
};

const FOOD_LABEL: Record<FoodId, string> = {
  mat: 'マット',
  jelly: 'ゼリー',
  citrusLeaf: 'ミカンの は',
  nectar: 'はな',
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
      return { icon: 'house', label: SPECIES[c.species].id === 'kabutomushi' ? 'とまりぎ' : 'おうち' };
    case 'food':
      return { icon: FOOD_ICON[st.food], label: FOOD_LABEL[st.food] };
  }
}

/** 道具の棚。タップすると 3D の道具が ケースへ飛んでいって 自動で使われる */
export function ToolBar({ creature, want }: { creature: Creature; want?: string | null }) {
  const tools = (['food', 'mist', 'scoop', 'house'] as ToolId[]).filter((t) => canUseTool(creature, t));
  const setDragging = useUi((s) => s.setDragging);
  const tutorial = useUi((s) => s.tutorialStep);
  if (tools.length === 0) return <div className="toolbar empty" />;
  return (
    <div className="toolbar" data-testid="toolbar">
      {tools.map((t) => {
        const info = toolInfo(creature, t);
        return (
          <button
            key={t}
            className={`tool-btn${want === t ? ' want' : ''}`}
            aria-label={info.label}
            data-testid={`tool-${t}`}
            onClick={() => {
              if (toolAction.tool) return;
              toolAction.tool = t;
              toolAction.t = 0;
              setDragging(true);
              // お手本は 1 回 道具を 使えたら おしまい
              if (useUi.getState().tutorialStep) {
                useUi.getState().setTutorialStep(0);
                useSettings.getState().set({ tutorialDone: true });
              }
              audio.play('pickup');
              speak(info.label);
            }}
          >
            <Icon name={info.icon} />
            <span className="tool-name">{info.label}</span>
            {tutorial === 2 && (want ? want === t : t === tools[0]) ? <span className="tutorial-hand" aria-hidden>👆</span> : null}
          </button>
        );
      })}
    </div>
  );
}
