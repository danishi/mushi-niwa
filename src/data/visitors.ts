/**
 * にわに ときどき 来る「おきゃくさん」。育てる ことは できないが、見つけて タップすると ずかんに のる。
 * 事実は docs/visitors-research.md（-2・-3 も）の 出典つき 調査に もとづく。
 */
export type VisitorId =
  | 'shiokara'
  | 'monshiro'
  | 'tonosama'
  | 'dangomushi'
  | 'aburazemi'
  | 'akiakane'
  | 'kanabun'
  | 'kurooari'
  | 'shouryou'
  | 'hotaru'
  | 'enmakorogi'
  | 'jorougumo'
  | 'katatsumuri'
  | 'oniyanma'
  | 'hakiriari'
  | 'oosuzumebachi'
  | 'guntaiari'
  | 'hiari'
  | 'sashihariari';

export interface VisitorDef {
  id: VisitorId;
  name: string;
  kana: string;
  scientific: string;
  /** どこに 来るか（air: 空中で ホバリング / ground: 上の 段の 板の 上 / post: 棚の 奥の 板に とまる） */
  where: 'air' | 'ground' | 'post';
  /** タップした ときの 反応（fly: とんで いく / hop: はねて いく / walk: あるいて いく / curl: まるまる・ひっこむ / stay: そのまま じっと / warn: 大あごを ならして おどかしてから とんで いく） */
  react: 'fly' | 'hop' | 'walk' | 'curl' | 'stay' | 'warn';
  /** warn の ときの 音（オオスズメバチは 大あごの カチカチ、サシハリアリは おなかを こする キーキー、ヒアリは 針を 見せる シュッ） */
  warnSfx?: 'clack' | 'squeak' | 'whoosh';
  /** はねで とぶ（帰る ときに とんで いく） */
  flier: boolean;
  /** 来る 時間（夜は 暗いので night と any の 子だけ） */
  time: 'day' | 'night' | 'any';
  /** いる あいだ ときどき 鳴く */
  call?: 'cicada' | 'chirp';
  /** 豆知識（ルビ記法） */
  facts: string[];
  notInsect?: string;
  /** 日本には すんで いない 子の 説明（ずかんに 出す。ルビ記法） */
  abroad?: string;
  /** 大人向けの 注意（ずかんの「おとなの かたへ」に 出す） */
  caution?: string;
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
    flier: true,
    time: 'day',
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
    flier: true,
    time: 'day',
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
    flier: true,
    time: 'day',
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
    flier: false,
    time: 'any',
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
    flier: true,
    time: 'day',
    call: 'cicada',
    facts: [
      'はねが ちゃいろで、すけて いないよ。クマゼミの はねは すけて いるから、くらべて みてね',
      '{幼虫|ようちゅう}は つちの なかで なんねんも くらすよ',
      'なくのは オスだけ。「ジージリジリ」と なくよ',
    ],
    color: '#7a5130',
    scale: 1.7,
    sources: ['https://kotobank.jp/word/%E6%B2%B9%E8%9D%89', 'https://www.city.meguro.tokyo.jp/midori/kurashi/kankyou/semi.html'],
  },
  akiakane: {
    id: 'akiakane',
    name: 'アキアカネ',
    kana: 'あきあかね',
    scientific: 'Sympetrum frequens',
    where: 'air',
    react: 'fly',
    flier: true,
    time: 'day',
    facts: [
      'なつの あいだは すずしい やまで すごして、あきに さとへ おりてくるよ',
      'オスは おとなに なると、おなかが まっかに なるよ。むねの よこは あかく ならないよ',
      'たんぼで うまれた たまごの まま、ふゆを こすよ',
    ],
    color: '#c8321e',
    scale: 1.7,
    sources: [
      'https://kotobank.jp/word/%E3%81%82%E3%81%8D%E3%81%82%E3%81%8B%E3%81%AD-3140629',
      'https://kotobank.jp/word/%E3%81%AA%E3%81%A4%E3%81%82%E3%81%8B%E3%81%AD-3161934',
      'https://fncc.pref.fukui.lg.jp/wp-content/uploads/2019/09/2018akatonbo_kekka.pdf',
      'https://www.city.akita.lg.jp/kurashi/recycle/1006075/1045739.html',
    ],
  },
  kanabun: {
    id: 'kanabun',
    name: 'カナブン',
    kana: 'かなぶん',
    scientific: 'Pseudotorynorrhina japonica',
    where: 'post',
    react: 'fly',
    flier: true,
    time: 'day',
    facts: [
      '{木|き}の しる（じゅえき）や、じゅくした くだものに あつまるよ',
      'かたい はねは ほとんど ひらかずに、その したから はねを だして ブーンと とぶよ',
      'からだは どういろや みどりいろに ぴかぴか ひかるよ',
    ],
    color: '#6a6a2a',
    scale: 1.9,
    sources: ['https://kotobank.jp/word/%E3%81%8B%E3%81%AA%E3%81%B6%E3%82%93-3147522', 'https://kotobank.jp/word/%E3%81%AF%E3%81%AA%E3%82%80%E3%81%90%E3%82%8A-3163537'],
  },
  kurooari: {
    id: 'kurooari',
    name: 'クロオオアリ',
    kana: 'くろおおあり',
    scientific: 'Camponotus japonicus',
    where: 'ground',
    react: 'walk',
    flier: false,
    time: 'day',
    facts: [
      'つちの なかに ふかい すを つくって、みんなで くらしているよ',
      'アリも こんちゅう。からだは あたま・むね・はらの 3つ、あしは 6ぽんだよ',
      'アブラムシから あまい みつを もらうかわりに、テントウムシから まもってあげるよ',
    ],
    caution: '毒針はありませんが、つかまえるとかむことがあります。そっと観察しましょう。',
    color: '#2a2626',
    scale: 3.4,
    sources: [
      'https://kotobank.jp/word/%E3%81%8F%E3%82%8D%E3%81%8A%E3%81%8A%E3%81%82%E3%82%8A-3150287',
      'https://web.tohoku.ac.jp/garden/aobayama/102Camponotus.html',
      'https://chushikoku.env.go.jp/blog/2014/07/1276.html',
    ],
  },
  shouryou: {
    id: 'shouryou',
    name: 'ショウリョウバッタ',
    kana: 'しょうりょうばった',
    scientific: 'Acrida cinerea',
    where: 'ground',
    react: 'hop',
    flier: true,
    time: 'day',
    facts: [
      'オスは とぶときに はねを うちあわせて「キチキチ」と おとを だすよ',
      'メスは オスの 2ばいくらい おおきいよ',
      'あたまが ながい さんかくに つきでていて、からだが ほそながいよ',
    ],
    color: '#7aa848',
    scale: 2.2,
    sources: ['https://kotobank.jp/word/%E3%81%97%E3%82%88%E3%81%86%E3%82%8A%E3%82%88%E3%81%86%E3%81%B0%E3%81%A4%E3%81%9F-3154671'],
  },
  hotaru: {
    id: 'hotaru',
    name: 'ゲンジボタル',
    kana: 'げんじぼたる',
    scientific: 'Luciola cruciata',
    where: 'air',
    react: 'fly',
    flier: true,
    time: 'night',
    facts: [
      'おしりを ひからせて、なかまに あいずを おくるよ。オスは とびながら ひかって、メスは はっぱの うえで まっているよ',
      '{幼虫|ようちゅう}は きれいな かわの なかで、カワニナと いう まきがいを たべて そだつよ',
      'ひがしと にしで、ひかる はやさが ちがうと いわれているよ',
    ],
    caution: '実際には、きれいな川の近くでしか見られません。観察では捕まえず、懐中電灯を向けないようにしましょう。ほかの地域のホタルを移して放さないでください。',
    color: '#2a2a1a',
    scale: 3.4,
    sources: [
      'https://kotobank.jp/word/%E6%BA%90%E6%B0%8F%E8%9B%8D-492148',
      'https://www.town.tatsuno.lg.jp/gyosei/soshiki/sangyoshinkoka/kankosite/1/1208.html',
      'https://www.city.akita.lg.jp/kurashi/recycle/1006075/1006103.html',
      'https://hp.brs.nihon-u.ac.jp/~baehozen/imgs/theme/h26/1503yr/26_y01.pdf',
    ],
  },
  enmakorogi: {
    id: 'enmakorogi',
    name: 'エンマコオロギ',
    kana: 'えんまこおろぎ',
    scientific: 'Teleogryllus emma',
    where: 'ground',
    react: 'hop',
    flier: false,
    time: 'night',
    call: 'chirp',
    facts: [
      'オスだけが はねを こすりあわせて「コロコロリー」と なくよ。メスは なかないよ',
      'かおが えんまさまに にているから この なまえが ついたよ',
      'みみは まえあしに あるよ',
    ],
    color: '#3a2618',
    scale: 2.3,
    sources: [
      'https://kotobank.jp/word/%E3%81%88%E3%82%93%E3%81%BE%E3%81%93%E3%81%8A%E3%82%8D%E3%81%8E-3145792',
      'https://kotobank.jp/word/%E9%96%BB%E9%AD%94%E8%9F%8B%E8%9F%80-448217',
      'https://www.skr.mlit.go.jp/kagawa/river/tanken/no65/no65.htm',
      'https://biodiversity.pref.fukuoka.lg.jp/rdb/kids/detail/5/61',
    ],
  },
  jorougumo: {
    id: 'jorougumo',
    name: 'ジョロウグモ',
    kana: 'じょろうぐも',
    scientific: 'Trichonephila clavata',
    where: 'post',
    // 触ったときの 反応は 出典が ないので、じっと している だけに する
    react: 'stay',
    flier: false,
    time: 'any',
    facts: [
      'きんいろの いとで、おおきな あみを はるよ。よこから みると 3まいに かさなって みえるよ',
      'おおきいのは メス。ちいさい オスは メスの あみの すみっこで くらしているよ',
    ],
    notInsect: 'こんちゅうでは なくて クモの なかま。あしは 8ほん、からだは 2つに わかれているよ',
    caution: '人間には無害です。おなか側の赤い模様で毒グモのセアカゴケグモとまちがわれますが、黄色い横じまと高い位置の円い網で見分けられます。素手ではつかまないようにしましょう。旧学名は Nephila clavata です。',
    color: '#e6c53a',
    scale: 1.7,
    sources: [
      'https://kotobank.jp/word/%E3%81%98%E3%82%88%E3%82%8D%E3%81%86%E3%81%90%E3%82%82-3155775',
      'https://kotobank.jp/word/%E3%81%8F%E3%82%82-3149858',
      'https://wsc.nmbe.ch/species/22434',
      'https://www.city.honjo.lg.jp/kankyo_machizukuri/kankyo_petto/eko_kankyohozen/1413873489620.html',
      'https://biodiversity.pref.fukuoka.lg.jp/futsushu/picturebook/jyorougumo.html',
    ],
  },
  katatsumuri: {
    id: 'katatsumuri',
    name: 'カタツムリ',
    kana: 'かたつむり',
    scientific: 'Acusta despecta sieboldiana（ウスカワマイマイ）',
    where: 'ground',
    react: 'curl',
    flier: false,
    time: 'any',
    facts: [
      'ながい つのの さきに めが あるよ',
      'さわると からだを からの なかに ひっこめるよ。あめの ひは ひるまでも でてくるよ',
      'さむいときや かわいたときは、からの くちに まくを はって やすむよ',
    ],
    notInsect: 'こんちゅうでは なくて、かいの なかま。おなかの ひらたい「あし」で すべるように すすむよ',
    caution: '広東住血線虫という寄生虫がいることがあります。なるべく直接さわらず、さわったら必ず手をよく洗いましょう。',
    color: '#c9a565',
    scale: 2.9,
    sources: [
      'https://kotobank.jp/word/%E3%81%86%E3%81%99%E3%81%8B%E3%82%8F%E3%81%BE%E3%81%84%E3%81%BE%E3%81%84-3144288',
      'https://kotobank.jp/word/%E3%81%8B%E3%81%9F%E3%81%A4%E3%82%80%E3%82%8A-701463',
      'https://www.city.urasoe.lg.jp/sites/urasoe-envmap/daikouen/daikouen-kata.htm',
      'https://www.forth.go.jp/moreinfo/topics/name15.html',
    ],
  },
  oniyanma: {
    id: 'oniyanma',
    name: 'オニヤンマ',
    kana: 'おにやんま',
    scientific: 'Anotogaster sieboldii',
    where: 'air',
    react: 'fly',
    flier: true,
    time: 'day',
    facts: [
      'にほんで いちばん おおきな トンボだよ。くろい からだに きいろい しましまが あるよ',
      'みどりいろの おおきな めは、あたまの てっぺんで ちょこっとだけ くっついて いるよ',
      'オスは みちや ながれの うえを、いったり きたり して とぶよ',
    ],
    caution: '幼虫は、きれいな小さい流れの砂の中で数年かけて育ちます。成虫は捕まえずに観察しましょう。',
    color: '#e2c23a',
    scale: 2.0,
    sources: [
      'https://kotobank.jp/word/%E3%81%8A%E3%81%AB%E3%82%84%E3%82%93%E3%81%BE-3146475',
      'https://kotobank.jp/word/%E9%AC%BC%E8%9C%BB%E8%9C%93-453747',
      'https://www.honda.co.jp/outdoor/knowledge/adventure/picture-book/oniyanma/',
    ],
  },
  hakiriari: {
    id: 'hakiriari',
    name: 'ハキリアリ',
    kana: 'はきりあり',
    scientific: 'Atta sexdens',
    where: 'ground',
    react: 'walk',
    flier: false,
    time: 'day',
    facts: [
      'はっぱを きりとって、すに はこぶよ。でも はっぱは たべないで、はっぱの うえで キノコの なかまを そだてて、それを たべるんだよ',
      'きった はっぱを あたまの うえに かかげて はこぶから、「パラソルアリ」とも よばれるよ',
      'おなじ すに、ちいさい こから あたまの おおきい こまで、いろんな おおきさの はたらきアリが いるよ。おおきさで しごとが ちがうんだよ',
    ],
    abroad: 'ハキリアリは にほんには いないよ。うみの ずっと むこうの、みなみアメリカの あつい もりに すんで いるんだ。にほんでは、{動物園|どうぶつえん}で みられる ところが あるよ',
    caution:
      '中南米の熱帯にすむアリで、日本の野外にはいません。葉を切るため、逃げ出すと植物や農業に大きな影響を与えるおそれがあり、輸入・飼育には農林水産省の許可が必要です。国内で生きたハキリアリを展示しているのは多摩動物公園だけです（2025年現在、同園の発表による）。原産地では、大きな働きアリにかまれると強く痛むことがあります。',
    color: '#8c3b18',
    scale: 3.0,
    sources: [
      'https://www.tokyo-zoo.net/tama/encyclopedia/leaf-cutter-ant/index.html',
      'https://www.tokyo-zoo.net/topic/topics_detail?kind=news&inst=tama&link_num=28530',
      'https://kotobank.jp/word/%E3%81%AF%E3%81%8D%E3%82%8A%E3%81%82%E3%82%8A-3163272',
      'https://kotobank.jp/word/%E8%91%89%E5%88%87%E8%9F%BB-600009',
    ],
  },
  oosuzumebachi: {
    id: 'oosuzumebachi',
    name: 'オオスズメバチ',
    kana: 'おおすずめばち',
    scientific: 'Vespa mandarinia',
    where: 'post',
    react: 'warn',
    flier: true,
    time: 'day',
    facts: [
      'おおきな ハチを みつけたら、てで はらったり、はしったり しないで、ゆっくり そっと はなれようね',
      'あごを「カチカチ」と ならすのは、「こっちに こないで」の あいずだよ',
      'せかいで いちばん おおきな スズメバチだよ。つちの なかに おおきな すを つくるよ',
    ],
    caution:
      'とても強い毒をもつハチです。刺されると激しく痛み、体質によってはアナフィラキシー（じんましん、息苦しさ、めまいなど）で命にかかわることがあります。刺されたら流水で洗いながら毒をしぼり出して冷やし、医療機関を受診してください。息苦しさなど全身の症状が出たら、ためらわず119番で救急車を呼んでください。特に危ないのは巣が大きくなる9〜10月です。手で払ったり走ったりせず、ゆっくり離れましょう。黒い服や香水はハチを刺激します。巣を見つけても自分で壊さず、自治体の窓口や専門業者に相談してください。',
    color: '#e59b25',
    scale: 2.4,
    sources: [
      'https://kotobank.jp/word/%E3%81%99%E3%81%9A%E3%82%81%E3%81%B0%E3%81%A1-3156198',
      'https://www.pref.yamaguchi.lg.jp/uploaded/attachment/78222.pdf',
      'https://www.pref.toyama.jp/documents/25936/suzumebati.pdf',
      'https://www.city.chiba.jp/faq/hokenfukushi/iryoeisei/hokenjo/kankyo/986.html',
    ],
  },
  guntaiari: {
    id: 'guntaiari',
    name: 'グンタイアリ',
    kana: 'ぐんたいあり',
    scientific: 'Eciton burchellii',
    where: 'ground',
    react: 'walk',
    flier: false,
    time: 'day',
    facts: [
      'きまった すを つくらないで、なんじゅうまんびきも ぎょうれつに なって、かりを しながら いどうするよ',
      'とまる ときは、はたらきアリどうしが からだを つなぎあって、じょおうや ようちゅうを まもる「いきた す」を つくるよ',
      'あたまの おおきな へいたいアリは、かまの ような ながい おおあごを もって いるよ',
      'めは とても ちいさくて、においの みちしるべを たどって すすむよ',
    ],
    abroad: 'グンタイアリは にほんには いないよ。なかアメリカや みなみアメリカの あつい もりに すんで いるんだ',
    caution: '中南米の熱帯林にすむアリで、日本の野外にはいません。大あごが鋭く、かまれたときに無理に引き離すと皮膚が切れることがあります。',
    color: '#7a4a22',
    scale: 1.8,
    sources: [
      'https://kotobank.jp/word/%E8%BB%8D%E9%9A%8A%E8%9F%BB-685908',
      'https://kotobank.jp/word/%E3%81%95%E3%81%99%E3%82%89%E3%81%84%E3%81%82%E3%82%8A-3152940',
      'https://en.wikipedia.org/wiki/Eciton_burchellii',
    ],
  },
  hiari: {
    id: 'hiari',
    name: 'ヒアリ',
    kana: 'ひあり',
    scientific: 'Solenopsis invicta',
    where: 'ground',
    react: 'warn',
    warnSfx: 'whoosh',
    flier: false,
    time: 'day',
    facts: [
      'あかちゃいろの ちいさな アリを みつけたら、さわらないで おとなに しらせてね',
      'おしりに どくの はりが あって、さされると やけどの ように いたいよ',
      'もとは みなみアメリカの アリ。にもつに まぎれて、にほんの みなとで みつかる ことが あるよ',
      'ひろい くさちに、つちで ドームの ような アリづかを つくるよ',
    ],
    abroad: 'ヒアリは もともと にほんには いないよ。とおくの くにから、にもつに まぎれて やって くる ことが あるんだ',
    caution:
      '南米原産の特定外来生物（2022年に要緊急対処特定外来生物に指定）で、毒針で刺します。日本では港のコンテナなどで見つかっています。体長2.5〜6mmほどの赤茶色のアリで見分けが難しいため、疑わしいアリは素手でさわらず、環境省ヒアリ相談ダイヤル（0570-046-110）や市町村に連絡してください。生きたまま持ち運ぶことは法律で禁止されています。刺されたら20〜30分は安静にして様子を見て、じんましん・息苦しさ・激しい動悸・めまいなどが出たら、すぐに医療機関を受診してください。',
    color: '#a8461f',
    scale: 2.6,
    sources: [
      'https://kotobank.jp/word/%E7%81%AB%E8%9F%BB-1819936',
      'https://www.pref.ibaraki.jp/seikatsukankyo/shizen/tayousei/alien_species/fire_ants/fire_ants.html',
      'https://www.env.go.jp/nature/intro/2outline/attention/hiari.html',
      'https://www.env.go.jp/content/900509628.pdf',
    ],
  },
  sashihariari: {
    id: 'sashihariari',
    name: 'サシハリアリ',
    kana: 'さしはりあり',
    scientific: 'Paraponera clavata',
    where: 'post',
    react: 'warn',
    warnSfx: 'squeak',
    flier: false,
    time: 'any',
    facts: [
      'さされると とても いたい アリだよ。いたみが まるいちにち つづくから「24じかんアリ」とも よばれるよ。みつけても さわらないでね',
      'からだの ながさが 2〜3センチも ある、おおきな アリだよ',
      'すは きの ねもとに つくって、きに のぼって あまい しるや ちいさな むしを あつめるよ',
      'じゃまを されると、おなかを こすって キーキーと おとを たてるよ',
    ],
    abroad: 'サシハリアリは にほんには いないよ。なかアメリカや みなみアメリカの あつい もりに すんで いるんだ',
    caution:
      '中南米（ニカラグア〜パラグアイ）の熱帯雨林にすむアリで、日本にはいません。刺されたときの痛みは昆虫の中で最も強い部類とされ、痛みが長く続くことから「24時間アリ」と呼ばれます。巣に近づくと激しく守ります。旅行先などで見かけても、さわったり巣に近づいたりしないでください。',
    color: '#3a1a12',
    scale: 3.4,
    sources: [
      'https://ja.wikipedia.org/wiki/%E3%82%B5%E3%82%B7%E3%83%8F%E3%83%AA%E3%82%A2%E3%83%AA',
      'https://ticotimes.net/?p=166082',
      'https://dictionnaire-amoureux-des-fourmis.fr/UIEIS-IUSSI/IUSSI-Londres-1973/IUSSI-Londres-1973-Markl.pdf',
    ],
  },
};

export const VISITOR_ORDER: VisitorId[] = [
  'monshiro',
  'shiokara',
  'akiakane',
  'oniyanma',
  'tonosama',
  'shouryou',
  'aburazemi',
  'kanabun',
  'oosuzumebachi',
  'kurooari',
  'hiari',
  'hakiriari',
  'guntaiari',
  'sashihariari',
  'hotaru',
  'enmakorogi',
  'dangomushi',
  'jorougumo',
  'katatsumuri',
];

/** その 時間に 来られる おきゃくさん */
export function visitorsAt(night: boolean): VisitorId[] {
  return VISITOR_ORDER.filter((id) => (night ? VISITORS[id].time !== 'day' : VISITORS[id].time !== 'night'));
}
