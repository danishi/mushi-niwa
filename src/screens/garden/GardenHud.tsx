import { useEffect } from 'react';
import { audio } from '../../audio/audio';
import { SPECIES, SPECIES_ORDER } from '../../data/species';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { speak } from '../../text/speech';
import { Icon } from '../../ui/Icon';
import { SettingsGateButton } from '../../ui/ParentalGate';
import { SpeciesIcon } from '../../ui/SpeciesIcon';

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

export function GardenHud() {
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
      {count === 0 ? (
        <button className="hint center-bottom" onClick={() => speak('ケースを タップして むしを えらんでね', true)}>
          <Icon name="plus" /> ケースを タップしてね
        </button>
      ) : null}
      {picking !== null ? <SpeciesPicker slot={picking} onClose={() => setPicking(null)} /> : null}
    </div>
  );
}
