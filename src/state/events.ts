import type { SimEvent } from '../sim/types';

type Listener = (e: SimEvent) => void;
const listeners = new Set<Listener>();

/** シミュレーションのイベント（成長・脱皮など）を 3D 演出や効果音に届ける */
export const simEvents = {
  emit(e: SimEvent) {
    for (const l of listeners) l(e);
  },
  on(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
