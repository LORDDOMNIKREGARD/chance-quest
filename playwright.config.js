import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 720 },
    // ponytail: on Windows this drives the Edge that is already installed (it is Chromium)
    // instead of downloading a browser. Elsewhere: `npx playwright install chromium`,
    // or set PW_CHANNEL=chrome to use an installed Chrome.
    channel: process.env.PW_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined),
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
