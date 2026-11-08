import * as THREE from 'three';

/**
 * トゥーン調の共有リソース。
 * マテリアルは色ごとにキャッシュして使い回し、ドローコールとシェーダ切り替えを抑える。
 */
let gradient: THREE.DataTexture | null = null;

export function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  // 3 段階の陰影（暗部も明るめにして、やわらかい印象にする）
  const data = new Uint8Array([150, 150, 150, 255, 210, 210, 210, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

const cache = new Map<string, THREE.MeshToonMaterial>();

export interface ToonOpts {
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
}

export function toon(color: THREE.ColorRepresentation, opts: ToonOpts = {}): THREE.MeshToonMaterial {
  const c = new THREE.Color(color);
  const key = `${c.getHexString()}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? ''}|${opts.opacity ?? ''}|${opts.side ?? ''}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color: c,
      gradientMap: toonGradient(),
      emissive: opts.emissive ? new THREE.Color(opts.emissive) : undefined,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      transparent: opts.transparent ?? (opts.opacity !== undefined && opts.opacity < 1),
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
    });
    cache.set(key, m);
  }
  return m;
}

/** 輪郭線（反転ハル）用の共有マテリアル */
export const OUTLINE_COLOR = '#4a3b2a';

/** よく使うジオメトリも共有する */
const geoCache = new Map<string, THREE.BufferGeometry>();
export function sharedGeo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g as T;
}

export const GEO = {
  sphere: () => sharedGeo('sphere', () => new THREE.SphereGeometry(1, 20, 14)),
  sphereLo: () => sharedGeo('sphereLo', () => new THREE.SphereGeometry(1, 10, 8)),
  cylinder: () => sharedGeo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 10, 1)),
  cone: () => sharedGeo('cone', () => new THREE.ConeGeometry(1, 1, 12, 1)),
  box: () => sharedGeo('box', () => new THREE.BoxGeometry(1, 1, 1)),
  capsule: () => sharedGeo('capsule', () => new THREE.CapsuleGeometry(0.5, 1, 6, 12)),
};
