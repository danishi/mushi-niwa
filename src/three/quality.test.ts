import { describe, expect, it } from 'vitest';
import { effectiveDpr, guessInitialTier, stepTier } from './quality';

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
