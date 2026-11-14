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
    sfx: 'bounce' | 'flap' | 'chirp' | 'puff' | 'whoosh' | 'drip';
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
  ookamakiri: {
    power: 1.15,
    special: {
      label: 'カマを ひろげる',
      effect: 'stun',
      strength: 0.15,
      seconds: 2.2,
      fact: 'カマキリは カマを ひろげて からだを そらし、あいてを おどかすよ',
      sfx: 'whoosh',
    },
  },
  tobizumukade: {
    power: 1.1,
    special: {
      label: 'うしろあしを もちあげる',
      effect: 'stun',
      strength: 0.15,
      seconds: 2.2,
      fact: 'オオムカデの なかまは いちばん うしろの ながい あしを もちあげて あいてを おどかすよ',
      sfx: 'whoosh',
    },
  },
  madarasasori: {
    power: 1.0,
    special: {
      label: 'ハサミと しっぽを ふりあげる',
      effect: 'stun',
      strength: 0.15,
      seconds: 2.4,
      fact: 'サソリは ハサミと しっぽを ふりあげて あいてを おどかすよ',
      sfx: 'whoosh',
    },
  },
  gomadara: {
    power: 1.05,
    special: {
      label: 'キィキィ なく',
      effect: 'stun',
      strength: 0.1,
      seconds: 2.0,
      fact: 'カミキリムシは むねを こすって キィキィ なき、あいてを びっくりさせるよ',
      sfx: 'chirp',
    },
  },
  ookuwagata: {
    power: 1.2,
    special: {
      label: '{大|おお}あご がっちり',
      effect: 'push',
      strength: 0.4,
      seconds: 0,
      fact: 'オスの 大あごは、メスや ごはんの ばしょを とりあう ケンカの どうぐだよ。がっちり はさんで ぐいぐい おすよ',
      sfx: 'bounce',
    },
  },
  nokogiri: {
    power: 1.15,
    special: {
      label: 'たちあがり {大|おお}あご',
      effect: 'push',
      strength: 0.4,
      seconds: 0,
      fact: 'ケンカの まえには 大あごを ひらいて、からだを ぐっと おこして かまえるよ',
      sfx: 'bounce',
    },
  },
  oomurasaki: {
    power: 0.85,
    special: {
      label: 'ちからづよく とぶ',
      effect: 'guard',
      strength: 0,
      seconds: 2.5,
      fact: 'おおきな はねで、ちからづよく とぶよ',
      sfx: 'flap',
    },
  },
  nanafushi: {
    power: 0.75,
    special: {
      label: 'かちこち えだ',
      effect: 'guard',
      strength: 0,
      seconds: 3,
      fact: 'びっくりすると、かちんと かたまって しんだ ふりを するよ。えだに なりきって じっと しているよ',
      sfx: 'whoosh',
    },
  },
  usubakagerou: {
    power: 0.8,
    special: {
      label: 'すなかけ ぴっ',
      effect: 'stun',
      strength: 0.1,
      seconds: 2.0,
      fact: 'ようちゅうの アリジゴクは、すなを ぴっと はねて、えものの あしもとを くずすよ',
      sfx: 'puff',
    },
  },
  gengorou: {
    power: 1.05,
    special: {
      label: 'オール キック',
      effect: 'push',
      strength: 0.35,
      seconds: 0,
      fact: 'けの はえた ひらたい うしろあしで みずを かいて、すばやく およぐよ',
      sfx: 'whoosh',
    },
  },
  marukubi: {
    power: 0.85,
    special: {
      label: 'しんだふり',
      effect: 'guard',
      strength: 0,
      seconds: 3,
      fact: 'つかまると しんだ ふりを して、あしの ふしから きいろい しるを だすよ',
      sfx: 'drip',
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
