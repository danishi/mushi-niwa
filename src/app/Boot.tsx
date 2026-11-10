import { useEffect, useState } from 'react';
import { audio } from '../audio/audio';
import { useSettings } from '../state/settings';
import { useUi } from '../state/ui';
import { Icon } from '../ui/Icon';

/** 最初のタップで音をアンロックする（iOS 対策）。文字なしで「おして」が伝わる大きな丸ボタン */
export function Boot() {
  const go = useUi((s) => s.go);
  const leaving = useUi((s) => s.screen !== 'boot');
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => setGone(true), 320);
    return () => window.clearTimeout(id);
  }, [leaving]);
  if (gone) return null;
  return (
    <div className={leaving ? 'boot leaving' : 'boot'} data-testid="boot">
      <button
        className="boot-tap"
        aria-label="はじめる"
        data-testid="boot-tap"
        onClick={() => {
          if (leaving) return;
          audio.unlock();
          const s = useSettings.getState();
          audio.setVolumes(s.bgmVolume, s.sfxVolume);
          audio.play('sparkle');
          audio.startBgm('title');
          // 端末のストレージを消されにくくする（対応ブラウザのみ）
          void navigator.storage?.persist?.().catch(() => undefined);
          go('title');
        }}
      >
        <Icon name="play" />
      </button>
    </div>
  );
}
