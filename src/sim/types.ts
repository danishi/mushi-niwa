/**
 * ゲームロジックの型。React / three には依存しない。
 */

export type SpeciesId =
  | 'kabutomushi'
  | 'namiageha'
  | 'suzumushi'
  | 'nanahoshi'
  | 'kaiko'
  | 'miidera'
  | 'marukubi'
  | 'ookamakiri'
  | 'tobizumukade'
  | 'madarasasori'
  | 'gomadara'
  | 'ookuwagata'
  | 'nokogiri'
  | 'oomurasaki'
  | 'nanafushi'
  | 'usubakagerou'
  | 'gengorou';

export type NeedKey = 'hunger' | 'moisture' | 'clean' | 'mood';
/** 0..1。1 が「満たされている」 */
export type Needs = Record<NeedKey, number>;

export type Condition = 'genki' | 'futsuu' | 'genkiganai';

export type ToolId = 'mist' | 'food' | 'scoop' | 'house';

export type ActivityTime = 'night' | 'day' | 'both';

/** 成長段階に入るときの見せ場 */
export type GrowthEvent = 'hatch' | 'molt' | 'pupate' | 'cocoon' | 'eclose' | 'adult';

/** 一生を終えたときの送り出し方 */
export type FarewellKind = 'mori' | 'sora' | 'kusamura' | 'tamago';

export type FoodId =
  | 'mat' // 腐葉土・昆虫マット
  | 'jelly' // 昆虫ゼリー
  | 'citrusLeaf' // ミカン・サンショウなどの葉
  | 'nectar' // 花のみつ（アゲハ成虫）
  | 'eggplant' // ナス・キュウリ
  | 'aphid' // アブラムシ
  | 'mulberry' // クワの葉
  | 'smallInsect' // 小さな虫・ミミズなど
  | 'wood' // 木の中（カミキリムシの幼虫は 生きた木、クワガタの幼虫は くち木）
  | 'twig' // 若い枝（カミキリムシの成虫は 樹皮を かじる）
  | 'enokiLeaf' // エノキの葉（オオムラサキの幼虫）
  | 'sakuraLeaf' // サクラなどの葉（ナナフシモドキ）
  | 'waterBug' // 水の中の 小さな 生きもの（ゲンゴロウの幼虫）
  | 'fish' // にぼし・小魚（ゲンゴロウの成虫）
  | 'dandelion' // タンポポなどの草の葉（ツチハンミョウの成虫）
  | 'none';

export type SubstrateId = 'mat' | 'soil' | 'leafbed' | 'paper' | 'moistSoil' | 'wood' | 'sand' | 'water';

export type DecorId = 'log' | 'leaf' | 'branch' | 'stone' | 'bark' | 'flower' | 'potPlant' | 'mulberryTwig' | 'waterweed' | 'enokiTwig';

export interface ObservePart {
  /** モデル側の部位 ID（userData.part と一致させる） */
  id: string;
  label: string;
  text: string;
  /** 片方の性別にしかない部位 */
  sex?: 'male' | 'female';
}

export interface StageDef {
  id: string;
  /** ひらがな＋ルビ記法 */
  label: string;
  /** 通常モードでこの段階にかかる「遊び時間」（分） */
  playMinutes: number;
  /** 実際の期間（ずかんの解説用） */
  realDuration: string;
  /** src/creatures のモデル登録キー */
  model: string;
  food: FoodId;
  /** 1 分あたりの減り方（0 または未指定ならその段階では減らない） */
  decay: Partial<Record<NeedKey, number>>;
  tools: ToolId[];
  moves: boolean;
  activity: ActivityTime;
  /** この段階に入るときの演出 */
  enter?: GrowthEvent;
  /** 段階中の脱皮回数（幼虫の齢） */
  molts?: number;
  /** かんさつモードで説明する部位 */
  parts: ObservePart[];
  /** この段階で土の中にいる（カブトムシ幼虫・さなぎ） */
  underground?: boolean;
  /** すなに すりばちの わなを つくる（アリジゴク） */
  pit?: boolean;
  /** この段階だけ すみかが ちがう（ゲンゴロウの さなぎは 水から あがって 土の中） */
  habitat?: Partial<SpeciesDef['habitat']>;
}

export interface SpeciesDef {
  id: SpeciesId;
  /** 和名（カタカナ） */
  name: string;
  /** ひらがなのよびな（読み上げ・ルビ） */
  kana: string;
  scientific: string;
  /** 目・科（ルビ記法） */
  order: string;
  family: string;
  /** カードやアイコンのテーマ色 */
  color: string;
  stages: StageDef[];
  farewell: FarewellKind;
  /** 送り出しのことば */
  farewellText: string;
  habitat: {
    substrate: SubstrateId;
    decor: DecorId[];
    /** 土の厚さ（ケース高さに対する割合） */
    soilDepth: number;
  };
  /** オスだけ鳴く・角があるなど */
  dimorphism?: string;
  /** メスしか いない（ナナフシモドキは メスだけで ふえる） */
  femaleOnly?: boolean;
  /** ずかんの豆知識（ルビ記法） */
  facts: string[];
  /** 何度も さわると する いかく（安全学習。罰は ない） */
  threat?: { kind: 'spray' | 'display' | 'squeak' | 'ooze'; text: string };
  /** 昆虫では ない（ずかんで 教える） */
  notInsect?: string;
  /** 気をつけること（大人向け注意書きにも使う） */
  caution?: string;
  season: string;
  sources: string[];
}

export interface Creature {
  id: string;
  species: SpeciesId;
  /** 棚の位置 0..5 */
  slot: number;
  stage: number;
  /** 段階内の進み 0..1 */
  progress: number;
  needs: Needs;
  sex: 'male' | 'female';
  /** ケースに置いてあるごはんの量 0..1 */
  food: number;
  /** かくれが・とまりぎを置いたか */
  house: boolean;
  /** 段階内で済んだ脱皮回数 */
  moltsDone: number;
  careCount: number;
  bornAt: number;
  /** 一生を終えて送り出しを待っている */
  finished: boolean;
  stagesSeen: string[];
}

export interface Memory {
  id: string;
  species: SpeciesId;
  sex: 'male' | 'female';
  startedAt: number;
  endedAt: number;
  careCount: number;
  stagesSeen: string[];
  farewell: FarewellKind;
}

export interface GameState {
  version: number;
  creatures: Creature[];
  memories: Memory[];
  /** 出会った虫（ずかん） */
  met: SpeciesId[];
  /** 累計の遊び時間（秒）。昼夜サイクルの基準 */
  playSeconds: number;
  /** 最後に進めた実時刻（ms）。リアルタイムモードの追いつき計算用 */
  lastTickAt: number;
}

export type SimEvent =
  | { type: 'grow'; id: string; stage: number; event: GrowthEvent }
  | { type: 'molt'; id: string; count: number }
  | { type: 'finished'; id: string }
  | { type: 'condition'; id: string; from: Condition; to: Condition }
  | { type: 'ate'; id: string };
