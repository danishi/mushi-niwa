import { SPECIES, SPECIES_ORDER } from '../data/species';
import { discoveryFact, VISITOR_ORDER, VISITORS, type VisitorId } from '../data/visitors';
import type { FoodId, SpeciesDef, SpeciesId } from './types';

/**
 * むしクイズ（純 TS）。問題は すべて 種の データから 作る（手書きの 問題文を ふやさない）。
 * まちがえても 罰は なく、こたえと 理由を 教えて 次へ すすむ。
 */
export type Choice =
  | { kind: 'species'; id: SpeciesId }
  | { kind: 'food'; id: FoodId }
  | { kind: 'visitor'; id: VisitorId }
  | { kind: 'number'; n: number };

export type QuestionKind =
  | 'who'
  | 'food'
  | 'night'
  | 'notInsect'
  | 'legs'
  | 'young'
  | 'noPupa'
  | 'water'
  | 'guest'
  | 'abroad'
  | 'safety';

export interface Question {
  kind: QuestionKind;
  /** 問題文（ルビ記法） */
  prompt: string;
  /** 3D で 見せる 虫（いれば） */
  subject?: { species: SpeciesId; stage: number };
  /** 3D で 見せる にわの おきゃくさん（いれば） */
  guest?: VisitorId;
  choices: Choice[];
  answer: number;
  /** こたえの あとに 出す 説明（ルビ記法） */
  explain: string;
}

export const QUIZ_LENGTH = 5;

type Rand = () => number;

function shuffle<T>(a: readonly T[], rand: Rand): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1)) % (i + 1);
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
}

function pickOne<T>(a: readonly T[], rand: Rand): T {
  return a[Math.floor(rand() * a.length) % a.length]!;
}

/** 答えを まぜた 3 択に して、答えの 位置を かえす */
function arrange(answer: Choice, others: Choice[], rand: Rand): { choices: Choice[]; answer: number } {
  const choices = shuffle([answer, ...others.slice(0, 2)], rand);
  return { choices, answer: choices.indexOf(answer) };
}

const adultIndex = (sp: SpeciesDef) => sp.stages.length - 1;

/** 見た目で 区別しやすい ごはんの 種類（アイコンが 同じに なる 葉っぱは 1 つに まとめる） */
export const FOOD_GROUP: Record<FoodId, string> = {
  mat: 'mat',
  jelly: 'jelly',
  citrusLeaf: 'leaf',
  mulberry: 'leaf',
  twig: 'leaf',
  nectar: 'nectar',
  eggplant: 'eggplant',
  aphid: 'aphid',
  smallInsect: 'smallInsect',
  wood: 'wood',
  enokiLeaf: 'leaf',
  sakuraLeaf: 'leaf',
  waterBug: 'smallInsect',
  fish: 'fish',
  dandelion: 'leaf',
  none: 'none',
};

/** ずかんの 説明に つかう その種の いちばん わかりやすい ごはん（成虫が 食べなければ 幼虫） */
export function signatureFood(sp: SpeciesDef): { food: FoodId; stage: number } | null {
  for (let i = sp.stages.length - 1; i >= 0; i--) {
    const f = sp.stages[i]!.food;
    if (f !== 'none') return { food: f, stage: i };
  }
  return null;
}

function whoQuestion(rand: Rand, pool: SpeciesId[]): Question {
  const id = pickOne(pool, rand);
  const sp = SPECIES[id];
  const others = shuffle(
    SPECIES_ORDER.filter((x) => x !== id),
    rand,
  ).map((x): Choice => ({ kind: 'species', id: x }));
  const a = arrange({ kind: 'species', id }, others, rand);
  return {
    kind: 'who',
    prompt: 'この むしは だれ？',
    subject: { species: id, stage: adultIndex(sp) },
    ...a,
    explain: `${sp.name}だよ。${sp.facts[0] ?? ''}`,
  };
}

