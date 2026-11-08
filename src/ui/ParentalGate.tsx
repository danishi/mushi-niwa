import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { useUi } from '../state/ui';
import { Icon } from './Icon';

const HOLD_MS = 2500;
const KANJI = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/**
 * 歯車を 2.5 秒長押し → 漢数字の順番タップ、の 2 段階で大人だけが設定を開ける。
 * （短いタップでは何も起きず、長押しの進み具合だけがリングで見える）
 */
export function SettingsGateButton() {
  const [progress, setProgress] = useState(0);
  const [quiz, setQuiz] = useState(false);
  const start = useRef<number | null>(null);
  const raf = useRef(0);

  const stop = () => {
    start.current = null;
    cancelAnimationFrame(raf.current);
    setProgress(0);
  };

  const tick = () => {
    if (start.current === null) return;
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      stop();
      audio.play('pop');
      setQuiz(true);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const C = 2 * Math.PI * 46;
  return (
    <>
      <button
        className="icon-btn"
        aria-label="せってい（おとなのかたは ながおし）"
        data-testid="settings-gate"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          start.current = performance.now();
          raf.current = requestAnimationFrame(tick);
        }}
        onPointerUp={() => {
          // 画面の更新が遅い端末でも、離した時点で 長押しの長さを判定する
          const held = start.current !== null && performance.now() - start.current >= HOLD_MS;
          stop();
          if (held) {
            audio.play('pop');
            setQuiz(true);
          }
        }}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Icon name="gear" />
        <svg className="hold-ring" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" strokeDasharray={`${C * progress} ${C}`} />
        </svg>
      </button>
      {quiz ? <GateQuiz onClose={() => setQuiz(false)} /> : null}
    </>
  );
}

function GateQuiz({ onClose }: { onClose: () => void }) {
  const openSettings = useUi((s) => s.openSettings);
  const answer = useMemo(() => {
    const a: number[] = [];
    while (a.length < 3) {
      const n = 1 + Math.floor(Math.random() * 9);
      if (!a.includes(n)) a.push(n);
    }
    return a;
  }, []);
  const [input, setInput] = useState<number[]>([]);

  const press = (n: number) => {
    const next = [...input, n];
    if (answer[next.length - 1] !== n) {
      audio.play('nope');
      setInput([]);
      return;
    }
    audio.play('tap');
    if (next.length === answer.length) {
      onClose();
      openSettings(true);
      return;
    }
    setInput(next);
  };

  return (
    <div className="modal-backdrop" data-testid="gate-quiz" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal gate">
        <p className="gate-q">
          保護者の方へ：
          <br />
          <strong className="gate-kanji">{answer.map((n) => KANJI[n]).join('・')}</strong>
          <br />
          の順に数字を押してください
        </p>
        <div className="gate-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} className={`gate-key${input.includes(n) ? ' on' : ''}`} onClick={() => press(n)} data-testid={`gate-key-${n}`}>
              {n}
            </button>
          ))}
        </div>
        <button className="icon-btn modal-close" aria-label="とじる" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}

/** E2E テスト用：答えを読み取れるよう漢数字→数字の対応を公開 */
export const __KANJI_DIGITS = KANJI;
