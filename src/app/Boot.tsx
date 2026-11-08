import { audio } from '../audio/audio';
import { useSettings } from '../state/settings';
import { useUi } from '../state/ui';
import { Icon } from '../ui/Icon';

/** 最初のタップで音をアンロックする（iOS 対策）。文字なしで「おして」が伝わる大きな丸ボタン */
export function Boot() {
  const go = useUi((s) => s.go);
  return (
    <div className="boot" data-testid="boot">
      <button
        className="boot-tap"
        aria-label="はじめる"
        data-testid="boot-tap"
        onClick={() => {
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
