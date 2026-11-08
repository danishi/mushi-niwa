import { useEffect, useState } from 'react';
import { audio } from '../../audio/audio';
import { actors } from '../../creatures/Actor';
import { SPECIES } from '../../data/species';
import { conditionOf, stageOf } from '../../sim/simulate';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { Ruby } from '../../text/ruby';
import { speak } from '../../text/speech';
import { emitParticles } from '../../three/Particles';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/Icon';
import { NeedsBar } from '../../ui/NeedsBar';
import { NightToggle } from '../../ui/NightToggle';
import { SettingsGateButton } from '../../ui/ParentalGate';
import { ToolBar } from '../../ui/ToolBar';
import { MemoryCardModal } from '../zukan/MemoryCard';

const FACE = { genki: '😊', futsuu: '🙂', genkiganai: '😢' } as const;
const FACE_TEXT = { genki: 'げんき！', futsuu: 'ふつう', genkiganai: 'げんきが ないみたい' } as const;

export function CareHud() {
  const id = useUi((s) => s.selectedId);
  const go = useUi((s) => s.go);
  const cine = useUi((s) => s.cinematic);
  const creature = useGame((s) => s.creatures.find((c) => c.id === id));
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!creature) return;
    audio.startBgm('day');
  }, [creature?.id]);

  if (memoryId) {
    return (
      <MemoryCardModal
        memoryId={memoryId}
        onClose={() => {
          setMemoryId(null);
          go('garden', null);
        }}
      />
    );
  }
  if (!creature) {
    return (
      <div className="hud">
        <div className="hud-row top">
          <IconButton icon="home" label="もどる" onPress={() => go('garden', null)} testId="back" />
        </div>
      </div>
    );
  }
  const sp = SPECIES[creature.species];
  const stage = stageOf(creature);
  const cond = conditionOf(creature);

  const sendOff = () => {
    if (leaving) return;
    setLeaving(true);
    audio.play('farewell');
    speak(`もりに かえそう。${sp.farewellText}`);
    const g = actors.get(creature.id)?.group;
    const p = g?.position;
    useUi.getState().setCinematic({
      kind: 'farewell',
      target: p ? [p.x, p.y, p.z] : [0, 1, 0],
      label: 'もりに かえそう',
      until: performance.now() + 3500,
    });
    for (let i = 0; i < 5; i++) {
      window.setTimeout(() => {
        const q = actors.get(creature.id)?.group?.position;
        if (q) emitParticles(i % 2 ? 'leaf' : 'sparkle', [q.x, q.y + 0.4, q.z], 16);
      }, i * 500);
    }
    window.setTimeout(() => {
      const memId = creature.id;
      useGame.getState().farewell(creature.id);
      useUi.getState().setCinematic(null);
      setLeaving(false);
      setMemoryId(memId);
    }, 3200);
  };

  return (
    <div className="hud" data-testid="care-hud">
      <div className="hud-row top">
        <IconButton icon="home" label="むしにわに もどる" onPress={() => go('garden', null)} testId="back" />
        <span className="hud-spacer" />
        <NightToggle />
        <IconButton icon="magnifier" label="かんさつ" onPress={() => go('observe')} testId="observe" />
        <SettingsGateButton />
      </div>
      <div className="hud-row" style={{ marginTop: 8 }}>
        <div className="stage-chip" data-testid="stage-label">
          {sp.name}・<Ruby text={stage.label} />
        </div>
      </div>
      <div className="hud-row" style={{ marginTop: 8 }}>
        <button className="cond-face" aria-label={FACE_TEXT[cond]} onClick={() => speak(FACE_TEXT[cond], true)} data-testid="condition">
          {FACE[cond]}
        </button>
        <NeedsBar creature={creature} />
      </div>
      {cine ? <div className="banner">{cine.label}</div> : null}
      <div className="hud-spacer" />
      {creature.finished ? (
        <button className="pill-btn center-bottom" onClick={sendOff} data-testid="farewell" aria-label="もりに かえす">
          <Icon name="release" />
          もりに かえす
        </button>
      ) : (
        <ToolBar creature={creature} />
      )}
    </div>
  );
}
