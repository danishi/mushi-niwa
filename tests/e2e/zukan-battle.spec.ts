import { expect, test, type Page } from '@playwright/test';
import { APP, WIDE } from './app';

type Hooks = {
  game: { getState: () => { adopt: (s: string, slot: number) => void } };
  ui: { getState: () => { go: (s: string, id?: string | null) => void } };
};

/** 画面の 切りかえ（ローディング）が 終わるのを 待つ。切りかえ中は タップを 受けない */
const settled = (page: Page) => expect(page.getByTestId('loading')).toHaveCount(0, { timeout: 30000 });

async function start(page: Page) {
  await page.goto(APP);
  await page.getByTestId('boot-tap').tap();
  await page.getByTestId('start-button').tap();
  await settled(page);
  await page.waitForFunction(() => '__mushi' in window);
  await page.evaluate(() => (window as unknown as { __mushi: Hooks }).__mushi.game.getState().adopt('nanahoshi', 0));
}

test('zukan shows met species with facts and hides unmet ones', WIDE, async ({ page }) => {
  await start(page);
  await page.evaluate(() => (window as unknown as { __mushi: Hooks }).__mushi.ui.getState().go('zukan'));
  await settled(page);
  await expect(page.getByTestId('zukan-hud')).toBeVisible();
  await expect(page.getByTestId('zukan-kaiko')).toContainText('？？？');
  await page.getByTestId('zukan-nanahoshi').tap();
  await expect(page.getByTestId('zukan-detail')).toContainText('アブラムシ');
  await expect(page.getByTestId('zukan-detail')).toContainText('Coccinella septempunctata');
});

test('mushi-zumou can be played to a gentle result', WIDE, async ({ page }) => {
  await start(page);
  test.skip(await page.getByTestId('no-webgl').isVisible(), 'WebGL is not available in this browser');
  await page.evaluate(() => (window as unknown as { __mushi: Hooks }).__mushi.ui.getState().go('battle'));
  await settled(page);
  await expect(page.getByTestId('battle-select')).toContainText('たたかわない');
  await page.getByTestId('battle-pick-nanahoshi').tap();
  const push = page.getByTestId('battle-push');
  await expect(push).toBeVisible();
  // はっけよい…（入場の 間は 押せない）→ のこった！
  await expect(page.getByTestId('battle-intro')).toContainText('はっけよい');
  await expect(page.getByTestId('battle-intro')).toHaveCount(0, { timeout: 15000 });
  // 押して 技ゲージを ためると 得意技が 出せる
  const special = page.getByTestId('battle-special');
  for (let i = 0; i < 150 && (await special.isDisabled()); i++) {
    if (await page.getByTestId('battle-result').isVisible()) break;
    await push.dispatchEvent('pointerdown');
    await page.waitForTimeout(150);
  }
  if (!(await page.getByTestId('battle-result').isVisible())) {
    // 相手の 技が 割りこまないよう、相手の ゲージを からに してから 技を 出す
    await page.evaluate(() => {
      const bt = (window as unknown as { __mushi: { battle: { getState: () => { state: object }; setState: (p: object) => void } } }).__mushi.battle;
      bt.setState({ state: { ...bt.getState().state, cpuCharge: 0, cpuTell: 0, playerStun: 0 } });
    });
    await special.tap();
    await expect(page.getByTestId('battle-fact')).toContainText('しんだふり');
  }
  for (let i = 0; i < 200; i++) {
    if (await page.getByTestId('battle-result').isVisible()) break;
    await push.dispatchEvent('pointerdown');
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId('battle-result')).toContainText('がんばったね', { timeout: 40000 });
});

test('when all six cases are full, a child can send one back and welcome a new species', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const m = (window as unknown as { __mushi: Hooks }).__mushi;
    ['kabutomushi', 'namiageha', 'suzumushi', 'kaiko', 'miidera'].forEach((s, i) => m.game.getState().adopt(s, i + 1));
  });
  await page.getByTestId('new-insect').tap({ force: true });
  await expect(page.getByTestId('swap-picker')).toBeVisible();
  await page.getByTestId('swap-kaiko').tap();
  await expect(page.getByTestId('memory-card')).toContainText('カイコ');
  await page.getByTestId('memory-ok').tap({ force: true });
  await expect(page.getByTestId('species-picker')).toBeVisible();
  await page.getByTestId('pick-gomadara').tap();
  await expect(page.getByTestId('stage-label')).toContainText('ゴマダラカミキリ');
});

test('zukan tells that centipedes are not insects', async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const m = (window as unknown as { __mushi: Hooks }).__mushi;
    m.game.getState().adopt('tobizumukade', 1);
    m.ui.getState().go('zukan');
  });
  await settled(page);
  await page.getByTestId('zukan-tobizumukade').tap();
  await expect(page.getByTestId('not-insect')).toContainText('こんちゅうでは なく');
});
