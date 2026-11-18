import { create } from 'zustand';

/** アリの すづくりの 画面だけの 状態（保存しない） */
export type AntKind = 'worker' | 'major' | 'queen' | 'alate';

export interface AntInfo {
  kind: AntKind;
  /** いま していること（ひらがな） */
  job: string;
}

interface NestView {
  /** カメラが ついていく アリ（-1 は 女王） */
  selected: number | null;
  info: AntInfo | null;
  select: (id: number, info: AntInfo) => void;
  setInfo: (info: AntInfo) => void;
  clear: () => void;
  /** 子どもへの ひとこと（タップの 返事・できごと）。しばらく 出して 消える */
  message: { text: string; at: number } | null;
  say: (text: string) => void;
  /** えさの ボタンで さいごに えらんだ もの（地面を タップした ときに おく） */
  food: 'sugar' | 'bug';
  setFood: (f: 'sugar' | 'bug') => void;
}

export const useNestView = create<NestView>()((set) => ({
  selected: null,
  info: null,
  select: (selected, info) => set({ selected, info }),
  setInfo: (info) => set({ info }),
  clear: () => set({ selected: null, info: null }),
  message: null,
  say: (text) => set({ message: { text, at: Date.now() } }),
  food: 'sugar',
  setFood: (food) => set({ food }),
}));

/** 寄って 見ている アリの 場所（毎フレーム 書く。React state に 入れない） */
export const followed = { x: 0, y: 0, z: 0, active: false };
