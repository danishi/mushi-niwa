import { describe, expect, it } from 'vitest';
import { createGovernor, effectiveDpr, GOVERNOR, governorApply, governorReset, governorSample, guessInitialTier, stepTier } from './quality';

describe('quality', () => {
  it('caps devicePixelRatio at 2', () => {
    expect(effectiveDpr('high', 3)).toBe(2);
    expect(effectiveDpr('mid', 3)).toBe(1.5);
    expect(effectiveDpr('high', 1)).toBe(1);
  });
  it('steps tiers within bounds', () => {
    expect(stepTier('high', 1)).toBe('high');
    expect(stepTier('high', -1)).toBe('mid');
    expect(stepTier('low', -1)).toBe('low');
  });
  it('guesses a lower tier on weak devices', () => {
    expect(guessInitialTier({ hardwareConcurrency: 2 })).toBe('low');
    expect(guessInitialTier({ hardwareConcurrency: 4 })).toBe('mid');
    expect(guessInitialTier({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe('high');
  });
});

describe('quality governor', () => {
  const feed = (g: ReturnType<typeof createGovernor>, fps: number, windows: number) => {
    let urgent = false;
    for (let i = 0; i < windows; i++) urgent = governorSample(g, fps) || urgent;
    return urgent;
  };
  const warm = (g: ReturnType<typeof createGovernor>) => feed(g, 60, GOVERNOR.warmupWindows);

  it('ignores the slow frames right after a screen change', () => {
    const g = createGovernor('high');
    feed(g, 10, GOVERNOR.warmupWindows);
    expect(g.pending).toBeNull();
  });

  it('waits for a screen change before lowering the tier', () => {
    const g = createGovernor('high');
    warm(g);
    expect(feed(g, 40, GOVERNOR.downWindows)).toBe(false);
    expect(g.tier).toBe('high');
    expect(g.pending).toBe('mid');
    expect(governorApply(g)).toBe('mid');
    expect(g.tier).toBe('mid');
    expect(governorApply(g)).toBeNull();
  });

  it('asks for an immediate change only when it is very slow', () => {
    const g = createGovernor('high');
    warm(g);
    expect(feed(g, 15, GOVERNOR.urgentWindows)).toBe(true);
    const low = createGovernor('low');
    warm(low);
    expect(feed(low, 15, GOVERNOR.urgentWindows)).toBe(false);
  });

  it('raises the tier after a long smooth run, but never back to a tier it dropped from', () => {
    const g = createGovernor('mid');
    warm(g);
    feed(g, 60, GOVERNOR.upWindows);
    expect(governorApply(g)).toBe('high');
    warm(g);
    feed(g, 30, GOVERNOR.downWindows);
    expect(governorApply(g)).toBe('mid');
    warm(g);
    feed(g, 60, GOVERNOR.upWindows * 2);
    expect(g.pending).toBeNull();
    expect(governorApply(g)).toBeNull();
  });

  it('forgets a pending drop once the frame rate recovers', () => {
    const g = createGovernor('high');
    warm(g);
    feed(g, 40, GOVERNOR.downWindows);
    feed(g, 60, GOVERNOR.upWindows);
    expect(g.pending).toBeNull();
  });

  it('restarts the measurement on reset', () => {
    const g = createGovernor('high');
    warm(g);
    feed(g, 40, GOVERNOR.downWindows - 1);
    governorReset(g);
    feed(g, 40, GOVERNOR.warmupWindows + 1);
    expect(g.pending).toBeNull();
  });
});
