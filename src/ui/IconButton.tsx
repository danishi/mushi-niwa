import type { ReactNode } from 'react';
import { audio, type SfxName } from '../audio/audio';
import { speak } from '../text/speech';
import { Icon, type IconName } from './Icon';

interface Props {
  icon: IconName;
  /** 読み上げ・アクセシビリティ用の名前（ひらがな／ルビ記法可） */
  label: string;
  onPress: () => void;
  big?: boolean;
  active?: boolean;
  disabled?: boolean;
  sfx?: SfxName;
  testId?: string;
  children?: ReactNode;
}

/** タップ領域 64px（最低 56px）。押すとぷにっと縮み、音が鳴り、必要なら読み上げる */
export function IconButton({ icon, label, onPress, big, active, disabled, sfx = 'tap', testId, children }: Props) {
  return (
    <button
      className={`icon-btn${big ? ' big' : ''}${active ? ' active' : ''}`}
      aria-label={label.replace(/\{([^|}]+)\|([^}]+)\}/g, '$2')}
      disabled={disabled}
      data-testid={testId}
      onClick={() => {
        audio.play(sfx);
        speak(label);
        onPress();
      }}
    >
      <Icon name={icon} />
      {children}
    </button>
  );
}
