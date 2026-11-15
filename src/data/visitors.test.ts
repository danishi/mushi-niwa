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
    // セアカゴケグモは さわると しんだ ふり。見つけた ときは まず「さわらない」を 読む
    expect(VISITORS.seakagokegumo.safety).toBe(true);
    expect(VISITORS.seakagokegumo.facts[0]).toMatch(/さわらない/);
    expect(VISITORS.seakagokegumo.caution).toBeTruthy();
    // ペルビアンジャイアントオオムカデは タップで おどかしてから 去る。見つけた ときは まず「さわらない」、日本に いないことも 説明
    expect(VISITORS.oomukade.react).toBe('warn');
    expect(VISITORS.oomukade.safety).toBe(true);
    expect(VISITORS.oomukade.abroad).toBeTruthy();
    for (const id of ['hiari', 'sashihariari', 'oomukade'] as const) {
      expect(VISITORS[id].react).toBe('warn');
      expect(VISITORS[id].caution).toBeTruthy();
      expect(VISITORS[id].facts[0]).toMatch(/さわらない/);
    }
    // 大きな クモ 4 種は タップで いかくして 去る。見つけた ときは まず「さわらない」、大人向けの 注意も ある
    for (const id of ['kurodokushibogumo', 'kabakikomachigumo', 'ruburon', 'tarantula'] as const) {
      expect(VISITORS[id].react).toBe('warn');
      expect(VISITORS[id].safety).toBe(true);
      expect(VISITORS[id].facts[0]).toMatch(/さわらない/);
      expect(VISITORS[id].caution).toBeTruthy();
      expect(VISITORS[id].notInsect).toBeTruthy();
    }
    // カバキコマチグモは 日本に すむ。ほかの 3 種と ヘラクレス・オオエンマハンミョウは 日本に いない
    expect(VISITORS.kabakikomachigumo.abroad).toBeUndefined();
    for (const id of ['kurodokushibogumo', 'ruburon', 'tarantula', 'herakuresu', 'ooenmahanmyou'] as const) expect(VISITORS[id].abroad).toBeTruthy();
    // ヘラクレスは 夜に 飛んで きて 奥の 板に とまる。オオエンマハンミョウは とべない
    expect(VISITORS.herakuresu).toMatchObject({ where: 'post', flier: true, time: 'night' });
    expect(VISITORS.ooenmahanmyou).toMatchObject({ where: 'ground', flier: false });
    expect(VISITORS.herakuresu.caution).toMatch(/放さない/);
    // ヒアリの 大人向け 注意には 相談先が ある
    expect(VISITORS.hiari.caution).toContain('0570-046-110');
    for (const id of ['guntaiari', 'hiari', 'sashihariari'] as const) expect(VISITORS[id].abroad).toBeTruthy();
    for (const id of VISITOR_ORDER) {
      expect(VISITORS[id].facts.join('')).not.toContain('TODO');
      expect(VISITORS[id].sources.every((u) => u.startsWith('https://'))).toBe(true);
    }
  });
  it('explains what non-insects are', () => {
    for (const id of ['dangomushi', 'jorougumo', 'katatsumuri', 'seakagokegumo', 'oomukade', 'kurodokushibogumo', 'kabakikomachigumo', 'ruburon', 'tarantula', 'mimizu', 'ashidakagumo'] as const)
      expect(VISITORS[id].notInsect).toBeTruthy();
  });
  it('brings the earthworm and the huntsman spider out at night', () => {
    // ミミズは 夜に 板の 上を はって 来て、さわると ちぢむ。アシダカグモは 夜に 壁（奥の 板）を おりて きて、さわると 走って にげる
    expect(VISITORS.mimizu).toMatchObject({ where: 'ground', react: 'curl', flier: false, time: 'night' });
    expect(VISITORS.ashidakagumo).toMatchObject({ where: 'post', react: 'walk', flier: false, time: 'night' });
    // アシダカグモは 日本に すみつき、人に 危なくない（さわらない 注意から 始めない）
    expect(VISITORS.ashidakagumo.abroad).toBeUndefined();
    expect(VISITORS.ashidakagumo.safety).toBeUndefined();
    expect(VISITORS.ashidakagumo.caution).toBeTruthy();
    expect(visitorsAt(false)).not.toContain('mimizu');
    expect(visitorsAt(true)).toEqual(expect.arrayContaining(['mimizu', 'ashidakagumo']));
  });
});
