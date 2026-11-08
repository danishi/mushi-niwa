import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deviceStorage } from '../save/storage';

export type QualitySetting = 'auto' | 'high' | 'mid' | 'low';

export interface SettingsState {
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
  speech: boolean; // 読み上げ
  realtime: boolean; // リアルタイムモード
  quality: QualitySetting;
  showFps: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      bgmVolume: 0.5,
      sfxVolume: 0.8,
      speech: false,
      realtime: false,
      quality: 'auto',
      showFps: false,
      set: (patch) => set(patch),
    }),
    {
      name: 'mushi-niwa:settings',
      version: 1,
      storage: createJSONStorage(() => deviceStorage),
    },
  ),
);
