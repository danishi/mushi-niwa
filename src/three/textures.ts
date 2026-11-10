import * as THREE from 'three';
import { rng } from './rng';

/**
 * 外部画像を使わずに、Canvas で描く写実寄りのテクスチャ。
 * 1 度作ったものはキャッシュする（サイズは小さめにしてメモリと転送量を抑える）。
 */
const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, opts: { repeat?: number; color?: boolean } = {}) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (opts.repeat) t.repeat.set(opts.repeat, opts.repeat);
  if (opts.color !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** 値ノイズ（なめらかな ゆらぎ） */
function valueNoise(seed: number, cells: number) {
  const r = rng(seed);
  const grid = Array.from({ length: (cells + 1) * (cells + 1) }, () => r());
  const at = (x: number, y: number) => grid[(y % cells) * (cells + 1) + (x % cells)]!;
  return (u: number, v: number) => {
    const x = u * cells;
    const y = v * cells;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

function fbm(seed: number) {
  const octaves = [valueNoise(seed, 4), valueNoise(seed + 1, 8), valueNoise(seed + 2, 16), valueNoise(seed + 3, 32)];
  return (u: number, v: number) => octaves.reduce((s, n, i) => s + n(u, v) / 2 ** (i + 1), 0) / 0.9375;
}

/** 細かい凹凸（バンプ用のグレースケール） */
export function grainBump(seed = 1, cells = 64) {
  return make(`grain:${seed}:${cells}`, 128, (g, s) => {
    const n = valueNoise(seed, cells);
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const v = n(x / s, y / s) * 255;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, { color: false });
}

/** 幼虫の皮ふの しわ（横じま）。v 方向に しわが並ぶ */
export function wrinkleBump() {
  return make('wrinkle', 128, (g, s) => {
    const n = valueNoise(9, 16);
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const w = 0.5 + 0.5 * Math.sin((y / s) * Math.PI * 24 + n(x / s, y / s) * 3);
        const v = (0.6 * w + 0.4 * n(x / s, y / s)) * 255;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, { color: false });
}

/** 昆虫マット（腐葉土）：繊維と粒が混ざった こげ茶 */
export function matTexture() {
  return make('mat', 256, (g, s) => {
    const r = rng(5);
    const n = fbm(5);
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const v = n(x / s, y / s);
        const i = (y * s + x) * 4;
        img.data[i] = 60 + v * 50;
        img.data[i + 1] = 40 + v * 34;
        img.data[i + 2] = 26 + v * 22;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    // 木くずの繊維
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(${150 + r() * 60},${110 + r() * 40},${70 + r() * 30},${0.35 + r() * 0.4})`;
      g.lineWidth = 0.6 + r() * 1.4;
      const x = r() * s;
      const y = r() * s;
      const a = r() * Math.PI;
      const l = 3 + r() * 10;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    // 小さな粒
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(${20 + r() * 40},${14 + r() * 26},${10 + r() * 16},${0.6})`;
      g.beginPath();
      g.arc(r() * s, r() * s, 0.5 + r() * 1.6, 0, Math.PI * 2);
      g.fill();
    }
  }, { repeat: 3 });
}

/** 土（スズムシ・ミイデラゴミムシ用）：灰色がかった茶色に小石 */
export function soilTexture() {
  return make('soil', 256, (g, s) => {
    const r = rng(11);
    const n = fbm(11);
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const v = n(x / s, y / s);
        const i = (y * s + x) * 4;
        img.data[i] = 86 + v * 46;
        img.data[i + 1] = 68 + v * 38;
        img.data[i + 2] = 52 + v * 30;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 160; i++) {
      const c = 120 + r() * 80;
      g.fillStyle = `rgba(${c},${c * 0.95},${c * 0.88},0.8)`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 0.8 + r() * 2.5, 0.6 + r() * 1.8, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }, { repeat: 3 });
}

/** 新聞紙・キッチンペーパー（アゲハ・カイコの床） */
export function paperTexture() {
  return make('paper', 128, (g, s) => {
    const n = valueNoise(21, 32);
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const v = 236 + n(x / s, y / s) * 16;
        const i = (y * s + x) * 4;
        img.data[i] = v;
        img.data[i + 1] = v - 3;
        img.data[i + 2] = v - 10;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, { repeat: 2 });
}

/** 落ち葉の床（テントウムシ） */
export function leafLitterTexture() {
  return make('litter', 256, (g, s) => {
    const r = rng(31);
    g.fillStyle = '#6b5638';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      const hue = r() < 0.3 ? `rgb(${120 + r() * 40},${130 + r() * 50},${60 + r() * 20})` : `rgb(${150 + r() * 60},${100 + r() * 50},${50 + r() * 30})`;
      g.save();
      g.translate(r() * s, r() * s);
      g.rotate(r() * Math.PI * 2);
      g.fillStyle = hue;
      g.beginPath();
      g.ellipse(0, 0, 10 + r() * 14, 5 + r() * 6, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(60,40,20,0.5)';
      g.beginPath();
      g.moveTo(-14, 0);
      g.lineTo(14, 0);
      g.stroke();
      g.restore();
    }
  }, { repeat: 2 });
}

/** 木の樹皮（とまり木・切り株） */
export function barkTexture() {
  return make('bark', 256, (g, s) => {
    const r = rng(41);
    const n = fbm(41);
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const ridge = Math.abs(Math.sin((x / s) * Math.PI * 10 + n(x / s, y / s) * 6));
        const v = 0.35 + 0.65 * ridge * (0.6 + 0.4 * n(y / s, x / s));
        const i = (y * s + x) * 4;
        img.data[i] = 70 + v * 70;
        img.data[i + 1] = 52 + v * 52;
        img.data[i + 2] = 38 + v * 34;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(110,130,80,${0.15 + r() * 0.2})`;
      g.beginPath();
      g.arc(r() * s, r() * s, 2 + r() * 6, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** 木目（棚・台） */
export function woodTexture() {
  return make('wood', 256, (g, s) => {
    const n = fbm(51);
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const ring = 0.5 + 0.5 * Math.sin((y / s) * 40 + n(x / s, y / s) * 8);
        const i = (y * s + x) * 4;
        img.data[i] = 176 + ring * 30;
        img.data[i + 1] = 132 + ring * 24;
        img.data[i + 2] = 88 + ring * 18;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  });
}

/** 草地 */
export function grassTexture() {
  return make('grass', 256, (g, s) => {
    const r = rng(61);
    const n = fbm(61);
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const v = n(x / s, y / s);
        const i = (y * s + x) * 4;
        img.data[i] = 70 + v * 40;
        img.data[i + 1] = 110 + v * 50;
        img.data[i + 2] = 40 + v * 20;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = `rgba(${60 + r() * 60},${120 + r() * 70},${30 + r() * 30},0.6)`;
      g.lineWidth = 1;
      const x = r() * s;
      const y = r() * s;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5);
      g.stroke();
    }
  }, { repeat: 6 });
}

/** 葉（葉脈つき）。UV は葉の形の外接矩形 */
export function leafTexture(base = '#4f7f2a') {
  return make(`leaf:${base}`, 128, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const grd = g.createLinearGradient(0, 0, s, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0.15)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    grd.addColorStop(1, 'rgba(0,0,0,0.15)');
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(220,235,170,0.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(s / 2, 0);
    g.lineTo(s / 2, s);
    g.stroke();
    g.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const y = (i / 8) * s;
      g.beginPath();
      g.moveTo(s / 2, y);
      g.quadraticCurveTo(s * 0.3, y - 6, s * 0.08, y - 14);
      g.moveTo(s / 2, y);
      g.quadraticCurveTo(s * 0.7, y - 6, s * 0.92, y - 14);
      g.stroke();
    }
  });
}

/** スズムシの オスの前ばね（半透明の褐色に 太い翅脈） */
export function cricketWing() {
  return make('cricketWing', 128, (g, s) => {
    g.fillStyle = '#8a7356';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#2e2218';
    g.lineWidth = 2;
    const r = rng(71);
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.moveTo(r() * s, 0);
      g.bezierCurveTo(r() * s, s * 0.3, r() * s, s * 0.7, r() * s, s);
      g.stroke();
    }
    g.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.moveTo(0, (i / 14) * s);
      g.lineTo(s, (i / 14) * s + (r() - 0.5) * 20);
      g.stroke();
    }
  });
}

/** カイコの成虫・まゆの 毛羽だった白 */
export function fuzzTexture() {
  return make('fuzz', 128, (g, s) => {
    const r = rng(81);
    g.fillStyle = '#f2eee4';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = `rgba(${200 + r() * 55},${195 + r() * 55},${180 + r() * 60},0.5)`;
      g.lineWidth = 0.6;
      const x = r() * s;
      const y = r() * s;
      const a = r() * Math.PI * 2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      g.stroke();
    }
  });
}

/** プラケースのふた（通気スリット） */
export function lidTexture() {
  return make('lid', 256, (g, s) => {
    g.fillStyle = '#2f7d4f';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#163f27';
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 3; col++) {
        g.beginPath();
        g.roundRect(s * (0.12 + col * 0.28), s * (0.1 + row * 0.13), s * 0.2, s * 0.05, 6);
        g.fill();
      }
  });
}

/** マダラサソリの まだら模様（黄褐色に こげ茶の まだら） */
export function mottledTexture() {
  return make('mottled', 128, (g, s) => {
    const r = rng(91);
    g.fillStyle = '#b48a4e';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(${50 + r() * 30},${30 + r() * 20},${15 + r() * 10},${0.5 + r() * 0.4})`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 2 + r() * 7, 2 + r() * 5, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** ゴマダラカミキリの 前ばね（つやのある 黒に 白い 点々）。UV は ドームの 経度・緯度 */
export function gomadaraElytra() {
  return make('gomadara', 256, (g, s) => {
    const r = rng(101);
    g.fillStyle = '#0d0d10';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#f2f2ee';
    // 点は 前後に 5 列ほど、左右に ちらばる
    for (let row = 0; row < 5; row++) {
      for (let k = 0; k < 9; k++) {
        const x = (k / 9) * s + r() * 12;
        const y = s * (0.2 + row * 0.15) + (r() - 0.5) * 18;
        g.beginPath();
        g.ellipse(x, y, 4 + r() * 4, 3 + r() * 3, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}

/** 木の 断面（幼虫が トンネルを ほる 木） */
export function woodCrossTexture() {
  return make('woodCross', 256, (g, s) => {
    const n = (x: number, y: number) => Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) * 0.5 + 0.5;
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const v = 0.5 + 0.5 * Math.sin(y * 0.35 + n(x, y) * 3);
        const i = (y * s + x) * 4;
        img.data[i] = 200 + v * 30;
        img.data[i + 1] = 160 + v * 26;
        img.data[i + 2] = 110 + v * 20;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, { repeat: 2 });
}

/** モンシロチョウの はね：白地に、前ばねの 先が 灰黒色で、黒い 紋が 2 つ（メスは 濃い） */
export function monshiroWing(which: 'fore' | 'hind') {
  return make(`monshiro:${which}`, 256, (g, s) => {
    const grad = g.createLinearGradient(0, 0, s, 0);
    grad.addColorStop(0, '#d9d6cc');
    grad.addColorStop(0.18, '#f7f5ee');
    grad.addColorStop(1, '#fbfaf5');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#3a3835';
    if (which === 'fore') {
      // 先端（右上）の 灰黒色
      g.beginPath();
      g.ellipse(s * 0.98, s * 0.98, s * 0.22, s * 0.16, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(s * 0.62, s * 0.55, s * 0.055, 0, Math.PI * 2);
      g.arc(s * 0.6, s * 0.25, s * 0.045, 0, Math.PI * 2);
      g.fill();
    } else {
      g.beginPath();
      g.arc(s * 0.18, s * 0.9, s * 0.04, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** トンボ・セミの すける はね：細かい 翅脈 */
export function veinWing(base: string, vein: string, alpha: number) {
  return make(`vein:${base}:${vein}:${alpha}`, 256, (g, s) => {
    g.fillStyle = base;
    g.globalAlpha = alpha;
    g.fillRect(0, 0, s, s);
    g.globalAlpha = 1;
    g.strokeStyle = vein;
    for (let i = 0; i < 9; i++) {
      g.lineWidth = i % 3 === 0 ? 2 : 1;
      g.beginPath();
      g.moveTo(0, s * (0.15 + i * 0.09));
      g.bezierCurveTo(s * 0.3, s * (0.2 + i * 0.08), s * 0.7, s * (0.3 + i * 0.07), s, s * (0.35 + i * 0.065));
      g.stroke();
    }
    g.lineWidth = 0.8;
    for (let i = 0; i < 40; i++) {
      const x = (i / 40) * s;
      g.beginPath();
      g.moveTo(x, s * 0.1);
      g.lineTo(x + 6, s);
      g.stroke();
    }
  });
}

/** 立てふだ（木の 板に 大きな 文字）。文字は 端末の フォントで 描く（外部フォントなし） */
export function signTexture(big: string, small: string) {
  return make(`sign:${big}:${small}`, 256, (g, s) => {
    g.fillStyle = '#d9b98a';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(120,80,40,0.25)';
    for (let i = 0; i < 14; i++) {
      g.lineWidth = 1 + (i % 3);
      g.beginPath();
      g.moveTo(0, (i / 14) * s + 6);
      g.bezierCurveTo(s * 0.3, (i / 14) * s, s * 0.7, (i / 14) * s + 12, s, (i / 14) * s + 4);
      g.stroke();
    }
    g.fillStyle = '#e4572e';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `bold ${s * 0.55}px "Hiragino Maru Gothic ProN", system-ui, sans-serif`;
    g.fillText(big, s / 2, s * 0.42);
    g.fillStyle = '#4a3b2a';
    g.font = `bold ${s * 0.17}px "Hiragino Maru Gothic ProN", system-ui, sans-serif`;
    g.fillText(small, s / 2, s * 0.84);
  });
}

/* ───────────── 法線マップ（表面の 細かい 凹凸） ───────────── */

/**
 * 高さの 場（0..1 の 2 次元 配列）から、くり返せる 法線マップを つくる。
 * バンプより 軽く、つやの ハイライトが 細部で くだけて「本物の 表面」に 見える。
 */
function normalFromHeight(key: string, size: number, repeat: [number, number], build: (h: Float32Array, s: number) => void, strength: number) {
  const k = `nrm:${key}:${repeat[0]}:${repeat[1]}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const h = new Float32Array(size * size);
  build(h, size);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)]!;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = 1 / Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = (-dx * l * 0.5 + 0.5) * 255;
      // Canvas は 上が v = 1 なので、縦の かたむきは 逆に なる
      img.data[i + 1] = (dy * l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (l * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  cache.set(k, t);
  return t;
}

/** まるい くぼみ・こぶを 場に 押す（はしは 反対がわへ 回りこむので つなぎ目が 出ない） */
function stamp(h: Float32Array, s: number, cx: number, cy: number, r: number, amp: number) {
  const R = Math.ceil(r * 2);
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      const d2 = (dx * dx + dy * dy) / (r * r);
      if (d2 > 4) continue;
      const x = (Math.round(cx) + dx + s) % s;
      const y = (Math.round(cy) + dy + s) % s;
      h[y * s + x] = h[y * s + x]! + amp * Math.exp(-d2 * 1.6);
    }
}

/** 甲虫の 点刻（てんこく）：細かい くぼみが ちらばる。density が 大きいほど ざらつく */
export function punctureNormal(repeat = 5, density = 1, strength = 2.2) {
  return normalFromHeight(`punct:${density}:${strength}`, 256, [repeat, repeat], (h, s) => {
    const r = rng(301);
    const n = valueNoise(302, 32);
    for (let i = 0; i < h.length; i++) h[i] = n((i % s) / s, Math.floor(i / s) / s) * 0.12;
    for (let i = 0; i < 520 * density; i++) stamp(h, s, r() * s, r() * s, 1.6 + r() * 2.2, -0.5 - r() * 0.5);
  }, strength);
}

/** 顆粒（かりゅう）：こまかい つぶつぶ（カブトムシの 前胸・頭、ざらざらの 脚） */
export function granuleNormal(repeat = 6, strength = 2.4) {
  return normalFromHeight(`gran:${strength}`, 256, [repeat, repeat], (h, s) => {
    const r = rng(311);
    for (let i = 0; i < 1500; i++) stamp(h, s, r() * s, r() * s, 1.3 + r() * 1.6, 0.4 + r() * 0.5);
  }, strength);
}

/**
 * 前ばねの 条溝（じょうこう）：体の 軸に そった 浅い みぞと、みぞの 中の 点刻の 列。
 * ロフトの UV（u = 周方向、v = 軸方向）で 使う。rows は 片がわの みぞの 本数
 */
export function striaeNormal(rows = 8, depth = 1, strength = 2.6) {
  return normalFromHeight(`striae:${rows}:${depth}:${strength}`, 512, [1, 1], (h, s) => {
    const r = rng(321);
    const n = valueNoise(322, 64);
    const lines = rows * 2;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const f = ((x / s) * lines) % 1;
        const d = Math.abs(f - 0.5) * 2; // 0 = みぞの 底
        h[y * s + x] = -depth * 0.55 * Math.exp(-d * d * 28) + n(x / s, y / s) * 0.1;
      }
    for (let k = 0; k < lines; k++)
      for (let y = 0; y < s; y += 7) stamp(h, s, ((k + 0.5) / lines) * s + (r() - 0.5) * 1.5, y + r() * 3, 1.8, -0.5 * depth);
    for (let i = 0; i < 900; i++) stamp(h, s, r() * s, r() * s, 1.3 + r(), -0.22);
  }, strength);
}

/** 複眼の 個眼（こがん）：六角形に ならぶ 小さな レンズ */
export function facetNormal(repeat = 9, strength = 1.6) {
  return normalFromHeight(`facet:${strength}`, 128, [repeat * 2, repeat], (h, s) => {
    // 3 方向の 波を 重ねると 六角格子の こぶに なる（周期が タイルに 合うよう 整数倍に する）
    const q = (Math.PI * 2 * 4) / s;
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const a = Math.cos(q * x * 2);
        const b = Math.cos(q * (x + y * 2));
        const c = Math.cos(q * (x - y * 2));
        h[y * s + x] = (a + b + c) / 3;
      }
  }, strength);
}

/** やわらかい 皮ふの こまかい しわ（幼虫）。v 方向に 節の しわ、全体に 細かい ちりめん */
export function skinNormal(repeat = 3, strength = 2) {
  return normalFromHeight(`skin:${strength}`, 256, [repeat, repeat], (h, s) => {
    const n = valueNoise(331, 24);
    const f = valueNoise(332, 96);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const u = x / s;
        const v = y / s;
        h[y * s + x] = 0.5 * Math.sin(v * Math.PI * 16 + n(u, v) * 4) + 0.35 * f(u, v);
      }
  }, strength);
}

/**
 * 前ばねの 色むら（色に かけ合わせる 明暗）。合わせ目と ふちが 暗く、肩と 背の まん中が 明るい。
 * ロフトの UV（u = 周方向）で 使う。本物の 甲虫は 一色ではなく、うすい ところが 赤っぽく すける。
 */
export function elytraShade(seed = 1, contrast = 0.45) {
  return make(`elyShade:${seed}:${contrast}`, 128, (g, s) => {
    const n = fbm(400 + seed);
    const img = g.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const u = x / s;
        const suture = Math.exp(-(((u - 0.5) / 0.035) ** 2));
        const rim = Math.exp(-((Math.min(u, 1 - u) / 0.07) ** 2));
        const v = 1 - contrast * Math.max(suture, rim) - contrast * 0.35 * (1 - n(u, y / s));
        const c = Math.max(0, Math.min(1, v)) * 255;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  });
}

/** 好きな 絵を 描く（色テクスチャ）。ロフトの UV：x = 周方向 u、上が v = 1（前） */
export function paint(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  return make(`paint:${key}`, size, draw);
}

/** 3 次ベジェ上の 点 */
function bez(p: number[][], t: number): [number, number] {
  const k = 1 - t;
  const f = (i: number) => k * k * k * p[0]![i]! + 3 * k * k * t * p[1]![i]! + 3 * k * t * t * p[2]![i]! + t * t * t * p[3]![i]!;
  return [f(0), f(1)];
}

/**
 * はねの 形の 座標（shapeGeo と 同じ 単位）で 描くための 道具。
 * box = [minX, minY, maxX, maxY]（形の 外接矩形）。Canvas の 上が y の 大きい がわ。
 */
function wingPainter(g: CanvasRenderingContext2D, s: number, box: [number, number, number, number]) {
  const X = (x: number) => ((x - box[0]) / (box[2] - box[0])) * s;
  const Y = (y: number) => (1 - (y - box[1]) / (box[3] - box[1])) * s;
  const L = (d: number) => (d / (box[2] - box[0])) * s;
  return {
    X,
    Y,
    L,
    line(pts: Array<[number, number]>, w: number, color: string) {
      g.strokeStyle = color;
      g.lineWidth = L(w);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
      g.stroke();
    },
    dot(x: number, y: number, rx: number, ry: number, color: string, rot = 0) {
      g.fillStyle = color;
      g.beginPath();
      g.ellipse(X(x), Y(y), L(rx), L(ry), rot, 0, Math.PI * 2);
      g.fill();
    },
  };
}

const CREAM = '#efe3a4';
const WING_BLACK = '#17130f';

/**
 * ナミアゲハの はね。形の 座標に 合わせて、翅脈・中室の すじ・外縁の 黒帯と 三日月紋を 描く。
 * 後ろばねには 青い 鱗粉の 帯と、肛角の だいだい色の 紋、尾状突起。
 */
export function agehaWing(which: 'fore' | 'hind') {
  return make(`ageha2:${which}`, 512, (g, s) => {
    g.fillStyle = CREAM;
    g.fillRect(0, 0, s, s);
    if (which === 'fore') {
      const w = wingPainter(g, s, [0, -0.12, 0.98, 0.48]);
      const costa = [[0, 0], [0.25, 0.22], [0.7, 0.48], [0.98, 0.44]];
      const margin = [[0.98, 0.44], [0.95, 0.2], [0.75, 0.0], [0.42, -0.12]];
      const pts = (b: number[][], n = 24) => Array.from({ length: n + 1 }, (_, i) => bez(b, i / n));
      // 外縁の 黒帯 と、中の 2 列の 淡い 紋
      w.line(pts(margin), 0.36, WING_BLACK);
      w.line(pts(costa), 0.09, WING_BLACK);
      const cellEnd: Array<[number, number]> = [[0.5, 0.31], [0.53, 0.25], [0.52, 0.18], [0.47, 0.1], [0.4, 0.03]];
      for (let i = 0; i <= 8; i++) {
        const m = bez(margin, 0.04 + (i / 8) * 0.92);
        const c = cellEnd[Math.min(4, Math.round(i / 2))]!;
        const dx = c[0] - m[0];
        const dy = c[1] - m[1];
        const d = Math.hypot(dx, dy);
        // 脈の 間の 淡い 室（外へ 向かって 細長い）
        if (i < 8) {
          const m2 = bez(margin, 0.04 + ((i + 0.5) / 8) * 0.92);
          const c2 = cellEnd[Math.min(4, Math.round((i + 0.5) / 2))]!;
          const ux = (c2[0] - m2[0]) / Math.hypot(c2[0] - m2[0], c2[1] - m2[1]);
          const uy = (c2[1] - m2[1]) / Math.hypot(c2[0] - m2[0], c2[1] - m2[1]);
          const rot = -Math.atan2(uy, ux);
          w.dot(m2[0] + ux * 0.045, m2[1] + uy * 0.045, 0.02, 0.026, CREAM, rot);
          w.dot(m2[0] + ux * 0.125, m2[1] + uy * 0.125, 0.03, 0.022, CREAM, rot);
        }
        w.line([m, [m[0] + (dx / d) * d, m[1] + (dy / d) * d]], 0.022, WING_BLACK);
      }
      // 中室：つけねから のびる 黒い すじ と、はしの 横帯
      w.line(cellEnd, 0.04, WING_BLACK);
      w.line([[0.36, 0.2], [0.4, 0.06]], 0.035, WING_BLACK);
      for (const [a, b] of [[0.27, 0.2], [0.19, 0.12], [0.1, 0.05], [0.02, 0.0]] as Array<[number, number]>) w.line([[0, 0], [0.48, a], [0.5, b]].slice(0, 2) as Array<[number, number]>, 0.02, WING_BLACK);
      w.line([[0, -0.03], [0.22, -0.06], [0.42, -0.1]], 0.03, WING_BLACK);
      // つけねの 黒い 鱗粉
      const grd = g.createRadialGradient(w.X(0), w.Y(0), 0, w.X(0), w.Y(0), w.L(0.3));
      grd.addColorStop(0, 'rgba(23,19,15,0.95)');
      grd.addColorStop(1, 'rgba(23,19,15,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
    } else {
      const w = wingPainter(g, s, [0, -0.76, 0.6, -0.04]);
      const outer = [[0.32, -0.05], [0.6, -0.14], [0.66, -0.36], [0.56, -0.56]];
      const lower = [[0.5, -0.56], [0.36, -0.62], [0.2, -0.56], [0.06, -0.36]];
      const pts = (b: number[][], n = 20) => Array.from({ length: n + 1 }, (_, i) => bez(b, i / n));
      w.line([...pts(outer), ...pts(lower)], 0.3, WING_BLACK);
      // 尾状突起
      w.line([[0.52, -0.52], [0.56, -0.78]], 0.12, WING_BLACK);
      const hub: [number, number] = [0.2, -0.2];
      const edge = [...pts(outer, 4), ...pts(lower, 3)];
      edge.forEach((m, i) => {
        w.line([hub, m], 0.016, WING_BLACK);
        const n = edge[i + 1];
        if (!n) return;
        const cx = (m[0] + n[0]) / 2;
        const cy = (m[1] + n[1]) / 2;
        const ux = (hub[0] - cx) / Math.hypot(hub[0] - cx, hub[1] - cy);
        const uy = (hub[1] - cy) / Math.hypot(hub[0] - cx, hub[1] - cy);
        const rot = -Math.atan2(uy, ux);
        // ふちの 黄色い 三日月と、その 内がわの 青い 鱗粉
        w.dot(cx + ux * 0.035, cy + uy * 0.035, 0.016, 0.034, CREAM, rot);
        w.dot(cx + ux * 0.1, cy + uy * 0.1, 0.02, 0.036, '#4a78b8', rot);
      });
      w.line([[0, -0.06], [0.2, -0.2]], 0.02, WING_BLACK);
      w.line([[0.07, -0.08], [0.2, -0.2], [0.3, -0.07]], 0.016, WING_BLACK);
      // 肛角の だいだい色の 紋（黒い 芯）
      w.dot(0.13, -0.44, 0.05, 0.045, '#e0762a');
      w.dot(0.13, -0.455, 0.02, 0.018, WING_BLACK);
      const grd = g.createRadialGradient(w.X(0), w.Y(-0.1), 0, w.X(0), w.Y(-0.1), w.L(0.2));
      grd.addColorStop(0, 'rgba(23,19,15,0.9)');
      grd.addColorStop(1, 'rgba(23,19,15,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
    }
    // 鱗粉の ざらつき
    const r = rng(701);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,250,220,0.07)' : 'rgba(0,0,0,0.07)';
      g.fillRect(r() * s, r() * s, 1.5, 1.5);
    }
  });
}

/** ガの はね（カイコ）：白い 鱗粉に、うすい 茶色の 翅脈と 帯。box は 形の 外接矩形 */
export function mothWing(box: [number, number, number, number]) {
  return make(`moth:${box.join(',')}`, 256, (g, s) => {
    g.fillStyle = '#f4f0e6';
    g.fillRect(0, 0, s, s);
    const w = wingPainter(g, s, box);
    const span = box[2] - box[0];
    for (let i = 0; i < 9; i++) {
      const a = -1.25 + i * 0.2;
      w.line([[0, 0], [Math.cos(a) * span * 1.2, Math.sin(a) * span * 1.2]], span * 0.012, 'rgba(150,130,100,0.55)');
    }
    for (const k of [0.45, 0.7]) {
      const arc: Array<[number, number]> = Array.from({ length: 13 }, (_, i) => {
        const a = -1.4 + i * 0.16;
        return [Math.cos(a) * span * k, Math.sin(a) * span * k];
      });
      w.line(arc, span * 0.035, 'rgba(170,150,120,0.35)');
    }
    const r = rng(711);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(${200 + r() * 55},${195 + r() * 55},${180 + r() * 50},0.25)`;
      g.fillRect(r() * s, r() * s, 1, 3);
    }
  });
}

/** 体に そった たての 帯（ロフトの 全周 UV：u = 0 が 腹の まん中、0.5 が 背の まん中） */
export function bandTexture(key: string, base: string, bands: Array<[number, number, string]>) {
  return make(`band:${key}`, 128, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    for (const [u, w, color] of bands) {
      g.fillStyle = color;
      g.fillRect((u - w / 2) * s, 0, w * s, s);
    }
  });
}

/** 樹皮の 凹凸：たてに 走る 深い われめ と、ざらざら */
export function barkNormal(strength = 3) {
  return normalFromHeight(`bark:${strength}`, 256, [1, 1], (h, s) => {
    const n = fbm(501);
    const f = valueNoise(502, 48);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const u = x / s;
        const v = y / s;
        const ridge = Math.abs(Math.sin(u * Math.PI * 10 + n(u, v) * 6));
        h[y * s + x] = ridge ** 0.6 * 0.9 + f(u, v) * 0.3;
      }
  }, strength);
}
