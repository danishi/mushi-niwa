import { describe, expect, it } from 'vitest';
import { SPECIES, SPECIES_ORDER } from '../data/species';
import { VISITORS } from '../data/visitors';
import { FOOD_GROUP, makeQuiz, QUIZ_LENGTH, type Question } from './quiz';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('quiz', () => {
  it('makes a full round of valid 3-choice questions', () => {
    for (let seed = 1; seed < 60; seed++) {
      const qs = makeQuiz(seeded(seed), seed % 2 ? ['kabutomushi', 'nanahoshi', 'suzumushi'] : []);
      expect(qs).toHaveLength(QUIZ_LENGTH);
      for (const q of qs) {
        expect(q.choices).toHaveLength(3);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(3);
        // 選択肢が かぶらない
        expect(new Set(q.choices.map((c) => JSON.stringify(c))).size).toBe(3);
        expect(q.explain.length).toBeGreaterThan(0);
      }
    }
  });

  it('food questions only offer one food the species actually eats', () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const q of makeQuiz(seeded(seed), SPECIES_ORDER)) {
        if (q.kind !== 'food') continue;
        const sp = SPECIES[q.subject!.species];
        const eaten = new Set(sp.stages.map((s) => FOOD_GROUP[s.food]));
        const hits = q.choices.filter((c) => c.kind === 'food' && eaten.has(FOOD_GROUP[c.id]));
        expect(hits).toHaveLength(1);
        // 見た目（アイコン）で 区別できる
        expect(new Set(q.choices.map((c) => (c.kind === 'food' ? FOOD_GROUP[c.id] : ''))).size).toBe(3);
      }
    }
  });

  it('night and not-insect questions have exactly one right answer', () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const q of makeQuiz(seeded(seed), [])) {
        if (q.kind === 'night') {
          const hits = q.choices.filter((c) => c.kind === 'species' && SPECIES[c.id].stages.at(-1)!.activity === 'night');
          expect(hits).toHaveLength(1);
        }
        if (q.kind === 'notInsect') {
          const hits = q.choices.filter((c) => c.kind === 'species' && SPECIES[c.id].notInsect);
          expect(hits).toHaveLength(1);
        }
      }
    }
  });

  const many = (guests = false): Question[] => {
    const out: Question[] = [];
    for (let seed = 1; seed < 300; seed++) out.push(...makeQuiz(seeded(seed), [], QUIZ_LENGTH, guests ? ['dangomushi', 'hotaru'] : []));
    return out;
  };

  it('asks every kind of question', () => {
    const kinds = new Set(many().map((q) => q.kind));
    for (const k of ['who', 'food', 'night', 'notInsect', 'legs', 'young', 'noPupa', 'water', 'guest', 'abroad', 'safety']) {
      expect(kinds).toContain(k);
    }
  });

  it('young questions show a larva or nymph and never mix look-alike grubs', () => {
    const grubs = new Set(['kabutomushi', 'nokogiri', 'ookuwagata', 'gomadara']);
    for (const q of many()) {
      if (q.kind !== 'young') continue;
      const sp = SPECIES[q.subject!.species];
      expect(['larva', 'nymph']).toContain(sp.stages[q.subject!.stage]!.id);
      const ans = q.choices[q.answer]!;
      expect(ans).toEqual({ kind: 'species', id: sp.id });
      if (grubs.has(sp.id)) {
        const others = q.choices.filter((c, i) => i !== q.answer && c.kind === 'species' && grubs.has(c.id));
        expect(others).toHaveLength(0);
      }
    }
  });

  it('pupa and water questions have exactly one right answer', () => {
    const pupa = (id: keyof typeof SPECIES) => SPECIES[id].stages.some((s) => s.id === 'pupa' || s.id === 'cocoon');
    const water = (id: keyof typeof SPECIES) =>
      SPECIES[id].habitat.substrate === 'water' || SPECIES[id].stages.some((s) => s.habitat?.substrate === 'water');
    for (const q of many()) {
      const ids = q.choices.map((c) => (c.kind === 'species' ? c.id : null)).filter((x) => x !== null);
      if (q.kind === 'noPupa') {
        expect(ids.filter((id) => !pupa(id))).toEqual([ids[q.answer]]);
        // 成虫だけを 育てる 種（幼虫期が データに ない）や 昆虫でない 種は 出さない
        for (const id of ids) {
          expect(SPECIES[id].stages.length).toBeGreaterThan(1);
          expect(SPECIES[id].notInsect).toBeUndefined();
        }
      }
      if (q.kind === 'water') expect(ids.filter(water)).toEqual([ids[q.answer]]);
    }
  });

  it('visitor questions use visitor choices with exactly one right answer', () => {
    for (const q of many(true)) {
      if (q.kind !== 'guest' && q.kind !== 'abroad' && q.kind !== 'safety') continue;
      const ids = q.choices.map((c) => {
        expect(c.kind).toBe('visitor');
        return c.kind === 'visitor' ? c.id : 'shiokara';
      });
      if (q.kind === 'guest') expect(ids[q.answer]).toBe(q.guest);
      if (q.kind === 'abroad') expect(ids.filter((id) => VISITORS[id].abroad)).toEqual([ids[q.answer]]);
      if (q.kind === 'safety') {
        expect(ids.filter((id) => VISITORS[id].safety)).toEqual([ids[q.answer]]);
        // ほかの 選択肢は おどかさない・日本に いる 子
        for (const id of ids.filter((_, i) => i !== q.answer)) {
          expect(VISITORS[id].react).not.toBe('warn');
          expect(VISITORS[id].abroad).toBeUndefined();
        }
      }
    }
  });
});
