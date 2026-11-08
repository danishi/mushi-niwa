import { useEffect, useState } from 'react';
import { VISITORS, VISITOR_ORDER, type VisitorId } from '../../data/visitors';
import { usePhotos, type Photo } from '../../state/photos';
import { useProgress } from '../../state/progress';
import type { ZukanTab } from '../../state/ui';
import { StickerBook } from '../../ui/Sticker';
import { VisitorIcon } from '../../ui/VisitorIcon';
import type { IconName } from '../../ui/Icon';
import { audio } from '../../audio/audio';
import { SPECIES, SPECIES_ORDER } from '../../data/species';
import { useGame } from '../../state/game';
import { useUi } from '../../state/ui';
import { Ruby, toPlain } from '../../text/ruby';
import { speak } from '../../text/speech';
import { Icon } from '../../ui/Icon';
import { IconButton } from '../../ui/IconButton';
import { SpeciesIcon } from '../../ui/SpeciesIcon';
import { MemoryCard } from './MemoryCard';

function SpeakBtn({ text }: { text: string }) {
  return (
    <button className="speak-btn" aria-label="よみあげ" onClick={() => speak(text, true)}>
      <Icon name="speaker" />
    </button>
  );
}

const TABS: Array<{ id: ZukanTab; icon: IconName; label: string }> = [
  { id: 'mushi', icon: 'book', label: 'むし' },
  { id: 'guest', icon: 'bug', label: 'おきゃくさん' },
  { id: 'sticker', icon: 'star', label: 'シール' },
  { id: 'photo', icon: 'camera', label: 'しゃしん' },
];

