import { create } from 'zustand';

export type Screen = 'boot' | 'title' | 'garden' | 'care' | 'observe' | 'zukan' | 'battle';

export interface Cinematic {
  kind: 'grow' | 'farewell';
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
  go: (screen, selectedId) =>
    set((s) => ({
      screen,
      selectedId: selectedId === undefined ? s.selectedId : selectedId,
      observedPart: null,
      cinematic: null,
    })),
  openSettings: (settingsOpen) => set({ settingsOpen }),
  setDragging: (dragging) => set({ dragging }),
  setCinematic: (cinematic) => set({ cinematic }),
  setObservedPart: (observedPart) => set({ observedPart }),
  setPickingSlot: (pickingSlot) => set({ pickingSlot }),
}));
