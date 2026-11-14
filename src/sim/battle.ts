import { BATTLE } from '../data/battle';
import type { SpeciesId } from './types';

/**
 * むしずもうのロジック（純 TS）。meter は -1..1 で、+1 にとどけば プレイヤーの勝ち。
 *
 * 遊びの しかけ（ユーザー要望）:
 * - タイミング押し: 「がんばれ」ボタンの まわりの 輪が ちぢんで ボタンに かさなった 瞬間に 押すと 強く 押せる
 *   （`grade`：ok / good / great）。good / great は 輪 1 周に 1 回だけ（連打で 何回も 取れない）。
 *   輪の たびに 続けて 取ると コンボで さらに 強く なる。1 周 のがすか、輪が ちかづく 前に あわてて 押すと とぎれる
 *   （「まって、いまだ！」の リズム。でたらめな 連打では コンボが つながらない）。
 *   でたらめに 連打しても 勝てる 強さは 残す（小さな 子むけ）が、リズムよく 押すほうが はやく 勝てる。
 * - 技ゲージ: 押すたびに たまり（タイミングが いいほど 多く）、いっぱいに なるたびに 得意技を 出せる。
 * - ふんばり: 相手が 技を 出す 前に 合図（`cpuTell`）。その 間に 押すと ふんばって 技を 弱められる。
 *   合図の さいごの ほう（`BRACE_WINDOW`）で、しかも 輪が かさなる タイミング（good / great）で 押すと、技を まるごと 受けとめる。
 *   相手が びっくりして 止まって いる 間は 合図も 止まる。こちらが 死んだ ふり・飛んで いる 間は 技が あたらない。
 * - はじめに「はっけよい」（`intro`）。その 間は 押せない。
 */
export type Grade = 'ok' | 'good' | 'great';
export type Brace = 'none' | 'half' | 'full';

export interface BattleState {
  player: SpeciesId;
  cpu: SpeciesId;
  meter: number;
  /** 取組の 時間（はっけよいの あと） */
  time: number;
  /** はっけよいの 残り秒数（0 で 取組が 始まる） */
  intro: number;
  /** 効果の残り秒数 */
  playerGuard: number;
  cpuGuard: number;
  playerStun: number;
  cpuStun: number;
  /** 技ゲージ 0..1（1 で 技が 出せる） */
  playerCharge: number;
  cpuCharge: number;
  /** CPU が 技を 出す 前の 合図の 残り秒数（0 なら 合図なし） */
  cpuTell: number;
  /** 合図の 間に プレイヤーが ふんばったか */
  brace: Brace;
  /** さいごに 押した 時刻（連打の 弱め 判定） */
  lastPush: number;
  /** タイミングが 続けて よかった 回数 */
  combo: number;
  /** さいごに good / great を 取った 輪の 番号（1 周に 1 回だけ） */
  hitBeat: number;
  result: 'win' | 'lose' | 'draw' | null;
}

export type BattleEvent =
  | { type: 'start' }
  | { type: 'push'; grade: Grade; combo: number }
  | { type: 'special'; who: 'player' | 'cpu'; brace: Brace }
  | { type: 'tell' }
  | { type: 'brace'; brace: Brace }
  | { type: 'end'; result: NonNullable<BattleState['result']> };

export const BATTLE_SECONDS = 30;
export const INTRO_SECONDS = 3.4;
/** タイミングの 輪が 1 周する 秒数 */
export const BEAT = 0.9;
/** 1 タップで 進む 量（power 1 のとき） */
export const PUSH: Record<Grade, number> = { ok: 0.022, good: 0.065, great: 0.12 };
/** 1 タップで たまる 技ゲージ */
export const CHARGE: Record<Grade, number> = { ok: 0.012, good: 0.05, great: 0.09 };
/** CPU が 1 秒に 押す 量（power 1 のとき） */
export const CPU_PUSH = 0.11;
/** CPU の 技ゲージが 1 秒に たまる 量 */
export const CPU_CHARGE = 0.07;
/** 合図の 長さ と、さいごの「ぴったり」の 時間 */
export const TELL_SECONDS = 1.5;
export const BRACE_WINDOW = 0.45;
/** これより 短い 間隔の 連打は 半分の 力（指が ふるえる くらいの 連打） */
const MASH_GAP = 0.15;
/** 指が ふるえる くらいの 連打の 力 */
const MASH_POWER = 0.4;
/** コンボの 倍率（2 回目から 0.25 ずつ、さいだい 2 倍） */
export const comboBoost = (combo: number) => 1 + Math.min(4, Math.max(0, combo - 1)) * 0.25;

