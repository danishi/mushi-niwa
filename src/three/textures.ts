import * as THREE from 'three';
import { rng } from './Diorama';

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

/**
 * ナミアゲハの はね（前ばね・後ろばね）。
 * 淡い黄色の地に、黒い翅脈と帯、外縁の黒帯に黄色の三日月紋、後ろばねに青い斑と橙色の眼状紋。
 */
export function agehaWing(which: 'fore' | 'hind') {
  return make(`ageha:${which}`, 256, (g, s) => {
    g.fillStyle = '#f2df8c';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#1d1712';
    g.strokeStyle = '#1d1712';
    if (which === 'fore') {
      // 付け根側の黒い部分と、すじ状の帯
      g.fillRect(0, 0, s * 0.18, s);
      for (let i = 0; i < 6; i++) {
        g.lineWidth = 3 + (i % 2) * 2;
        g.beginPath();
        g.moveTo(s * 0.18, s * (0.15 + i * 0.12));
        g.lineTo(s * (0.75 + i * 0.03), s * (0.05 + i * 0.16));
        g.stroke();
      }
      // 外縁の黒帯と黄色の三日月紋
      g.fillRect(s * 0.78, 0, s * 0.22, s);
      g.fillStyle = '#f2df8c';
      for (let i = 0; i < 8; i++) {
        g.beginPath();
        g.ellipse(s * 0.88, s * (0.06 + i * 0.12), 5, 9, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#1d1712';
      g.fillRect(s * 0.4, 0, s * 0.08, s * 0.5);
    } else {
      g.fillRect(0, 0, s * 0.15, s);
      for (let i = 0; i < 5; i++) {
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(s * 0.15, s * (0.2 + i * 0.15));
        g.lineTo(s * 0.7, s * (0.1 + i * 0.2));
        g.stroke();
      }
      g.fillRect(s * 0.68, 0, s * 0.32, s);
      // 青い斑
      g.fillStyle = '#4f7fbf';
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.ellipse(s * 0.76, s * (0.12 + i * 0.14), 6, 8, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#f2df8c';
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.ellipse(s * 0.92, s * (0.12 + i * 0.14), 5, 7, 0, 0, Math.PI * 2);
        g.fill();
      }
      // 内縁の橙色の眼状紋
      g.fillStyle = '#e07a2f';
      g.beginPath();
      g.arc(s * 0.62, s * 0.9, 12, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1d1712';
      g.beginPath();
      g.arc(s * 0.62, s * 0.92, 5, 0, Math.PI * 2);
      g.fill();
    }
    // 細い翅脈
    g.strokeStyle = 'rgba(30,22,16,0.7)';
    g.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.moveTo(0, s * 0.5);
      g.lineTo(s, s * (i / 8));
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
