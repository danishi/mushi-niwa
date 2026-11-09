import { useState } from 'react';
import { audio } from '../audio/audio';
import { SPECIES } from '../data/species';
import { makeId } from '../sim/simulate';
import type { Creature } from '../sim/types';
import { playEvents } from '../state/events';
import { usePhotos } from '../state/photos';
import { takeSnapshot } from '../three/snapshot';
import { speak } from '../text/speech';
import { Icon } from './Icon';

/** しゃしん：パシャッと とって ずかんの アルバムに のこす（端末の 中だけ）。お世話と かんさつの 両方に 置く */
export function CameraButton({ creature }: { creature: Creature }) {
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
