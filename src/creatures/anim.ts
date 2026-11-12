/** 虫 1 匹ぶんのアニメーション状態。毎フレーム Behavior が書き換え、パーツが読む */
export interface CreatureAnim {
  t: number;
  /** 0..1 のブレンド量 */
  walk: number;
  eat: number;
  sleep: number;
  flap: number;
  sing: number;
  spray: number;
  /** げんき度（動きの速さ・つや） 1 / 0.65 / 0.3 */
  energy: number;
  /** タップされたときの ぷにっと */
  bounce: number;
  /** 脱皮・羽化などのぶるぶる */
  shiver: number;
  /** 歩行の位相（距離に比例して進む） */
  gait: number;
  /* ── ひまな ときの しぐさ（`gestures.ts` が 書く。0..1、look だけ -1..1） ── */
  /** 前あしで 触角や 顔を 手入れする */
  groom: number;
  /** きょろきょろ 見回す（頭・前半身を 左右へ） */
  look: number;
  /** 背のび（前を 持ち上げる） */
  rear: number;
  /** 風に ゆれる 葉や 枝の まね（カマキリ・ナナフシ） */
  sway: number;
  /** はねを ひろげる（チョウの 日光浴、甲虫の はねのばし） */
  fan: number;
  /* ── 動きの 緩急と 反応（Actor が 書く） ── */
  /** 滑空：はばたきを 止めて はねを 浅い V 字に たもつ */
  glide: number;
  /** とびはねて 空中に いる（後ろあしを のばす） */
  jump: number;
  /** さわられた 直後の「びくっ」（身を ひくくして 触角を ひっこめる） */
  startle: number;
}

export function newAnim(): CreatureAnim {
  return {
    t: Math.random() * 10,
    walk: 0,
    eat: 0,
    sleep: 0,
    flap: 0,
    sing: 0,
    spray: 0,
    energy: 1,
    bounce: 0,
    shiver: 0,
    gait: 0,
    groom: 0,
    look: 0,
    rear: 0,
    sway: 0,
    fan: 0,
    glide: 0,
    jump: 0,
    startle: 0,
  };
}
