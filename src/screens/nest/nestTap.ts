import { audio } from '../../audio/audio';
import { BOUNDS, type BaitKind } from '../../sim/nest';
import { useNest } from '../../state/nest';
import { useNestView } from '../../state/nestView';
import { speak } from '../../text/speech';
import { emitParticles } from '../../three/Particles';
import { SURF_Z } from './NestAnts';

/** 画面に 出して 読み上げる */
export function sayNest(text: string) {
  useNestView.getState().say(text);
  speak(text, true);
}

export const FOOD_NAME: Record<BaitKind, string> = { sugar: 'あまい みつ', bug: 'ちいさな むし' };

/** えさを おく（地面の 上の x。ボタンからは 入口から はなれた 所） */
export function dropFood(kind: BaitKind, x?: number) {
  const n = useNest.getState().nest;
  const at = x ?? n.entranceX + (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 0.9);
  const bx = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, at));
  useNestView.getState().setFood(kind);
  const r = useNest.getState().placeBait(bx, kind);
  if (r === true) {
    audio.play('drop');
    emitParticles('sparkle', [bx, 0.15, SURF_Z - 0.1], 8);
    const phase = useNest.getState().nest.phase;
    if (phase === 'founding') sayNest('じょおうは そとに でないで、なにも たべずに こどもを そだてるよ。はたらきアリが うまれたら はこぶよ');
    else sayNest(kind === 'sugar' ? 'あまい みつを おいたよ。おとなの アリの ごはんだよ' : 'ちいさな むしを おいたよ。ようちゅうの ごはんだよ');
  } else if (r === 'full') {
    audio.play('nope');
    sayNest('えさは もう じゅうぶん あるよ。はこぶのを みていてね');
  } else {
    audio.play('nope');
    sayNest(n.phase === 'empty' ? 'さきに じょおうアリの すの ばしょを えらんでね' : 'じょおうアリが あなを ほっているよ。まってね');
  }
}

const DIG_REPLY = {
  phase: 'じょおうは へやに とじこもって こそだて ちゅう。はたらきアリが うまれたら ほれるよ',
  winter: 'ふゆは みんな すの おくで じっと しているよ。はるに なったら ほろう',
  busy: 'いま へやを ほっているよ。できるまで まってね',
  few: 'もっと なかまが ふえたら ほれるよ',
  max: 'もう じゅうぶん ひろい すに なったね',
  place: 'ほかの へやから すこし はなれた、ふかい ところを タップしてね',
} as const;

export const nestTap = {
  /** 地面の 上：巣の 場所を えらぶ／えさを おく */
  surface(x: number) {
    const n = useNest.getState().nest;
    if (n.phase === 'empty') {
      useNest.getState().chooseSite(x);
      audio.play('flap');
      sayNest('じょおうアリが おりてきたよ。はねを じぶんで おとして、ひとりで あなを ほるんだ');
      return;
    }
    dropFood(useNestView.getState().food, x);
  },
  /** 土の 中：へやを ほる 場所を えらぶ */
  ground(x: number, y: number) {
    const n = useNest.getState().nest;
    if (n.phase === 'empty') {
      audio.play('nope');
      sayNest('じめんの うえを タップして、すを つくる ばしょを えらんでね');
      return;
    }
    const r = useNest.getState().digAt({ x, y });
    if (r === true) {
      audio.play('scoop');
      sayNest('ここに へやを ほるよ。アリの すは ジグザグの みちに へやが ついて いるんだ');
    } else {
      audio.play('nope');
      sayNest(DIG_REPLY[r]);
    }
  },
};
