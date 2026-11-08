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

/** 遊びの できごと（シールの 記録に つかう）。ストアどうしが 直接 import しあわないための 中継 */
export type PlayEvent = 'care' | 'pet' | 'farewell' | 'adopt' | 'parts' | 'threat' | 'sumoWin' | 'photo';
type PlayListener = (e: PlayEvent) => void;
const playListeners = new Set<PlayListener>();
export const playEvents = {
  emit(e: PlayEvent) {
    for (const l of playListeners) l(e);
  },
  on(l: PlayListener): () => void {
    playListeners.add(l);
    return () => {
      playListeners.delete(l);
    };
  },
};