function foodQuestion(rand: Rand, pool: SpeciesId[]): Question | null {
  const candidates = pool.filter((id) => signatureFood(SPECIES[id]));
  if (candidates.length === 0) return null;
  const id = pickOne(candidates, rand);
  const sp = SPECIES[id];
  const sig = signatureFood(sp)!;
  const st = sp.stages[sig.stage]!;
  const group = FOOD_GROUP[sig.food];
  // ほかの 選択肢は、見た目の ちがう ごはんで、しかも その 種が どの 段階でも 食べない もの
  const eaten = new Set(sp.stages.map((s) => FOOD_GROUP[s.food]));
  const seen = new Set<string>([group]);
  const others: Choice[] = [];
  for (const f of shuffle(Object.keys(FOOD_GROUP) as FoodId[], rand)) {
    const g = FOOD_GROUP[f];
    if (f === 'none' || seen.has(g) || eaten.has(g)) continue;
    seen.add(g);
    others.push({ kind: 'food', id: f });
  }
  const a = arrange({ kind: 'food', id: sig.food }, others, rand);
  const who = sig.stage === adultIndex(sp) ? sp.name : `${sp.name}の ${st.label}`;
  return {
    kind: 'food',
    prompt: `${who}の ごはんは どれ？`,
    subject: { species: id, stage: sig.stage },
    ...a,
    explain: `${who}は ${FOOD_WORD[sig.food]}を たべるよ`,
  };
}

/** ごはんの よびかた（説明文用。ひらがな中心） */
export const FOOD_WORD: Record<FoodId, string> = {
  mat: '{腐葉土|ふようど}や マット',
  jelly: 'じゅえきや ゼリー',
  citrusLeaf: 'ミカンや サンショウの は',
  nectar: 'はなの みつ',
  eggplant: 'ナスや キュウリ',
  aphid: 'アブラムシ',
  mulberry: 'クワの は',
  smallInsect: 'ちいさな むし',
  wood: 'きの なか',
  twig: 'わかい えだの かわ',
  enokiLeaf: 'エノキの は',
  sakuraLeaf: 'サクラや クヌギの は',
  waterBug: 'みずの なかの ちいさな いきもの',
  fish: 'しんだ さかなや にぼし',
  dandelion: 'タンポポなどの くさの は',
  none: '',
};

function nightQuestion(rand: Rand): Question | null {
  const night = SPECIES_ORDER.filter((id) => SPECIES[id].stages[adultIndex(SPECIES[id])]!.activity === 'night');
  const day = SPECIES_ORDER.filter((id) => SPECIES[id].stages[adultIndex(SPECIES[id])]!.activity === 'day');
  if (night.length === 0 || day.length < 2) return null;
  const id = pickOne(night, rand);
  const a = arrange(
    { kind: 'species', id },
    shuffle(day, rand).map((x): Choice => ({ kind: 'species', id: x })),
    rand,
  );
  return {
    kind: 'night',
    prompt: 'よるに げんきに うごく むしは どれ？',
    ...a,
    explain: `${SPECIES[id].name}は よるに うごくよ。ひるまは かくれて やすんでいるんだ`,
  };
}

function notInsectQuestion(rand: Rand): Question | null {
  const not = SPECIES_ORDER.filter((id) => SPECIES[id].notInsect);
  const insects = SPECIES_ORDER.filter((id) => !SPECIES[id].notInsect);
  if (not.length === 0 || insects.length < 2) return null;
  const id = pickOne(not, rand);
  const a = arrange(
    { kind: 'species', id },
    shuffle(insects, rand).map((x): Choice => ({ kind: 'species', id: x })),
    rand,
  );
  return {
    kind: 'notInsect',
    prompt: '{昆虫|こんちゅう}じゃ ない のは どれ？',
    ...a,
    explain: SPECIES[id].notInsect!,
  };
}

function legsQuestion(rand: Rand): Question {
  const a = arrange(
    { kind: 'number', n: 6 },
    shuffle([4, 8, 10], rand).map((n): Choice => ({ kind: 'number', n })),
    rand,
  );
  return {
    kind: 'legs',
    prompt: '{昆虫|こんちゅう}の あしは なんぼん？',
    subject: { species: 'kabutomushi', stage: adultIndex(SPECIES.kabutomushi) },
    ...a,
    explain: '{昆虫|こんちゅう}の あしは 6ぽん。むねから はえているよ',
  };
}

