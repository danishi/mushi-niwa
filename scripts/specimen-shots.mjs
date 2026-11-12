// ずかんの 標本を 撮って、造形を 見くらべる（開発用。先に `npm run build` と `npx vite preview --port 4173`）。
//   node scripts/specimen-shots.mjs <outDir> [item,item,...]     item = species | species:stage | guest:id | guests
//   BIG=1 で 大きく（1 コマ 1 ファイル）、既定は 小さく 撮って コンタクトシートに まとめる。ANGLES=n で 1 体あたりの 枚数
//   種・段階の 一覧は src/data/species と src/data/visitors.ts に 合わせて ここも 足す
import fs from 'node:fs';
import path from 'node:path';
import { webkit } from '@playwright/test';

const out = process.argv[2];
const only = process.argv[3] ? process.argv[3].split(',') : null;
const big = !!process.env.BIG;
const angles = Number(process.env.ANGLES ?? 2);
fs.mkdirSync(out, { recursive: true });

const SPECIES = {
  kabutomushi: 3, namiageha: 4, suzumushi: 2, nanahoshi: 4, kaiko: 4, miidera: 1, ookamakiri: 3, tobizumukade: 2,
  madarasasori: 2, gomadara: 3, ookuwagata: 3, nokogiri: 3, oomurasaki: 4, nanafushi: 3, usubakagerou: 3, gengorou: 3,
};
const GUESTS = ['shiokara', 'monshiro', 'tonosama', 'dangomushi', 'aburazemi', 'akiakane', 'kanabun', 'kurooari', 'shouryou', 'hotaru', 'enmakorogi', 'jorougumo', 'katatsumuri', 'oniyanma', 'hakiriari', 'oosuzumebachi'];

const vw = big ? 860 : 560;
const vh = Math.round((vw * 760) / 560);
const k = vw / 560;
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: big ? 2 : 1.5 });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto('http://localhost:4173/mushi-niwa/?e2e');
await page.getByTestId('boot-tap').click();
await page.getByTestId('start-button').click();
await page.waitForFunction(() => '__mushi' in window);
await page.waitForTimeout(1500);
await page.evaluate(() => window.__mushi.ui.getState().go('zukan'));
await page.waitForTimeout(3000);

const clip = { x: Math.round(60 * k), y: Math.round(10 * k), width: Math.round(440 * k), height: Math.round(290 * k) };
const files = [];
async function shot(name) {
  // 標本は 回っているので、角度を 変えて 何枚か
  for (let i = 0; i < angles; i++) {
    await page.waitForTimeout(i === 0 ? 1200 : 2600);
    const f = path.join(out, `${name}-${i}.png`);
    await page.screenshot({ path: f, clip });
    files.push(f);
  }
}
const want = (sp, st) => !only || only.includes(sp) || only.includes(`${sp}:${st}`);
for (const [sp, n] of Object.entries(SPECIES)) {
  for (let st = 0; st < n; st++) {
    if (!want(sp, st)) continue;
    await page.evaluate(([sp, st]) => window.__mushi.ui.getState().setZukan({ species: sp, stage: st }), [sp, st]);
    await shot(`${sp}-${st}`);
  }
}
const guests = GUESTS.filter((id) => !only || only.includes('guests') || only.includes(`guest:${id}`));
if (guests.length) {
  await page.evaluate(() => {
    const u = window.__mushi.ui.getState();
    u.setZukan(null);
    u.setZukanTab('guest');
  });
  for (const id of guests) {
    await page.evaluate((id) => window.__mushi.ui.getState().setZukanGuest(id), id);
    await shot(`guest-${id}`);
  }
}

if (!big) {
  // コンタクトシート（1 枚に 12 コマ）
  const sheet = await browser.newPage({ viewport: { width: 1320, height: 100 }, deviceScaleFactor: 1 });
  const per = 12;
  for (let i = 0; i < files.length; i += per) {
    const cells = files
      .slice(i, i + per)
      .map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${path.basename(f, '.png')}</figcaption></figure>`)
      .join('');
    await sheet.setContent(`<style>body{margin:0;display:grid;grid-template-columns:repeat(4,330px);background:#222}figure{margin:0;position:relative}img{width:330px;display:block}figcaption{position:absolute;left:4px;top:2px;font:14px monospace;color:#fff;text-shadow:0 0 3px #000}</style>${cells}`);
    await sheet.screenshot({ path: path.join(out, `sheet-${String(i / per).padStart(2, '0')}.png`), fullPage: true });
  }
}
await browser.close();
console.log('done', files.length);
