import { useEffect } from 'react';
import { audio } from '../../audio/audio';
import { BATTLE } from '../../data/battle';
import { SPECIES, SPECIES_ORDER } from '../../data/species';
import { BATTLE_SECONDS, beatPhase, canSpecial, fighting, timingOpen } from '../../sim/battle';
import { playEvents } from '../../state/events';
import { useBattle } from '../../state/battle';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { Ruby } from '../../text/ruby';
import { speak } from '../../text/speech';
import { Icon } from '../../ui/Icon';
import { IconButton } from '../../ui/IconButton';
import { SpeciesIcon } from '../../ui/SpeciesIcon';

const RESULT_TEXT = {
  win: 'かったね！ どっちも がんばったね',
  lose: 'まけちゃった。でも どっちも がんばったね',
  draw: 'ひきわけ！ どっちも がんばったね',
} as const;

/** あそびかた（はじめの 画面に 出す） */
const HOW_TO = 'わが ちぢんで ボタンに かさなったら おすと つよく おせるよ。ゲージが たまったら とくいわざ！ あいての わざが くる ときは ふんばろう';

function Select() {
  const met = useGame((s) => s.met);
  const begin = useBattle((b) => b.begin);
  const pool = met.length ? met : [];
  return (
    <div className="sheet" data-testid="battle-select">
      <h3>
        <Ruby text="むしずもう：どの むしで あそぶ？" />
      </h3>
      {pool.length === 0 ? (
        <p>
          <Ruby text="まずは むしにわで むしを そだててみよう" />
        </p>
      ) : (
        <div className="zukan-grid">
          {pool.map((id) => (
            <button
              key={id}
              className="zukan-item"
              style={{ ['--card' as string]: SPECIES[id].color }}
              aria-label={SPECIES[id].kana}
              data-testid={`battle-pick-${id}`}
              onClick={() => {
                audio.play('sparkle');
                speak(`${SPECIES[id].kana}で しょうぶ！`);
                begin(id, SPECIES_ORDER);
              }}
            >
              <SpeciesIcon id={id} />
              <span>{SPECIES[id].name}</span>
            </button>
          ))}
        </div>
      )}
      <p className="battle-howto">
        <Ruby text={HOW_TO} />
      </p>
      <p className="sci">
        <Ruby text="※ ほんとうは ちがう しゅるいの むしどうしは たたかわないよ。これは あそびの すもうだよ。けがは しないよ" />
      </p>
    </div>
  );
}

/** はっけよいの 間の ことば（入場 → にらみあい → はっけよい） */
function introText(intro: number): string | null {
  if (intro > 2.2) return null;
  if (intro > 0) return 'はっけよい…';
  return null;
}

