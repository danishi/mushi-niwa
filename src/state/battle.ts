import { create } from 'zustand';
import { BATTLE } from '../data/battle';
import * as b from '../sim/battle';
import type { SpeciesId } from '../sim/types';

export type BattleFx = { kind: 'push' | 'special' | 'cpuSpecial' | 'end'; at: number };

interface BattleStore {
  state: b.BattleState | null;
  /** 演出用：最後に起きたこと */
  fx: BattleFx | null;
  /** 技の説明（ほんとうの話） */
  fact: string | null;
  begin: (player: SpeciesId, pool: SpeciesId[]) => void;
  push: () => void;
  special: () => void;
  step: (dt: number) => void;
  reset: () => void;
}

export const useBattle = create<BattleStore>()((set, get) => ({
  state: null,
  fx: null,
  fact: null,
  begin: (player, pool) => set({ state: b.startBattle(player, b.pickOpponent(player, pool)), fx: null, fact: null }),
  push: () => {
    const s = get().state;
    if (!s) return;
    const next = b.playerPush(s);
    if (next !== s) set({ state: next, fx: { kind: next.result ? 'end' : 'push', at: performance.now() } });
  },
  special: () => {
    const s = get().state;
    if (!s) return;
    const next = b.playerSpecial(s);
    if (next !== s)
      set({ state: next, fx: { kind: next.result ? 'end' : 'special', at: performance.now() }, fact: BATTLE[s.player].special.fact });
  },
  step: (dt) => {
    const s = get().state;
    if (!s || s.result) return;
    const r = b.stepBattle(s, dt);
    const ended = !!r.state.result;
    set({
      state: r.state,
      ...(r.cpuUsedSpecial ? { fx: { kind: 'cpuSpecial' as const, at: performance.now() }, fact: BATTLE[s.cpu].special.fact } : {}),
      ...(ended ? { fx: { kind: 'end' as const, at: performance.now() } } : {}),
    });
  },
  reset: () => set({ state: null, fx: null, fact: null }),
}));
