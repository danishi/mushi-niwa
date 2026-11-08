import { describe, expect, it } from 'vitest';
import { SPECIES, SPECIES_ORDER } from '../data/species';
import {
  adopt,
  advance,
  conditionOf,
  dayPhase,
  farewell,
  newGame,
  nightFromPhase,
  playSecondsFor,
  REALTIME_SCALE,
  tick,
  useTool,
} from './simulate';
import type { GameState } from './types';

const NOW = 1_700_000_000_000;
const fixedRand = () => 0.1;

function careAll(s: GameState): GameState {
  for (const c of s.creatures) {
    for (const t of ['food', 'mist', 'scoop', 'house'] as const) s = useTool(s, c.id, t).state;
  }
  return s;
}

describe('species data', () => {
  it('has consistent stages for every species', () => {
    for (const id of SPECIES_ORDER) {
      const sp = SPECIES[id];
      expect(sp.stages.length).toBeGreaterThan(0);
      for (const st of sp.stages) {
        expect(st.playMinutes).toBeGreaterThan(0);
        expect(st.parts.length).toBeGreaterThan(0);
        // ごはんを食べない段階に food 道具はない
        if (st.food === 'none') expect(st.tools).not.toContain('food');
      }
      expect(sp.sources.length).toBeGreaterThan(0);
    }
  });
  it('raises Pheropsophus only as an adult', () => {
    expect(SPECIES.miidera.stages.map((s) => s.id)).toEqual(['adult']);
  });
});

describe('simulation', () => {
  it('adopts into an empty slot only', () => {
    let s = adopt(newGame(NOW), 'kabutomushi', 0, NOW, fixedRand);
    s = adopt(s, 'kaiko', 0, NOW, fixedRand);
    expect(s.creatures).toHaveLength(1);
    expect(s.met).toEqual(['kabutomushi']);
  });

  it('never kills: neglected creatures become genkiganai and stop growing', () => {
    let s = adopt(newGame(NOW), 'kabutomushi', 0, NOW, fixedRand);
    s = advance(s, 60 * 60 * 3, false).state;
    const c = s.creatures[0]!;
    expect(c).toBeDefined();
    expect(conditionOf(c)).toBe('genkiganai');
    const before = c.progress;
    s = tick(s, 600, false).state;
    expect(s.creatures[0]!.progress).toBe(before);
  });

  it('recovers when cared for', () => {
    let s = adopt(newGame(NOW), 'kabutomushi', 0, NOW, fixedRand);
    s = advance(s, 60 * 60, false).state;
    expect(conditionOf(s.creatures[0]!)).toBe('genkiganai');
    s = careAll(s);
    for (let i = 0; i < 5; i++) s = useTool(s, s.creatures[0]!.id, 'mist').state;
    for (let i = 0; i < 5; i++) s = useTool(s, s.creatures[0]!.id, 'scoop').state;
    s = tick(s, 120, false).state;
    expect(conditionOf(s.creatures[0]!)).not.toBe('genkiganai');
  });

  it('goes through the whole life cycle with care and emits growth events', () => {
    for (const id of SPECIES_ORDER) {
      let s = adopt(newGame(NOW), id, 0, NOW, fixedRand);
      const kinds: string[] = [];
      for (let i = 0; i < 400 && !s.creatures[0]!.finished; i++) {
        s = careAll(s);
        const r = tick(s, 60, false);
        s = r.state;
        kinds.push(...r.events.map((e) => (e.type === 'grow' ? `grow:${e.event}` : e.type)));
      }
      const c = s.creatures[0]!;
      expect(c.finished, id).toBe(true);
      expect(c.stage).toBe(SPECIES[id].stages.length - 1);
      expect(c.stagesSeen).toEqual(SPECIES[id].stages.map((st) => st.id));
      expect(kinds).toContain('finished');
      const molts = SPECIES[id].stages.reduce((n, st) => n + (st.molts ?? 0), 0);
      expect(kinds.filter((k) => k === 'molt')).toHaveLength(molts);
    }
  });

  it('only allows tools valid for the stage', () => {
    const s = adopt(newGame(NOW), 'kaiko', 0, NOW, fixedRand);
    expect(useTool(s, s.creatures[0]!.id, 'food').ok).toBe(false); // たまご
    expect(useTool(s, s.creatures[0]!.id, 'mist').ok).toBe(false); // カイコに霧吹きはしない
  });

  it('records a memory card on farewell', () => {
    let s = adopt(newGame(NOW), 'miidera', 2, NOW, fixedRand);
    s = farewell(s, s.creatures[0]!.id, NOW + 1000);
    expect(s.creatures).toHaveLength(0);
    expect(s.memories[0]).toMatchObject({ species: 'miidera', farewell: 'mori' });
  });
});

describe('time', () => {
  it('scales real time in realtime mode and caps catch-up', () => {
    expect(playSecondsFor(60_000, false)).toBe(60);
    expect(playSecondsFor(3_600_000, true)).toBeCloseTo(3600 * REALTIME_SCALE);
    expect(playSecondsFor(10 * 24 * 3_600_000, true)).toBeCloseTo(24 * 3600 * REALTIME_SCALE);
  });
  it('maps device clock to day and night in realtime mode', () => {
    const at = (h: number) => new Date(2026, 6, 1, h, 0, 0).getTime();
    expect(nightFromPhase(dayPhase(0, true, at(12)))).toBe(false);
    expect(nightFromPhase(dayPhase(0, true, at(21)))).toBe(true);
    expect(nightFromPhase(dayPhase(0, true, at(3)))).toBe(true);
    expect(nightFromPhase(dayPhase(0, true, at(7)))).toBe(false);
  });
});
