import { relevantNeeds, stageOf } from '../sim/simulate';
import type { Creature, NeedKey } from '../sim/types';
import { Icon, type IconName } from './Icon';

const ICON: Record<NeedKey, IconName> = { hunger: 'belly', moisture: 'drop', clean: 'sparkle', mood: 'heart' };
const LABEL: Record<NeedKey, string> = { hunger: 'おなか', moisture: 'しめりけ', clean: 'きれいさ', mood: 'ごきげん' };

/**
 * お世話パラメータは数字を出さず、アイコンの「満ちぐあい」と揺れで見せる。
 * 足りないものはアイコンがぴょこぴょこ揺れて知らせる。
 */
export function NeedsBar({ creature }: { creature: Creature }) {
  const keys = relevantNeeds(stageOf(creature));
  if (keys.length === 0) return null;
  return (
    <div className="needs" data-testid="needs">
      {keys.map((k) => {
        const v = creature.needs[k];
        const low = v < 0.35;
        return (
          <div key={k} className={`need${low ? ' low' : ''}`} aria-label={`${LABEL[k]}${low ? ' たりない' : ''}`} data-testid={`need-${k}`}>
            <div className="need-fill" style={{ height: `${Math.round(v * 100)}%` }} />
            <Icon name={ICON[k]} />
          </div>
        );
      })}
    </div>
  );
}
