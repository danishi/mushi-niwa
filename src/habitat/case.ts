/** 飼育ケースの内寸（ワールド単位） */
export const CASE = { w: 4.4, d: 2.8, h: 2.8 };

/** 水そうの 水面の 高さ（ゲンゴロウ） */
export const WATER_LEVEL = CASE.h * 0.74;

/**
 * アリジゴクの すりばち。中心は 動かない 虫（locomotion 'still'）の 置き場所と そろえる。
 * r: 口の はんけい、depth: ふかさ
 */
export const PIT = { x: 0.6, z: 0.2, r: 0.8, depth: 0.34 };
