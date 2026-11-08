import { expect, test, type Page } from '@playwright/test';

type Hooks = {
  game: { getState: () => { adopt: (s: string, slot: number) => void } };
  ui: { getState: () => { go: (s: string, id?: string | null) => void } };
};

async function start(page: Page) {
  await page.goto('./?e2e');
  await page.getByTestId('boot-tap').tap();
  await page.getByTestId('start-button').tap();
  await page.waitForFunction(() => '__mushi' in window);
  await page.evaluate(() => (window as unknown as { __mushi: Hooks }).__mushi.game.getState().adopt('nanahoshi', 0));
}

test('zukan shows met species with facts and hides unmet ones', async ({ page }) => {
  await start(page);
  await page.evaluate(() => (window as unknown as { __mushi: Hooks }).__mushi.ui.getState().go('zukan'));
  await expect(page.getByTestId('zukan-hud')).toBeVisible();
  await expect(page.getByTestId('zukan-kaiko')).toContainText('？？？');
  await page.getByTestId('zukan-nanahoshi').tap();
  await expect(page.getByTestId('zukan-detail')).toContainText('アブラムシ');
  await expect(page.getByTestId('zukan-detail')).toContainText('Coccinella septempunctata');
});

test('mushi-zumou can be played to a gentle result', async ({ page }) => {
  await start(page);
  test.skip(await page.getByTestId('no-webgl').isVisible(), 'WebGL is not available in this browser');
  await page.evaluate(() => (window as unknown as { __mushi: Hooks }).__mushi.ui.getState().go('battle'));
  await expect(page.getByTestId('battle-select')).toContainText('たたかわない');
  await page.getByTestId('battle-pick-nanahoshi').tap();
  const push = page.getByTestId('battle-push');
  await expect(push).toBeVisible();
  await page.getByTestId('battle-special').tap();
  await expect(page.getByTestId('battle-fact')).toContainText('しんだふり');
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('battle-result').isVisible()) break;
    await push.dispatchEvent('pointerdown');
    await page.waitForTimeout(120);
  }
  await expect(page.getByTestId('battle-result')).toContainText('がんばったね');
});
