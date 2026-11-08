import { SPECIES } from '../data/species';
import type {
  Condition,
  Creature,
  GameState,
  NeedKey,
  Needs,
  SimEvent,
  SpeciesId,
  StageDef,
  ToolId,
} from './types';

export const SAVE_VERSION = 1;
export const MAX_SLOTS = 6;
/** リアルタイムモードでは 1 遊び分 = 実時間 2 時間（一生がおよそ 4〜5 日） */
export const REALTIME_SCALE = 1 / 120;
/** 離れていた間の追いつきは最大 24 時間分まで */
export const MAX_CATCHUP_MS = 24 * 60 * 60 * 1000;
/** 昼夜サイクル（遊び時間で 1 日 = 8 分） */
export const DAY_SECONDS = 8 * 60;

const NEED_KEYS: NeedKey[] = ['hunger', 'moisture', 'clean', 'mood'];

export function newGame(now: number): GameState {
  return { version: SAVE_VERSION, creatures: [], memories: [], met: [], playSeconds: 0, lastTickAt: now };
}

export function stageOf(c: Creature): StageDef {
  const sp = SPECIES[c.species];
  return sp.stages[Math.min(c.stage, sp.stages.length - 1)]!;
}

export function isFinalStage(c: Creature): boolean {
  return c.stage >= SPECIES[c.species].stages.length - 1;
}

/** その段階で気にする（減る）パラメータだけを見る */
export function relevantNeeds(stage: StageDef): NeedKey[] {
  return NEED_KEYS.filter((k) => (stage.decay[k] ?? 0) > 0);
}

export function conditionOf(c: Creature): Condition {
  const keys = relevantNeeds(stageOf(c));
  if (keys.length === 0) return 'genki';
  const min = Math.min(...keys.map((k) => c.needs[k]));
  if (min < 0.2) return 'genkiganai';
  if (min < 0.5) return 'futsuu';
  return 'genki';
}

/** げんき度による成長の速さ。げんきがない間は成長が止まるだけ（死なない） */
export function growthFactor(cond: Condition): number {
  return cond === 'genki' ? 1 : cond === 'futsuu' ? 0.6 : 0;
}

