import * as THREE from 'three';
import { sharedGeo } from '../three/materials';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** 根元から先へ細くなるチューブ（角・触角・脚など） */
export function taperedTube(points: THREE.Vector3[], r0: number, r1: number, segs = 16, radial = 8): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    const r = THREE.MathUtils.lerp(r0, r1, t);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  // 先端をふさぐ小さな球は省略（輪郭線で十分丸く見える）
  geo.computeVertexNormals();
  return geo;
}

export function cachedTube(key: string, points: [number, number, number][], r0: number, r1: number, segs = 16, radial = 8) {
  return sharedGeo(`tube:${key}`, () =>
    taperedTube(points.map((p) => new THREE.Vector3(...p)), r0, r1, segs, radial),
  );
}

/** 蝶のはねなどの平たい形 */
export function shapeGeo(key: string, build: (s: THREE.Shape) => void, depth = 0): THREE.BufferGeometry {
  return sharedGeo(`shape:${key}`, () => {
    const s = new THREE.Shape();
    build(s);
    const g = depth > 0 ? new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }) : new THREE.ShapeGeometry(s, 16);
    // テクスチャを形の外接矩形に合わせる
    g.computeBoundingBox();
    const b = g.boundingBox!;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) - b.min.x) / (b.max.x - b.min.x || 1);
      uv[i * 2 + 1] = (pos.getY(i) - b.min.y) / (b.max.y - b.min.y || 1);
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  });
}

/** 半球（甲虫の前ばね・テントウの背中） */
export function halfSphere(): THREE.BufferGeometry {
  return sharedGeo('halfSphere', () => new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2));
}

/** 縦に半分の楕円体（左右の前ばね） */
export function elytronGeo(): THREE.BufferGeometry {
  return sharedGeo('elytron', () => new THREE.SphereGeometry(1, 16, 12, 0, Math.PI, 0, Math.PI / 2));
}

/** 回転体（軸は +Z）。profile は [半径, z] の列（後ろ→前） */
export function latheZ(key: string, profile: Array<[number, number]>, segments = 24): THREE.BufferGeometry {
  return sharedGeo(`lathe:${key}`, () => {
    const g = new THREE.LatheGeometry(
      profile.map(([r, z]) => new THREE.Vector2(Math.max(0.0001, r), z)),
      segments,
    );
    g.rotateX(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  });
}

/** 上半分のドーム（甲虫の前ばね・テントウの背中） */
export function domeGeo(): THREE.BufferGeometry {
  return sharedGeo('dome', () => new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2));
}

/* ───────────── 写実的な 造形のための 曲面 ───────────── */

/** ロフトの 断面（体の 軸 +Z に そって 並べる） */
export interface Section {
  z: number;
  /** 半分の はば */
  w: number;
  /** 上の はしの 高さ */
  top: number;
  /** 下の はしの 高さ（arc が 'top' の ときは 使わない） */
  bottom?: number;
  /** いちばん はばの 広い 高さ（省略すると 上下の まん中。'top' では すその 高さ） */
  mid?: number;
  /** 上がわの 角ばり（2 = だ円、大きいほど 箱形、小さいほど とがる） */
  nt?: number;
  nb?: number;
}

export interface LoftOpts {
  rings?: number;
  radial?: number;
  /** 'top' は 上半分だけの から（前ばね・前胸の 背板）。'half' は その 右半分（ひらく 前ばね） */
  arc?: 'full' | 'top' | 'half';
  /** 頂点を 動かして 溝・こぶ・ふちを つくる。u は 周方向（0..1）、v は 軸方向（0..1） */
  displace?: (p: THREE.Vector3, u: number, v: number) => void;
}

/** 不等間隔の Catmull-Rom（断面の 値を なめらかに つなぐ） */
function hermite(zs: number[], ys: number[], z: number): number {
  const n = zs.length;
  let i = 0;
  while (i < n - 2 && z > zs[i + 1]!) i++;
  const z0 = zs[i]!;
  const z1 = zs[i + 1]!;
  const h = z1 - z0 || 1e-6;
  const t = THREE.MathUtils.clamp((z - z0) / h, 0, 1);
  const slope = (k: number) => {
    if (k <= 0) return (ys[1]! - ys[0]!) / (zs[1]! - zs[0]! || 1e-6);
    if (k >= n - 1) return (ys[n - 1]! - ys[n - 2]!) / (zs[n - 1]! - zs[n - 2]! || 1e-6);
    return (ys[k + 1]! - ys[k - 1]!) / (zs[k + 1]! - zs[k - 1]! || 1e-6);
  };
  const m0 = slope(i) * h;
  const m1 = slope(i + 1) * h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[i]! + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * ys[i + 1]! + (t3 - t2) * m1;
}

