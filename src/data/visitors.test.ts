import { describe, expect, it } from 'vitest';
import { VISITORS, VISITOR_ORDER, visitorsAt } from './visitors';

describe('garden visitors', () => {
  it('lists every visitor once, each with facts and sources', () => {
    expect(new Set(VISITOR_ORDER).size).toBe(VISITOR_ORDER.length);
    expect(VISITOR_ORDER.length).toBe(Object.keys(VISITORS).length);
    for (const id of VISITOR_ORDER) {
      const v = VISITORS[id];
      expect(v.id).toBe(id);
      expect(v.facts.length).toBeGreaterThan(0);
      expect(v.sources.length).toBeGreaterThan(0);
    }
  });
  it('sends only night-active visitors at night, and no night-only ones by day', () => {
    const night = visitorsAt(true);
    const day = visitorsAt(false);
    expect(night).toContain('hotaru');
    expect(night).toContain('dangomushi');
    expect(night).not.toContain('monshiro');
    expect(day).not.toContain('hotaru');
    expect(day).toContain('dangomushi');
    for (const id of night) expect(VISITORS[id].time).not.toBe('day');
    for (const id of day) expect(VISITORS[id].time).not.toBe('night');
  });
  it('explains what non-insects are', () => {
    for (const id of ['dangomushi', 'jorougumo', 'katatsumuri'] as const) expect(VISITORS[id].notInsect).toBeTruthy();
  });
});
