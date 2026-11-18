import { describe, expect, it } from 'vitest';
import {
  advanceNest,
  ALATE_EGGS,
  ALATE_NEED,
  canDigAt,
  capacity,
  chooseSite,
  digAt,
  digFront,
  digging,
  EGG_T,
  flightReady,
  flyOne,
  groom,
  GROOM_BOOST,
  FOUNDING_EGGS,
  inFlightWindow,
  LAND_T,
  LARVA_T,
  MAX_BAITS,
  newNest,
  placeBait,
  pointAlong,
  polyLength,
  PUPA_T,
  roomAnchor,
  route,
  seasonAt,
  tunnelPoints,
  wantOf,
  YEAR,
  type Nest,
} from './nest';

const run = (n: Nest, sec: number) => advanceNest(n, sec).nest;

function founded(): Nest {
  return run(chooseSite(newNest(), 0.5), LAND_T + 0.5);
}

/** 最初の はたらきアリが 生まれるまで */
function withWorkers(): Nest {
  return run(founded(), FOUNDING_EGGS * 5 + EGG_T + LARVA_T + PUPA_T + 5);
}

describe('ant nest', () => {
  it('starts empty and asks for a site', () => {
    const n = newNest();
    expect(n.phase).toBe('empty');
    expect(wantOf(n)).toBe('site');
    expect(advanceNest(n, 100).nest).toBe(n);
  });

  it('the queen lands, digs the first chamber and starts founding', () => {
    let n = chooseSite(newNest(), 0.5);
    expect(n.phase).toBe('landing');
    expect(n.rooms).toHaveLength(1);
    expect(n.rooms[0]!.use).toBe('queen');
    const r = advanceNest(n, LAND_T + 0.5);
    n = r.nest;
    expect(n.phase).toBe('founding');
    expect(n.rooms[0]!.dug).toBe(1);
    expect(r.events).toContainEqual({ type: 'founded' });
  });

  it('the founding queen raises about 10 first workers without any food', () => {
    const n = withWorkers();
    expect(n.sugar).toBe(0);
    expect(n.protein).toBe(0);
    expect(n.phase).toBe('colony');
    expect(n.workers).toBeGreaterThanOrEqual(1);
    const later = run(n, 120);
    expect(later.workers + later.brood.length).toBe(FOUNDING_EGGS);
  });

  it('the first worker comes in under two minutes of play', () => {
    const r = advanceNest(founded(), EGG_T + LARVA_T + PUPA_T + 10);
    expect(r.events.some((e) => e.type === 'born' && e.first)).toBe(true);
  });

  it('larvae wait for insects (protein) and then grow; no one dies', () => {
    let n = run(withWorkers(), 120);
    // へやが いっぱいだと うまない。へやを ほって、さとうで たまごを うむ
    n = { ...n, sugar: 10 };
    expect(run(n, 30).brood.some((b) => !b.reserve)).toBe(false);
    const dug = digAt(n, { x: -1.5, y: -2 });
    expect(dug.ok).toBe(true);
    if (dug.ok) n = run(dug.nest, 60);
    n = run(n, 100);
    expect(n.brood.some((b) => !b.reserve)).toBe(true);
    const workers = n.workers;
    n = run(n, 400);
    expect(n.brood.some((b) => b.stage === 'larva' && !b.reserve && b.age >= LARVA_T)).toBe(true);
    expect(wantOf(n)).toBe('bug');
    expect(n.workers).toBe(workers);
    const fed = run({ ...n, protein: 10 }, PUPA_T + 5);
    expect(fed.workers).toBeGreaterThan(workers);
  });

  it('workers carry baits into the food stores', () => {
    const n = withWorkers();
    const placed = placeBait(n, -1, 'sugar');
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const after = run(placed.nest, 120);
    expect(after.baits).toHaveLength(0);
    expect(after.sugar).toBeGreaterThan(0);
  });

  it('baits are limited and need workers', () => {
    expect(placeBait(newNest(), 0, 'bug').ok).toBe(false);
    let n = founded();
    for (let i = 0; i < MAX_BAITS; i++) {
      const r = placeBait(n, i - 1, 'bug');
      expect(r.ok).toBe(true);
      if (r.ok) n = r.nest;
    }
    expect(placeBait(n, 1, 'bug')).toEqual({ ok: false, reason: 'full' });
    // むしの えさが いっぱいでも あまい みつは おける（運べない えさで ふさがらない）
    expect(placeBait({ ...n, protein: 20 }, 1, 'sugar').ok).toBe(true);
    // はたらきアリが いない 間は 運ばれない（女王は 外へ 出ない）
    expect(run(n, 10).baits).toHaveLength(MAX_BAITS);
  });

  it('digging a room needs enough workers and a free place', () => {
    const n = withWorkers();
    const near = { x: n.rooms[0]!.x, y: n.rooms[0]!.y };
    expect(canDigAt(n, near)).toEqual({ ok: false, reason: 'place' });
    expect(canDigAt(n, { x: 0, y: -0.2 })).toEqual({ ok: false, reason: 'place' });
    const few = { ...n, workers: 1 };
    expect(canDigAt(few, { x: -1.5, y: -2 })).toEqual({ ok: false, reason: 'few' });
    const r = digAt({ ...n, workers: 3 }, { x: -1.5, y: -2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(digging(r.nest)).toBeDefined();
    expect(canDigAt(r.nest, { x: 1.5, y: -3 })).toEqual({ ok: false, reason: 'busy' });
    const done = advanceNest(r.nest, 120);
    expect(digging(done.nest)).toBeUndefined();
    expect(done.events.some((e) => e.type === 'room')).toBe(true);
    expect(capacity(done.nest)).toBe(capacity(n) + 10);
  });

  it('routes run continuously through the tunnels', () => {
    let n = { ...withWorkers(), workers: 10 };
    for (const p of [
      { x: -1.5, y: -2 },
      { x: 1.6, y: -2.6 },
    ]) {
      const r = digAt(n, p);
      expect(r.ok).toBe(true);
      if (r.ok) n = run(r.nest, 200);
    }
    const [a, b, c] = n.rooms;
    const path = route(n, { room: b!.id }, { room: c!.id });
    expect(path[0]).toEqual(roomAnchor(b!));
    expect(path[path.length - 1]).toEqual(roomAnchor(c!));
    for (let i = 1; i < path.length; i++) {
      expect(Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y)).toBeLessThan(2.5);
    }
    const out = route(n, { room: a!.id }, { surface: 2 });
    expect(out[out.length - 1]).toEqual({ x: 2, y: 0 });
    expect(out.some((p) => p.x === n.entranceX && p.y === 0)).toBe(true);
    const len = polyLength(out);
    expect(pointAlong(out, len + 1).p).toEqual({ x: 2, y: 0 });
    // 入口からの トンネルは 地面から はじまる
    expect(tunnelPoints(n, a!)[0]).toEqual({ x: n.entranceX, y: 0 });
    const dig = digAt({ ...n, workers: 20, t: 0 }, { x: 0, y: -3.3 });
    expect(dig.ok).toBe(true);
    if (dig.ok) {
      const front = digFront(dig.nest, digging(dig.nest)!);
      expect(front).toEqual(tunnelPoints(dig.nest, digging(dig.nest)!)[0]);
    }
  });

  it('seasons cycle through the year and winter pauses the nest', () => {
    expect(seasonAt(0)).toBe('natsu');
    expect(seasonAt(YEAR * 0.4)).toBe('aki');
    expect(seasonAt(YEAR * 0.7)).toBe('fuyu');
    expect(seasonAt(YEAR * 0.85)).toBe('haru');
    expect(seasonAt(YEAR * 1.1)).toBe('natsu');
    const winter = { ...withWorkers(), t: YEAR * 0.67, sugar: 10 };
    const after = run(winter, 60);
    expect(after.brood).toEqual(winter.brood.map((b) => ({ ...b })));
    expect(wantOf(after)).toBe('winter');
  });

  it('a big enough colony raises winged ants in spring and they fly in May-June', () => {
    let n: Nest = { ...withWorkers(), workers: ALATE_NEED, t: YEAR * 0.81, protein: 20, sugar: 0 };
    n = run(n, 2);
    expect(n.brood.filter((b) => b.alate)).toHaveLength(ALATE_EGGS);
    n = run(n, EGG_T + LARVA_T + PUPA_T + 5);
    expect(n.alates).toBe(ALATE_EGGS);
    // 5〜6 月の ころに とびたつ
    n = run(n, Math.max(0, YEAR * 0.9 - n.t + 1));
    expect(inFlightWindow(n.t)).toBe(true);
    expect(inFlightWindow(YEAR * 0.8)).toBe(false);
    expect(flightReady(n)).toBe(true);
    expect(wantOf(n)).toBe('flight');
    for (let i = 0; i < ALATE_EGGS; i++) n = flyOne(n);
    expect(n.alates).toBe(0);
    expect(n.flown).toBe(ALATE_EGGS);
    expect(flyOne(n)).toBe(n);
    // 同じ 年には もう 育てない
    n = run(n, 10);
    expect(n.brood.filter((b) => b.alate)).toHaveLength(0);
  });

  it('grooming the brood speeds it up, but hungry larvae still wait for insects', () => {
    const n = founded();
    const laid = run(n, 6);
    const g = groom(laid);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.nest.brood[0]!.age).toBeCloseTo(laid.brood[0]!.age + GROOM_BOOST);
    // 何度も 手つだうと 最初の はたらきアリが 早く 生まれる
    let helped = laid;
    for (let i = 0; i < 30; i++) {
      const r = groom(helped);
      if (r.ok) helped = r.nest;
    }
    expect(run(helped, 10).workers).toBeGreaterThan(0);
    expect(run(laid, 10).workers).toBe(0);
    expect(groom(newNest())).toEqual({ ok: false, reason: 'phase' });
    expect(groom({ ...laid, t: YEAR * 0.7 })).toEqual({ ok: false, reason: 'winter' });
    const waiting = { ...withWorkers(), brood: [{ stage: 'larva' as const, age: LARVA_T, alate: false, reserve: false }] };
    expect(groom(waiting)).toEqual({ ok: false, reason: 'none' });
    expect(wantOf(laid)).toBe('founding');
  });

  it('long catch-up is capped and stays consistent', () => {
    const n = run(withWorkers(), YEAR * 10);
    expect(n.t).toBeLessThan(YEAR * 3);
    expect(n.workers).toBeLessThanOrEqual(60);
  });
});
