import { BATTLE } from '../data/battle';
import type { SpeciesId } from './types';

/**
 * むしずもうのロジック（純 TS）。meter は -1..1 で、+1 にとどけば プレイヤーの勝ち。
 */
export interface BattleState {
  player: SpeciesId;
  cpu: SpeciesId;
  meter: number;
  time: number;
  /** 効果の残り秒数 */
  playerGuard: number;
  cpuGuard: number;
  playerStun: number;
  cpuStun: number;
  playerSpecialUsed: boolean;
  cpuSpecialUsed: boolean;
  /** CPU が技を出す時刻 */
  cpuSpecialAt: number;
  result: 'win' | 'lose' | 'draw' | null;
}

export const BATTLE_SECONDS = 25;
/** 1 タップで進む量（power 1 のとき） */
export const TAP_PUSH = 0.07;
/** CPU が 1 秒に押す量（power 1 のとき） */
export const CPU_PUSH = 0.14;

export function startBattle(player: SpeciesId, cpu: SpeciesId, rand = Math.random): BattleState {
  return {
    player,
    cpu,
    meter: 0,
    time: 0,
    playerGuard: 0,
    cpuGuard: 0,
    playerStun: 0,
    cpuStun: 0,
    playerSpecialUsed: false,
    cpuSpecialUsed: false,
    cpuSpecialAt: 6 + rand() * 10,
    result: null,
  };
}

export function pickOpponent(player: SpeciesId, pool: SpeciesId[], rand = Math.random): SpeciesId {
  const others = pool.filter((s) => s !== player);
  const list = others.length ? others : pool;
  return list[Math.floor(rand() * list.length)]!;
}

function clampMeter(v: number) {
  return Math.max(-1, Math.min(1, v));
}

function finish(s: BattleState): BattleState {
  if (s.result) return s;
  if (s.meter >= 1) return { ...s, result: 'win' };
  if (s.meter <= -1) return { ...s, result: 'lose' };
  if (s.time >= BATTLE_SECONDS) return { ...s, result: 'draw' };
  return s;
}

/** プレイヤーが「がんばれ」をタップ */
export function playerPush(s: BattleState): BattleState {
  if (s.result || s.playerStun > 0 || s.cpuGuard > 0) return s;
  // 小さな子でも勝てるよう、種の強さの差は小さめにする
  return finish({ ...s, meter: clampMeter(s.meter + TAP_PUSH * (0.8 + 0.2 * BATTLE[s.player].power)) });
}

function applySpecial(s: BattleState, who: 'player' | 'cpu'): BattleState {
  const me = who === 'player' ? s.player : s.cpu;
  const sp = BATTLE[me].special;
  const dir = who === 'player' ? 1 : -1;
  const next = { ...s };
  if (who === 'player') next.playerSpecialUsed = true;
  else next.cpuSpecialUsed = true;
  switch (sp.effect) {
    case 'push':
      next.meter = clampMeter(next.meter + dir * sp.strength);
      break;
    case 'guard':
      if (who === 'player') next.playerGuard = sp.seconds;
      else next.cpuGuard = sp.seconds;
      break;
    case 'stun':
      if (who === 'player') next.cpuStun = sp.seconds;
      else next.playerStun = sp.seconds;
      next.meter = clampMeter(next.meter + dir * sp.strength);
      break;
  }
  return finish(next);
}

export function playerSpecial(s: BattleState): BattleState {
  if (s.result || s.playerSpecialUsed || s.playerStun > 0) return s;
  return applySpecial(s, 'player');
}

/** 時間を進める（CPU が押す・技を出す・効果が切れる） */
export function stepBattle(s: BattleState, dt: number): { state: BattleState; cpuUsedSpecial: boolean } {
  if (s.result) return { state: s, cpuUsedSpecial: false };
  let next: BattleState = {
    ...s,
    time: s.time + dt,
    playerGuard: Math.max(0, s.playerGuard - dt),
    cpuGuard: Math.max(0, s.cpuGuard - dt),
    playerStun: Math.max(0, s.playerStun - dt),
    cpuStun: Math.max(0, s.cpuStun - dt),
  };
  let cpuUsedSpecial = false;
  if (next.cpuStun <= 0 && next.playerGuard <= 0) {
    // 終盤ほど少しずつ力が強くなる（だらだら続かないように）
    const ramp = 1 + (0.5 * next.time) / BATTLE_SECONDS;
    next.meter = clampMeter(next.meter - CPU_PUSH * BATTLE[next.cpu].power * ramp * dt);
  }
  if (!next.cpuSpecialUsed && next.cpuStun <= 0 && next.time >= next.cpuSpecialAt) {
    next = applySpecial(next, 'cpu');
    cpuUsedSpecial = true;
  }
  return { state: finish(next), cpuUsedSpecial };
}
