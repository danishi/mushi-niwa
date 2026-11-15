import { describe, expect, it } from 'vitest';
import { BATTLE } from '../data/battle';
import { SPECIES_ORDER } from '../data/species';
import {
  BATTLE_SECONDS,
  BEAT,
  INTRO_SECONDS,
  TELL_SECONDS,
  beatPhase,
  canSpecial,
  gradeAt,
  pickOpponent,
  playerPress,
  playerPush,
  playerSpecial,
  playerTap,
  ringFill,
  tapMode,
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

  it('lets a child win by tapping the one button steadily without minding the timing', () => {
    // だいたい 4 タップ/秒（ゆびの 間隔は すこし ばらつく）。技も 同じ ボタン
    let seed = 7;
    const jitter = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 0.12;
    let s = fight('kaiko', 'kabutomushi');
    let next = 0;
    let lift = 0;
    for (let t = 0; t < BATTLE_SECONDS * 20 && !s.result; t++) {
      if (s.time >= next) {
        // タップ ＝ 押して すぐ はなす
        s = playerPress(playerTap(s).state, true).state;
        lift = s.time + 0.08;
        next = s.time + 0.19 + jitter();
      }
      if (s.pressing && s.time >= lift) s = playerPress(s, false).state;
      s = stepBattle(s, 0.05).state;
    }
    expect(s.result).toBe('win');
  });

  it('wins sooner when tapping as the ring lights up', () => {
    let s = fight('kaiko', 'kabutomushi');
    let last = -1;
    for (let t = 0; t < BATTLE_SECONDS * 20 && !s.result; t++) {
      const beat = Math.floor(s.time / BEAT);
      if (ringFill(s.time) >= 1 && beat !== last) {
        s = playerTap(s).state;
        last = beat;
      }
      s = stepBattle(s, 0.05).state;
    }
    expect(s.result).toBe('win');
    expect(s.time).toBeLessThan(15);
  });

  it('uses one button: push, special when the gauge is full, brace while the cpu signals', () => {
    let s = fight('miidera', 'kabutomushi');
    expect(tapMode(startBattle('miidera', 'kabutomushi'))).toBe('wait');
    expect(tapMode(s)).toBe('push');
    s = { ...s, playerCharge: 1 };
    expect(tapMode(s)).toBe('special');
    const r = playerTap(s);
    expect(r.events).toContainEqual({ type: 'special', who: 'player', brace: 'none' });
    // 合図の 間は 技より ふんばる ほうが 先（ゲージは のこる）
    const tell = { ...s, cpuTell: 1 };
    expect(tapMode(tell)).toBe('brace');
    const b = playerPress(playerTap(tell).state, true);
    expect(b.state.brace).not.toBe('none');
    expect(b.state.playerCharge).toBe(1);
  });

  it('fills the ring before the great window and keeps it full during it', () => {
    expect(ringFill(BEAT * 0.1)).toBeLessThan(0.1);
    expect(ringFill(BEAT * 0.5)).toBeGreaterThan(0.4);
    expect(ringFill(BEAT * 0.5)).toBeLessThan(1);
    for (const p of [0.8, 0.9, 0.99, 1.05]) {
      expect(ringFill(BEAT * p)).toBe(1);
      expect(gradeAt(BEAT * p)).toBe('great');
    }
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

  it('signals the cpu special first, and holding the button braces fully', () => {
    let s = { ...fight('kaiko', 'kabutomushi'), cpuCharge: 0.999 };
    const tell = stepBattle(s, 0.1);
    expect(tell.events).toContainEqual({ type: 'tell' });
    s = tell.state;
    expect(s.cpuTell).toBeCloseTo(TELL_SECONDS);
    // 押したまま 技を むかえると まるごと 受けとめる
    const down = playerPress(playerTap(s).state, true);
    expect(down.events).toContainEqual({ type: 'brace', brace: 'full' });
    const fire = stepBattle(down.state, TELL_SECONDS);
    expect(fire.events).toContainEqual({ type: 'special', who: 'cpu', brace: 'full' });
    expect(fire.state.playerStun).toBe(0);
    // 受けとめない ときより ずっと 押されない
    const unbraced = stepBattle(playerTap(s).state, TELL_SECONDS);
    expect(fire.state.meter).toBeGreaterThan(unbraced.state.meter + BATTLE.kabutomushi.special.strength * 0.9);
  });

  it('a tap that lets go before the special braces only half', () => {
    let s = stepBattle({ ...fight('kaiko', 'kabutomushi'), cpuCharge: 0.999 }, 0.1).state;
    s = playerPress(playerTap(s).state, true).state;
    const up = playerPress(s, false);
    expect(up.events).toContainEqual({ type: 'brace', brace: 'half' });
    const fire = stepBattle(up.state, TELL_SECONDS);
    expect(fire.events).toContainEqual({ type: 'special', who: 'cpu', brace: 'half' });
  });

  it('a child already holding when the signal starts is braced', () => {
    let s = playerPress({ ...fight('kaiko', 'kabutomushi'), cpuCharge: 0.999 }, true).state;
    s = stepBattle(s, 0.1).state;
    expect(s.brace).toBe('half');
    expect(stepBattle(s, TELL_SECONDS).events).toContainEqual({ type: 'special', who: 'cpu', brace: 'full' });
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