let idCounter = 0;
export function makeId(now: number): string {
  idCounter = (idCounter + 1) % 1e6;
  return `${now.toString(36)}-${idCounter.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function fullNeeds(): Needs {
  return { hunger: 1, moisture: 1, clean: 1, mood: 0.8 };
}

export function adopt(state: GameState, species: SpeciesId, slot: number, now: number, rand = Math.random): GameState {
  if (slot < 0 || slot >= MAX_SLOTS || state.creatures.some((c) => c.slot === slot)) return state;
  const c: Creature = {
    id: makeId(now),
    species,
    slot,
    stage: 0,
    progress: 0,
    needs: fullNeeds(),
    sex: rand() < 0.5 ? 'male' : 'female',
    food: 0,
    house: false,
    moltsDone: 0,
    careCount: 0,
    bornAt: now,
    finished: false,
    stagesSeen: [SPECIES[species].stages[0]!.id],
  };
  return {
    ...state,
    creatures: [...state.creatures, c],
    met: state.met.includes(species) ? state.met : [...state.met, species],
  };
}

export function canUseTool(c: Creature, tool: ToolId): boolean {
  if (c.finished) return false;
  return stageOf(c).tools.includes(tool);
}

export interface ToolResult {
  state: GameState;
  ok: boolean;
}

/**
 * 道具を使う。amount は霧吹き・スコップを「なぞっている間」少しずつ効かせるための量。
 */
export function useTool(state: GameState, id: string, tool: ToolId, amount = 1): ToolResult {
  const c = state.creatures.find((x) => x.id === id);
  if (!c || !canUseTool(c, tool)) return { state, ok: false };
  const needs = { ...c.needs };
  let food = c.food;
  let house = c.house;
  switch (tool) {
    case 'mist':
      needs.moisture = clamp01(needs.moisture + 0.18 * amount);
      break;
    case 'scoop':
      needs.clean = clamp01(needs.clean + 0.2 * amount);
      break;
    case 'food':
      food = 1;
      break;
    case 'house':
      if (!house) needs.mood = clamp01(needs.mood + 0.3);
      house = true;
      break;
  }
  const next: Creature = { ...c, needs, food, house, careCount: c.careCount + 1 };
  return { state: replace(state, next), ok: true };
}

/** やさしく なでた・声をかけた。ごきげんが少しあがる */
export function pet(state: GameState, id: string): GameState {
  const c = state.creatures.find((x) => x.id === id);
  if (!c || c.finished) return state;
  return replace(state, { ...c, needs: { ...c.needs, mood: clamp01(c.needs.mood + 0.06) } });
}

export function isNight(playSeconds: number): boolean {
  const phase = (playSeconds % DAY_SECONDS) / DAY_SECONDS;
  return phase >= 0.62;
}

/** 0..1 の時刻（0=朝）。リアルタイムモードでは端末の時計に合わせる */
export function dayPhase(playSeconds: number, realtime: boolean, now: number): number {
  if (realtime) {
    const d = new Date(now);
    const h = d.getHours() + d.getMinutes() / 60;
    // 6〜18 時を昼（0〜0.62）、18〜翌 6 時を夜（0.62〜1）に対応させる
    if (h >= 6 && h < 18) return ((h - 6) / 12) * 0.62;
    const hh = h >= 18 ? h - 18 : h + 6;
    return 0.62 + (hh / 12) * 0.38;
  }
  return (playSeconds % DAY_SECONDS) / DAY_SECONDS;
}

export function nightFromPhase(phase: number): boolean {
  return phase >= 0.62;
}

/**
 * 1 ステップ進める。dtPlay は「遊び時間」の秒数（リアルタイムモードでは換算済み）。
 */
export function tick(state: GameState, dtPlay: number, night: boolean): { state: GameState; events: SimEvent[] } {
  if (dtPlay <= 0) return { state, events: [] };
  const events: SimEvent[] = [];
  const minutes = dtPlay / 60;
  const creatures = state.creatures.map((c) => {
    if (c.finished) return c;
    const sp = SPECIES[c.species];
    let stage = stageOf(c);
    const before = conditionOf(c);
    const needs = { ...c.needs };
    for (const k of NEED_KEYS) {
      const rate = stage.decay[k] ?? 0;
      if (rate > 0) needs[k] = clamp01(needs[k] - rate * minutes);
    }
    // ごはんが置いてあれば食べる
    let food = c.food;
    if (stage.food !== 'none' && food > 0 && needs.hunger < 0.98) {
      const eat = Math.min(food, 0.25 * minutes, 1 - needs.hunger);
      needs.hunger = clamp01(needs.hunger + eat * 1.6);
      food = Math.max(0, food - eat);
      if (eat > 0.001 && Math.floor(food * 4) !== Math.floor(c.food * 4)) events.push({ type: 'ate', id: c.id });
    }
    // ほかのお世話が足りていて、活動する時間帯なら、ごきげんが少しずつ戻る
    const others = relevantNeeds(stage).filter((k) => k !== 'mood');
    const othersOk = others.every((k) => needs[k] > 0.6);
    const activeTime = stage.activity === 'both' || (stage.activity === 'night') === night;
    if (othersOk && (stage.decay.mood ?? 0) > 0) {
      needs.mood = clamp01(needs.mood + (activeTime ? 0.15 : 0.08) * minutes + (c.house ? 0.03 * minutes : 0));
    }
    const draft: Creature = { ...c, needs, food };
    const cond = conditionOf(draft);
    if (cond !== before) events.push({ type: 'condition', id: c.id, from: before, to: cond });

    // 成長
    let progress = c.progress + (minutes / stage.playMinutes) * growthFactor(cond);
    let stageIdx = c.stage;
    let moltsDone = c.moltsDone;
    let finished = false;
    let stagesSeen = c.stagesSeen;
    let house = c.house;
    const molts = stage.molts ?? 0;
    while (molts > 0 && moltsDone < molts && progress >= (moltsDone + 1) / (molts + 1)) {
      moltsDone++;
      events.push({ type: 'molt', id: c.id, count: moltsDone });
    }
    if (progress >= 1) {
      if (stageIdx < sp.stages.length - 1) {
        stageIdx++;
        progress = 0;
        moltsDone = 0;
        stage = sp.stages[stageIdx]!;
        stagesSeen = stagesSeen.includes(stage.id) ? stagesSeen : [...stagesSeen, stage.id];
        // 新しい段階では お世話の状態を少し整えてあげる（成長のごほうび）
        for (const k of NEED_KEYS) needs[k] = Math.max(needs[k], 0.75);
        food = 0;
        house = false;
        events.push({ type: 'grow', id: c.id, stage: stageIdx, event: stage.enter ?? 'molt' });
      } else {
        progress = 1;
        finished = true;
        events.push({ type: 'finished', id: c.id });
      }
    }
    return { ...draft, needs, food, house, progress, stage: stageIdx, moltsDone, finished, stagesSeen };
  });
  return { state: { ...state, creatures, playSeconds: state.playSeconds + dtPlay }, events };
}

/**
 * 実時間 elapsedMs をゲームの遊び時間（秒）に換算する。
 * 通常モード: 遊んでいる間の経過のみ（呼び出し側が非表示中は数えない）。
 * リアルタイムモード: 経過時間 × REALTIME_SCALE（上限あり）。
 */
export function playSecondsFor(elapsedMs: number, realtime: boolean): number {
  const ms = Math.max(0, Math.min(elapsedMs, MAX_CATCHUP_MS));
  return realtime ? (ms / 1000) * REALTIME_SCALE : ms / 1000;
}

/** 長い時間をまとめて進めるときは 1 分刻みに分割する（成長イベントを取りこぼさない） */
export function advance(state: GameState, dtPlay: number, night: boolean): { state: GameState; events: SimEvent[] } {
  let s = state;
  const events: SimEvent[] = [];
  let remaining = dtPlay;
  while (remaining > 0) {
    const step = Math.min(60, remaining);
    const r = tick(s, step, night);
    s = r.state;
    events.push(...r.events);
    remaining -= step;
  }
  return { state: s, events };
}

export function farewell(state: GameState, id: string, now: number): GameState {
  const c = state.creatures.find((x) => x.id === id);
  if (!c) return state;
  return {
    ...state,
    creatures: state.creatures.filter((x) => x.id !== id),
    memories: [
      ...state.memories,
      {
        id: c.id,
        species: c.species,
        sex: c.sex,
        startedAt: c.bornAt,
        endedAt: now,
        careCount: c.careCount,
        stagesSeen: c.stagesSeen,
        farewell: SPECIES[c.species].farewell,
      },
    ],
  };
}

function replace(state: GameState, c: Creature): GameState {
  return { ...state, creatures: state.creatures.map((x) => (x.id === c.id ? c : x)) };
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
