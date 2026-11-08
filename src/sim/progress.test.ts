import { describe, expect, it } from 'vitest';
import { STICKERS } from '../data/stickers';
import { addVisitor, bump, grant, newlyEarned, newProgress, nextGoal } from './progress';
import { pickVisitor } from './visitors';

describe('stickers', () => {
  it('ids are unique and every sticker is reachable', () => {
    const ids = STICKERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STICKERS) expect(s.need.n).toBeGreaterThan(0);
  });

  it('earns stickers when counts reach the goal, only once', () => {
    let p = newProgress();
    expect(newlyEarned(p, { met: 0 }, STICKERS)).toEqual([]);
    for (let i = 0; i < 10; i++) p = bump(p, 'care');
    const earned = newlyEarned(p, { met: 1 }, STICKERS);
    expect(earned).toContain('care-10');
    expect(earned).toContain('first-friend');
    p = grant(p, earned);
    expect(newlyEarned(p, { met: 1 }, STICKERS)).toEqual([]);
  });

  it('counts distinct visitor kinds', () => {
    let p = newProgress();
    p = addVisitor(p, 'monshiro');
    p = addVisitor(p, 'monshiro');
    expect(p.visitors).toEqual(['monshiro']);
    expect(p.stats.visitor).toBe(2);
  });

  it('suggests the closest next goal', () => {
    let p = newProgress();
    for (let i = 0; i < 9; i++) p = bump(p, 'pet');
    expect(nextGoal(p, { met: 0 }, STICKERS)?.def.id).toBe('pet-10');
  });
});

describe('visitors', () => {
  it('never repeats the last visitor and prefers unfound ones', () => {
    const ids = ['a', 'b', 'c'];
    let r = 0;
    const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    let freshCount = 0;
    for (let i = 0; i < 300; i++) {
      const v = pickVisitor(ids, ['a', 'b'], 'b', rand);
      expect(v).not.toBe('b');
      if (v === 'c') freshCount++;
    }
    expect(freshCount).toBeGreaterThan(150);
    expect(pickVisitor(['only'], [], 'only', rand)).toBe('only');
  });
});
