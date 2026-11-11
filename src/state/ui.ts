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
  /**
   * 画面を 切りかえる。新しい シーンの 用意（形づくり・シェーダの コンパイル）は 重いので、
   * 先に ローディングの 表示を 出してから 切りかえる（`loading` → 描画 1 回ぶん 待つ → `screen`）。
   */
  go: (screen: Screen, selectedId?: string | null) => void;
  /** 画面の 切りかえ中。長びいた ときだけ ローディングの 表示が 見える */
  loading: boolean;
  /** 新しい シーンの シェーダを 用意している 間は 3D の 描画を 止める（止めないと 最初の 1 枚で 固まる） */
  compiling: boolean;
  /** 最初の シーンを 描きおえた（起動画面の ボタンを 押せるように する） */
  ready: boolean;
  /** シーンの 用意が できた（3D 側から 呼ぶ）。描画を 再開する */
  sceneReady: () => void;
  /** 用意した シーンが 実際に 描かれた（3D 側から 呼ぶ）。ローディングを 消す */
  sceneShown: () => void;
  openSettings: (open: boolean) => void;
  setDragging: (v: boolean) => void;
  setCinematic: (c: Cinematic | null) => void;
  setObservedPart: (p: string | null) => void;
  setPickingSlot: (s: number | null) => void;
}

/** 画面に 1 回 描かれるのを 待つ（かくれた タブでは rAF が 来ないので、時間でも 進める） */
function afterPaint(run: () => void) {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    run();
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(once));
  setTimeout(once, 250);
}

/** 切りかえの 途中で 次の 切りかえが 来たら、古い ほうは 捨てる */
let goToken = 0;
/** 捨てた 切りかえが 選んでいた 虫は、次の 切りかえに 引きつぐ（`go('care', id)` の すぐ あとの `go('observe')`） */
let pendingSelected: string | null | undefined;

export const useUi = create<UiState>()((set, get) => ({
  screen: 'boot',
  loading: false,
  compiling: true,
  ready: false,
  sceneReady: () => set({ compiling: false }),
  sceneShown: () => {
    // 次の 切りかえが もう 始まっていたら、そちらが 終わるまで 出したままに する
    if (!get().compiling) set({ loading: false, ready: true });
  },
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
  go: (screen, selectedId) => {
    const selected = selectedId === undefined ? pendingSelected : selectedId;
    pendingSelected = selected;
    const apply = (compiling: boolean) => {
      pendingSelected = undefined;
      set((s) => ({
        screen,
        selectedId: selected === undefined ? s.selectedId : selected,
        observedPart: null,
        cinematic: null,
        discovery: null,
        loading: compiling,
        compiling,
      }));
    };
    const from = get().screen;
    // 起動画面の 下では タイトルの シーンを もう 描いている。同じ 画面なら 作りなおしは ない
    if (from === 'boot' || from === screen) {
      goToken++;
      return apply(false);
    }
    const token = ++goToken;
    set({ loading: true });
    afterPaint(() => {
      if (token === goToken) apply(true);
    });
  },
  openSettings: (settingsOpen) => set({ settingsOpen }),
  setDragging: (dragging) => set({ dragging }),
  setCinematic: (cinematic) => set({ cinematic }),
  setObservedPart: (observedPart) => set({ observedPart }),
  setPickingSlot: (pickingSlot) => set({ pickingSlot }),
}));
