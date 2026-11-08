import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deviceStorage } from '../save/storage';
import * as sim from '../sim/simulate';
import type { GameState, SpeciesId, ToolId } from '../sim/types';
import { playEvents, simEvents } from './events';

interface GameStore extends GameState {
  hydrated: boolean;
  /** 遊び時間を進める（通常モード: 画面表示中の経過、リアルタイム: 換算済み） */
  advance: (dtPlay: number, night: boolean, now: number) => void;
  adopt: (species: SpeciesId, slot: number) => void;
  useTool: (id: string, tool: ToolId, amount?: number) => boolean;
  pet: (id: string) => void;
  farewell: (id: string) => void;
  resetAll: () => void;
}

function pick(s: GameStore): GameState {
  return {
    version: s.version,
    creatures: s.creatures,
    memories: s.memories,
    met: s.met,
    playSeconds: s.playSeconds,
    lastTickAt: s.lastTickAt,
  };
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      ...sim.newGame(Date.now()),
      hydrated: false,
      advance: (dtPlay, night, now) => {
        const { state, events } = sim.advance(pick(get()), dtPlay, night);
        set({ ...state, lastTickAt: now });
        for (const e of events) simEvents.emit(e);
      },
      adopt: (species, slot) => {
        set(sim.adopt(pick(get()), species, slot, Date.now()));
        playEvents.emit('adopt');
      },
      useTool: (id, tool, amount) => {
        const r = sim.useTool(pick(get()), id, tool, amount);
        if (r.ok) set(r.state);
        return r.ok;
      },
      pet: (id) => {
        set(sim.pet(pick(get()), id));
        playEvents.emit('pet');
      },
      farewell: (id) => {
        set(sim.farewell(pick(get()), id, Date.now()));
        playEvents.emit('farewell');
      },
      resetAll: () => set(sim.newGame(Date.now())),
    }),
    {
      name: 'mushi-niwa:game',
      version: sim.SAVE_VERSION,
      storage: createJSONStorage(() => deviceStorage),
      partialize: (s) => pick(s),
      // セーブデータの形が変わったらここで移行する
      migrate: (persisted) => persisted as GameState,
      onRehydrateStorage: () => () => {
        useGame.setState({ hydrated: true });
      },
    },
  ),
);

export function creatureById(id: string | null) {
  if (!id) return undefined;
  return useGame.getState().creatures.find((c) => c.id === id);
}
