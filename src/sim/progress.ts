/**
 * ごほうびシール・おきゃくさん・クイズ・しゃしんの 記録（純 TS）。
 * 罰は なく、できた ことが 増えていくだけ。
 */

export type StatKey =
  | 'care' // 道具で お世話した 回数
  | 'pet' // なでた 回数
  | 'grow' // 成長を 見た 回数
  | 'molt' // 脱皮を 見た 回数
  | 'adult' // 成虫に なった 回数
  | 'farewell' // 送り出した 回数
  | 'visitor' // おきゃくさんを 見つけた 回数
  | 'quizCorrect' // クイズの 正解数
  | 'quizPerfect' // クイズ まんてんの 回数
  | 'photo' // しゃしんを とった 回数
  | 'parts' // かんさつで 部位を 見た 回数
  | 'sumoWin' // むしずもうで 勝った 回数
  | 'threat' // いかくを 見た 回数
  | 'nightCare'; // 夜に お世話した 回数

/** 記録から 計算する 値（ゲーム本体の 状態を 見る） */
export type DerivedKey = 'met' | 'visitorKinds';

export interface StickerDef {
  id: string;
  /** ひらがな（ルビ記法可） */
  label: string;
  /** どう すると もらえるか（読み上げにも 使う） */
  how: string;
  need: { stat: StatKey | DerivedKey; n: number };
  /** シールの 絵（src/ui/Icon の名前） */
  icon: string;
  color: string;
}

export interface Progress {
  stats: Partial<Record<StatKey, number>>;
  /** もらった シール（もらった 順） */
  stickers: string[];
  /** 見つけた おきゃくさんの 種類 */
  visitors: string[];
}

export function newProgress(): Progress {
  return { stats: {}, stickers: [], visitors: [] };
}

export interface Derived {
  met: number;
}

export function valueOf(p: Progress, d: Derived, key: StatKey | DerivedKey): number {
  if (key === 'met') return d.met;
  if (key === 'visitorKinds') return p.visitors.length;
  return p.stats[key] ?? 0;
}

/** まだ もっていない シールの うち、条件を 満たした もの */
export function newlyEarned(p: Progress, d: Derived, defs: readonly StickerDef[]): string[] {
  return defs.filter((s) => !p.stickers.includes(s.id) && valueOf(p, d, s.need.stat) >= s.need.n).map((s) => s.id);
}

export function bump(p: Progress, key: StatKey, by = 1): Progress {
  return { ...p, stats: { ...p.stats, [key]: (p.stats[key] ?? 0) + by } };
}

export function addVisitor(p: Progress, id: string): Progress {
  const next = bump(p, 'visitor');
  return next.visitors.includes(id) ? next : { ...next, visitors: [...next.visitors, id] };
}

export function grant(p: Progress, ids: string[]): Progress {
  const add = ids.filter((id) => !p.stickers.includes(id));
  return add.length ? { ...p, stickers: [...p.stickers, ...add] } : p;
}

/** つぎに ねらえる シール（いちばん 近い もの）。シールちょうの 「つぎは これ」 に 出す */
export function nextGoal(p: Progress, d: Derived, defs: readonly StickerDef[]): { def: StickerDef; have: number } | null {
  let best: { def: StickerDef; have: number; ratio: number } | null = null;
  for (const s of defs) {
    if (p.stickers.includes(s.id)) continue;
    const have = valueOf(p, d, s.need.stat);
    const ratio = have / s.need.n;
    if (!best || ratio > best.ratio) best = { def: s, have, ratio };
  }
  return best ? { def: best.def, have: best.have } : null;
}