export function startBattle(player: SpeciesId, cpu: SpeciesId, rand = Math.random): BattleState {
  return {
    player,
    cpu,
    meter: 0,
    time: 0,
    intro: INTRO_SECONDS,
    playerGuard: 0,
    cpuGuard: 0,
    playerStun: 0,
    cpuStun: 0,
    playerCharge: 0,
    // CPU は すこし ずつ ちがう 時刻に 最初の 技を 出す
    cpuCharge: rand() * 0.3,
    cpuTell: 0,
    brace: 'none',
    lastPush: -1,
    combo: 0,
    hitBeat: -10,
    result: null,
  };
}

export function pickOpponent(player: SpeciesId, pool: SpeciesId[], rand = Math.random): SpeciesId {
  const others = pool.filter((s) => s !== player);
  const list = others.length ? others : pool;
  return list[Math.floor(rand() * list.length)]!;
}

/** タイミングの 輪の 位置 0..1（1 に ちかいほど ボタンに かさなる） */
export function beatPhase(time: number): number {
  return (((time / BEAT) % 1) + 1) % 1;
}

/** 輪の 番号（good の 窓の はじまりで 次の 番号に かわる。窓が 1 周の さかいめを またぐため） */
export function beatIndex(time: number): number {
  return Math.floor(time / BEAT + 0.32);
}

/** いま 押すと good / great に なるか（この 輪で もう 取って いれば ok） */
export function timingOpen(s: BattleState): boolean {
  return gradeAt(s.time) !== 'ok' && beatIndex(s.time) !== s.hitBeat;
}

/** 輪が まだ とおい のに 押した（あわてた）。コンボが とぎれる */
export function tooEarly(time: number): boolean {
  const p = beatPhase(time);
  return p >= 0.4 && p < 0.68;
}

/** 押した 瞬間の できばえ。輪が ボタンに かさなる 直前〜直後が great */
export function gradeAt(time: number): Grade {
  const p = beatPhase(time);
  if (p >= 0.85 || p < 0.08) return 'great';
  if (p >= 0.68) return 'good';
  return 'ok';
}

function clampMeter(v: number) {
  return Math.max(-1, Math.min(1, v));
}

function finish(s: BattleState, events: BattleEvent[]): BattleState {
  if (s.result) return s;
  let result: BattleState['result'] = null;
  if (s.meter >= 1) result = 'win';
  else if (s.meter <= -1) result = 'lose';
  else if (s.time >= BATTLE_SECONDS) result = 'draw';
  if (!result) return s;
  events.push({ type: 'end', result });
  return { ...s, result, cpuTell: 0 };
}

export const fighting = (s: BattleState) => !s.result && s.intro <= 0;

/** プレイヤーが「がんばれ」を タップ */
export function playerPush(s: BattleState): { state: BattleState; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  if (!fighting(s) || s.playerStun > 0) return { state: s, events };
  let next: BattleState = { ...s, lastPush: s.time };
  // good / great は 輪 1 周に 1 回だけ。2 回目からは ok
  const beat = beatIndex(s.time);
  let grade = gradeAt(s.time);
  if (grade !== 'ok' && beat === s.hitBeat) grade = 'ok';
  const mash = s.time - s.lastPush < MASH_GAP ? MASH_POWER : 1;
  // 合図の 間に 押すと ふんばる（さいごの ほうで 輪に あわせて 押せば まるごと 受けとめる）
  if (s.cpuTell > 0) {
    const brace: Brace = s.cpuTell <= BRACE_WINDOW && grade !== 'ok' ? 'full' : 'half';
    if (brace === 'full' || next.brace === 'none') {
      if (next.brace !== brace) events.push({ type: 'brace', brace });
      next.brace = brace;
    }
  }
  if (grade !== 'ok') {
    // 1 周 のがしたら コンボは 1 から
    next.combo = beat - s.hitBeat === 1 && s.combo > 0 ? s.combo + 1 : 1;
    next.hitBeat = beat;
  } else if (tooEarly(s.time)) next.combo = 0;
  const boost = comboBoost(next.combo);
  next.playerCharge = Math.min(1, s.playerCharge + CHARGE[grade] * mash * boost);
  // 相手が 死んだ ふり・飛んで いる 間は 押しても 動かない（ゲージは たまる）
  if (s.cpuGuard <= 0) {
    // 小さな子でも勝てるよう、種の強さの差は小さめにする
    next.meter = clampMeter(s.meter + PUSH[grade] * mash * boost * (0.8 + 0.2 * BATTLE[s.player].power));
  }
  events.push({ type: 'push', grade, combo: next.combo });
  return { state: finish(next, events), events };
}

