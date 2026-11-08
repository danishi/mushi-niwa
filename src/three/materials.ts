import * as THREE from 'three';

/**
 * 写実寄りの共有マテリアル（物理ベース）。
 * 同じ設定のマテリアルはキャッシュして使い回し、シェーダの切り替えとメモリを抑える。
 */
export interface MatOpts {
  roughness?: number;
  metalness?: number;
  /** 甲虫の前ばねのような つや（クリアコート） */
  clearcoat?: number;
  clearcoatRoughness?: number;
  /** 毛や鱗粉の やわらかい光沢 */
  sheen?: number;
  sheenColor?: THREE.ColorRepresentation;
  opacity?: number;
  side?: THREE.Side;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  map?: THREE.Texture | null;
  bumpMap?: THREE.Texture | null;
  bumpScale?: number;
  roughnessMap?: THREE.Texture | null;
  alphaTest?: number;
  depthWrite?: boolean;
  envMapIntensity?: number;
  /** 半透明の皮ふ（幼虫など）：うすく光を通して見せる */
  translucent?: boolean;
}

const cache = new Map<string, THREE.MeshStandardMaterial>();

function key(color: THREE.Color, o: MatOpts): string {
  const t = (x?: THREE.Texture | null) => (x ? x.uuid : '');
  return [
    color.getHexString(),
    o.roughness,
    o.metalness,
    o.clearcoat,
    o.clearcoatRoughness,
    o.sheen,
    o.sheenColor,
    o.opacity,
    o.side,
    o.emissive,
    o.emissiveIntensity,
    t(o.map),
    t(o.bumpMap),
    o.bumpScale,
    t(o.roughnessMap),
    o.alphaTest,
    o.depthWrite,
    o.envMapIntensity,
    o.translucent,
  ].join('|');
}

export function mat(color: THREE.ColorRepresentation, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const c = new THREE.Color(color);
  const k = key(c, o);
  let m = cache.get(k);
  if (m) return m;
  const physical = o.clearcoat !== undefined || o.sheen !== undefined || o.translucent;
  const base: THREE.MeshStandardMaterialParameters = {
    color: c,
    roughness: o.roughness ?? 0.75,
    metalness: o.metalness ?? 0,
    side: o.side ?? THREE.FrontSide,
    transparent: o.opacity !== undefined && o.opacity < 1,
    opacity: o.opacity ?? 1,
    map: o.map ?? null,
    bumpMap: o.bumpMap ?? null,
    bumpScale: o.bumpScale ?? 1,
    roughnessMap: o.roughnessMap ?? null,
    alphaTest: o.alphaTest ?? 0,
    depthWrite: o.depthWrite ?? !(o.opacity !== undefined && o.opacity < 1),
    envMapIntensity: o.envMapIntensity ?? 1,
  };
  if (o.emissive) {
    base.emissive = new THREE.Color(o.emissive);
    base.emissiveIntensity = o.emissiveIntensity ?? 1;
  }
  if (physical) {
    const p = new THREE.MeshPhysicalMaterial({
      ...base,
      clearcoat: o.clearcoat ?? 0,
      clearcoatRoughness: o.clearcoatRoughness ?? 0.15,
      sheen: o.sheen ?? 0,
      sheenColor: new THREE.Color(o.sheenColor ?? '#ffffff'),
      sheenRoughness: 0.6,
    });
    if (o.translucent) {
      // 透過計算（transmission）は重いので、明るい乗り物色と薄い発光で「透け感」を近似する
      p.emissive = c.clone().multiplyScalar(0.12);
      p.emissiveIntensity = 1;
      p.sheen = Math.max(p.sheen, 0.4);
      p.sheenColor = new THREE.Color('#fff6e8');
    }
    m = p;
  } else {
    m = new THREE.MeshStandardMaterial(base);
  }
  cache.set(k, m);
  return m;
}

/** よく使う表面の プリセット */
export const SURF = {
  /** 甲虫の前ばね：つやつや */
  chitin: (gloss = 1): MatOpts => ({ roughness: 0.38, clearcoat: gloss, clearcoatRoughness: 0.12 }),
  /** つやのない かたい体（脚など） */
  matteChitin: (): MatOpts => ({ roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
  /** 幼虫の やわらかい皮ふ */
  softSkin: (): MatOpts => ({ roughness: 0.55, translucent: true }),
  /** 複眼 */
  eye: (): MatOpts => ({ roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
  /** チョウ・ガの鱗粉、毛 */
  scales: (): MatOpts => ({ roughness: 0.85, sheen: 0.4, sheenColor: '#d8cdb8' }),
  plant: (): MatOpts => ({ roughness: 0.6 }),
};

/* ───────────── 共有ジオメトリ ───────────── */

const geoCache = new Map<string, THREE.BufferGeometry>();
export function sharedGeo<T extends THREE.BufferGeometry>(k: string, make: () => T): T {
  let g = geoCache.get(k);
  if (!g) {
    g = make();
    geoCache.set(k, g);
  }
  return g as T;
}

export const GEO = {
  sphere: () => sharedGeo('sphere', () => new THREE.SphereGeometry(1, 28, 20)),
  sphereLo: () => sharedGeo('sphereLo', () => new THREE.SphereGeometry(1, 10, 8)),
  cylinder: () => sharedGeo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 14, 1)),
  cone: () => sharedGeo('cone', () => new THREE.ConeGeometry(1, 1, 12, 1)),
  box: () => sharedGeo('box', () => new THREE.BoxGeometry(1, 1, 1)),
  capsule: () => sharedGeo('capsule', () => new THREE.CapsuleGeometry(0.5, 1, 8, 16)),
};
