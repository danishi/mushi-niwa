import { expect, test, type Page } from '@playwright/test';

type Hooks = {
  game: { getState: () => { adopt: (s: string, slot: number) => void; creatures: Array<{ id: string; needs: Record<string, number> }> }; setState: (p: unknown) => void };
  ui: { getState: () => { go: (s: string, id?: string | null) => void } };
};

async function start(page: Page) {
  await page.goto('./?e2e');
  await page.getByTestId('boot-tap').tap();
  await page.getByTestId('start-button').tap();
  await expect(page.getByTestId('garden-hud')).toBeVisible();
  await page.waitForFunction(() => '__mushi' in window);
}

test('a beetle larva asks for moisture and the mist tool works with one tap', async ({ page }) => {
  await start(page);
  test.skip(await page.getByTestId('no-webgl').isVisible(), 'WebGL is not available in this browser');
  await page.evaluate(() => {
    const m = (window as unknown as { __mushi: Hooks }).__mushi;
    m.game.getState().adopt('kabutomushi', 0);
    const c = m.game.getState().creatures[0]!;
    m.game.setState({ creatures: [{ ...c, needs: { ...c.needs, moisture: 0.2 } }] });
    m.ui.getState().go('care', c.id);
  });
  await expect(page.getByTestId('care-hud')).toBeVisible();
  await expect(page.getByTestId('stage-label')).toContainText('ようちゅう');
  // 虫の吹き出しが「しめりけ」を頼み、霧吹きの道具が光っている
  await expect(page.getByTestId('want-mist')).toBeVisible();
  await expect(page.getByTestId('tool-mist')).toHaveClass(/want/);
  // タップだけで 霧吹きが ケースへ飛んでいって 使われる
  await page.getByTestId('tool-mist').tap();
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __mushi: Hooks }).__mushi.game.getState().creatures[0]!.needs.moisture),
      { timeout: 10000 },
    )
    .toBeGreaterThan(0.4);
  // 使い終わると 吹き出しが よろこびに かわる
  await expect(page.getByTestId('reaction-bubble')).toContainText('しっとり', { timeout: 15000 });
});

test('first visit shows a guided tutorial that ends after using a tool', async ({ page }) => {
  await start(page);
  test.skip(await page.getByTestId('no-webgl').isVisible(), 'WebGL is not available in this browser');
  await page.evaluate(() => {
    const m = (window as unknown as { __mushi: Hooks & { settings: { getState: () => { set: (p: unknown) => void } } } }).__mushi;
    m.settings.getState().set({ tutorialDone: false });
    m.game.getState().adopt('kabutomushi', 2);
    const c = m.game.getState().creatures[0]!;
    m.ui.getState().go('care', c.id);
  });
  await expect(page.getByTestId('tutorial')).toContainText('ふきだし');
  await expect(page.getByTestId('tutorial')).toContainText('どうぐ', { timeout: 8000 });
  await page.getByTestId('tool-food').tap({ force: true });
  await expect(page.getByTestId('tutorial')).toHaveCount(0);
});

test('saves progress on the device and restores it after reload', async ({ page }) => {
  await start(page);
  await page.evaluate(() => (window as unknown as { __mushi: Hooks }).__mushi.game.getState().adopt('miidera', 3));
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForFunction(() => '__mushi' in window);
  await page.waitForTimeout(500);
  const species = await page.evaluate(() =>
    (window as unknown as { __mushi: { game: { getState: () => { creatures: Array<{ species: string }> } } } }).__mushi.game
      .getState()
      .creatures.map((c) => c.species),
  );
  expect(species).toEqual(['miidera']);
});

test('observe mode explains body parts', async ({ page }) => {
  await start(page);
  test.skip(await page.getByTestId('no-webgl').isVisible(), 'WebGL is not available in this browser');
  await page.evaluate(() => {
    const m = (window as unknown as { __mushi: Hooks }).__mushi;
    m.game.getState().adopt('kabutomushi', 1);
    const c = m.game.getState().creatures[0]!;
    m.game.setState({ creatures: [{ ...c, stage: 2, sex: 'male' }] });
    m.ui.getState().go('care', c.id);
  });
  await page.evaluate(() => (window as unknown as { __mushi: Hooks }).__mushi.ui.getState().go('observe'));
  await expect(page.getByTestId('observe-hud')).toBeVisible();
  await page.getByTestId('part-horn').tap();
  await expect(page.getByTestId('part-bubble')).toContainText('ふたまた');
});
