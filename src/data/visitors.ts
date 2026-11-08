/**
 * にわに ときどき 来る「おきゃくさん」。育てる ことは できないが、見つけて タップすると ずかんに のる。
 * 事実は docs/visitors-research.md の 出典つき 調査に もとづく。
 */
export type VisitorId = 'shiokara' | 'monshiro' | 'tonosama' | 'dangomushi' | 'aburazemi';

export interface VisitorDef {
  id: VisitorId;
  name: string;
  kana: string;
  scientific: string;
  /** どこに 来るか（air: 空中で ホバリング / ground: 草の上 / post: 棚の 柱に とまる） */
  where: 'air' | 'ground' | 'post';
  /** タップした ときの 反応 */
  react: 'fly' | 'hop' | 'curl';
  /** 豆知識（ルビ記法） */
  facts: string[];
  notInsect?: string;
  color: string;
  /** 3D の 大きさ（育てる 虫と 見た目の 大きさを そろえる） */
  scale: number;
  sources: string[];
}

export const VISITORS: Record<VisitorId, VisitorDef> = {
  shiokara: {
    id: 'shiokara',
    name: 'シオカラトンボ',
    kana: 'しおからとんぼ',
    scientific: 'Orthetrum albistylum speciosum',
    where: 'air',
    react: 'fly',
    facts: [
      'オスは おとなに なると、しおを ふいたように しろっぽく なるよ。めは みずいろだよ。メスは むぎわらいろで「ムギワラトンボ」とも よばれるよ',
      '{幼虫|ようちゅう}の ヤゴは、いけや たんぼの みずの なかで くらすよ',
    ],
    color: '#a9bcc6',
    scale: 1.4,
    sources: ['https://kotobank.jp/word/%E3%81%97%E3%81%8A%E3%81%8B%E3%82%89%E3%81%A8%E3%82%93%E3%81%BC-3153846', 'https://www.env.go.jp/content/900540369.pdf'],
  },
  monshiro: {
    id: 'monshiro',
    name: 'モンシロチョウ',
    kana: 'もんしろちょう',
    scientific: 'Pieris rapae',
    where: 'air',
    react: 'fly',
    facts: [
      '{幼虫|ようちゅう}は キャベツなど アブラナの なかまの はを たべる あおむしだよ',
      'まえの はねに くろい もんが ふたつ あるよ。それで「もんしろちょう」って いうんだよ',
    ],
    color: '#e9e6da',
    scale: 1.5,
    sources: ['https://kotobank.jp/word/%E7%B4%8B%E7%99%BD%E8%9D%B6', 'https://www.pref.shimane.lg.jp/industry/norin/gijutsu/nougyo_tech/byougaityuu/byougaityuu-index/kyabetu/ky-monshiro.html'],
  },
  tonosama: {
    id: 'tonosama',
    name: 'トノサマバッタ',
    kana: 'とのさまばった',
    scientific: 'Locusta migratoria',
    where: 'ground',
    react: 'hop',
    facts: ['ふとくて ながい うしろあしで ぴょーんと はねて、はねを ひろげて とおくまで とぶよ', 'みどりいろの こと ちゃいろの こが いるよ'],
    color: '#7b9442',
    scale: 1.6,
    sources: ['https://kotobank.jp/word/%E3%83%88%E3%83%8E%E3%82%B5%E3%83%9E%E3%83%90%E3%83%83%E3%82%BF-3160908', 'https://kotobank.jp/word/%E9%A3%9B%E8%9D%97'],
  },
  dangomushi: {
    id: 'dangomushi',
    name: 'オカダンゴムシ',
    kana: 'おかだんごむし',
    scientific: 'Armadillidium vulgare',
    where: 'ground',
    react: 'curl',
    facts: ['さわると くるんと まるく なるよ', 'あしは 14ほん あるよ。こんちゅうの あしは 6ぽんだから、かぞえて くらべて みてね'],
    notInsect: 'こんちゅうでは なくて、エビや カニの なかま（{甲殻類|こうかくるい}）だよ',
    color: '#6b6a66',
    scale: 2.2,
    sources: ['https://www.city.nagoya.jp/kenkofukushi/eisei/1015269/1034848/1015298/1034491/1015373.html', 'https://kotobank.jp/word/%E5%9B%A3%E5%AD%90%E8%99%AB'],
  },
  aburazemi: {
    id: 'aburazemi',
    name: 'アブラゼミ',
    kana: 'あぶらぜみ',
    scientific: 'Graptopsaltria nigrofuscata',
    where: 'post',
    react: 'fly',
    facts: [
      'はねが ちゃいろで、すけて いないよ。クマゼミの はねは すけて いるから、くらべて みてね',
      '{幼虫|ようちゅう}は つちの なかで なんねんも くらすよ',
      'なくのは オスだけ。「ジージリジリ」と なくよ',
    ],
    color: '#7a5130',
    scale: 1.7,
    sources: ['https://kotobank.jp/word/%E6%B2%B9%E8%9D%89', 'https://www.city.meguro.tokyo.jp/midori/kurashi/kankyou/semi.html'],
  },
};

export const VISITOR_ORDER: VisitorId[] = ['monshiro', 'shiokara', 'tonosama', 'dangomushi', 'aburazemi'];
