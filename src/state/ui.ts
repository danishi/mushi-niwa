import { create } from 'zustand';
import type { VisitorId } from '../data/visitors';
import type { SpeciesId } from '../sim/types';

export type Screen = 'boot' | 'title' | 'garden' | 'care' | 'observe' | 'zukan' | 'battle' | 'quiz';

export type ZukanTab = 'mushi' | 'guest' | 'sticker' | 'photo';

export interface Cinematic {
  kind: 'grow' | 'farewell' | 'tool';
  target: [number, number, number];
  label: string;
  until: number;
}

export interface UiState {
  screen: Screen;
  /** 選択中の虫ケース（お世話・かんさつ対象） */
  selectedId: string | null;
  settingsOpen: boolean;
  /** 道具をドラッグ中はカメラ操作を止める */
  dragging: boolean;
  cinematic: Cinematic | null;
  /** かんさつモードで選んだ部位 */
  observedPart: string | null;
  /** 空き棚をタップしたときの種えらび */
  pickingSlot: number | null;
  /** お世話の あとの 虫の よろこび（吹き出しに 出す） */
  reaction: { text: string; until: number } | null;
  setReaction: (r: { text: string; until: number } | null) => void;
  /** 画面全体を おおう 大人向けの パネル（ゲート・設定）を 開いている数。開いている間は 3D の 描画を 止める */
  overlays: number;
  pushOverlay: (d: 1 | -1) => void;
  /** はじめての お手本の 段階（0: なし、1: 吹き出しを見て、2: 道具を押して） */
  tutorialStep: 0 | 1 | 2;
  setTutorialStep: (s: 0 | 1 | 2) => void;
  /** ずかんで見ている種と段階 */
  zukan: { species: SpeciesId; stage: number } | null;
  setZukan: (z: { species: SpeciesId; stage: number } | null) => void;
  /** ずかんで見ている おきゃくさん */
  zukanGuest: VisitorId | null;
  setZukanGuest: (id: VisitorId | null) => void;
  /** ずかんの タブ */
  zukanTab: ZukanTab;
  setZukanTab: (t: ZukanTab) => void;
  /** にわで おきゃくさんを 見つけた ときの カード */
  discovery: { id: string; first: boolean; at: number } | null;
  setDiscovery: (d: { id: string; first: boolean; at: number } | null) => void;
  go: (screen: Screen, selectedId?: string | null) => void;
  openSettings: (open: boolean) => void;
  setDragging: (v: boolean) => void;
  setCinematic: (c: Cinematic | null) => void;
  setObservedPart: (p: string | null) => void;
  setPickingSlot: (s: number | null) => void;
}

export const useUi = create<UiState>()((set) => ({
  screen: 'boot',
  selectedId: null,
  settingsOpen: false,
  dragging: false,
  cinematic: null,
  observedPart: null,
  pickingSlot: null,
  zukan: null,
  zukanGuest: null,
  setZukanGuest: (zukanGuest) => set({ zukanGuest }),
  zukanTab: 'mushi',
  setZukanTab: (zukanTab) => set({ zukanTab }),
  discovery: null,
  setDiscovery: (discovery) => set({ discovery }),
  reaction: null,
  overlays: 0,
  pushOverlay: (d) => set((s) => ({ overlays: Math.max(0, s.overlays + d) })),
  tutorialStep: 0,
  setTutorialStep: (tutorialStep) => set({ tutorialStep }),
  setReaction: (reaction) => set({ reaction }),
  setZukan: (zukan) => set({ zukan }),
  go: (screen, selectedId) =>
    set((s) => ({
      screen,
      selectedId: selectedId === undefined ? s.selectedId : selectedId,
      observedPart: null,
      cinematic: null,
      discovery: null,
    })),
  openSettings: (settingsOpen) => set({ settingsOpen }),
  setDragging: (dragging) => set({ dragging }),
  setCinematic: (cinematic) => set({ cinematic }),
  setObservedPart: (observedPart) => set({ observedPart }),
  setPickingSlot: (pickingSlot) => set({ pickingSlot }),
}));
