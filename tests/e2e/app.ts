/**
 * アプリを ひらく URL。CI は GPU が なく 3D を ソフトウェアで 描くので、
 * いちばん 軽い 描画（`?lite`：低画質・解像度 半分）で 回す。手元では ふつうの 画質の まま（`E2E_LITE=1` で CI と 同じに できる）。
 */
const lite = !!(process.env.CI || process.env.E2E_LITE);

/** テスト用フック（`window.__mushi`）つき */
export const APP = lite ? './?e2e&lite' : './?e2e';
/** フックなし（ふつうに ひらいた とき） */
export const ROOT = lite ? './?lite' : './';

/** iPad 横画面でも 回す テスト（横長の レイアウトに かかわる もの）。ほかは iPhone 縦だけ */
export const WIDE = { tag: '@wide' };
