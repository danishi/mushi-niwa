import { describe, expect, it } from 'vitest';
import { BATTLE } from '../data/battle';
import { SPECIES_ORDER } from '../data/species';
import {
  BATTLE_SECONDS,
  BEAT,
  BRACE_WINDOW,
  INTRO_SECONDS,
  TELL_SECONDS,
  beatPhase,
  canSpecial,
  gradeAt,
  pickOpponent,
  playerPush,
  playerSpecial,
  startBattle,
  stepBattle,
  type BattleState,
} from './battle';

/** はっけよいを 飛ばして 取組を 始める */
function fight(player: Parameters<typeof startBattle>[0], cpu: Parameters<typeof startBattle>[1]): BattleState {
  return stepBattle(startBattle(player, cpu, () => 0), INTRO_SECONDS + 0.01).state;
}

describe('mushi-zumou battle', () => {
  it('defines a special move with a fact for every species', () => {
    for (const id of SPECIES_ORDER) {
      expect(BATTLE[id].special.fact.length).toBeGreaterThan(5);
    }
  });

  it('never picks the same species as the opponent when others exist', () => {
    for (let i = 0; i < 20; i++) expect(pickOpponent('kabutomushi', SPECIES_ORDER)).not.toBe('kabutomushi');
  });

  it('waits for hakkeyoi before anyone can push', () => {
    let s = startBattle('kaiko', 'kabutomushi', () => 0);
    expect(playerPush(s).state).toBe(s);
    const r = stepBattle(s, INTRO_SECONDS / 2);
    expect(r.state.meter).toBe(0);
    s = r.state;
    const start = stepBattle(s, INTRO_SECONDS);
    expect(start.events).toContainEqual({ type: 'start' });
    expect(playerPush(start.state).state.meter).toBeGreaterThan(0);
  });

  it('pushes harder when tapping in time with the ring', () => {
    expect(gradeAt(BEAT * 0.95)).toBe('great');
    expect(gradeAt(BEAT * 0.75)).toBe('good');
    expect(gradeAt(BEAT * 0.3)).toBe('ok');
    expect(beatPhase(BEAT * 1.5)).toBeCloseTo(0.5);
    const s = fight('kaiko', 'kabutomushi');
    const great = playerPush({ ...s, time: BEAT * 0.95 }).state.meter;
    const ok = playerPush({ ...s, time: BEAT * 0.3 }).state.meter;
    expect(great).toBeGreaterThan(ok * 2);
  });

  it('lets a child win by tapping steadily without minding the timing', () => {
    let s = fight('kaiko', 'kabutomushi');
    for (let t = 0; t < BATTLE_SECONDS * 10 && !s.result; t++) {
      if (t % 2 === 0) s = playerPush(s).state; // 5 タップ/秒
      if (canSpecial(s)) s = playerSpecial(s).state;
      s = stepBattle(s, 0.1).state;
    }
    expect(s.result).toBe('win');
  });

  it('ends in a draw or loss without tapping, never throws', () => {
    let s = startBattle('nanahoshi', 'miidera', () => 0.5);
    for (let t = 0; t < (BATTLE_SECONDS + INTRO_SECONDS) * 10 + 5 && !s.result; t++) s = stepBattle(s, 0.1).state;
    expect(['lose', 'draw']).toContain(s.result);
  });

  it('charges the special gauge and allows it again after it refills', () => {
    let s = fight('miidera', 'kabutomushi');
    expect(canSpecial(s)).toBe(false);
    s = { ...s, playerCharge: 1 };
    const r = playerSpecial(s);
    expect(r.events).toContainEqual({ type: 'special', who: 'player', brace: 'none' });
    expect(r.state.cpuStun).toBeGreaterThan(0);
    expect(r.state.playerCharge).toBe(0);
    expect(playerSpecial(r.state).state).toBe(r.state); // ゲージが からの 間は 出せない
    expect(canSpecial({ ...r.state, playerCharge: 1 })).toBe(true);
  });

  it('applies guard specials', () => {
    let s = playerSpecial({ ...fight('nanahoshi', 'kabutomushi'), playerCharge: 1 }).state;
    expect(s.playerGuard).toBeGreaterThan(0);
    const before = s.meter;
    s = stepBattle(s, 0.5).state;
    expect(s.meter).toBe(before); // しんだふり中は押されない
  });

  it('signals the cpu special first, and a well-timed tap braces fully', () => {
    let s = { ...fight('kaiko', 'kabutomushi'), cpuCharge: 0.999 };
    const tell = stepBattle(s, 0.1);
    expect(tell.events).toContainEqual({ type: 'tell' });
    s = tell.state;
    expect(s.cpuTell).toBeCloseTo(TELL_SECONDS);
    // 合図の はじめに 押すと 半分、さいごの ほうで 輪に あわせて 押すと まるごと 受けとめる
    const early = playerPush(s);
    expect(early.state.brace).toBe('half');
    s = stepBattle(early.state, TELL_SECONDS - BRACE_WINDOW / 2).state;
    // さいごの ほうでも 輪が とおい ときは 半分の まま
    expect(playerPush({ ...s, time: Math.floor(s.time / BEAT) * BEAT + BEAT * 0.3 }).state.brace).toBe('half');
    const late = playerPush({ ...s, time: Math.ceil(s.time / BEAT + 1) * BEAT - 0.02 });
    expect(late.state.brace).toBe('full');
    const meter = late.state.meter;
    const fire = stepBattle(late.state, BRACE_WINDOW);
    expect(fire.events).toContainEqual({ type: 'special', who: 'cpu', brace: 'full' });
    expect(fire.state.playerStun).toBe(0);
    expect(fire.state.meter).toBeGreaterThan(meter - 0.05);
  });

  it('pauses the cpu signal while the cpu is stunned, and misses a guarding child', () => {
    let s = { ...fight('kaiko', 'kabutomushi'), cpuCharge: 0.999 };
    s = stepBattle(s, 0.1).state;
    const tell = s.cpuTell;
    s = stepBattle({ ...s, cpuStun: 2 }, 1).state;
    expect(s.cpuTell).toBeCloseTo(tell); // びっくりして いる 間は 合図も 止まる
    const guarded = stepBattle({ ...s, cpuStun: 0, playerGuard: 3 }, TELL_SECONDS + 0.01);
    expect(guarded.events).toContainEqual({ type: 'special', who: 'cpu', brace: 'full' });
    expect(guarded.state.meter).toBeGreaterThanOrEqual(s.meter);
  });

  it('the cpu special lands in full when the child does not brace', () => {
    let s = { ...fight('kaiko', 'kabutomushi'), cpuCharge: 0.999 };
    s = stepBattle(s, 0.1).state;
    const before = s.meter;
    const fire = stepBattle(s, TELL_SECONDS + 0.01);
    expect(fire.events).toContainEqual({ type: 'special', who: 'cpu', brace: 'none' });
    expect(fire.state.meter).toBeLessThan(before - BATTLE.kabutomushi.special.strength * 0.9);
  });
});
