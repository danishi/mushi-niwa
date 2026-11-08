import { create } from 'zustand';
import { makeQuiz, type Question } from '../sim/quiz';
import type { SpeciesId } from '../sim/types';

interface QuizStore {
  questions: Question[];
  index: number;
  /** 今の 問題で えらんだ 番号（まだなら null） */
  picked: number | null;
  correct: number;
  start: (met: readonly SpeciesId[]) => void;
  pick: (i: number) => boolean;
  next: () => void;
}

export const useQuiz = create<QuizStore>()((set, get) => ({
  questions: [],
  index: 0,
  picked: null,
  correct: 0,
  start: (met) => set({ questions: makeQuiz(Math.random, met), index: 0, picked: null, correct: 0 }),
  pick: (i) => {
    const s = get();
    const q = s.questions[s.index];
    if (!q || s.picked !== null) return false;
    const ok = i === q.answer;
    set({ picked: i, correct: s.correct + (ok ? 1 : 0) });
    return ok;
  },
  next: () => set((s) => ({ index: s.index + 1, picked: null })),
}));
