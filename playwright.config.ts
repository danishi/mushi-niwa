import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
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
