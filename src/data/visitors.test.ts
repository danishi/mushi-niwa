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
  it('teaches safety for dangerous visitors and explains ones from abroad', () => {
    // オオスズメバチは さわると 大あごを ならして 去る。大人向けの 注意と、こどもへの「はなれよう」が ある
    const hornet = VISITORS.oosuzumebachi;
    expect(hornet.react).toBe('warn');
    expect(hornet.caution).toBeTruthy();
    expect(hornet.facts[0]).toMatch(/はなれ/);
    // ハキリアリは 日本に いないことを ずかんで 説明する
    expect(VISITORS.hakiriari.abroad).toBeTruthy();
    // 刺す アリは タップで おどかしてから 去り、さいしょの 豆知識で「さわらない」を 教える
    for (const id of ['hiari', 'sashihariari'] as const) {
      expect(VISITORS[id].react).toBe('warn');
      expect(VISITORS[id].caution).toBeTruthy();
      expect(VISITORS[id].facts[0]).toMatch(/さわらない/);
    }
    // ヒアリの 大人向け 注意には 相談先が ある
    expect(VISITORS.hiari.caution).toContain('0570-046-110');
    for (const id of ['guntaiari', 'hiari', 'sashihariari'] as const) expect(VISITORS[id].abroad).toBeTruthy();
    for (const id of VISITOR_ORDER) {
      expect(VISITORS[id].facts.join('')).not.toContain('TODO');
      expect(VISITORS[id].sources.every((u) => u.startsWith('https://'))).toBe(true);
    }
  });
  it('explains what non-insects are', () => {
    for (const id of ['dangomushi', 'jorougumo', 'katatsumuri'] as const) expect(VISITORS[id].notInsect).toBeTruthy();
  });
});
