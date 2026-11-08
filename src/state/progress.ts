import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STICKERS } from '../data/stickers';
import { deviceStorage } from '../save/storage';
import * as pg from '../sim/progress';
import { isFinalStage } from '../sim/simulate';
import { env } from './env';
import { playEvents, simEvents } from './events';
import { useGame } from './game';

interface ProgressStore extends pg.Progress {
  hydrated: boolean;
  /** 画面に 出す まえの もらいたて シール（保存しない） */
  toast: string[];
  bump: (key: pg.StatKey, by?: number) => void;
  foundVisitor: (id: string) => void;
  /** 条件を 見なおして、満たした シールを わたす */
  check: () => void;
  shiftToast: () => void;
  reset: () => void;
}

function pick(s: ProgressStore): pg.Progress {
  return { stats: s.stats, stickers: s.stickers, visitors: s.visitors };
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...pg.newProgress(),
      hydrated: false,
      toast: [],
      bump: (key, by = 1) => {
        set(pg.bump(pick(get()), key, by));
        get().check();
      },
      foundVisitor: (id) => {
        set(pg.addVisitor(pick(get()), id));
        get().check();
      },
      check: () => {
        const s = get();
        // 読みこみ前に 判定すると 保存データで 上書きされるので 待つ
        if (!s.hydrated || !useGame.getState().hydrated) return;
        const earned = pg.newlyEarned(pick(s), { met: useGame.getState().met.length }, STICKERS);
        if (earned.length === 0) return;
        set({ ...pg.grant(pick(s), earned), toast: [...s.toast, ...earned] });
      },
      shiftToast: () => set((s) => ({ toast: s.toast.slice(1) })),
      reset: () => set({ ...pg.newProgress(), toast: [] }),
    }),
    {
      name: 'mushi-niwa:progress',
      version: 1,
      storage: createJSONStorage(() => deviceStorage),
      partialize: (s) => pick(s),
      onRehydrateStorage: () => () => {
        useProgress.setState({ hydrated: true });
      },
    },
  ),
);

/** 成長・脱皮の できごとを 記録する */
simEvents.on((e) => {
  const p = useProgress.getState();
  if (e.type === 'molt') p.bump('molt');
  if (e.type === 'grow') {
    p.bump('grow');
    if (e.event === 'molt') p.bump('molt');
    const c = useGame.getState().creatures.find((x) => x.id === e.id);
    if (c && isFinalStage(c)) p.bump('adult');
  }
});

/** 遊びの できごとを 記録する */
playEvents.on((e) => {
  const p = useProgress.getState();
  switch (e) {
    case 'adopt':
      p.check();
      break;
    case 'care':
      p.bump('care');
      if (env.night > 0.5) p.bump('nightCare');
      break;
    default:
      p.bump(e);
  }
});
