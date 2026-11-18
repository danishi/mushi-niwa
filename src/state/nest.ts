import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deviceStorage } from '../save/storage';
import * as ns from '../sim/nest';
import { playEvents } from './events';

/**
 * アリの すづくりの 状態（端末内に 保存）。時間は `SimDriver` が ほかの 虫と いっしょに 進める。
 * できごと（生まれた・へやが できた・季節）は `nestEvents` で 3D と HUD に 届ける。
 */
interface NestStore {
  nest: ns.Nest;
  hydrated: boolean;
  advance: (dtPlay: number) => void;
  chooseSite: (x: number) => void;
  placeBait: (x: number, kind: ns.BaitKind) => ns.BaitResult['ok'] | 'full' | 'phase';
  digAt: (p: ns.Pt) => true | Exclude<ns.DigCheck, { ok: true }>['reason'];
  flyOne: () => boolean;
  groom: () => true | Exclude<ns.GroomResult, { ok: true }>['reason'];
  reset: () => void;
}

type Listener = (e: ns.NestEvent) => void;
const listeners = new Set<Listener>();
export const nestEvents = {
  emit(e: ns.NestEvent) {
    for (const l of listeners) l(e);
  },
  on(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export const useNest = create<NestStore>()(
  persist(
    (set, get) => ({
      nest: ns.newNest(),
      hydrated: false,
      advance: (dt) => {
        const { nest, events } = ns.advanceNest(get().nest, dt);
        if (nest !== get().nest) set({ nest });
        for (const e of events) {
          if (e.type === 'born') playEvents.emit('antBorn');
          nestEvents.emit(e);
        }
      },
      chooseSite: (x) => {
        const before = get().nest;
        const nest = ns.chooseSite(before, x);
        if (nest === before) return;
        set({ nest });
        playEvents.emit('nestFound');
      },
      placeBait: (x, kind) => {
        const r = ns.placeBait(get().nest, x, kind);
        if (!r.ok) return r.reason;
        set({ nest: r.nest });
        return true;
      },
      digAt: (p) => {
        const r = ns.digAt(get().nest, p);
        if (!r.ok) return r.reason;
        set({ nest: r.nest });
        return true;
      },
      flyOne: () => {
        const before = get().nest;
        const nest = ns.flyOne(before);
        if (nest === before) return false;
        set({ nest });
        playEvents.emit('nestFlight');
        return true;
      },
      groom: () => {
        const r = ns.groom(get().nest);
        if (!r.ok) return r.reason;
        set({ nest: r.nest });
        return true;
      },
      reset: () => set({ nest: ns.newNest() }),
    }),
    {
      name: 'mushi-niwa:nest',
      version: 1,
      storage: createJSONStorage(() => deviceStorage),
      partialize: (s) => ({ nest: s.nest }),
      // 古い 保存データに ない 項目は 新しい 巣の 値で うめる
      merge: (persisted, current) => ({ ...current, nest: { ...ns.newNest(), ...((persisted as { nest?: Partial<ns.Nest> } | undefined)?.nest ?? {}) } }),
      onRehydrateStorage: () => () => {
        useNest.setState({ hydrated: true });
      },
    },
  ),
);
