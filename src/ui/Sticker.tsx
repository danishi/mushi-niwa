import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { audio } from '../audio/audio';
import { STICKERS } from '../data/stickers';
import { useGame } from '../state/game';
import { useProgress } from '../state/progress';
import { useQuiz } from '../state/quiz';
import { useUi } from '../state/ui';
import { Ruby } from '../text/ruby';
import { speak } from '../text/speech';
import { nextGoal } from '../sim/progress';
import { Icon, type IconName } from './Icon';

/** まるい シール 1 まい。もっていない ときは うすい「？」 */
export function StickerBadge({ id, owned, size = 88 }: { id: string; owned: boolean; size?: number }) {
  const def = STICKERS.find((s) => s.id === id);
  if (!def) return null;
  // シールらしく 少し かたむける（id から 決めて 毎回 同じに）
  const tilt = ((id.length * 37 + id.charCodeAt(0) * 13) % 17) - 8;
  return (
    <span
      className={`sticker${owned ? '' : ' locked'}`}
      style={{ ['--sticker' as string]: def.color, width: size, height: size, transform: `rotate(${owned ? tilt : 0}deg)` }}
      aria-hidden
    >
      <Icon name={def.icon as IconName} />
    </span>
  );
}

/** もらった ときの おしらせ（どの 画面でも 上に 出る） */
export function StickerToast() {
  const toast = useProgress((s) => s.toast);
  const shift = useProgress((s) => s.shiftToast);
  const screen = useUi((s) => s.screen);
  const gameReady = useGame((s) => s.hydrated);
  const progReady = useProgress((s) => s.hydrated);
  // 前の 版から 遊んでいる 子にも、これまでの ぶんを わたす
  useEffect(() => {
    if (gameReady && progReady && screen === 'garden') useProgress.getState().check();
  }, [gameReady, progReady, screen]);
  // クイズの 問題を かくさないよう、こたえ おわるまで 待つ
  const quizBusy = useQuiz((q) => screen === 'quiz' && q.index < q.questions.length);
  const current = screen === 'boot' || screen === 'title' || quizBusy ? undefined : toast[0];
  useEffect(() => {
    if (!current) return;
    const def = STICKERS.find((s) => s.id === current);
    audio.play('grow');
    if (def) speak(`シール ゲット！ ${def.label}`, true);
    const t = window.setTimeout(shift, 3200);
    return () => window.clearTimeout(t);
  }, [current, shift]);
  if (!current) return null;
  const def = STICKERS.find((s) => s.id === current);
  if (!def) return null;
  return (
    <button className="sticker-toast" data-testid="sticker-toast" onClick={shift} aria-label={`シール ゲット ${def.label}`}>
      <StickerBadge id={def.id} owned size={72} />
      <span className="sticker-toast-text">
        <small>シール ゲット！</small>
        <strong>
          <Ruby text={def.label} />
        </strong>
      </span>
    </button>
  );
}

/** シールちょう：もっている シールと、つぎに ねらえる シール */
export function StickerBook() {
  const owned = useProgress((s) => s.stickers);
  const progress = useProgress(useShallow((s) => ({ stats: s.stats, stickers: s.stickers, visitors: s.visitors })));
  const met = useGame((s) => s.met.length);
  const goal = nextGoal(progress, { met }, STICKERS);
  return (
    <div data-testid="sticker-book">
      <p className="sticker-count">
        <Icon name="star" /> {owned.length} / {STICKERS.length}
      </p>
      {goal ? (
        <button className="sticker-goal" onClick={() => speak(`つぎは、${goal.def.how}`, true)}>
          <span className="sci">つぎは これ</span>
          <Ruby text={goal.def.how} />
          <span className="sci">
            {Math.min(goal.have, goal.def.need.n)} / {goal.def.need.n}
          </span>
        </button>
      ) : null}
      <div className="sticker-grid">
        {STICKERS.map((s) => {
          const has = owned.includes(s.id);
          return (
            <button
              key={s.id}
              className="sticker-cell"
              data-testid={`sticker-${s.id}`}
              aria-label={has ? s.label : 'まだ もっていない シール'}
              onClick={() => {
                audio.play(has ? 'pop' : 'tap');
                speak(has ? s.label : `${s.how}と もらえるよ`, true);
              }}
            >
              <StickerBadge id={s.id} owned={has} />
              <span>{has ? <Ruby text={s.label} /> : '？'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