/** 幼虫が 白い イモムシ形で 見分けにくい 種（「おおきく なると だれ？」で いっしょに 出さない） */
const GRUBS: ReadonlySet<SpeciesId> = new Set<SpeciesId>(['kabutomushi', 'nokogiri', 'ookuwagata', 'gomadara']);

/** こどもの 段階（ようちゅう）の 番号。たまご・さなぎ・まゆは のぞく */
export function youngStage(sp: SpeciesDef): number | null {
  const i = sp.stages.findIndex((s) => s.id === 'larva' || s.id === 'nymph');
  return i >= 0 && i < adultIndex(sp) ? i : null;
}

/** さなぎ（まゆ）の 段階が ある */
const hasPupa = (sp: SpeciesDef) => sp.stages.some((s) => s.id === 'pupa' || s.id === 'cocoon');
/** どこかの 段階で 水の 中で くらす */
const aquatic = (sp: SpeciesDef) =>
  sp.habitat.substrate === 'water' || sp.stages.some((s) => s.habitat?.substrate === 'water');

/** ようちゅうを 見せて「おおきく なると だれ？」 */
function youngQuestion(rand: Rand, pool: SpeciesId[]): Question | null {
  const candidates = pool.filter((id) => youngStage(SPECIES[id]) !== null);
  if (candidates.length === 0) return null;
  const id = pickOne(candidates, rand);
  const sp = SPECIES[id];
  const stage = youngStage(sp)!;
  const others = shuffle(
    SPECIES_ORDER.filter((x) => x !== id && !(GRUBS.has(id) && GRUBS.has(x))),
    rand,
  ).map((x): Choice => ({ kind: 'species', id: x }));
  const a = arrange({ kind: 'species', id }, others, rand);
  const label = sp.stages[stage]!.label;
  const young = label === 'ようちゅう' ? `${sp.name}の ようちゅう` : `${label}（${sp.name}の ようちゅう）`;
  return {
    kind: 'young',
    prompt: 'この こは おおきく なると だれに なる？',
    subject: { species: id, stage },
    ...a,
    explain: `${young}だよ。おおきく なると ${sp.name}に なるんだ`,
  };
}

/** 「さなぎに ならない むしは どれ？」（不完全変態）。成虫だけを 育てる 種は データに 幼虫期が ないので 出さない */
function noPupaQuestion(rand: Rand): Question | null {
  const insects = SPECIES_ORDER.filter((id) => !SPECIES[id].notInsect && SPECIES[id].stages.length > 1);
  const right = insects.filter((id) => !hasPupa(SPECIES[id]));
  const wrong = insects.filter((id) => hasPupa(SPECIES[id]));
  if (right.length === 0 || wrong.length < 2) return null;
  const id = pickOne(right, rand);
  const a = arrange(
    { kind: 'species', id },
    shuffle(wrong, rand).map((x): Choice => ({ kind: 'species', id: x })),
    rand,
  );
  return {
    kind: 'noPupa',
    prompt: 'さなぎに ならない むしは どれ？',
    ...a,
    explain: `${SPECIES[id].name}は さなぎに ならないよ。かわを ぬぐ たびに おおきく なって、そのまま おとなに なるんだ`,
  };
}

/** 「みずの なかで くらす むしは どれ？」 */
function waterQuestion(rand: Rand): Question | null {
  const right = SPECIES_ORDER.filter((id) => aquatic(SPECIES[id]));
  const wrong = SPECIES_ORDER.filter((id) => !aquatic(SPECIES[id]));
  if (right.length === 0 || wrong.length < 2) return null;
  const id = pickOne(right, rand);
  const a = arrange(
    { kind: 'species', id },
    shuffle(wrong, rand).map((x): Choice => ({ kind: 'species', id: x })),
    rand,
  );
  return {
    kind: 'water',
    prompt: 'みずの なかで くらす むしは どれ？',
    ...a,
    explain: `${SPECIES[id].name}は みずの なかで くらすよ`,
  };
}

