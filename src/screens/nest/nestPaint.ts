import * as THREE from 'three';
import { partOf, tunnelPoints, TUNNEL_W, type Nest, type Pt } from '../../sim/nest';


/**
 * アリの 巣の 断面（地面の 切り口）。土の 面を Canvas に 描き、トンネルと へやを 透明に くりぬく
 * （うしろの 暗い 壁が 見えて、くぼみに なる）。
 * 外がわの 土の 面と 模様が つながるよう、模様は ワールド座標で そろえる（1 まい = TILE）。
 */
export const FACE = { x0: -2.6, x1: 2.6, top: 0, bottom: -4.4 };
export const TILE = 2.2;
const PX = 200;
const W = Math.round((FACE.x1 - FACE.x0) * PX);
const H = Math.round((FACE.top - FACE.bottom) * PX);

const toPx = (p: Pt): [number, number] => [(p.x - FACE.x0) * PX, (FACE.top - p.y) * PX];

export function createFaceTexture(): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture };
}

/** 描きなおしが いるかどうかの しるし（ほる 進みは 5% きざみ） */
export function faceKey(n: Nest): string {
  return `${n.entranceX}|${n.rooms.map((r) => `${r.id}:${Math.round(r.dug * 20)}`).join(',')}`;
}

function tracePaths(g: CanvasRenderingContext2D, n: Nest, widen: number) {
  for (const r of n.rooms) {
    if (r.dug <= 0) continue;
    const pts = partOf(tunnelPoints(n, r), Math.min(1, r.dug * 2)).map(toPx);
    g.lineWidth = TUNNEL_W * PX + widen * 2;
    g.beginPath();
    g.moveTo(pts[0]![0], pts[0]![1] - (r.parent < 0 ? 40 : 0));
    for (const p of pts) g.lineTo(p[0], p[1]);
    g.stroke();
    if (r.dug > 0.5) {
      const k = 0.35 + 0.65 * Math.min(1, (r.dug - 0.5) * 2);
      const [cx, cy] = toPx({ x: r.x, y: r.y });
      const rw = (r.w / 2) * k * PX + widen;
      const rh = (r.h / 2) * Math.min(1, k * 1.3) * PX + widen;
      // 床が ひらたい へや（上は まるく、下は 平ら）
      g.beginPath();
      g.ellipse(cx, cy + rh * 0.12, rw, rh, 0, Math.PI, Math.PI * 2);
      g.ellipse(cx, cy + rh * 0.12, rw, rh * 0.82, 0, 0, Math.PI);
      g.fill();
    }
  }
}

export function paintFace(canvas: HTMLCanvasElement, n: Nest) {
  const g = canvas.getContext('2d')!;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, W, H);
  // 土の 模様（外の 面と 同じ 大きさで しきつめる）
  const img = soilImage();
  const pattern = g.createPattern(img, 'repeat');
  if (pattern) {
    const k = (TILE * PX) / img.width;
    pattern.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
    g.fillStyle = pattern;
  } else g.fillStyle = '#6b5442';
  g.fillRect(0, 0, W, H);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // くりぬく
  g.globalCompositeOperation = 'destination-out';
  g.strokeStyle = '#000';
  g.fillStyle = '#000';
  tracePaths(g, n, 0);
  // くりぬいた ふちを 暗く（土の かべの かげ）
  g.globalCompositeOperation = 'source-atop';
  g.strokeStyle = 'rgba(40,26,16,0.22)';
  g.fillStyle = 'rgba(40,26,16,0.22)';
  tracePaths(g, n, 9);
  g.strokeStyle = 'rgba(30,18,10,0.3)';
  g.fillStyle = 'rgba(30,18,10,0.3)';
  tracePaths(g, n, 4);
  g.globalCompositeOperation = 'source-over';
}

/** 土の 面（外がわ）の 板。UV を ワールド座標から 決めて、断面の 模様と つなげる */
export function worldPlane(x0: number, x1: number, y0: number, y1: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  geo.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - FACE.x0) / TILE, (pos.getY(i) - FACE.top) / TILE);
  return geo;
}

