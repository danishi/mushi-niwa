import { useEffect } from 'react';
import { audio } from '../../audio/audio';
import { BATTLE } from '../../data/battle';
import { SPECIES, SPECIES_ORDER } from '../../data/species';
import { BATTLE_SECONDS } from '../../sim/battle';
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
      <p className="sci">
        <Ruby text="※ ほんとうは ちがう しゅるいの むしどうしは たたかわないよ。これは あそびの すもうだよ。けがは しないよ" />
      </p>
    </div>
  );
}

function Fight() {
  const s = useBattle((b) => b.state)!;
  const fact = useBattle((b) => b.fact);
  const push = useBattle((b) => b.push);
  const special = useBattle((b) => b.special);
  const reset = useBattle((b) => b.reset);
  // 技の「ほんとうの話」を読み上げる
  useEffect(() => {
    if (fact) speak(fact);
  }, [fact]);
  useEffect(() => {
    if (s.result) speak(RESULT_TEXT[s.result]);
  }, [s.result]);
  const sp = BATTLE[s.player].special;
  const pct = Math.round(((s.meter + 1) / 2) * 100);
  const left = Math.max(0, Math.ceil(BATTLE_SECONDS - s.time));
  return (
    <>
      <div className="battle-bar" aria-hidden>
        <div className="battle-face">
          <SpeciesIcon id={s.player} />
        </div>
        <div className="battle-meter">
          <div className="battle-fill" style={{ width: `${pct}%` }} />
          <div className="battle-time">{left}</div>
        </div>
        <div className="battle-face">
          <SpeciesIcon id={s.cpu} />
        </div>
      </div>
      {fact ? (
        <div className="bubble" data-testid="battle-fact">
          <Ruby text={fact} />
        </div>
      ) : null}
      <div className="hud-spacer" />
      {s.result ? (
        <div className="sheet center-col" data-testid="battle-result">
          <h3>
            <Ruby text={RESULT_TEXT[s.result]} />
          </h3>
          <button
            className="pill-btn"
            onClick={() => {
              audio.play('pop');
              reset();
            }}
            data-testid="battle-again"
          >
            <Icon name="check" />
            もういちど
          </button>
        </div>
      ) : (
        <div className="battle-controls">
          <button
            className="special-btn"
            disabled={s.playerSpecialUsed}
            onClick={() => {
              special();
              speak(sp.label);
            }}
            data-testid="battle-special"
          >
            <Icon name="sparkle" />
            <Ruby text={sp.label} />
          </button>
          <button className="push-btn" onPointerDown={() => push()} data-testid="battle-push" aria-label="がんばれ">
            <Icon name="paw" />
            がんばれ！
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
