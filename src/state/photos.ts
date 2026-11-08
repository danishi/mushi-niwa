import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { deviceStorage } from '../save/storage';
import type { SpeciesId } from '../sim/types';

export interface Photo {
  id: string;
  /** JPEG の data URL（端末の 中だけに 保存） */
  url: string;
  species: SpeciesId;
  at: number;
}

/** 保存する 枚数の 上限（古い ものから 入れかわる） */
export const MAX_PHOTOS = 30;

interface PhotoStore {
  photos: Photo[];
  add: (p: Photo) => void;
  clear: () => void;
}

export const usePhotos = create<PhotoStore>()(
  persist(
    (set) => ({
      photos: [],
      add: (p) => set((s) => ({ photos: [p, ...s.photos].slice(0, MAX_PHOTOS) })),
      clear: () => set({ photos: [] }),
    }),
    {
      name: 'mushi-niwa:photos',
      version: 1,
      storage: createJSONStorage(() => deviceStorage),
      partialize: (s) => ({ photos: s.photos }),
    },
  ),
);
