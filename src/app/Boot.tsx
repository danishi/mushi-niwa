import { useEffect, useState } from 'react';
import { audio } from '../audio/audio';
import { useSettings } from '../state/settings';
import { useUi } from '../state/ui';
import { Icon } from '../ui/Icon';

/** 最初のタップで音をアンロックする（iOS 対策）。文字なしで「おして」が伝わる大きな丸ボタン */
export function Boot() {
  const go = useUi((s) => s.go);
  const leaving = useUi((s) => s.screen !== 'boot');
  // 最初の シーンが 描けるまでは 読みこみ中の 丸（押せない）。描けたら 再生ボタンに なる
  const ready = useUi((s) => s.ready);
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
        className={ready ? 'boot-tap' : 'boot-tap boot-loading'}
        disabled={!ready}
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
        {ready ? <Icon name="play" /> : <span className="spinner" />}
      </button>
    </div>
  );
}
