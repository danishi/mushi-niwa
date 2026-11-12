import { describe, expect, it } from 'vitest';
import { newAnim } from './anim';
import { envelope, GestureRunner, GESTURE_GAP, GESTURE_TIME, pickGesture, type Gesture } from './gestures';

/** 決まった 数列を 返す 乱数 */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('envelope', () => {
  it('starts and ends at zero and reaches one in the middle', () => {
    expect(envelope(0, 3)).toBe(0);
    expect(envelope(3, 3)).toBe(0);
    expect(envelope(1.5, 3)).toBe(1);
    expect(envelope(0.2, 3)).toBeGreaterThan(0);
    expect(envelope(0.2, 3)).toBeLessThan(1);
  });
});

describe('pickGesture', () => {
  it('returns null when the model has no gestures', () => {
    expect(pickGesture([], null)).toBeNull();
  });
  it('does not repeat the previous gesture when there is a choice', () => {
    for (const r of [0, 0.3, 0.6, 0.99]) expect(pickGesture(['groom', 'look'], 'groom', () => r)).toBe('look');
  });
  it('repeats when it is the only gesture', () => {
    expect(pickGesture(['sway'], 'sway', () => 0.5)).toBe('sway');
  });
});

describe('GestureRunner', () => {
  const run = (g: GestureRunner, a = newAnim(), list: Gesture[] = ['groom'], seconds = 1, allowed = true) => {
    for (let t = 0; t < seconds; t += 0.05) g.update(0.05, a, list, allowed);
    return a;
  };

  it('waits, then plays a gesture and returns to rest', () => {
    const g = new GestureRunner(seq(0));
    const a = newAnim();
    run(g, a, ['groom'], GESTURE_GAP[0] - 0.2);
    expect(a.groom).toBe(0);
    run(g, a, ['groom'], 0.2 + GESTURE_TIME.groom[0] / 2);
    expect(g.kind).toBe('groom');
    expect(a.groom).toBeGreaterThan(0.9);
    run(g, a, ['groom'], GESTURE_TIME.groom[0]);
    expect(a.groom).toBe(0);
  });

  it('writes only the active gesture', () => {
    const g = new GestureRunner(seq(0));
    const a = run(g, newAnim(), ['sway'], GESTURE_GAP[0] + 1.5);
    expect(a.sway).toBeGreaterThan(0.9);
    expect(a.groom + a.rear + a.fan + Math.abs(a.look)).toBe(0);
  });

  it('looks to one side and then the other', () => {
    const g = new GestureRunner(seq(0));
    const a = newAnim();
    const seen: number[] = [];
    for (let t = 0; t < GESTURE_GAP[0] + GESTURE_TIME.look[0]; t += 0.05) {
      g.update(0.05, a, ['look'], true);
      seen.push(a.look);
    }
    expect(Math.min(...seen)).toBeLessThan(-0.5);
    expect(Math.max(...seen)).toBeGreaterThan(0.5);
  });

  it('fades out quickly when the creature starts to move', () => {
    const g = new GestureRunner(seq(0.99));
    const a = newAnim();
    run(g, a, ['fan'], GESTURE_GAP[1] + 2);
    expect(a.fan).toBeGreaterThan(0.9);
    run(g, a, ['fan'], 0.6, false);
    expect(a.fan).toBe(0);
    expect(g.kind).toBeNull();
  });

  it('never starts while not allowed', () => {
    const g = new GestureRunner(seq(0));
    const a = run(g, newAnim(), ['groom', 'look', 'rear'], 30, false);
    expect(g.kind).toBeNull();
    expect(a.groom + a.rear + Math.abs(a.look)).toBe(0);
  });
});
