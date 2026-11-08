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

test('adopts a beetle larva and cares for it with the mist tool', async ({ page }) => {
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
  await expect(page.getByTestId('need-moisture')).toHaveClass(/low/);
  const tool = page.getByTestId('tool-mist');
  await expect(tool).toBeVisible();
  const box = (await tool.boundingBox())!;
  const vp = page.viewportSize()!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(vp.width / 2, vp.height * 0.55, { steps: 10 });
  // ケースの上で きりふきを 持ったまま、しめりけが 上がるのを待つ（CI のソフトウェア描画でも通るよう余裕をもたせる）
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __mushi: Hooks }).__mushi.game.getState().creatures[0]!.needs.moisture),
      { timeout: 8000 },
    )
    .toBeGreaterThan(0.4);
  await page.mouse.up();
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
  await page.getByTestId('observe').tap();
  await expect(page.getByTestId('observe-hud')).toBeVisible();
  await page.getByTestId('part-horn').tap();
  await expect(page.getByTestId('part-bubble')).toContainText('ふたまた');
});
