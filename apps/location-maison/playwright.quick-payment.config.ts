import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './__tests__/e2e', testMatch: 'quick-payment-local.spec.ts', workers: 1,
  timeout: 60000, use: { baseURL: 'http://localhost:3002', screenshot: 'only-on-failure' },
  projects: [
    { name: 'quick-mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'quick-desktop', use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
