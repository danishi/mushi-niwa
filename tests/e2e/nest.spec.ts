import { expect, test, type Page } from '@playwright/test';
import { APP } from './app';

/* アリの すづくり */

type NestState = {
  nest: { phase: string; workers: number; rooms: unknown[]; baits: unknown[] };
  advance: (dt: number) => void;
};
type W = Window & {
  __mushi: {
    ui: { getState: () => { go: (s: string, id?: string | null) => void } };
    settings: { getState: () => { set: (p: Record<string, unknown>) => void } };
    progress: { getState: () => { stickers: string[] } };
    nest: { getState: () => NestState; setState: (f: (s: NestState) => Partial<NestState>) => void };
  };
  __r3f: { camera: { updateMatrixWorld: () => void }; size: { width: number; height: number; left: number; top: number } };
};

const settled = (page: Page) => expect(page.getByTestId('loading')).toHaveCount(0, { timeout: 30000 });

/** 3D の 点を 画面の 座標に して タップする（カメラが 止まるのを 待ってから） */
async function tapWorld(page: Page, p: [number, number, number]) {
  const at = await page.evaluate(async (q) => {
    const w = window as unknown as W;
    const cam = w.__r3f.camera as unknown as { position: { x: number; y: number; z: number }; updateMatrixWorld: () => void };
    // カメラの 移動が おわるまで 待つ
    let last = '';
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const now = `${cam.position.x.toFixed(3)},${cam.position.y.toFixed(3)},${cam.position.z.toFixed(3)}`;
      if (now === last) break;
      last = now;
    }
    const v = new (Object.getPrototypeOf((cam as unknown as { position: object }).position).constructor)(...q);
    v.project(w.__r3f.camera);
    const s = w.__r3f.size;
    return { x: s.left + ((v.x + 1) / 2) * s.width, y: s.top + ((1 - v.y) / 2) * s.height };
  }, p);
  await page.touchscreen.tap(at.x, at.y);
}

const nest = (page: Page) => page.evaluate(() => (window as unknown as W).__mushi.nest.getState().nest);

test('the ant nest can be founded, fed and dug by tapping', async ({ page }) => {
  await page.goto(APP);
  await page.getByTestId('boot-tap').tap();
  await page.getByTestId('start-button').tap();
  await settled(page);
  await page.waitForFunction(() => '__mushi' in window && '__r3f' in window);
  await page.evaluate(() => {
    const m = (window as unknown as W).__mushi;
    m.settings.getState().set({ tutorialDone: true });
    m.ui.getState().go('nest');
  });
  await settled(page);
  await expect(page.getByTestId('nest-message')).toContainText('じめんの うえ');

  // 地面の 上を タップすると 女王が おりてくる
  await tapWorld(page, [0.6, 0.3, -0.12]);
  await expect.poll(async () => (await nest(page)).phase).toBe('landing');
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__mushi.progress.getState().stickers)).toContain('nest-1');

  // 時間を 進めると 女王が なにも 食べずに 最初の はたらきアリを 育てる
  await page.evaluate(() => {
    const st = (window as unknown as W).__mushi.nest.getState();
    st.advance(13);
    st.advance(200);
  });
  await expect.poll(async () => (await nest(page)).workers).toBeGreaterThan(0);
  await expect(page.getByTestId('nest-workers')).not.toContainText(/^\s*0\s*$/);

  // えさの ボタン
  await page.getByTestId('nest-food-bug').tap();
  await expect.poll(async () => (await nest(page)).baits.length).toBe(1);

  // 土の 中を タップすると へやを ほりはじめる
  await page.evaluate(() => (window as unknown as W).__mushi.nest.setState((s) => ({ nest: { ...s.nest, workers: 4, t: 10 } })));
  await tapWorld(page, [-1.5, -2.3, 0]);
  await expect.poll(async () => (await nest(page)).rooms.length).toBe(2);
  await expect(page.getByTestId('nest-message')).toContainText('へやを ほる');

  await page.getByTestId('nest-back').tap();
  await settled(page);
  await expect(page.getByTestId('garden-hud')).toBeVisible();
});