function applySpecial(s: BattleState, who: 'player' | 'cpu', events: BattleEvent[]): BattleState {
  const me = who === 'player' ? s.player : s.cpu;
  const sp = BATTLE[me].special;
  const dir = who === 'player' ? 1 : -1;
  // ふんばった ぶん 弱まる（プレイヤーの 技は 弱まらない）。死んだ ふり・飛んで いる 子には あたらない
  const brace: Brace = who === 'cpu' ? (s.playerGuard > 0 ? 'full' : s.brace) : 'none';
  const k = brace === 'full' ? 0 : brace === 'half' ? 0.5 : 1;
  const next = { ...s };
  if (who === 'player') next.playerCharge = 0;
  else {
    next.cpuCharge = 0;
    next.cpuTell = 0;
    next.brace = 'none';
  }
  events.push({ type: 'special', who, brace });
  if (brace === 'full') {
    // ぜんぶ 受けとめて、すこし 押しかえす
    next.meter = clampMeter(next.meter + 0.08);
    return next;
  }
  switch (sp.effect) {
    case 'push':
      next.meter = clampMeter(next.meter + dir * sp.strength * k);
      break;
    case 'guard':
      if (who === 'player') next.playerGuard = sp.seconds;
      else next.cpuGuard = sp.seconds * k;
      break;
    case 'stun':
      if (who === 'player') next.cpuStun = sp.seconds;
      else next.playerStun = sp.seconds * k;
      next.meter = clampMeter(next.meter + dir * sp.strength * k);
      break;
  }
  return next;
}

export const canSpecial = (s: BattleState) => fighting(s) && s.playerCharge >= 1 && s.playerStun <= 0;

export function playerSpecial(s: BattleState): { state: BattleState; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  if (!canSpecial(s)) return { state: s, events };
  const next = applySpecial(s, 'player', events);
  return { state: finish(next, events), events };
}

/** 時間を進める（はっけよい・CPU が押す・技の 合図と 技・効果が切れる） */
export function stepBattle(s: BattleState, dt: number): { state: BattleState; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  if (s.result) return { state: s, events };
  if (s.intro > 0) {
    const intro = Math.max(0, s.intro - dt);
    if (intro === 0) events.push({ type: 'start' });
    return { state: { ...s, intro }, events };
  }
  let next: BattleState = {
    ...s,
    time: s.time + dt,
    playerGuard: Math.max(0, s.playerGuard - dt),
    cpuGuard: Math.max(0, s.cpuGuard - dt),
    playerStun: Math.max(0, s.playerStun - dt),
    cpuStun: Math.max(0, s.cpuStun - dt),
  };
  if (next.cpuStun <= 0 && next.playerGuard <= 0) {
    // 終盤ほど少しずつ力が強くなる（だらだら続かないように）。押されて いる 子には 手かげん
    const ramp = 1 + (0.3 * next.time) / BATTLE_SECONDS;
    const ease = next.meter < -0.5 ? 0.55 : next.meter < -0.2 ? 0.8 : 1;
    next.meter = clampMeter(next.meter - CPU_PUSH * BATTLE[next.cpu].power * ramp * ease * dt);
  }
  // 1 周 以上 のがすと コンボは とぎれる
  if (next.combo > 0 && beatIndex(next.time) - next.hitBeat > 1) next.combo = 0;
  if (next.cpuTell > 0) {
    // 合図の あとに 技（びっくりして 止まって いる 間は 合図も 止まる）
    if (next.cpuStun <= 0) next.cpuTell = Math.max(0, next.cpuTell - dt);
    if (next.cpuTell === 0) next = applySpecial(next, 'cpu', events);
  } else if (next.cpuStun <= 0) {
    next.cpuCharge = Math.min(1, next.cpuCharge + CPU_CHARGE * dt);
    if (next.cpuCharge >= 1) {
      next.cpuTell = TELL_SECONDS;
      next.brace = 'none';
      events.push({ type: 'tell' });
    }
  }
  return { state: finish(next, events), events };
}
