import { SPECIES, SPECIES_ORDER } from '../data/species';
import type { FoodId, SpeciesDef, SpeciesId } from './types';

/**
 * むしクイズ（純 TS）。問題は すべて 種の データから 作る（手書きの 問題文を ふやさない）。
 * まちがえても 罰は なく、こたえと 理由を 教えて 次へ すすむ。
 */
export type Choice =
  | { kind: 'species'; id: SpeciesId }
  | { kind: 'food'; id: FoodId }
  | { kind: 'number'; n: number };

export type QuestionKind = 'who' | 'food' | 'night' | 'notInsect' | 'legs';

export interface Question {
  kind: QuestionKind;
  /** 問題文（ルビ記法） */
  prompt: string;
  /** 3D で 見せる 虫（いれば） */
  subject?: { species: SpeciesId; stage: number };
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

/**
 * 1 回ぶんの 問題を 作る。met（出会った 虫）を 多めに 出すが、まだの 虫も 出る（ずかんへの 興味）。
 */
export function makeQuiz(rand: Rand, met: readonly SpeciesId[], n = QUIZ_LENGTH): Question[] {
  const pool = met.length >= 2 && rand() < 0.75 ? [...met] : [...SPECIES_ORDER];
  const makers: Array<() => Question | null> = [
    () => whoQuestion(rand, pool),
    () => foodQuestion(rand, pool),
    () => whoQuestion(rand, [...SPECIES_ORDER]),
    () => foodQuestion(rand, [...SPECIES_ORDER]),
    () => nightQuestion(rand),
    () => notInsectQuestion(rand),
    () => legsQuestion(rand),
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
