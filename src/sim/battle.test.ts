import { describe, expect, it } from 'vitest';
import { BATTLE } from '../data/battle';
import { SPECIES_ORDER } from '../data/species';
import { BATTLE_SECONDS, pickOpponent, playerPush, playerSpecial, startBattle, stepBattle } from './battle';

describe('mushi-zumou battle', () => {
  it('defines a special move with a fact for every species', () => {
    for (const id of SPECIES_ORDER) {
      expect(BATTLE[id].special.fact.length).toBeGreaterThan(5);
    }
  });

  it('never picks the same species as the opponent when others exist', () => {
    for (let i = 0; i < 20; i++) expect(pickOpponent('kabutomushi', SPECIES_ORDER)).not.toBe('kabutomushi');
  });

  it('lets a child win by tapping steadily', () => {
    let s = startBattle('kaiko', 'kabutomushi', () => 0.5);
    for (let t = 0; t < BATTLE_SECONDS * 10 && !s.result; t++) {
      if (t % 2 === 0) s = playerPush(s); // 5 タップ/秒
      s = stepBattle(s, 0.1).state;
    }
    expect(s.result).toBe('win');
  });

  it('ends in a draw or loss without tapping, never throws', () => {
    let s = startBattle('nanahoshi', 'miidera', () => 0.5);
    for (let t = 0; t < BATTLE_SECONDS * 10 + 5 && !s.result; t++) s = stepBattle(s, 0.1).state;
    expect(['lose', 'draw']).toContain(s.result);
  });

  it('applies guard and stun specials', () => {
    let s = startBattle('nanahoshi', 'kabutomushi', () => 0.99);
    s = playerSpecial(s);
    expect(s.playerGuard).toBeGreaterThan(0);
    const before = s.meter;
    s = stepBattle(s, 0.5).state;
    expect(s.meter).toBe(before); // しんだふり中は押されない
    let m = startBattle('miidera', 'kabutomushi', () => 0.99);
    m = playerSpecial(m);
    expect(m.cpuStun).toBeGreaterThan(0);
    expect(playerSpecial(m)).toBe(m); // 技は 1 回だけ
  });
});
