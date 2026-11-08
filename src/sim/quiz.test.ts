import { describe, expect, it } from 'vitest';
import { SPECIES, SPECIES_ORDER } from '../data/species';
import { FOOD_GROUP, makeQuiz, QUIZ_LENGTH } from './quiz';

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
});
