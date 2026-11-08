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
}

export function newAnim(): CreatureAnim {
  return { t: Math.random() * 10, walk: 0, eat: 0, sleep: 0, flap: 0, sing: 0, spray: 0, energy: 1, bounce: 0, shiver: 0, gait: 0 };
}
