import { useEffect, useState } from 'react';
import { audio } from '../../audio/audio';
import { SEASON_LABEL, seasonAt, wantOf, type BaitKind, type NestEvent, type NestWant, type RoomUse } from '../../sim/nest';
import { nestEvents, useNest } from '../../state/nest';
import { useNestView } from '../../state/nestView';
import { useUi } from '../../state/ui';
import { Ruby } from '../../text/ruby';
import { speak } from '../../text/speech';
import { Icon, type IconName } from '../../ui/Icon';
import { IconButton } from '../../ui/IconButton';
import { ANT_NAME, clearSelection } from './NestAnts';
import { dropFood, FOOD_NAME, sayNest } from './nestTap';

/** いま してほしい ことの ひとこと */
const WANT_TEXT: Record<Exclude<NestWant, null>, string> = {
  site: 'じめんの うえを タップして、じょおうアリが すを つくる ばしょを えらんでね',
  wait: 'じょおうアリが はねを おとして、あなを ほっているよ',
  founding: 'じょおうアリが ひとりで こどもを そだてているよ。たまごを タップして てつだおう',
  groom: 'たまごや ようちゅうを タップすると、はやく そだつよ',
  bug: 'ようちゅうが むしを ほしがっているよ',
  sugar: 'あまい みつが あると、じょおうが たまごを うむよ',
  room: 'へやが いっぱい。つちの なかを タップして、あたらしい へやを ほろう',
  winter: 'ふゆは すの おくで じっと しているよ',
  flight: 'はねアリが とびたつよ！ タップして みおくろう',
};

/** タップで 順に 話す 豆知識（docs/ant-nest-research.md） */
const FACTS = [
  'じょおうアリは はねを じぶんで おとして、ひとりで あなを ほるよ',
  'じょおうは なにも たべずに、さいしょの こどもを そだてるんだ',
  'アリの すは ジグザグの みちに、へやが ついて いるよ',
  'おとなは あまい みつ、ようちゅうは むしを たべて おおきく なるよ',
  'アリは おなかの みつぶくろに ためて、なかまに くちうつしで わけるよ',
  'さなぎは まゆの なかで おとなに なるよ',
  'あたまの おおきな はたらきアリも いるよ',
  'はねアリが とびたつのは、あめあがりの はれた ひの ゆうがただよ',
];

const ROOM_TEXT: Record<RoomUse, string> = {
  queen: 'じょおうの へや',
  brood: 'こどもの へや',
  food: 'えさの へや',
  trash: 'ごみの へや',
  rest: 'やすむ へや',
};

const SEASON_TEXT = {
  natsu: 'なつに なったよ',
  aki: 'あきに なったよ',
  fuyu: 'ふゆに なったよ。みんな すの おくで じっと するよ',
  haru: 'はるに なったよ。また はたらきはじめるよ',
} as const;

const SEASON_ICON: Record<keyof typeof SEASON_TEXT, IconName> = { natsu: 'sun', aki: 'leaf', fuyu: 'moon', haru: 'flower' };

function eventText(e: NestEvent): string | null {
  switch (e.type) {
    case 'founded':
      return 'へやが できたよ。じょおうは いりぐちを ふさいで、たまごを うむよ';
    case 'born':
      if (e.first) return 'はじめての はたらきアリが うまれたよ！ これから えさを はこぶよ';
      return e.major ? 'あたまの おおきな はたらきアリが うまれたよ' : null;
    case 'room':
      return `${ROOM_TEXT[e.use]}が できたよ`;
    case 'alate':
      return 'はねアリが うまれたよ！ ほんとうは すが おおきく なるまで 4〜5ねん かかるんだ';
    case 'season':
      return SEASON_TEXT[e.season];
  }
}

const FOODS: Array<{ kind: BaitKind; icon: IconName }> = [
  { kind: 'sugar', icon: 'drop' },
  { kind: 'bug', icon: 'bug' },
];

/** アリの すづくりの 画面：えさの ボタン・季節・ひとこと・えらんだ アリの 説明 */
export function NestHud() {
  const go = useUi((s) => s.go);
  const nest = useNest((s) => s.nest);
  const info = useNestView((s) => s.info);
  const message = useNestView((s) => s.message);
  const [now, setNow] = useState(Date.now());
  const [fact, setFact] = useState(0);
  const want = wantOf(nest);
  const season = seasonAt(nest.t);
  const started = nest.phase !== 'empty';

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    useNestView.setState({ message: null });
    const w = wantOf(useNest.getState().nest);
    speak(w ? WANT_TEXT[w] : 'アリの すへ ようこそ', true);
    return nestEvents.on((e) => {
      const t = eventText(e);
      if (!t) return;
      if (e.type === 'born' || e.type === 'alate' || e.type === 'room') audio.play('sparkle');
      sayNest(t);
    });
  }, []);

  const showMessage = message && now - message.at < 7000;
  const text = showMessage ? message.text : want ? WANT_TEXT[want] : null;
  const canFood = started && nest.phase !== 'landing';

  return (
    <div className="hud nest-hud" data-testid="nest-hud">
      <div className="hud-row top">
        <IconButton
          icon="back"
          label="もどる"
          onPress={() => {
            clearSelection();
            go('garden');
          }}
          testId="nest-back"
        />
        {started ? null : <div className="stage-chip">アリの す</div>}
        <span className="hud-spacer" />
        {started ? (
          <>
            <div className="stage-chip nest-chip" data-testid="nest-season" aria-label={SEASON_LABEL[season]}>
              <Icon name={SEASON_ICON[season]} /> {SEASON_LABEL[season]}
            </div>
            <div className="stage-chip nest-chip" data-testid="nest-workers" aria-label={`はたらきアリ ${nest.workers}ひき`}>
              <Icon name="ant" /> {nest.workers}
            </div>
          </>
        ) : null}
      </div>
      {text ? (
        <button
          className={`bubble nest-bubble${want === 'flight' && !showMessage ? ' flight' : ''}`}
          data-testid="nest-message"
          onClick={() => {
            const f = FACTS[fact % FACTS.length]!;
            setFact((i) => i + 1);
            sayNest(f);
          }}
        >
          <Ruby text={text} />
        </button>
      ) : null}
      <div className="hud-spacer" />
      {info ? (
        <div className="sheet nest-info" data-testid="nest-ant-info">
          <div className="nest-info-row">
            <span className="nest-info-icon">
              <Icon name="ant" />
            </span>
            <p>
              <strong>{ANT_NAME[info.kind]}</strong>
              <br />
              <Ruby text={info.job} />
            </p>
            <IconButton icon="close" label="とじる" onPress={clearSelection} testId="nest-ant-close" />
          </div>
        </div>
      ) : null}
      {canFood ? (
        <div className="toolbar" data-testid="nest-toolbar">
          {FOODS.map((f) => (
            <button
              key={f.kind}
              className={`tool-btn${(want === 'bug' && f.kind === 'bug') || (want === 'sugar' && f.kind === 'sugar') ? ' want' : ''}`}
              aria-label={FOOD_NAME[f.kind]}
              data-testid={`nest-food-${f.kind}`}
              onClick={() => dropFood(f.kind)}
            >
              <Icon name={f.icon} />
              <span className="tool-name">{FOOD_NAME[f.kind]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
