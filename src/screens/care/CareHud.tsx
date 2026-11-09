import { useEffect, useState } from 'react';
import { audio } from '../../audio/audio';
import { actors } from '../../creatures/Actor';
import { SPECIES } from '../../data/species';
import { stageOf, wantOf } from '../../sim/simulate';
import { useGame } from '../../state/game';
import { useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { Ruby } from '../../text/ruby';
import { speak } from '../../text/speech';
import { emitParticles } from '../../three/Particles';
import { CameraButton } from '../../ui/CameraButton';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/Icon';
import { SettingsGateButton } from '../../ui/ParentalGate';
import { ToolBar } from '../../ui/ToolBar';
import { MemoryCardModal } from '../zukan/MemoryCard';
import { WantBubble } from './WantBubble';


const TUTORIAL_TEXT = { 1: 'むしの ふきだしを みてね', 2: 'ひかっている どうぐを おしてね' } as const;

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

  // はじめての お手本：① 吹き出しを見てね → ② 光っている道具を押してね
  const tutorial = useUi((s) => s.tutorialStep);
  const setTutorial = useUi((s) => s.setTutorialStep);
  const hasTools = !!creature && stageOf(creature).tools.length > 0;
  const hasWant = !!creature && wantOf(creature) !== null;
  useEffect(() => {
    if (useSettings.getState().tutorialDone || !hasTools) return;
    let t2: number | undefined;
    const t1 = window.setTimeout(() => {
      if (hasWant) {
        setTutorial(1);
        speak(TUTORIAL_TEXT[1], true);
        t2 = window.setTimeout(() => {
          setTutorial(2);
          speak(TUTORIAL_TEXT[2], true);
        }, 3800);
      } else {
        setTutorial(2);
        speak(TUTORIAL_TEXT[2], true);
      }
    }, 900);
    return () => {
      window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
      setTutorial(0);
    };
  }, [creature?.id, hasTools]); // hasWant は 開始時だけ 見る

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
      {!creature.finished ? <WantBubble creature={creature} /> : null}
      <div className="hud-row top">
        <IconButton icon="home" label="むしにわに もどる" onPress={() => go('garden', null)} testId="back" />
        <span className="hud-spacer" />
        {!cine ? <CameraButton creature={creature} /> : null}
        <SettingsGateButton />
      </div>
      <div className="hud-row" style={{ marginTop: 8 }}>
        <div className="stage-chip" data-testid="stage-label">
          {sp.name}・<Ruby text={stage.label} />
        </div>
      </div>
      {cine ? <div className="banner">{cine.label}</div> : null}
      {!cine && tutorial ? (
        <div className="banner tip" data-testid="tutorial">
          {TUTORIAL_TEXT[tutorial]}
        </div>
      ) : null}
      <div className="hud-spacer" />
      {creature.finished ? (
        <button className="pill-btn center-bottom" onClick={sendOff} data-testid="farewell" aria-label="もりに かえす">
          <Icon name="release" />
          もりに かえす
        </button>
      ) : (
        <ToolBar creature={creature} want={wantOf(creature)} />
      )}
    </div>
  );
}