const spow = (x: number, e: number) => Math.sign(x) * Math.abs(x) ** e;

/**
 * 断面を 軸に そって つないだ 曲面（ロフト）。球の 寄せ集めでは 出せない、
 * 甲虫の 前ばね・前胸・頭の ような「はりの ある」形を つくる。
 * 断面は 上下で 別の 超だ円（superellipse）なので、背中は まるく・おなかは 平らに できる。
 */
export function loft(key: string, sections: Section[], opts: LoftOpts = {}): THREE.BufferGeometry {
  return sharedGeo(`loft:${key}`, () => {
    const rings = opts.rings ?? 40;
    const radial = opts.radial ?? 32;
    const half = opts.arc === 'half';
    const top = opts.arc === 'top' || half;
    const zs = sections.map((s) => s.z);
    const col = (f: (s: Section) => number) => sections.map(f);
    const W = col((s) => s.w);
    const T = col((s) => s.top);
    const M = col((s) => s.mid ?? (top ? (s.bottom ?? s.top) : (s.top + (s.bottom ?? s.top)) / 2));
    const B = col((s) => s.bottom ?? s.mid ?? s.top);
    const NT = col((s) => s.nt ?? 2);
    const NB = col((s) => s.nb ?? 2);
    const z0 = zs[0]!;
    const z1 = zs[zs.length - 1]!;
    const pos = new Float32Array((rings + 1) * (radial + 1) * 3);
    const uv = new Float32Array((rings + 1) * (radial + 1) * 2);
    const p = new THREE.Vector3();
    for (let i = 0; i <= rings; i++) {
      const v = i / rings;
      // 両はしを 細かく（先の 丸みを きれいに 出す）
      const z = z0 + (z1 - z0) * (0.5 - 0.5 * Math.cos(Math.PI * v));
      const w = Math.max(0, hermite(zs, W, z));
      const yt = hermite(zs, T, z);
      const ym = hermite(zs, M, z);
      const yb = hermite(zs, B, z);
      const nt = hermite(zs, NT, z);
      const nb = hermite(zs, NB, z);
      for (let j = 0; j <= radial; j++) {
        const u = j / radial;
        const th = half ? (Math.PI / 2) * u : top ? Math.PI * u : -Math.PI / 2 + Math.PI * 2 * u;
        const c = Math.cos(th);
        const s = Math.sin(th);
        const n = s >= 0 ? nt : nb;
        p.set(w * spow(c, 2 / n), ym + (s >= 0 ? Math.max(0, yt - ym) : Math.max(0, ym - yb)) * spow(s, 2 / n), z);
        opts.displace?.(p, u, v);
        const k = i * (radial + 1) + j;
        pos[k * 3] = p.x;
        pos[k * 3 + 1] = p.y;
        pos[k * 3 + 2] = p.z;
        uv[k * 2] = u;
        uv[k * 2 + 1] = v;
      }
    }
    const idx: number[] = [];
    for (let i = 0; i < rings; i++)
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j;
        const b = a + radial + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    if (!top) weldSeam(g, rings, radial);
    return g;
  });
}

/** 周方向の つなぎ目（j = 0 と j = radial）の 法線を そろえて、すじが 出ないように する */
function weldSeam(g: THREE.BufferGeometry, rings: number, radial: number) {
  const nrm = g.attributes.normal as THREE.BufferAttribute;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i <= rings; i++) {
    const k0 = i * (radial + 1);
    const k1 = k0 + radial;
    a.fromBufferAttribute(nrm, k0).add(b.fromBufferAttribute(nrm, k1)).normalize();
    nrm.setXYZ(k0, a.x, a.y, a.z);
    nrm.setXYZ(k1, a.x, a.y, a.z);
  }
}

/**
 * 断面が だ円の チューブ（角・大あご・脚の 節）。r(t) は [side 方向の 半径, それと 直角の 半径]。
 * side は 断面の 向きを 決める 基準（曲線が YZ 平面なら X、XZ 平面なら Y を わたす）。両はしは とじる。
 */