/** つなぎ目の ない 値ノイズ（cells ごとに くりかえす） */
function noise(seed: number, cells: number) {
  let s = seed * 7919 + 1;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const g = new Float32Array(cells * cells);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (u: number, v: number) => {
    const x = u * cells;
    const y = v * cells;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const xa = x0 % cells;
    const xb = (x0 + 1) % cells;
    const ya = (y0 % cells) * cells;
    const yb = ((y0 + 1) % cells) * cells;
    const a = g[ya + xa]! + (g[ya + xb]! - g[ya + xa]!) * sx;
    const b = g[yb + xa]! + (g[yb + xb]! - g[yb + xa]!) * sx;
    return a + (b - a) * sy;
  };
}

let soilImg: HTMLCanvasElement | null = null;
/** 断面の 土（1 まい = TILE。大きめに 描いて くりかえしを 目立たせない）：こげ茶の むらに 小石と 砂つぶ */
export function soilImage(): HTMLCanvasElement {
  if (soilImg) return soilImg;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const oct = [noise(3, 5), noise(4, 11), noise(5, 23), noise(6, 47), noise(7, 128)];
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const n = oct[0]!(u, v) * 0.4 + oct[1]!(u, v) * 0.27 + oct[2]!(u, v) * 0.17 + oct[3]!(u, v) * 0.1 + oct[4]!(u, v) * 0.06;
      // ところどころ 赤みの ある 粘土
      const clay = Math.max(0, oct[1]!(u + 0.37, v + 0.61) - 0.62) * 2.2;
      const i = (y * S + x) * 4;
      img.data[i] = 78 + n * 52 + clay * 26;
      img.data[i + 1] = 58 + n * 40 + clay * 8;
      img.data[i + 2] = 40 + n * 28;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  let s = 77;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  // 砂つぶ と 小石（まわりにも 描いて つなぎ目で 切れない ように）
  const dot = (x: number, y: number, rx: number, ry: number, a: number, fill: string, shade: boolean) => {
    for (const ox of [-S, 0, S])
      for (const oy of [-S, 0, S]) {
        if (x + ox + rx < 0 || x + ox - rx > S || y + oy + ry < 0 || y + oy - ry > S) continue;
        g.fillStyle = fill;
        g.beginPath();
        g.ellipse(x + ox, y + oy, rx, ry, a, 0, Math.PI * 2);
        g.fill();
        if (shade) {
          g.fillStyle = 'rgba(30,20,12,0.35)';
          g.beginPath();
          g.ellipse(x + ox + rx * 0.2, y + oy + ry * 0.35, rx * 0.85, ry * 0.6, a, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = fill;
          g.beginPath();
          g.ellipse(x + ox - rx * 0.1, y + oy - ry * 0.15, rx * 0.8, ry * 0.7, a, 0, Math.PI * 2);
          g.fill();
        }
      }
  };
  for (let i = 0; i < 900; i++) {
    const k = 150 + rnd() * 70;
    dot(rnd() * S, rnd() * S, 0.6 + rnd() * 1.1, 0.5 + rnd() * 0.9, rnd() * 3, `rgba(${k},${k * 0.9},${k * 0.78},${0.35 + rnd() * 0.35})`, false);
  }
  for (let i = 0; i < 26; i++) {
    const k = 120 + rnd() * 70;
    const r = 2.5 + rnd() * 6;
    dot(rnd() * S, rnd() * S, r, r * (0.6 + rnd() * 0.3), rnd() * 3, `rgb(${k},${k * 0.94},${k * 0.86})`, true);
  }
  soilImg = c;
  return c;
}

let soilFace: THREE.Texture | null = null;
/** 外がわの 土の 面の テクスチャ（断面と 同じ 模様。1 まいで くりかえす） */
export function soilFaceTexture(): THREE.Texture {
  if (!soilFace) {
    soilFace = new THREE.CanvasTexture(soilImage());
    soilFace.wrapS = soilFace.wrapT = THREE.RepeatWrapping;
    soilFace.colorSpace = THREE.SRGBColorSpace;
    soilFace.anisotropy = 4;
  }
  return soilFace;
}

let humus: THREE.Texture | null = null;
/** 地面の すぐ 下の 黒っぽい 土（上が こく、下へ うすく なる） */
export function humusTexture(): THREE.Texture {
  if (!humus) {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, 'rgba(32,22,14,0.75)');
    grad.addColorStop(0.45, 'rgba(40,28,18,0.35)');
    grad.addColorStop(1, 'rgba(40,28,18,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 64);
    humus = new THREE.CanvasTexture(c);
    humus.colorSpace = THREE.SRGBColorSpace;
  }
  return humus;
}
