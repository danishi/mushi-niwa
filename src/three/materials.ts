import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { granuleNormal, punctureNormal, skinNormal } from './textures';

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
  /** 法線マップ（点刻・条溝・個眼など。bumpMap より 優先される） */
  normalMap?: THREE.Texture | null;
  normalScale?: number;
  /** 構造色（玉虫色の うすい 膜）。0..1 */
  iridescence?: number;
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
    t(o.normalMap),
    o.normalScale,
    o.iridescence,
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
  const physical = o.clearcoat !== undefined || o.sheen !== undefined || o.translucent || o.iridescence !== undefined;
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
    normalMap: o.normalMap ?? null,
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
      iridescence: o.iridescence ?? 0,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [180, 420],
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
  if (o.normalMap) m.normalScale.setScalar(o.normalScale ?? 1);
  cache.set(k, m);
  return m;
}

/** よく使う表面の プリセット */
export const SURF = {
  /** 甲虫の前ばね：つやつや。こまかい 点刻で ハイライトが くだける */
  chitin: (gloss = 1): MatOpts => ({
    roughness: 0.34,
    clearcoat: gloss,
    clearcoatRoughness: 0.1,
    normalMap: punctureNormal(),
    normalScale: 0.3 + (1 - Math.min(1, gloss)) * 0.5,
  }),
  /** つぶつぶの ある かたい 体（カブトムシの 前胸・頭など、つやが にぶい ところ） */
  granular: (gloss = 0.5): MatOpts => ({ roughness: 0.5, clearcoat: gloss, clearcoatRoughness: 0.3, normalMap: granuleNormal(), normalScale: 0.55 }),
  /** つやのない かたい体（脚など） */
  matteChitin: (): MatOpts => ({ roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3, normalMap: punctureNormal(3, 1), normalScale: 0.45 }),
  /** 幼虫の やわらかい皮ふ */
  softSkin: (): MatOpts => ({ roughness: 0.5, translucent: true, normalMap: skinNormal(), normalScale: 0.5 }),
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
  cylinder: () => sharedGeo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 32, 1)),
  cone: () => sharedGeo('cone', () => new THREE.ConeGeometry(1, 1, 12, 1)),
  box: () => sharedGeo('box', () => new THREE.BoxGeometry(1, 1, 1)),
  /** 樹皮の ある 丸太（GEO.cylinder と 同じ 寸法）：断面が いびつで、たての うねが ある */
  bark: () =>
    sharedGeo('barkCyl', () => {
      const g = new THREE.CylinderGeometry(1, 1, 1, 40, 14);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const r = Math.hypot(x, z);
        if (r < 0.99) continue;
        const th = Math.atan2(z, x);
        const k = 1 + 0.06 * Math.sin(th * 2 + y * 2.2 + 1) + 0.035 * Math.sin(th * 5 - y * 3) + 0.045 * Math.abs(Math.sin(th * 9 + Math.sin(y * 7) * 1.4)) - 0.03;
        p.setXYZ(i, x * k, y, z * k);
      }
      g.computeVertexNormals();
      return g;
    }),
  /** 石：なめらかに でこぼこした かたまり（半径 1） */
  rock: () =>
    sharedGeo('rock', () => {
      const g = mergeVertices(new THREE.IcosahedronGeometry(1, 3));
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const k = 1 + 0.14 * Math.sin(x * 2.3 + 1) * Math.sin(z * 2.9) + 0.09 * Math.sin(y * 4.1 + x * 3.3) + 0.05 * Math.sin(z * 7.3 + y * 5.1);
        p.setXYZ(i, x * k, y * k, z * k);
      }
      g.computeVertexNormals();
      return g;
    }),
  /** 植木鉢（GEO.cylinder と 同じ 寸法）：上へ ひらき、ふちに 厚みが ある */
  pot: () =>
    sharedGeo('pot', () =>
      new THREE.LatheGeometry(
        [[0, -0.5], [0.7, -0.5], [0.74, -0.47], [0.93, 0.3], [1.02, 0.31], [1.03, 0.47], [1, 0.5], [0.9, 0.5], [0.88, 0.42], [0, 0.42]].map(([x, y]) => new THREE.Vector2(x, y)),
        36,
      ),
    ),
  /** 土の つぶ・木くず・小石：角ばった いびつな かたまり */
  chunk: () =>
    sharedGeo('chunk', () => {
      const g = new THREE.IcosahedronGeometry(1, 1);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        // 同じ 場所の 頂点は 同じだけ 動かす（面が はなれない ように 位置から 決める）
        const k = 0.72 + 0.5 * Math.abs(Math.sin(p.getX(i) * 12.9898 + p.getY(i) * 78.233 + p.getZ(i) * 37.719) * 43758.5453 % 1);
        p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
      }
      g.computeVertexNormals();
      return g;
    }),
  capsule: () => sharedGeo('capsule', () => new THREE.CapsuleGeometry(0.5, 1, 8, 16)),
};
