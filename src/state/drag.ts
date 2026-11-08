import type { ToolId } from '../sim/types';

/**
 * 道具の自動アクション。ボタンをタップすると、3D の道具がケースへ飛んでいって使われる。
 * （小さな子でも できるよう、ドラッグは使わない）
 */
export const toolAction = {
  tool: null as ToolId | null,
  t: 0,
};

/** 置いたごはんの場所（虫 ID ごと） */
export const foodPositions = new Map<string, [number, number, number]>();
