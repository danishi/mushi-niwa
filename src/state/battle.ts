import { create } from 'zustand';
import { BATTLE } from '../data/battle';
import { SPECIES } from '../data/species';
import * as b from '../sim/battle';
import type { SpeciesId } from '../sim/types';

/** 画面に 大きく 出す ことば（はっけよい・技の 名前・ふんばれ など） */
export interface Callout {
  text: string;
  tone: 'start' | 'great' | 'good' | 'tell' | 'brace' | 'special' | 'cpu' | 'end';
  at: number;
}

type FxListener = (e: b.BattleEvent) => void;
const fxListeners = new Set<FxListener>();

/** 取組の できごとを 3D の 演出（カメラ・土けむり・おきゃくさん）に 届ける */
export const battleFx = {
  emit(e: b.BattleEvent) {
    for (const l of fxListeners) l(e);
  },
  on(l: FxListener): () => void {
    fxListeners.add(l);
    return () => {
      fxListeners.delete(l);
    };
  },
};

/** 技の 瞬間は ゆっくり（見せ場）。取組の 時間も いっしょに ゆっくり 進む */
const SLOW = { seconds: 0.7, scale: 0.3 };

interface BattleStore {
  state: b.BattleState | null;
  /** 技の説明（ほんとうの話） */
  fact: string | null;
  /** fact を 出した 時刻（同じ 技を 2 回 出しても 読みあげる） */
  factAt: number;
  callout: Callout | null;
  /** 取組の 番号（もういちど でも 3D を 作りなおす） */
  round: number;
  /** ゆっくりに する 終わりの 時刻（performance.now） */
  slowUntil: number;
  begin: (player: SpeciesId, pool: SpeciesId[]) => void;
  push: () => void;
  special: () => void;
  step: (dt: number) => void;
  reset: () => void;
}

const GRADE_TEXT = { good: 'いいね！', great: 'すごい！' } as const;

export const useBattle = create<BattleStore>()((set, get) => {
  /** できごとを 演出と ことばに する */
  function handle(s: b.BattleState, events: b.BattleEvent[]) {
    const now = performance.now();
    let patch: Partial<BattleStore> = {};
    for (const e of events) {
      switch (e.type) {
        case 'start':
          patch.callout = { text: 'のこった！', tone: 'start', at: now };
          break;
        case 'push':
          // 同じ タップの「ふんばれ」を 上書き しない
          if (e.grade !== 'ok' && patch.callout?.tone !== 'brace') {
            const combo = e.combo >= 2 ? ` ×${e.combo}` : '';
            patch.callout = { text: `${GRADE_TEXT[e.grade]}${combo}`, tone: e.grade, at: now };
          }
          break;
        case 'tell':
          patch.callout = { text: 'くるよ！ ふんばれ！', tone: 'tell', at: now };
          break;
        case 'brace':
          patch.callout = { text: e.brace === 'full' ? 'いまだ！ ふんばれ！' : 'ふんばれ！', tone: 'brace', at: now };
          break;
        case 'special': {
          const who = e.who === 'player' ? s.player : s.cpu;
          const sp = BATTLE[who].special;
          if (e.brace === 'full') {
            patch.callout = { text: 'ふんばった！', tone: 'great', at: now };
            patch.fact = `${SPECIES[who].name}の「${sp.label}」を うけとめたよ！`;
            patch.factAt = now;
          } else {
            patch.callout = { text: `${sp.label}！`, tone: e.who === 'player' ? 'special' : 'cpu', at: now };
            patch.fact = sp.fact;
            patch.factAt = now;
            patch.slowUntil = now + SLOW.seconds * 1000;
          }
          break;
        }
        case 'end':
          patch.callout = {
            text: e.result === 'draw' ? 'ひきわけ！' : `${SPECIES[e.result === 'win' ? s.player : s.cpu].name}の かち！`,
            tone: 'end',
            at: now,
          };
          break;
      }
    }
    // 先に 状態を 入れてから 3D の 演出へ（演出は 新しい meter の 位置で 土けむりを 出す）
    patch = { ...patch, state: s };
    set(patch);
    for (const e of events) battleFx.emit(e);
  }
  return {
    state: null,
    fact: null,
    factAt: 0,
    callout: null,
    round: 0,
    slowUntil: 0,
    begin: (player, pool) =>
      set((st) => ({ state: b.startBattle(player, b.pickOpponent(player, pool)), fact: null, slowUntil: 0, callout: null, round: st.round + 1 })),
    push: () => {
      const s = get().state;
      if (!s) return;
      const r = b.playerPush(s);
      if (r.state !== s) handle(r.state, r.events);
    },
    special: () => {
      const s = get().state;
      if (!s) return;
      const r = b.playerSpecial(s);
      if (r.state !== s) handle(r.state, r.events);
    },
    step: (dt) => {
      const s = get().state;
      if (!s || s.result) return;
      const scale = performance.now() < get().slowUntil ? SLOW.scale : 1;
      const r = b.stepBattle(s, dt * scale);
      if (r.events.length) handle(r.state, r.events);
      else set({ state: r.state });
    },
    reset: () => set({ state: null, fact: null, callout: null, slowUntil: 0 }),
  };
});
