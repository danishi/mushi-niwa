import { useEffect, type ReactNode } from 'react';
import { audio } from '../../audio/audio';
import { useSettings, type QualitySetting } from '../../state/settings';
import { useUi } from '../../state/ui';
import { speak } from '../../text/speech';
import { Icon } from '../../ui/Icon';

const QUALITIES: Array<{ v: QualitySetting; label: string }> = [
  { v: 'auto', label: '自動' },
  { v: 'high', label: '高' },
  { v: 'mid', label: '中' },
  { v: 'low', label: '低' },
];

/** 大人向けの設定画面（ペアレンタルゲートの先）。ここだけは漢字の通常表記にする */
export function SettingsPanel({ extra }: { extra?: ReactNode }) {
  const s = useSettings();
  const close = useUi((u) => u.openSettings);

  useEffect(() => {
    audio.setVolumes(s.bgmVolume, s.sfxVolume);
  }, [s.bgmVolume, s.sfxVolume]);

  return (
    <div className="modal-backdrop" data-testid="settings-panel">
      <div className="modal settings">
        <h2>設定</h2>
        <label className="row">
          <span>BGM の音量</span>
          <input type="range" min={0} max={1} step={0.05} value={s.bgmVolume} onChange={(e) => s.set({ bgmVolume: +e.target.value })} />
        </label>
        <label className="row">
          <span>効果音の音量</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.sfxVolume}
            onChange={(e) => s.set({ sfxVolume: +e.target.value })}
            onPointerUp={() => audio.play('pop')}
          />
        </label>
        <label className="row">
          <span>読み上げ（端末の音声合成）</span>
          <input
            type="checkbox"
            checked={s.speech}
            onChange={(e) => {
              s.set({ speech: e.target.checked });
              if (e.target.checked) speak('よみあげを オンにしたよ', true);
            }}
          />
        </label>
        <label className="row">
          <span>
            リアルタイムモード
            <small>遊んでいない間も時間が進みます（オフ：遊んでいる間だけ進む）</small>
          </span>
          <input type="checkbox" checked={s.realtime} onChange={(e) => s.set({ realtime: e.target.checked })} data-testid="realtime-toggle" />
        </label>
        <div className="row">
          <span>画質</span>
          <div className="seg">
            {QUALITIES.map((q) => (
              <button key={q.v} className={s.quality === q.v ? 'on' : ''} onClick={() => s.set({ quality: q.v })}>
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <label className="row">
          <span>FPS を表示</span>
          <input type="checkbox" checked={s.showFps} onChange={(e) => s.set({ showFps: e.target.checked })} />
        </label>
        {extra}
        <p className="note">
          広告・課金・外部への送信はありません。データはこの端末の中だけに保存されます。
        </p>
        <button className="icon-btn modal-close" aria-label="とじる" data-testid="settings-close" onClick={() => close(false)}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
