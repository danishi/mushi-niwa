import type * as THREE from 'three';

/**
 * 描画の トラブルの 記録（設定画面の 版の 下に 出す）。
 * 実機（とくに iPhone）でしか 起きない 不具合の 手がかりに する。毎フレームは 書かないので 可変オブジェクトで よい。
 */
export const renderHealth = {
  /** WebGL の コンテキストが 失われた 回数（メモリ不足・バックグラウンドなど） */
  contextLost: 0,
  /** コンテキストが もどった 回数（3D の 中身を 作りなおす） */
  contextRestored: 0,
  /** 画面切りかえで 描画の 準備を やりなおした 回数 */
  refreshed: 0,
  /** そのとき、もう ない シェーダを 指していた 材質の 数（合計） */
  stale: 0,
};

/**
 * 新しい シーンの 材質の「描画の ための 状態」（レンダラーが 材質ごとに 持つ シェーダ・uniform の 対応）を 捨てて、
 * 作りたての 材質と 同じ 手順で 準備しなおさせる。
 *
 * 材質は `mat()` で 画面を またいで 使いまわすので、前の 画面の 状態を 引きずる。iPhone で ずかんから もどった ときに、
 * 使いまわしの 材質（棚・地面・ふた など）だけが 描かれず、作りたての 材質（ケースの 土）は 描かれる ことが あった。
 * シェーダ自体は レンダラーが 鍵で 共有して いるので、ここで 捨てても コンパイルしなおしには ならない。
 * （古い 状態が 持っていた シェーダの 使用数は 減らさない。共有の シェーダを うっかり 消さない ため）
 */
export function refreshMaterialState(gl: THREE.WebGLRenderer, root: THREE.Object3D): void {
  const live = new Set<unknown>(gl.info.programs ?? []);
  const seen = new Set<THREE.Material>();
  let stale = 0;
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    for (const material of Array.isArray(m) ? m : [m]) {
      if (seen.has(material)) continue;
      seen.add(material);
      const state = gl.properties.get(material) as { currentProgram?: unknown };
      if (state.currentProgram !== undefined && !live.has(state.currentProgram)) stale++;
      gl.properties.remove(material);
    }
  });
  renderHealth.refreshed++;
  renderHealth.stale += stale;
}

/** 設定画面に 出す 1 行 */
export function renderHealthLine(): string {
  const h = renderHealth;
  return `描画: 準備 ${h.refreshed} 回・古い状態 ${h.stale}・コンテキスト喪失 ${h.contextLost} / 復帰 ${h.contextRestored}`;
}
