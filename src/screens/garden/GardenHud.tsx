import { useEffect, useState } from 'react';
import { audio } from '../../audio/audio';
import { SPECIES, SPECIES_ORDER } from '../../data/species';
import { MAX_SLOTS } from '../../sim/simulate';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { speak } from '../../text/speech';
import { Icon } from '../../ui/Icon';
import { SettingsGateButton } from '../../ui/ParentalGate';
import { SpeciesIcon } from '../../ui/SpeciesIcon';
import { Ruby } from '../../text/ruby';
import { MemoryCardModal } from '../zukan/MemoryCard';
import { VISITORS, type VisitorId } from '../../data/visitors';
import { VisitorIcon } from '../../ui/VisitorIcon';

/** おきゃくさんを 見つけた ときの カード（すこしで 消える。タップで もう いちど 読む） */
function DiscoveryCard() {
  const d = useUi((s) => s.discovery);
  const setD = useUi((s) => s.setDiscovery);
  useEffect(() => {
    if (!d) return;
    const t = window.setTimeout(() => setD(null), 6500);
    return () => window.clearTimeout(t);
  }, [d, setD]);
  if (!d) return null;
  const v = VISITORS[d.id as VisitorId];
  if (!v) return null;
  const fact = v.notInsect ?? v.facts[0]!;
  return (
    <button className="discovery" data-testid="discovery" onClick={() => speak(`${v.kana}。${fact}`, true)}>
      <span className="discovery-icon">
        <VisitorIcon id={v.id} />
      </span>
      <span className="discovery-text">
        <small>{d.first ? 'はじめて みつけた！' : 'みつけた！'}</small>
        <strong>{v.name}</strong>
        <span>
          <Ruby text={fact} />
        </span>
      </span>
    </button>
  );
}

function SpeciesPicker({ slot, onClose }: { slot: number; onClose: () => void }) {
  const adopt = useGame((s) => s.adopt);
  const go = useUi((s) => s.go);
  return (
    <div className="modal-backdrop" data-testid="species-picker" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal picker">
        <h2>どの むしを そだてる？</h2>
        <div className="picker-grid">
          {SPECIES_ORDER.map((id) => {
            const sp = SPECIES[id];
            return (
              <button
                key={id}
                className="picker-item"
                style={{ ['--card' as string]: sp.color }}
                aria-label={sp.kana}
                data-testid={`pick-${id}`}
                onClick={() => {
                  audio.play('sparkle');
                  speak(`${sp.kana}を そだてよう`);
                  adopt(id, slot);
                  onClose();
                  const c = useGame.getState().creatures.find((x) => x.slot === slot);
                  if (c) go('care', c.id);
                }}
              >
                <SpeciesIcon id={id} />
                <span>{sp.name}</span>
              </button>
            );
          })}
        </div>
        <button className="icon-btn modal-close" aria-label="とじる" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}

/**
 * 棚が いっぱいの ときの 入れかえ：どの子を もりに かえすか 選ぶ → 思い出カード → あいた ケースで 新しい 虫を 選ぶ
 */
function SwapPicker({ onClose }: { onClose: () => void }) {
  const creatures = useGame((s) => s.creatures);
  const setPicking = useUi((s) => s.setPickingSlot);
  const [memory, setMemory] = useState<{ id: string; slot: number } | null>(null);
  if (memory) {
    return (
      <MemoryCardModal
        memoryId={memory.id}
        onClose={() => {
          onClose();
          speak('どの むしを むかえる？', true);
          setPicking(memory.slot);
        }}
      />
    );
  }
  return (
    <div className="modal-backdrop" data-testid="swap-picker" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal picker">
        <h2>どの こを もりに かえす？</h2>
        <p className="sci">あたらしい むしを むかえるには、ケースを ひとつ あけてね。おもいでカードは ずかんに のこるよ</p>
        <div className="picker-grid">
          {[...creatures]
            .sort((a, b) => a.slot - b.slot)
            .map((c) => {
              const sp = SPECIES[c.species];
              const st = sp.stages[c.stage]!;
              return (
                <button
                  key={c.id}
                  className="picker-item"
                  style={{ ['--card' as string]: sp.color }}
                  aria-label={`${sp.kana}を もりに かえす`}
                  data-testid={`swap-${c.species}`}
                  onClick={() => {
                    audio.play('farewell');
                    speak(`${sp.kana}、もりに かえろうね。${sp.farewellText}`, true);
                    const slot = c.slot;
                    useGame.getState().farewell(c.id);
                    setMemory({ id: c.id, slot });
                  }}
                >
                  <SpeciesIcon id={c.species} />
                  <span>{sp.name}</span>
                  <span className="sci">
                    <Ruby text={st.label} />
                  </span>
                </button>
              );
            })}
        </div>
        <button className="icon-btn modal-close" aria-label="とじる" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}

export function GardenHud() {
  const [swapping, setSwapping] = useState(false);
  const picking = useUi((s) => s.pickingSlot);
  const setPicking = useUi((s) => s.setPickingSlot);
  const count = useGame((s) => s.creatures.length);
  useEffect(() => {
    audio.startBgm('day');
  }, []);
  return (
    <div className="hud" data-testid="garden-hud">
      <div className="hud-row top">
        <span className="hud-spacer" />
        <SettingsGateButton />
      </div>
      <div className="hud-spacer" />
      {count >= MAX_SLOTS ? (
        <button
          className="pill-btn center-bottom"
          data-testid="new-insect"
          aria-label="あたらしい むしを むかえる"
          onClick={() => {
            audio.play('pop');
            speak('ケースが いっぱい。どの こを もりに かえす？', true);
            setSwapping(true);
          }}
        >
          <Icon name="plus" />
          あたらしい むし
        </button>
      ) : null}
      <DiscoveryCard />
      {swapping ? <SwapPicker onClose={() => setSwapping(false)} /> : null}
      {count === 0 ? (
        <button className="hint center-bottom" onClick={() => speak('ケースを タップして むしを えらんでね', true)}>
          <Icon name="plus" /> ケースを タップしてね
        </button>
      ) : null}
      {picking !== null ? <SpeciesPicker slot={picking} onClose={() => setPicking(null)} /> : null}
    </div>
  );
}
