import { useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/audio';
import { BATTLE } from '../../data/battle';
import { SPECIES, SPECIES_ORDER } from '../../data/species';
import { BATTLE_SECONDS, beatIndex, fighting, ringFill, tapMode, timingOpen } from '../../sim/battle';
import { playEvents } from '../../state/events';
import { useBattle } from '../../state/battle';
import { useGame } from '../../state/game';
import { useSettings } from '../../state/settings';
import type { SpeciesId } from '../../sim/types';
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

/**
 * あそびかた：文字は みじかく、うごく ボタンの みほんと 読み上げで つたえる。
 * はじめて あそぶ ときは 虫を えらんだ あとに 3 つの 説明（`HowToGuide`）を 見せ、さいごに 押しっぱなしを ためして もらう。
 * えらぶ 画面の みほん（`HowTo`）を タップすると、その 説明を もういちど 見られる。
 */
const HOW_TO = [
  { mode: 'push', label: 'ひかったら タッチ', text: 'まわりの ひかりが いっぱいに なって ひかったら タッチ！', say: 'まわりの ひかりが いっぱいに なって ひかったら タッチ！ つよく おせるよ' },
  { mode: 'special', label: 'きらきらは わざ', text: 'ボタンが きらきらに なったら タッチで とくいわざ！', say: 'ボタンが きらきらに なったら タッチ！ とくいわざが でるよ' },
  {
    mode: 'brace',
    label: 'あかは おしたまま',
    text: 'あかく なったら あいての わざが くるよ。ボタンを おしたまま ふんばろう！',
    say: 'ボタンが あかく なったら、あいての わざが くるよ。ゆびを はなさないで、おしたまま ふんばろう！ やってみてね',
  },
] as const;

/** 取組の 始めに 読む（どう 押すかを 声で） */
const START_SAY = 'ひかったら タッチ！';
/** 押しっぱなしの れんしゅう：この 秒数 押したままで できた */
const HOLD_PRACTICE_MS = 1000;

function HowTo({ onOpen }: { onOpen: (step: number) => void }) {
  return (
    <div className="battle-howto" data-testid="battle-howto">
      {HOW_TO.map((h, i) => (
        <button key={h.mode} className="howto-tile" onClick={() => onOpen(i)} aria-label={h.label}>
          <span className={`howto-btn mode-${h.mode}`} aria-hidden>
            <Icon name={h.mode === 'special' ? 'sparkle' : 'paw'} />
          </span>
          <Ruby text={h.label} />
        </button>
      ))}
    </div>
  );
}

/** はじめの 説明：1 つずつ うごく みほんを 見せて 読む。さいごは 赤い ボタンを 押したままに する れんしゅう */
function HowToGuide({ start, onDone }: { start: number; onDone: () => void }) {
  const [step, setStep] = useState(start);
  const [down, setDown] = useState(false);
  const [held, setHeld] = useState(false);
  const h = HOW_TO[step]!;
  const last = step === HOW_TO.length - 1;
  useEffect(() => {
    speak(h.say, true);
  }, [step, h.say]);
  // 押したまま 1 秒で「できた！」。指を はなしたら やりなおし
  useEffect(() => {
    if (!down || held) return;
    const id = window.setTimeout(() => {
      setHeld(true);
      audio.play('sparkle');
      speak('じょうず！ そうやって ふんばるよ', true);
    }, HOLD_PRACTICE_MS);
    const up = () => setDown(false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [down, held]);
  return (
    <div className="sheet center-col howto-guide" data-testid="battle-howto-guide">
      <div className="howto-dots" aria-hidden>
        {HOW_TO.map((_, i) => (
          <span key={i} className={i === step ? 'on' : ''} />
        ))}
      </div>
      <div className="howto-stage">
        {last ? (
          <button
            className={`tap-btn mode-brace demo${down ? ' holding' : ''}${held ? ' done' : ''}`}
            onPointerDown={() => {
              if (!held) setDown(true);
            }}
            onContextMenu={(e) => e.preventDefault()}
            data-testid="battle-howto-hold"
            aria-label="おしたまま"
          >
            <span className="tap-face">
              <Icon name={held ? 'check' : 'paw'} />
              <span className="tap-label">
                <Ruby text={held ? 'できた！' : down ? 'ぐぐっ…' : 'おしたまま'} />
              </span>
            </span>
            <span className="hold-meter" aria-hidden />
            {!down && !held ? (
              <span className="tap-hint hold" aria-hidden>
                <Icon name="tap" />
              </span>
            ) : null}
          </button>
        ) : (
          <span className={`tap-btn mode-${h.mode} demo`} aria-hidden>
            <span className="tap-ring" />
            <span className="tap-face">
              <Icon name={h.mode === 'special' ? 'sparkle' : 'paw'} />
            </span>
            <span className="tap-hint" >
              <Icon name="tap" />
            </span>
          </span>
        )}
      </div>
      <p className="howto-text" onClick={() => speak(h.say, true)}>
        <Ruby text={h.text} />
      </p>
      {!last ? (
        <button className="pill-btn" onClick={() => setStep(step + 1)} data-testid="battle-howto-next">
          <Icon name="next" />
          つぎ
        </button>
      ) : (
        <button className={`pill-btn${held ? '' : ' ghost'}`} disabled={!held} onClick={onDone} data-testid="battle-howto-start">
          <Icon name="check" />
          わかった！
        </button>
      )}
    </div>
  );
}

/**
 * 取組が 終わった あと しばらくは 結果の ボタンを 押せない（連打の いきおいで 次へ 進まない）。
 * 終わってから `minMs` たち、しかも 画面へ の タップが `quietMs` やんだら 押せる ように なる。
 */
function useSettledUnlock(key: string | null, minMs = 2000, quietMs = 700): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
    if (!key) return;
    const start = performance.now();
    let last = start;
    const onDown = () => {
      last = performance.now();
    };
    window.addEventListener('pointerdown', onDown, true);
    const id = window.setInterval(() => {
      const now = performance.now();
      if (now - start >= minMs && now - last >= quietMs) {
        setOpen(true);
        window.clearInterval(id);
      }
    }, 100);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pointerdown', onDown, true);
    };
  }, [key, minMs, quietMs]);
  return open;
}

