import { useEffect, type ReactNode } from 'react';
import { audio } from '../../audio/audio';
import { useSettings, type QualitySetting } from '../../state/settings';
import { useGame } from '../../state/game';
import { usePhotos } from '../../state/photos';
import { useProgress } from '../../state/progress';
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
  const photoCount = usePhotos((p) => p.photos.length);

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
        <div className="row">
          <span>
            写真をすべて消す
            <small>かんさつで撮った写真（{photoCount}枚）を消します</small>
          </span>
          <button
            className="danger-btn"
            data-testid="clear-photos"
            disabled={photoCount === 0}
            onClick={() => {
              if (window.confirm('かんさつ写真をすべて消します。元に戻せません。よろしいですか？')) usePhotos.getState().clear();
            }}
          >
            消す
          </button>
        </div>
        <div className="row">
          <span>
            データをすべて消す
            <small>育てている虫・ずかん・おもいでカード・シール・写真が消えます（元に戻せません）</small>
          </span>
          <button
            className="danger-btn"
            data-testid="reset-data"
            onClick={() => {
              if (window.confirm('この端末の むしにわ のデータをすべて消します。元に戻せません。よろしいですか？')) {
                useGame.getState().resetAll();
                useProgress.getState().reset();
                usePhotos.getState().clear();
                close(false);
                useUi.getState().go('title', null);
              }
            }}
          >
            消す
          </button>
        </div>
        {extra}
        <p className="note">
          広告・課金・外部への送信はありません。データはこの端末の中だけに保存されます。
        </p>
        <p className="note" data-testid="app-version">
          バージョン {__APP_VERSION__}（ページを再読み込みすると最新版になります。ホーム画面のアプリは一度閉じて開き直してください）
        </p>
        <button className="icon-btn modal-close" aria-label="とじる" data-testid="settings-close" onClick={() => close(false)}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
