import { expect, test, type Page } from '@playwright/test';

/* シール・おきゃくさん・しゃしん・むしクイズ */

type W = Window & {
  __mushi: {
    game: { getState: () => { adopt: (s: string, slot: number) => void; creatures: Array<{ id: string }> } };
    ui: { getState: () => { go: (s: string, id?: string | null) => void } };
    settings: { getState: () => { set: (p: Record<string, unknown>) => void } };
    progress: { getState: () => { stickers: string[]; visitors: string[] } };
    photos: { getState: () => { photos: unknown[] } };
  };
  __forceVisitor?: string;
  __visitor?: unknown;
};

/** 画面の 切りかえ（ローディング）が 終わるのを 待つ。切りかえ中は タップを 受けない */
const settled = (page: Page) => expect(page.getByTestId('loading')).toHaveCount(0, { timeout: 30000 });

async function start(page: Page) {
  await page.goto('./?e2e');
  await page.getByTestId('boot-tap').tap();
  await page.getByTestId('start-button').tap();
  await settled(page);
  await page.waitForFunction(() => '__mushi' in window);
  await page.evaluate(() => {
    const m = (window as unknown as W).__mushi;
    m.settings.getState().set({ tutorialDone: true });
    m.game.getState().adopt('nanahoshi', 0);
  });
}

test('a sticker is awarded and shown in the sticker book', async ({ page }) => {
  await start(page);
  await page.evaluate(() => (window as unknown as W).__mushi.ui.getState().go('garden', null));
  await settled(page);
  await expect(page.getByTestId('sticker-toast')).toContainText('はじめての なかま');
  await page.evaluate(() => (window as unknown as W).__mushi.ui.getState().go('zukan'));
  await settled(page);
  await page.getByTestId('tab-sticker').tap();
  await expect(page.getByTestId('sticker-book')).toContainText('はじめての なかま');
});

test('mushi quiz can be finished and gives a perfect score sticker', async ({ page }) => {
  await start(page);
  await page.evaluate(() => (window as unknown as W).__mushi.ui.getState().go('quiz'));
  await settled(page);
  await expect(page.getByTestId('quiz-prompt')).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-answer="yes"]').tap({ force: true });
    await expect(page.getByTestId('quiz-explain')).toContainText('せいかい');
    await page.getByTestId('quiz-next').tap({ force: true });
  }
  await expect(page.getByTestId('quiz-result')).toContainText('5 / 5');
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__mushi.progress.getState().stickers)).toContain('quiz-perfect');
});

test('a garden visitor can be found and appears in the zukan', async ({ page }) => {
  // にわは 最初から 開いていて すぐ おきゃくさんが 来るので、読みこむ 前に 種類を 決めておく
  await page.addInitScript(() => {
    (window as unknown as { __forceVisitor?: string }).__forceVisitor = 'dangomushi';
  });
  await start(page);
  test.skip(await page.getByTestId('no-webgl').isVisible(), 'WebGL is not available in this browser');
  await page.evaluate(() => {
    (window as unknown as W).__forceVisitor = 'dangomushi';
    (window as unknown as W).__mushi.ui.getState().go('garden', null);
  });
  await settled(page);
  await page.waitForFunction(() => (window as unknown as W).__visitor, null, { timeout: 30000 });
  await page.waitForTimeout(2000);
  // 着いて 止まるまで 何度か ねらって タップする
  for (let i = 0; i < 20; i++) {
    // three の 型を テストに 持ちこまないよう、文字列で 評価する
    const pos = (await page.evaluate(`(() => {
      const st = window.__r3f;
      let found = null;
      st.scene.traverse((o) => { if (o.userData.visitor) found = o; });
      if (!found) return null;
      const v = found.getWorldPosition(found.position.clone()).project(st.camera);
      const r = st.gl.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    })()`)) as { x: number; y: number } | null;
    if (pos) await page.touchscreen.tap(pos.x, pos.y);
    if (await page.getByTestId('discovery').isVisible()) break;
    await page.waitForTimeout(500);
  }
  await expect(page.getByTestId('discovery')).toContainText('オカダンゴムシ');
  await expect(page.getByTestId('discovery')).toContainText('こんちゅうでは なくて');
  await page.evaluate(() => (window as unknown as W).__mushi.ui.getState().go('zukan'));
  await settled(page);
  await page.getByTestId('tab-guest').tap();
  await expect(page.getByTestId('guest-dangomushi')).toContainText('オカダンゴムシ');
  await expect(page.getByTestId('guest-monshiro')).toContainText('？？？');
  // 見つけた おきゃくさんは 台の 上の 3D と 説明の パネルで 見られる
  await page.getByTestId('guest-dangomushi').tap();
  await expect(page.getByTestId('guest-detail')).toContainText('エビや カニ');
  await page.getByTestId('guest-detail-back').tap();
  await expect(page.getByTestId('guest-list')).toBeVisible();
});

test('the camera button is on the care screen too', async ({ page }) => {
  await start(page);
  test.skip(await page.getByTestId('no-webgl').isVisible(), 'WebGL is not available in this browser');
  await page.evaluate(() => {
    const m = (window as unknown as W).__mushi;
    m.ui.getState().go('care', m.game.getState().creatures[0]!.id);
  });
  await settled(page);
  await expect(page.getByTestId('care-hud').getByTestId('photo-btn')).toBeVisible();
  await page.getByTestId('photo-btn').tap();
  await expect(page.getByTestId('photo-thumb')).toBeVisible({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__mushi.photos.getState().photos.length)).toBe(1);
});

test('a photo can be taken in observe mode and seen in the album', async ({ page }) => {
  await start(page);
  test.skip(await page.getByTestId('no-webgl').isVisible(), 'WebGL is not available in this browser');
  await page.evaluate(() => {
    const m = (window as unknown as W).__mushi;
    m.ui.getState().go('observe', m.game.getState().creatures[0]!.id);
  });
  await settled(page);
  await page.getByTestId('photo-btn').tap({ force: true });
  await expect(page.getByTestId('photo-thumb')).toBeVisible({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__mushi.photos.getState().photos.length)).toBe(1);
  await page.evaluate(() => (window as unknown as W).__mushi.ui.getState().go('zukan'));
  await settled(page);
  await page.getByTestId('tab-photo').tap();
  await expect(page.getByTestId('album').locator('img')).toHaveCount(1);
  // ひらいた 写真と とじる ボタンが 画面から はみださない
  await page.getByTestId('album').locator('button').first().tap();
  const view = page.getByTestId('photo-view');
  await expect(view).toBeVisible();
  const vp = page.viewportSize()!;
  for (const el of [view.locator('img'), page.getByTestId('photo-close')]) {
    const b = (await el.boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 1);
  }
  await page.screenshot({ path: test.info().outputPath('photo-view.png') });
  await page.getByTestId('photo-close').tap();
  await expect(view).toHaveCount(0);
});
