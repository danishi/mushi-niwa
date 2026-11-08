// PWA アイコンを外部ツールなしで生成する（シンプルな SDF ラスタライザ + PNG エンコーダ）
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ellipse = (x, y, cx, cy, rx, ry) => Math.hypot((x - cx) / rx, (y - cy) / ry) - 1;
const roundRect = (x, y, r) => {
  const qx = Math.abs(x - 0.5) - (0.5 - r);
  const qy = Math.abs(y - 0.5) - (0.5 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const seg = (x, y, ax, ay, bx, by, r) => {
  const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - dx * t, py - dy * t) - r;
};

// 0..1 座標で、上から順に塗るレイヤー（d<0 が内側）
function layers(maskable) {
  const s = maskable ? 0.72 : 0.86; // maskable はセーフゾーン分だけ縮める
  const o = (1 - s) / 2;
  const T = (x, y) => [(x - o) / s, (y - o) / s];
  const ink = hex('#4a3b2a');
  return [
    { d: (x, y) => (maskable ? -1 : roundRect(x, y, 0.22)), c: hex('#8bc34a') },
    { d: (x, y) => { const [u, v] = T(x, y); return ellipse(u, v, 0.5, 0.62, 0.3, 0.26) - 0.025; }, c: ink },
    { d: (x, y) => { const [u, v] = T(x, y); return ellipse(u, v, 0.5, 0.62, 0.3, 0.26); }, c: hex('#8d5a3b') },
    { d: (x, y) => { const [u, v] = T(x, y); return seg(u, v, 0.5, 0.4, 0.5, 0.86, 0.012); }, c: ink },
    { d: (x, y) => { const [u, v] = T(x, y); return Math.min(seg(u, v, 0.5, 0.42, 0.47, 0.2, 0.045), seg(u, v, 0.47, 0.2, 0.36, 0.12, 0.04)); }, c: hex('#5d3a26') },
    { d: (x, y) => { const [u, v] = T(x, y); return Math.min(ellipse(u, v, 0.4, 0.46, 0.075, 0.075), ellipse(u, v, 0.6, 0.46, 0.075, 0.075)); }, c: hex('#ffffff') },
    { d: (x, y) => { const [u, v] = T(x, y); return Math.min(ellipse(u, v, 0.41, 0.47, 0.04, 0.04), ellipse(u, v, 0.61, 0.47, 0.04, 0.04)); }, c: hex('#2b2118') },
  ];
}

function render(size, maskable) {
  const L = layers(maskable);
  const out = Buffer.alloc(size * size * 4);
  const SS = 3;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          let col = null;
          for (const l of L) if (l.d(x, y) < 0) col = l.c;
          if (col) { r += col[0]; g += col[1]; b += col[2]; a += 255; }
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      const cov = a / 255;
      out[i] = cov ? r / cov : 0;
      out[i + 1] = cov ? g / cov : 0;
      out[i + 2] = cov ? b / cov : 0;
      out[i + 3] = a / n;
    }
  }
  return png(size, size, out);
}

const targets = [
  ['public/pwa-192x192.png', 192, false],
  ['public/pwa-512x512.png', 512, false],
  ['public/maskable-512x512.png', 512, true],
  ['public/apple-touch-icon.png', 180, true],
];
for (const [file, size, mask] of targets) {
  writeFileSync(file, render(size, mask));
  console.log('wrote', file);
}