function Tabs() {
  const tab = useUi((s) => s.zukanTab);
  const set = useUi((s) => s.setZukanTab);
  return (
    <div className="zukan-tabs" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          className={`zukan-tab${tab === t.id ? ' on' : ''}`}
          data-testid={`tab-${t.id}`}
          onClick={() => {
            audio.play('tap');
            speak(t.label);
            set(t.id);
          }}
        >
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/** おきゃくさんの 一覧。見つけた 子だけ 名前と 豆知識が 見られる */
function GuestList() {
  const found = useProgress((s) => s.visitors);
  const [open, setOpen] = useState<VisitorId | null>(null);
  const v = open ? VISITORS[open] : null;
  return (
    <>
      <p className="sci">
        <Ruby text="にわに ときどき くる むしだよ。タップして みつけてね" />
      </p>
      <div className="zukan-grid" data-testid="guest-list">
        {VISITOR_ORDER.map((id) => {
          const seen = found.includes(id);
          const d = VISITORS[id];
          return (
            <button
              key={id}
              className={`zukan-item${seen ? '' : ' unseen'}`}
              style={{ ['--card' as string]: d.color }}
              aria-label={seen ? d.kana : 'まだ みつけていない むし'}
              data-testid={`guest-${id}`}
              onClick={() => {
                if (!seen) {
                  audio.play('nope');
                  speak('にわで みつけてね', true);
                  return;
                }
                audio.play('pop');
                speak(d.kana);
                setOpen(id);
              }}
            >
              <VisitorIcon id={id} silhouette={!seen} />
              <span>{seen ? d.name : '？？？'}</span>
            </button>
          );
        })}
      </div>
      {v ? (
        <div className="modal-backdrop" data-testid="guest-detail" onPointerDown={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal">
            <div className="guest-head">
              <span className="discovery-icon">
                <VisitorIcon id={v.id} />
              </span>
              <h2>{v.name}</h2>
            </div>
            <p className="sci">
              <i>{v.scientific}</i>
            </p>
            {v.notInsect ? (
              <p className="not-insect">
                <Ruby text={v.notInsect} />
              </p>
            ) : null}
            <ul className="facts">
              {v.facts.map((f) => (
                <li key={f}>
                  <SpeakBtn text={f} />
                  <span>
                    <Ruby text={f} />
                  </span>
                </li>
              ))}
            </ul>
            <details className="adult-note">
              <summary>おとなの かたへ（出典）</summary>
              <ul>
                {v.sources.map((u) => (
                  <li key={u}>{decodeURI(u)}</li>
                ))}
              </ul>
            </details>
            <button className="icon-btn modal-close" aria-label="とじる" onClick={() => setOpen(null)}>
              <Icon name="close" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** かんさつで とった しゃしん */
function Album() {
  const photos = usePhotos((s) => s.photos);
  const [open, setOpen] = useState<Photo | null>(null);
  if (photos.length === 0) {
    return (
      <p className="album-empty" data-testid="album-empty">
        <Icon name="camera" />
        <Ruby text="かんさつの がめんで カメラを おすと しゃしんが とれるよ" />
      </p>
    );
  }
  return (
    <>
      <div className="album-grid" data-testid="album">
        {photos.map((p) => (
          <button
            key={p.id}
            className="album-item"
            aria-label={`${SPECIES[p.species].kana}の しゃしん`}
            onClick={() => {
              audio.play('pop');
              speak(SPECIES[p.species].kana);
              setOpen(p);
            }}
          >
            <img src={p.url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {open ? (
        <div className="modal-backdrop" data-testid="photo-view" onPointerDown={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal center photo-modal">
            <img src={open.url} alt={SPECIES[open.species].name} />
            <button className="icon-btn modal-close" aria-label="とじる" onClick={() => setOpen(null)}>
              <Icon name="close" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** ずかん：出会った虫の 3D 標本・成長のようす・まめちしき・おもいでカード */
export function ZukanHud() {
  const go = useUi((s) => s.go);
  const z = useUi((s) => s.zukan);
  const setZukan = useUi((s) => s.setZukan);
  const met = useGame((s) => s.met);
  const memories = useGame((s) => s.memories);
  const tab = useUi((s) => s.zukanTab);
  useEffect(() => () => setZukan(null), [setZukan]);

  if (!z && tab !== 'mushi') {
    return (
      <div className="hud" data-testid="zukan-hud">
        <div className="hud-row top">
          <IconButton icon="back" label="もどる" onPress={() => go('garden')} testId="zukan-back" />
          <div className="stage-chip">ずかん</div>
          <span className="hud-spacer" />
        </div>
        <div className="hud-spacer" />
        <div className="sheet tall">
          <Tabs />
          {tab === 'guest' ? <GuestList /> : tab === 'sticker' ? <StickerBook /> : <Album />}
        </div>
      </div>
    );
  }

  if (!z) {
    return (
      <div className="hud" data-testid="zukan-hud">
        <div className="hud-row top">
          <IconButton icon="back" label="もどる" onPress={() => go('garden')} testId="zukan-back" />
          <div className="stage-chip">ずかん</div>
          <span className="hud-spacer" />
        </div>
        <div className="hud-spacer" />
        <div className="sheet">
          <Tabs />
          <div className="zukan-grid">
            {SPECIES_ORDER.map((id) => {
              const sp = SPECIES[id];
              const seen = met.includes(id);
              const count = memories.filter((m) => m.species === id).length;
              return (
                <button
                  key={id}
                  className={`zukan-item${seen ? '' : ' unseen'}`}
                  style={{ ['--card' as string]: sp.color }}
                  aria-label={seen ? sp.kana : 'まだ であっていない むし'}
                  data-testid={`zukan-${id}`}
                  onClick={() => {
                    if (!seen) {
                      audio.play('nope');
                      speak('まだ であっていないよ', true);
                      return;
                    }
                    audio.play('pop');
                    speak(sp.kana);
                    setZukan({ species: id, stage: sp.stages.length - 1 });
                  }}
                >
                  <SpeciesIcon id={id} silhouette={!seen} />
                  <span>{seen ? sp.name : '？？？'}</span>
                  {count > 0 ? <span className="badge">{count}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const sp = SPECIES[z.species];
  const st = sp.stages[z.stage]!;
  const mine = memories.filter((m) => m.species === z.species);
  return (
    <div className="hud" data-testid="zukan-detail">
      <div className="hud-row top">
        <IconButton icon="back" label="もどる" onPress={() => setZukan(null)} testId="zukan-detail-back" />
        <div className="stage-chip">{sp.name}</div>
        <span className="hud-spacer" />
      </div>
      <div className="hud-spacer" />
      <div className="sheet detail">
        <div className="stage-tabs">
          {sp.stages.map((s, i) => (
            <button
              key={s.id}
              className={`part-chip${i === z.stage ? ' on' : ''}`}
              onClick={() => {
                audio.play('tap');
                speak(s.label);
                setZukan({ species: z.species, stage: i });
              }}
            >
              <Ruby text={s.label} />
            </button>
          ))}
        </div>
        <p className="sci">
          <i>{sp.scientific}</i>　<Ruby text={sp.order} />・<Ruby text={sp.family} />
        </p>
        <p>
          <Ruby text={`${st.label}：${st.realDuration}`} />
        </p>
        <p>
          <Ruby text={sp.season} />
        </p>
        {sp.dimorphism ? <p>{sp.dimorphism}</p> : null}
        {sp.notInsect ? (
          <p className="not-insect" data-testid="not-insect">
            <Ruby text={sp.notInsect} />
          </p>
        ) : null}
        <h3>まめちしき</h3>
        <ul className="facts">
          {sp.facts.map((f) => (
            <li key={f}>
              <SpeakBtn text={f} />
              <span>
                <Ruby text={f} />
              </span>
            </li>
          ))}
        </ul>
        {mine.length > 0 ? (
          <>
            <h3>おもいでカード</h3>
            <div className="memory-row-list">
              {mine.map((m) => (
                <MemoryCard key={m.id} memory={m} />
              ))}
            </div>
          </>
        ) : null}
        <details className="adult-note">
          <summary>おとなの かたへ（出典・注意）</summary>
          {sp.caution ? <p>{sp.caution}</p> : null}
          <p>ゲームでは一生を終えた虫を「もりにかえす」と表現していますが、物語上の表現です。</p>
          <ul>
            {sp.sources.map((u) => (
              <li key={u}>{decodeURI(u)}</li>
            ))}
          </ul>
          <p className="sci">{toPlain(sp.scientific)}</p>
        </details>
      </div>
    </div>
  );
}
