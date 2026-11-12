import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  // CI は ソフトウェア描画で 3D が とても おそい（iPad 横の 広い 画面では 1 テストが 60 秒を こえる ことが ある）
  timeout: process.env.CI ? 150_000 : 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}/mushi-niwa/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 16'], reducedMotion: 'reduce' } },
    { name: 'ipad', use: { ...devices['iPad Pro 11 landscape'], reducedMotion: 'reduce' } },
  ],
  webServer: {
    command: `npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/mushi-niwa/`,
    reuseExistingServer: !process.env.CI,
  },
});
