import { useState } from 'react';
import { audio } from '../../audio/audio';
import { SPECIES } from '../../data/species';
import { partsFor } from '../../sim/simulate';
import { makeId } from '../../sim/simulate';
import { playEvents } from '../../state/events';
import { usePhotos } from '../../state/photos';
import { takeSnapshot } from '../../three/snapshot';
import { speak } from '../../text/speech';
import type { Creature } from '../../sim/types';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { Ruby } from '../../text/ruby';
import { Icon } from '../../ui/Icon';
import { IconButton } from '../../ui/IconButton';
import { explainPart } from './ObserveScene';

/** かんさつ しゃしん：パシャッと とって ずかんの アルバムに のこす（端末の 中だけ） */
function CameraButton({ creature }: { creature: Creature }) {
  const [flash, setFlash] = useState(0);
  const [thumb, setThumb] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="icon-btn camera-btn"
        aria-label="しゃしんを とる"
        data-testid="photo-btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          audio.play('shutter');
          setFlash((f) => f + 1);
          const sp = SPECIES[creature.species];
          const d = new Date();
          const url = await takeSnapshot({ caption: sp.name, date: `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` });
          setBusy(false);
          if (!url) {
            audio.play('nope');
            return;
          }
          usePhotos.getState().add({ id: makeId(Date.now()), url, species: creature.species, at: Date.now() });
          playEvents.emit('photo');
          speak('しゃしんを とったよ。ずかんの アルバムで みられるよ', true);
          setThumb(url);
          window.setTimeout(() => setThumb(null), 2200);
        }}
      >
        <Icon name="camera" />
      </button>
      {flash > 0 ? <div key={flash} className="photo-flash" aria-hidden /> : null}
      {thumb ? (
        <div className="photo-thumb" data-testid="photo-thumb" aria-hidden>
          <img src={thumb} alt="" />
        </div>
      ) : null}
    </>
  );
}

/** 部位の説明の吹き出し。小さい部位は下のボタンからも選べる */
export function ObserveHud() {
  const id = useUi((s) => s.selectedId);
  const part = useUi((s) => s.observedPart);
  const go = useUi((s) => s.go);
  const creature = useGame((s) => s.creatures.find((c) => c.id === id));
  if (!creature) return null;
  const parts = partsFor(creature);
  const info = parts.find((p) => p.id === part);
  return (
    <div className="hud" data-testid="observe-hud">
      <div className="hud-row top">
        <IconButton icon="back" label="もどる" onPress={() => go('care')} testId="observe-back" />
        <div className="stage-chip">
          <Ruby text="かんさつ" />
        </div>
        <span className="hud-spacer" />
        <CameraButton creature={creature} />
      </div>
      {info ? (
        <div className="bubble" data-testid="part-bubble">
          <strong>
            <Ruby text={info.label} />
          </strong>
          <p>
            <Ruby text={info.text} />
          </p>
        </div>
      ) : (
        <div className="bubble hint-bubble">
          <Ruby text="からだを タップしてみよう" />
        </div>
      )}
      <div className="hud-spacer" />
      <div className="part-chips">
        {parts.map((p) => (
          <button
            key={p.id}
            className={`part-chip${p.id === part ? ' on' : ''}`}
            onClick={() => explainPart(creature.id, p.id)}
            data-testid={`part-${p.id}`}
          >
            <Ruby text={p.label} />
          </button>
        ))}
      </div>
    </div>
  );
}
