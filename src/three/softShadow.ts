import * as THREE from 'three';

let tex: THREE.CanvasTexture | null = null;

/** 影を切った画質でも接地感を出すための、丸いぼかし影テクスチャ（1 枚を共有） */
export function blobShadowTexture(): THREE.Texture {
  if (tex) return tex;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(60,40,20,0.55)');
  grd.addColorStop(1, 'rgba(60,40,20,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  tex = new THREE.CanvasTexture(c);
  return tex;
}