const visitorChoices = (ids: VisitorId[], rand: Rand) =>
  shuffle(ids, rand).map((x): Choice => ({ kind: 'visitor', id: x }));

/** にわの おきゃくさんを 見せて「だれ？」 */
function guestQuestion(rand: Rand, pool: VisitorId[]): Question {
  const id = pickOne(pool, rand);
  const v = VISITORS[id];
  const a = arrange({ kind: 'visitor', id }, visitorChoices(VISITOR_ORDER.filter((x) => x !== id), rand), rand);
  return {
    kind: 'guest',
    prompt: 'にわに きた この おきゃくさんは だれ？',
    guest: id,
    ...a,
    explain: `${v.name}だよ。${discoveryFact(v)}`,
  };
}

/** 「にほんに すんで いない のは どれ？」 */
function abroadQuestion(rand: Rand): Question | null {
  const right = VISITOR_ORDER.filter((id) => VISITORS[id].abroad);
  const wrong = VISITOR_ORDER.filter((id) => !VISITORS[id].abroad);
  if (right.length === 0 || wrong.length < 2) return null;
  const id = pickOne(right, rand);
  const a = arrange({ kind: 'visitor', id }, visitorChoices(wrong, rand), rand);
  return {
    kind: 'abroad',
    prompt: 'にほんには すんで いない のは どれ？',
    ...a,
    explain: VISITORS[id].abroad!,
  };
}

/**
 * 「みつけても さわっちゃ いけない のは どれ？」（安全学習）。
 * ほかの 選択肢は 日本に いる 危なく ない 子だけ（おどかす 子 `warn`・外国の 子は 入れない）。
 */
function safetyQuestion(rand: Rand): Question | null {
  const right = VISITOR_ORDER.filter((id) => VISITORS[id].safety);
  const wrong = VISITOR_ORDER.filter((id) => {
    const v = VISITORS[id];
    return !v.safety && v.react !== 'warn' && !v.abroad;
  });
  if (right.length === 0 || wrong.length < 2) return null;
  const id = pickOne(right, rand);
  const a = arrange({ kind: 'visitor', id }, visitorChoices(wrong, rand), rand);
  return {
    kind: 'safety',
    prompt: 'みつけても さわっちゃ いけない のは どれ？',
    ...a,
    explain: `${VISITORS[id].name}。${VISITORS[id].facts[0]!}`,
  };
}

/**
 * 1 回ぶんの 問題を 作る。met（出会った 虫）・guests（見つけた おきゃくさん）を 多めに 出すが、
 * まだの 子も 出る（ずかんへの 興味）。
 */
export function makeQuiz(
  rand: Rand,
  met: readonly SpeciesId[],
  n = QUIZ_LENGTH,
  guests: readonly VisitorId[] = [],
): Question[] {
  const pool = met.length >= 2 && rand() < 0.75 ? [...met] : [...SPECIES_ORDER];
  const guestPool = guests.length >= 2 && rand() < 0.75 ? [...guests] : [...VISITOR_ORDER];
  const makers: Array<() => Question | null> = [
    () => whoQuestion(rand, pool),
    () => foodQuestion(rand, pool),
    () => whoQuestion(rand, [...SPECIES_ORDER]),
    () => foodQuestion(rand, [...SPECIES_ORDER]),
    () => youngQuestion(rand, pool),
    () => youngQuestion(rand, [...SPECIES_ORDER]),
    () => guestQuestion(rand, guestPool),
    () => nightQuestion(rand),
    () => notInsectQuestion(rand),
    () => legsQuestion(rand),
    () => noPupaQuestion(rand),
    () => waterQuestion(rand),
    () => abroadQuestion(rand),
    () => safetyQuestion(rand),
  ];
  const out: Question[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    const q = pickOne(makers, rand)();
    if (!q) continue;
    // 同じ 問題（同じ 種類・同じ こたえ）は 1 回に 1 つ
    const key = `${q.kind}:${JSON.stringify(q.choices[q.answer])}`;
    if (used.has(key)) continue;
    used.add(key);
    out.push(q);
  }
  return out;
}

export function isCorrect(q: Question, pick: number): boolean {
  return pick === q.answer;
}
