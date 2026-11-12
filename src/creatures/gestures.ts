import type { CreatureAnim } from './anim';

/**
 * ひまな ときの しぐさ（純ロジック。three / React を 使わない）。
 * - groom: 前あしで 触角・顔の 手入れ（多くの 昆虫が する 身づくろい）
 * - look:  きょろきょろ 見回す（幼虫は 頭を ふって 足場を さがす）
 * - rear:  背のび（前を 持ち上げる）
 * - sway:  風に ゆれる まね（カマキリ・ナナフシ）
 * - fan:   はねを ひろげる（チョウの 日光浴、甲虫の はねのばし）
 */
export type Gesture = 'groom' | 'look' | 'rear' | 'sway' | 'fan';

/** しぐさの 長さ（秒）[最短, 最長] */
export const GESTURE_TIME: Record<Gesture, [number, number]> = {
  groom: [2.2, 4],
  look: [1.8, 3.2],
  rear: [1.6, 2.6],
  sway: [3, 5.5],
  fan: [3, 6],
};

/** 次の しぐさまでの 間（秒）[最短, 最長]。げんきが ないと 長くなる */
export const GESTURE_GAP: [number, number] = [1.2, 4.5];

const FADE = 0.4;

/** 0 → 1 → 0 の なめらかな 山（始まりと 終わりを FADE 秒で つなぐ） */
export function envelope(t: number, duration: number): number {
  if (t <= 0 || t >= duration) return 0;
  const fade = Math.min(FADE, duration / 2);
  const k = Math.min(1, t / fade, (duration - t) / fade);
  return k * k * (3 - 2 * k);
}

/** 次の しぐさを 選ぶ。同じ しぐさが 続かないように する（1 つしか ないときは それ） */
export function pickGesture(list: readonly Gesture[], last: Gesture | null, rnd: () => number = Math.random): Gesture | null {
  if (list.length === 0) return null;
  const pool = list.length > 1 ? list.filter((g) => g !== last) : list;
  return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))]!;
}

const between = ([a, b]: [number, number], r: number) => a + (b - a) * r;

/**
 * しぐさの 進行役。`update` を 毎フレーム 呼ぶと、anim の groom / look / rear / sway / fan を 書く。
 * `allowed` が false（歩いている・食べている・ねむっている）の 間は しぐさを やめて 0 へ もどす。
 */
export class GestureRunner {
  kind: Gesture | null = null;
  private t = 0;
  private duration = 0;
  private gap: number;
  private last: Gesture | null = null;
  private side = 1;

  constructor(private rnd: () => number = Math.random) {
    this.gap = between(GESTURE_GAP, rnd());
  }

  /** いまの しぐさを すぐ やめる（さわられた・歩きだした） */
  cancel() {
    if (this.kind) this.duration = Math.min(this.duration, this.t + FADE);
  }

  update(dt: number, a: CreatureAnim, list: readonly Gesture[], allowed: boolean) {
    if (!allowed) this.cancel();
    if (this.kind) {
      this.t += dt;
      if (this.t >= this.duration) {
        this.last = this.kind;
        this.kind = null;
        this.gap = between(GESTURE_GAP, this.rnd()) / Math.max(0.3, a.energy);
      }
    } else if (allowed && list.length > 0) {
      this.gap -= dt;
      if (this.gap <= 0) {
        this.kind = pickGesture(list, this.last, this.rnd);
        this.t = 0;
        this.duration = this.kind ? between(GESTURE_TIME[this.kind], this.rnd()) : 0;
        this.side = this.rnd() < 0.5 ? -1 : 1;
      }
    }
    const k = this.kind ? envelope(this.t, this.duration) : 0;
    const is = (g: Gesture) => (this.kind === g ? k : 0);
    a.groom = is('groom');
    a.rear = is('rear');
    a.sway = is('sway');
    a.fan = is('fan');
    // 見回す：片方へ 向いてから 反対へ（1 往復）
    a.look = this.kind === 'look' ? k * this.side * Math.sin((this.t / this.duration) * Math.PI * 2) : 0;
  }
}