export function shapedTube(
  points: Array<[number, number, number]>,
  r: (t: number) => [number, number],
  segs = 16,
  radial = 10,
  side: [number, number, number] = [1, 0, 0],
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q)));
  const sideV = new THREE.Vector3(...side);
  const c = new THREE.Vector3();
  const t3 = new THREE.Vector3();
  const n = new THREE.Vector3();
  const b = new THREE.Vector3();
  // 両はしに 半径 0 の 輪を 足して ふたを する
  const R = segs + 3;
  const pos = new Float32Array(R * (radial + 1) * 3);
  const uv = new Float32Array(R * (radial + 1) * 2);
  for (let i = 0; i < R; i++) {
    const t = THREE.MathUtils.clamp((i - 1) / segs, 0, 1);
    curve.getPointAt(t, c);
    curve.getTangentAt(t, t3);
    n.copy(sideV).addScaledVector(t3, -t3.dot(sideV)).normalize();
    b.crossVectors(t3, n);
    const [ra, rb] = i === 0 || i === R - 1 ? [0, 0] : r(t);
    for (let j = 0; j <= radial; j++) {
      const th = (j / radial) * Math.PI * 2;
      const k = i * (radial + 1) + j;
      pos[k * 3] = c.x + n.x * Math.cos(th) * ra + b.x * Math.sin(th) * rb;
      pos[k * 3 + 1] = c.y + n.y * Math.cos(th) * ra + b.y * Math.sin(th) * rb;
      pos[k * 3 + 2] = c.z + n.z * Math.cos(th) * ra + b.z * Math.sin(th) * rb;
      uv[k * 2] = j / radial;
      uv[k * 2 + 1] = t;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < R - 1; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const d = a + radial + 1;
      idx.push(a, a + 1, d, a + 1, d + 1, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  weldSeam(g, R - 1, radial);
  return g;
}

/** いくつかの ジオメトリを 1 つに まとめて キャッシュ（ドローコールを ふやさない） */
export function mergedGeo(key: string, build: () => THREE.BufferGeometry[]): THREE.BufferGeometry {
  return sharedGeo(`merged:${key}`, () => {
    const parts = build().map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      for (const name of Object.keys(n.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') n.deleteAttribute(name);
      return n;
    });
    return mergeGeometries(parts)!;
  });
}

const gaussian = (x: number, w: number) => Math.exp(-((x / w) ** 2));

/** [z, 半分の はば, 上, 下] */
export type BodyProfile = Array<[number, number, number, number]>;

/**
 * 胴体（頭・胸・はら・幼虫の 体）。segs = [z の 始まり, 終わり, 節の 数, くびれの 深さ] で 節の くびれを つける。
 */
export function bodyGeo(
  key: string,
  prof: BodyProfile,
  o: { nt?: number; nb?: number; mid?: number; segs?: [number, number, number, number]; rings?: number; radial?: number; extra?: LoftOpts['displace'] } = {},
): THREE.BufferGeometry {
  const m = o.mid ?? 0.5;
  const cy = prof.reduce((a, q) => a + q[3] + (q[2] - q[3]) * m, 0) / prof.length;
  return loft(
    `body:${key}`,
    prof.map(([z, w, top, bottom]) => ({ z, w, top, bottom, mid: bottom + (top - bottom) * m, nt: o.nt, nb: o.nb })),
    {
      rings: o.rings ?? (o.segs ? Math.max(36, o.segs[2] * 7) : 28),
      radial: o.radial ?? 24,
      displace: (p, u, v) => {
        if (o.segs) {
          const [a, b, n, depth] = o.segs;
          const t = (p.z - a) / (b - a);
          if (t > 0 && t < 1) {
            const k = 1 - depth * Math.abs(Math.cos(Math.PI * t * n)) ** 10;
            p.x *= k;
            p.y = cy + (p.y - cy) * k;
          }
        }
        o.extra?.(p, u, v);
      },
    },
  );
}

/** [z, 半分の はば, 上] */
export type ShellProfile = Array<[number, number, number]>;

/** 背中の から（前ばね・前胸）。base は すその 高さ。suture は 合わせ目の みぞ、rim は すその そり返り */
export function shellGeo(
  key: string,
  prof: ShellProfile,
  o: { base: number; nt?: number; suture?: number; rim?: number; half?: boolean; rings?: number; radial?: number; extra?: LoftOpts['displace'] },
): THREE.BufferGeometry {
  return loft(
    `shell:${key}`,
    prof.map(([z, w, top]) => ({ z, w, top, mid: o.base, nt: o.nt })),
    {
      arc: o.half ? 'half' : 'top',
      rings: o.rings ?? 36,
      radial: o.radial ?? (o.half ? 18 : 32),
      displace: (p, u, v) => {
        if (o.suture) p.y -= o.suture * gaussian(p.x, o.suture * 0.9);
        if (o.rim) {
          const e = o.half ? u : Math.min(u, 1 - u);
          const k = Math.max(0, 1 - e / 0.07);
          p.x *= 1 + o.rim * k * k;
        }
        o.extra?.(p, u, v);
      },
    },
  );
}

/** 幼虫の 節 1 つ（半径 1 の たる形。軸は Z）。つらねると 節の くびれが できる */
export function segmentGeo(): THREE.BufferGeometry {
  const pr: BodyProfile = [];
  for (let i = 0; i <= 12; i++) {
    const z = -1 + (i / 12) * 2;
    const r = (1 - Math.abs(z) ** 2.7) ** (1 / 2.7);
    pr.push([z, r, r, -r]);
  }
  return bodyGeo('segment', pr, { rings: 16, radial: 20 });
}

/** bodyGeo を Y 軸に 立てた もの（GEO.capsule を rotation x = π/2 で 寝かせて 使う 所の 置きかえ用。+y が 前、背中は -z） */
export function yBody(key: string, prof: BodyProfile, o: Parameters<typeof bodyGeo>[2] = {}): THREE.BufferGeometry {
  return sharedGeo(`ybody:${key}`, () => bodyGeo(`y:${key}`, prof, o).clone().rotateX(-Math.PI / 2));
}

/** 背板 1 枚（半径 1。ムカデ・サソリの 節）：角の まるい 四角い 板で、まん中が 少し 高い */
export function plateGeo(): THREE.BufferGeometry {
  return bodyGeo(
    'plate',
    [[-1, 0.7, 0.45, -0.5], [-0.75, 0.97, 0.9, -0.85], [0, 1, 1, -1], [0.75, 0.97, 0.9, -0.85], [1, 0.7, 0.45, -0.5]],
    { nt: 3, nb: 3.4, rings: 12, radial: 20 },
  );
}

/** さなぎの 胴（半径 1・Y 軸）：下が 節の ある はら、上が 胸 */
export function pupaGeo(): THREE.BufferGeometry {
  return yBody(
    'pupa',
    [[-1, 0, 0, 0], [-0.93, 0.3, 0.3, -0.3], [-0.55, 0.8, 0.8, -0.72], [-0.1, 1, 1, -0.88], [0.4, 0.96, 0.96, -0.85], [0.8, 0.72, 0.72, -0.6], [1, 0.3, 0.3, -0.25]],
    { segs: [-0.95, 0.05, 5, 0.07], rings: 40 },
  );
}

/** 節の ある 細長い はら（半径 0.5・Y 軸。GEO.capsule の 置きかえ：トンボ・バッタ・チョウ） */
export function abdomenY(n = 8): THREE.BufferGeometry {
  return yBody(`abdomenY${n}`, [[-1, 0, 0, 0], [-0.95, 0.25, 0.25, -0.25], [-0.5, 0.42, 0.42, -0.42], [0.5, 0.5, 0.5, -0.5], [1, 0.4, 0.4, -0.4]], { segs: [-0.97, 0.95, n, 0.07], rings: n * 7 });
}

/** 節の ある ずんぐりした はら（半径 1・Z 軸。GEO.sphere の 置きかえ：セミ・コオロギ・アリ） */
export function abdomenZ(n = 6): THREE.BufferGeometry {
  return bodyGeo(`abdomenZ${n}`, [[-1, 0, 0, 0], [-0.93, 0.35, 0.35, -0.35], [-0.5, 0.85, 0.85, -0.85], [0.1, 1, 1, -1], [0.7, 0.8, 0.8, -0.8], [1, 0.3, 0.3, -0.3]], { segs: [-0.95, 0.6, n, 0.06], rings: n * 7 });
}
