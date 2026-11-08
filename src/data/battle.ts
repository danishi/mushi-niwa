import type { SpeciesId } from '../sim/types';

/**
 * むしずもう（異種対戦ミニゲーム）のデータ。
 * 得意技は各種の「ほんとうの行動」から取り、技を出すと その事実を読み上げる。
 * ケガ・罰はなく、負けた虫も ころんと転ぶだけ。
 * 出典は docs/species-research.md（各種の行動の節）。
 */
export type SpecialEffect =
  /** 相手を大きく押し返す */
  | 'push'
  /** しばらく押されない（飛ぶ・死んだふり） */
  | 'guard'
  /** 相手がしばらく止まる（びっくり・聞き入る） */
  | 'stun';

export interface BattleDef {
  /** 押す強さ（CPU の押す速さ・プレイヤーの 1 タップの強さ） */
  power: number;
  special: {
    label: string;
    effect: SpecialEffect;
    strength: number;
    /** 効果の秒数（guard / stun） */
    seconds: number;
    /** 技を出したときに出す ほんとうの話（ルビ記法） */
    fact: string;
    sfx: 'bounce' | 'flap' | 'chirp' | 'puff' | 'whoosh';
  };
}

export const BATTLE: Record<SpeciesId, BattleDef> = {
  kabutomushi: {
    power: 1.25,
    special: {
      label: 'つので すくいあげ',
      effect: 'push',
      strength: 0.45,
      seconds: 0,
      fact: 'オスは つので あいてを すくいあげて、じゅえきの ばしょを とりあうよ',
      sfx: 'bounce',
    },
  },
  namiageha: {
    power: 0.8,
    special: {
      label: 'ひらひら とぶ',
      effect: 'guard',
      strength: 0,
      seconds: 2.5,
      fact: 'チョウは ひらひら とんで にげるよ',
      sfx: 'flap',
    },
  },
  suzumushi: {
    power: 0.9,
    special: {
      label: 'リーンと なく',
      effect: 'stun',
      strength: 0,
      seconds: 2.2,
      fact: 'オスは はねを こすりあわせて なくよ。メスは その こえを ききに くるんだ',
      sfx: 'chirp',
    },
  },
  nanahoshi: {
    power: 0.85,
    special: {
      label: 'しんだふり',
      effect: 'guard',
      strength: 0,
      seconds: 3,
      fact: 'あぶないと ころんと おちて しんだふりを するよ',
      sfx: 'whoosh',
    },
  },
  kaiko: {
    power: 0.75,
    special: {
      label: 'はねを ぶるぶる',
      effect: 'push',
      strength: 0.25,
      seconds: 0,
      fact: 'カイコの おとなは とべないけど、はねを ぶるぶる ふるわせて あるくよ',
      sfx: 'flap',
    },
  },
  miidera: {
    power: 1.0,
    special: {
      label: 'プッ！',
      effect: 'stun',
      strength: 0.2,
      seconds: 2.5,
      fact: 'おしりから あつい しるを「プッ」と ふきだして みを まもるよ。カマキリも にげだすんだ',
      sfx: 'puff',
    },
  },
};
