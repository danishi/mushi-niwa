import { create } from 'zustand';

export type Screen = 'boot' | 'title' | 'garden' | 'care' | 'observe' | 'zukan';

export interface UiState {
  screen: Screen;
  /** 選択中の虫ケース（お世話・かんさつ対象） */
  selectedId: string | null;
  settingsOpen: boolean;
  /** 道具をドラッグ中はカメラ操作を止める */
  dragging: boolean;
  go: (screen: Screen, selectedId?: string | null) => void;
  openSettings: (open: boolean) => void;
  setDragging: (v: boolean) => void;
}

export const useUi = create<UiState>()((set) => ({
  screen: 'boot',
  selectedId: null,
  settingsOpen: false,
  dragging: false,
  go: (screen, selectedId) =>
    set((s) => ({ screen, selectedId: selectedId === undefined ? s.selectedId : selectedId })),
  openSettings: (settingsOpen) => set({ settingsOpen }),
  setDragging: (dragging) => set({ dragging }),
}));
