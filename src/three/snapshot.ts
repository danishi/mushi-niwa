import { addAfterEffect } from '@react-three/fiber';

/**
 * 3D 画面の しゃしん。描画の 直後（同じ フレームの 中）に canvas を 読みとるので、
 * preserveDrawingBuffer を 付けずに すむ（iOS の 描画を 重くしない）。
 */
type Pending = (canvas: HTMLCanvasElement) => void;
let pending: Pending | null = null;
let target: HTMLCanvasElement | null = null;

export function registerSnapshotCanvas(c: HTMLCanvasElement | null) {
  target = c;
}

addAfterEffect(() => {
  if (pending && target) {
    const p = pending;
    pending = null;
    p(target);
  }
});

export interface PhotoOptions {
  /** 写真の 下に 書く ことば */
  caption: string;
  date: string;
  width?: number;
}

/** 次の フレームを ポラロイド風の 小さな JPEG に する */
export function takeSnapshot(opts: PhotoOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      pending = null;
      resolve(null);
    }, 1500);
    pending = (src) => {
      window.clearTimeout(timeout);
      try {
        const w = opts.width ?? 360;
        const pad = Math.round(w * 0.05);
        const inner = w - pad * 2;
        // 正方形に 切りとる（画面の 中央）
        const side = Math.min(src.width, src.height);
        const sx = (src.width - side) / 2;
        const sy = (src.height - side) / 2;
        const out = document.createElement('canvas');
        out.width = w;
        out.height = inner + pad * 2 + Math.round(w * 0.16);
        const g = out.getContext('2d')!;
        g.fillStyle = '#fffdf6';
        g.fillRect(0, 0, out.width, out.height);
        g.drawImage(src, sx, sy, side, side, pad, pad, inner, inner);
        g.fillStyle = '#4a3b2a';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `bold ${Math.round(w * 0.065)}px "Hiragino Maru Gothic ProN", system-ui, sans-serif`;
        g.fillText(opts.caption, w / 2, inner + pad + Math.round(w * 0.075));
        g.fillStyle = '#9a8670';
        g.font = `${Math.round(w * 0.04)}px system-ui, sans-serif`;
        g.fillText(opts.date, w / 2, inner + pad + Math.round(w * 0.14));
        resolve(out.toDataURL('image/jpeg', 0.78));
      } catch {
        resolve(null);
      }
    };
  });
}
