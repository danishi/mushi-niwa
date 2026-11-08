import { expect, test } from '@playwright/test';

test('boots, unlocks audio by tap, shows title and opens garden', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByTestId('boot-tap')).toBeVisible();
  // タップ領域は 56px 以上
  const box = await page.getByTestId('boot-tap').boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(56);
  await page.getByTestId('boot-tap').tap();
  await expect(page.getByTestId('title-hud')).toBeVisible();
  await expect(page.getByTestId('start-button')).toBeVisible();
  const gate = await page.getByTestId('settings-gate').boundingBox();
  expect(gate!.width).toBeGreaterThanOrEqual(56);
  expect(errors).toEqual([]);
});

test('settings are guarded by a parental gate', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('boot-tap').tap();
  const gate = page.getByTestId('settings-gate');
  // 短いタップでは開かない
  await gate.tap();
  await expect(page.getByTestId('gate-quiz')).toHaveCount(0);
  // 長押しでクイズが出る
  await gate.dispatchEvent('pointerdown', { pointerId: 1 });
  await page.waitForTimeout(2800);
  await gate.dispatchEvent('pointerup', { pointerId: 1 });
  await expect(page.getByTestId('gate-quiz')).toBeVisible();
  const kanji = (await page.locator('.gate-kanji').textContent())!.split('・');
  const digits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  for (const k of kanji) await page.getByTestId(`gate-key-${digits.indexOf(k)}`).tap();
  await expect(page.getByTestId('settings-panel')).toBeVisible();
  await page.getByTestId('settings-close').tap();
  await expect(page.getByTestId('settings-panel')).toHaveCount(0);
});

test('PWA manifest is linked', async ({ page }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toContain('manifest.webmanifest');
});
