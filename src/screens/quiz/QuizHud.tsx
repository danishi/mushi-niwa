import { useEffect } from 'react';
import { audio } from '../../audio/audio';
import { SPECIES } from '../../data/species';
import { QUIZ_LENGTH, type Choice } from '../../sim/quiz';
import { useGame } from '../../state/game';
import { useProgress } from '../../state/progress';
import { useQuiz } from '../../state/quiz';
import { useUi } from '../../state/ui';
import { Ruby, toPlain } from '../../text/ruby';
import { speak } from '../../text/speech';
import { Icon } from '../../ui/Icon';
import { IconButton } from '../../ui/IconButton';
import { SpeciesIcon } from '../../ui/SpeciesIcon';
import { FOOD_ICON, FOOD_LABEL } from '../../ui/ToolBar';

function choiceText(c: Choice): string {
  if (c.kind === 'species') return SPECIES[c.id].name;
  if (c.kind === 'food') return FOOD_LABEL[c.id];
  return `${c.n}ほん`;
}

function ChoiceFace({ c }: { c: Choice }) {
  if (c.kind === 'species') return <SpeciesIcon id={c.id} />;
  if (c.kind === 'food') return <Icon name={FOOD_ICON[c.id]} />;
  return <span className="quiz-number">{c.n}</span>;
}

/** むしクイズ：5 もん。まちがえても こたえを 教えて 次へ（罰なし） */
export function QuizHud() {
  const go = useUi((s) => s.go);
  const met = useGame((s) => s.met);
  const { questions, index, picked, correct, start, pick, next } = useQuiz();
  useEffect(() => {
    start(met);
    audio.startBgm('title');
  }, []); // 入ったときに 1 回だけ 問題を 作る
  const q = questions[index];
  useEffect(() => {
    if (q) speak(q.prompt, true);
  }, [q]);

  const finished = questions.length > 0 && index >= questions.length;
  useEffect(() => {
    if (!finished) return;
    if (correct === questions.length) useProgress.getState().bump('quizPerfect');
    audio.play(correct >= 3 ? 'grow' : 'sparkle');
    speak(`${correct}もん せいかい！ よく がんばったね`, true);
  }, [finished]);

  return (
    <div className="hud" data-testid="quiz-hud">
      <div className="hud-row top">
        <IconButton icon="back" label="もどる" onPress={() => go('garden')} testId="quiz-back" />
        <div className="stage-chip">むしクイズ</div>
        <span className="hud-spacer" />
        <div className="quiz-dots" aria-label={`${Math.min(index + 1, QUIZ_LENGTH)}もんめ`}>
          {questions.map((_, i) => (
            <span key={i} className={`quiz-dot${i < index ? ' done' : i === index ? ' now' : ''}`} />
          ))}
        </div>
      </div>
      {finished ? (
        <>
          <div className="hud-spacer" />
          <div className="sheet center-col" data-testid="quiz-result">
            <div className="quiz-stars" aria-hidden>
              {questions.map((_, i) => (
                <span key={i} className={i < correct ? 'on' : ''}>
                  <Icon name="star" />
                </span>
              ))}
            </div>
            <h3>
              {correct} / {questions.length} もん せいかい！
            </h3>
            <p>
              <Ruby text={correct === questions.length ? 'まんてん！ むし はかせだね' : 'よく がんばったね。ずかんで しらべてみよう'} />
            </p>
            <div className="hud-row center">
              <button
                className="pill-btn"
                data-testid="quiz-again"
                onClick={() => {
                  audio.play('pop');
                  start(useGame.getState().met);
                }}
              >
                <Icon name="play" /> もういちど
              </button>
              <IconButton icon="home" label="にわへ もどる" onPress={() => go('garden')} testId="quiz-home" />
            </div>
          </div>
        </>
      ) : q ? (
        <>
          <button className="bubble quiz-prompt" data-testid="quiz-prompt" onClick={() => speak(q.prompt, true)}>
            <strong>
              <Ruby text={q.prompt} />
            </strong>
          </button>
          <div className="hud-spacer" />
          <div className="sheet quiz-sheet">
            <div className="quiz-choices">
              {q.choices.map((c, i) => {
                const state = picked === null ? '' : i === q.answer ? ' right' : i === picked ? ' wrong' : ' dim';
                return (
                  <button
                    key={i}
                    className={`quiz-choice${state}`}
                    data-testid={`quiz-choice-${i}`}
                    data-answer={i === q.answer ? 'yes' : undefined}
                    aria-label={choiceText(c)}
                    onClick={() => {
                      if (picked !== null) return;
                      const ok = pick(i);
                      if (ok) {
                        audio.play('correct');
                        audio.play('sparkle');
                        useProgress.getState().bump('quizCorrect');
                        speak(`せいかい！ ${toPlain(q.explain)}`, true);
                      } else {
                        audio.play('nope');
                        speak(`こたえは ${choiceText(q.choices[q.answer]!)}。${toPlain(q.explain)}`, true);
                      }
                    }}
                  >
                    <ChoiceFace c={c} />
                    <span>{choiceText(c)}</span>
                    {picked !== null && i === q.answer ? (
                      <span className="quiz-mark">
                        <Icon name="check" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {picked !== null ? (
              <div className="quiz-explain" data-testid="quiz-explain">
                <p>
                  <strong>{picked === q.answer ? 'せいかい！' : 'おしい！'}</strong> <Ruby text={q.explain} />
                </p>
                <button
                  className="pill-btn"
                  data-testid="quiz-next"
                  onClick={() => {
                    audio.play('pop');
                    next();
                  }}
                >
                  {index + 1 >= questions.length ? 'けっか' : 'つぎ'} <Icon name="next" />
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