function Select() {
  const met = useGame((s) => s.met);
  const begin = useBattle((b) => b.begin);
  const howtoDone = useSettings((s) => s.sumoHowtoDone);
  const setSettings = useSettings((s) => s.set);
  // はじめての ときは 虫を えらんだ あとに 説明。みほんを タップしても 見られる
  const [guide, setGuide] = useState<{ step: number; pick: SpeciesId | null } | null>(null);
  const pool = met.length ? met : [];
  if (guide) {
    return (
      <HowToGuide
        start={guide.step}
        onDone={() => {
          audio.play('pop');
          setSettings({ sumoHowtoDone: true });
          if (guide.pick) begin(guide.pick, SPECIES_ORDER);
          setGuide(null);
        }}
      />
    );
  }
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
                if (howtoDone) begin(id, SPECIES_ORDER);
                else setGuide({ step: 0, pick: id });
              }}
            >
              <SpeciesIcon id={id} />
              <span>{SPECIES[id].name}</span>
            </button>
          ))}
        </div>
      )}
      <HowTo onOpen={(step) => setGuide({ step, pick: null })} />
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
  const round = useBattle((b) => b.round);
  const tap = useBattle((b) => b.tap);
  const press = useBattle((b) => b.press);
  const begin = useBattle((b) => b.begin);
  const reset = useBattle((b) => b.reset);
  const mode = tapMode(s);
  const live = fighting(s);
  // 技の「ほんとうの話」を読み上げる
  useEffect(() => {
    if (fact) speak(fact);
  }, [factAt]);
  // 声の 案内：始まりに「ひかったら タッチ」、取組で はじめて きらきら・あかく なった ときに ひとこと
  const said = useRef({ round: -1, special: false, brace: false });
  useEffect(() => {
    const m = said.current;
    if (m.round !== round) {
      if (!live) return;
      said.current = { round, special: false, brace: false };
      speak(START_SAY);
      return;
    }
    // 技の 話を 読んで いる 最中は じゃま しない
    const busy = performance.now() - factAt < 4000;
    if (mode === 'special' && !m.special && !busy) {
      m.special = true;
      speak('きらきら！ タッチで わざ！');
    } else if (mode === 'brace' && !m.brace && !busy) {
      m.brace = true;
      speak('くるよ！ ボタンを おしたまま ふんばれ！');
    }
  }, [round, live, mode, factAt]);
  useEffect(() => {
    if (!s.result) return;
    const name = s.result === 'draw' ? '' : `${SPECIES[s.result === 'win' ? s.player : s.cpu].kana}の かち！ `;
    speak(`${name}${RESULT_TEXT[s.result]}`);
    if (s.result === 'win') playEvents.emit('sumoWin');
  }, [s.result, s.player, s.cpu]);
  // 指を はなしたら（ボタンの 外でも）押しっぱなしを おわる
  useEffect(() => {
    const up = () => press(false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
    };
  }, [press]);
  // 終わって すぐは 結果の ボタンを 押せない（連打が やむまで まつ）
  const unlocked = useSettledUnlock(s.result ? `${round}` : null);
  const sp = BATTLE[s.player].special;
  const pct = Math.round(((s.meter + 1) / 2) * 100);
  const left = Math.max(0, Math.ceil(BATTLE_SECONDS - s.time));
  // ボタンの まわりの 光：たまって いっぱいに なったら「いま！」
  // 赤い 間は 押したままに する ことだけ 伝える（光の 合図は 出さない）
  const fill = mode === 'push' ? ringFill(s.time) : 0;
  const now = mode === 'push' && timingOpen(s);
  // 「いま！」が 3 周 ちかく 取れて いない ときは ゆびで おしえる（取組の はじめも。できて いる 子には 出さない）。
  // 技の とき・赤くて まだ 押して いない ときも
  const hint = (now && beatIndex(s.time) - s.hitBeat > 2) || mode === 'special' || (mode === 'brace' && !s.pressing);
  const holding = mode === 'brace' && s.pressing;
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
        <div className={`sheet center-col battle-result${unlocked ? ' open' : ''}`} data-testid="battle-result">
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
              disabled={!unlocked}
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
              disabled={!unlocked}
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
          {/* ボタンは 1 つだけ。ふだんは 押す、きらきらは 得意技、あかは ふんばる */}
          <button
            className={`tap-btn mode-${mode}${now ? ' now' : ''}${holding ? ' holding' : ''}`}
            style={{ ['--fill' as string]: fill.toFixed(3), ['--charge' as string]: s.playerCharge.toFixed(3) }}
            onPointerDown={() => {
              tap();
              press(true);
            }}
            onContextMenu={(e) => e.preventDefault()}
            data-testid="battle-push"
            data-mode={mode}
            aria-label={mode === 'special' ? sp.label : mode === 'brace' ? 'おしたまま ふんばれ' : 'がんばれ'}
          >
            <span className="tap-ring" aria-hidden />
            <span className="tap-face">
              <Icon name={mode === 'special' ? 'sparkle' : 'paw'} />
              <span className="tap-label">
                <Ruby text={mode === 'special' ? sp.label : holding ? 'ぐぐっ！' : mode === 'brace' ? 'おしたまま！' : 'がんばれ！'} />
              </span>
            </span>
            {/* 技ゲージ：ボタンの 下から たまる */}
            <span className="tap-charge" aria-hidden />
            {hint ? (
              <span className={`tap-hint${mode === 'brace' ? ' hold' : ''}`} aria-hidden>
                <Icon name="tap" />
              </span>
            ) : null}
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
