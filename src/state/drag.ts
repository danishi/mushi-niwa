import type { ToolId } from '../sim/types';

/**
 * 道具ドラッグの共有状態。HUD（DOM）のボタンで掴み、3D シーン側で道具を動かす。
 * DOM 側でポインターを捕まえるので、カメラ操作（OrbitControls）とぶつからない。
 */
export const drag = {
  active: false,
  tool: null as ToolId | null,
  ndc: { x: 0, y: 0 },
  released: false,
  /** 3D 側が書く：ケースの上にあるか */
  over: false,
};

/** 置いたごはんの場所（虫 ID ごと） */
export const foodPositions = new Map<string, [number, number, number]>();