function Fight() {
  const s = useBattle((b) => b.state)!;
  const fact = useBattle((b) => b.fact);
  const factAt = useBattle((b) => b.factAt);
  const callout = useBattle((b) => b.callout);
  const push = useBattle((b) => b.push);
  const special = useBattle((b) => b.special);
  const begin = useBattle((b) => b.begin);
  const reset = useBattle((b) => b.reset);
  // 技の「ほんとうの話」を読み上げる
  useEffect(() => {
    if (fact) speak(fact);
  }, [factAt]);
  useEffect(() => {
    if (!s.result) return;
    const name = s.result === 'draw' ? '' : `${SPECIES[s.result === 'win' ? s.player : s.cpu].kana}の かち！ `;
    speak(`${name}${RESULT_TEXT[s.result]}`);
    if (s.result === 'win') playEvents.emit('sumoWin');
  }, [s.result, s.player, s.cpu]);
  const sp = BATTLE[s.player].special;
  const pct = Math.round(((s.meter + 1) / 2) * 100);
  const left = Math.max(0, Math.ceil(BATTLE_SECONDS - s.time));
  const ready = canSpecial(s);
  const live = fighting(s);
  // タイミングの 輪：ちぢんで ボタンに かさなる ときが「いま！」
  const phase = beatPhase(s.time);
  // 0.68〜1.08 が「いま」。輪は 0.08 から ちぢみはじめ、0.95 で ぴったり、窓の おわり（0.08）まで かさなった まま
  const k = ((phase - 0.08 + 1) % 1) / 0.87;
  const ring = 1 + Math.max(0, 1 - k) * 0.9;
  // この 輪で まだ 取って いない ときだけ「いま！」と 光る
  const now = timingOpen(s);
  const tell = s.cpuTell > 0;
  const intro = introText(s.intro);
  return (
    <>
      <div className="battle-bar" aria-hidden>
        <div className="battle-side">
          <div className="battle-face">
            <SpeciesIcon id={s.player} />
          </div>
        </div>
        <div className="battle-meter">
          <div className="battle-fill" style={{ width: `${pct}%` }} />
          <div className="battle-mid" />
          <div className="battle-time">{live || s.result ? left : ''}</div>
        </div>
        <div className="battle-side">
          <div className={`battle-face${tell ? ' tell' : ''}`}>
            <SpeciesIcon id={s.cpu} />
          </div>
          {/* 相手の 技ゲージ（いっぱいに なると 技が くる） */}
          <div className="battle-cpu-gauge">
            <div style={{ width: `${Math.round((tell ? 1 : s.cpuCharge) * 100)}%` }} />
          </div>
        </div>
      </div>
      {intro ? (
        <div className="battle-callout tone-start intro" key="intro" data-testid="battle-intro">
          {intro}
        </div>
      ) : callout && performance.now() - callout.at < (callout.tone === 'end' ? 60000 : 1300) ? (
        <div className={`battle-callout tone-${callout.tone}`} key={callout.at} data-testid="battle-callout">
          <Ruby text={callout.text} />
        </div>
      ) : null}
      <div className="hud-spacer" />
      {/* 技の ほんとうの 話は ボタンの すぐ 上（まん中の 3D を かくさない） */}
      {fact && !s.result ? (
        <div className="bubble battle-fact" data-testid="battle-fact">
          <Ruby text={fact} />
        </div>
      ) : null}
      {s.result ? (
        <div className="sheet center-col" data-testid="battle-result">
          {fact ? (
            <p className="battle-result-fact" data-testid="battle-fact">
              <Ruby text={fact} />
            </p>
          ) : null}
          <h3>
            <Ruby text={RESULT_TEXT[s.result]} />
          </h3>
          <div className="battle-result-btns">
            <button
              className="pill-btn"
              onClick={() => {
                audio.play('pop');
                begin(s.player, SPECIES_ORDER);
              }}
              data-testid="battle-again"
            >
              <Icon name="check" />
              もういちど
            </button>
            <button
              className="pill-btn ghost"
              onClick={() => {
                audio.play('pop');
                reset();
              }}
              data-testid="battle-change"
            >
              <Icon name="bug" />
              むしを えらぶ
            </button>
          </div>
        </div>
      ) : (
        <div className={`battle-controls${live ? '' : ' waiting'}`}>
          <button
            className={`special-btn${ready ? ' ready' : ''}`}
            style={{ ['--charge' as string]: `${Math.round(s.playerCharge * 100)}%` }}
            disabled={!ready}
            onClick={() => special()}
            data-testid="battle-special"
          >
            <span className="special-gauge" aria-hidden />
            <Icon name="sparkle" />
            <Ruby text={sp.label} />
          </button>
          <button
            className={`push-btn${now && live ? ' now' : ''}${tell ? ' tell' : ''}`}
            onPointerDown={() => push()}
            data-testid="battle-push"
            aria-label="がんばれ"
          >
            {live ? <span className="beat-ring" aria-hidden style={{ transform: `translate(-50%, -50%) scale(${ring})` }} /> : null}
            <Icon name="paw" />
            {tell ? 'ふんばれ！' : 'がんばれ！'}
          </button>
        </div>
      )}
    </>
  );
}

export function BattleHud() {
  const go = useUi((s) => s.go);
  const active = useBattle((b) => b.state !== null);
  const reset = useBattle((b) => b.reset);
  useEffect(() => {
    audio.startBgm('title');
    return () => reset();
  }, [reset]);
  return (
    <div className="hud" data-testid="battle-hud">
      <div className="hud-row top">
        <IconButton icon="back" label="もどる" onPress={() => go('garden')} testId="battle-back" />
        <div className="stage-chip">むしずもう</div>
        <span className="hud-spacer" />
      </div>
      {active ? <Fight /> : (
        <>
          <div className="hud-spacer" />
          <Select />
        </>
      )}
    </div>
  );
}
