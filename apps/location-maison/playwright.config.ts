import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration
 * 
 * E2E tests configuration for the Location Maison application.
 * Tests run against Firebase Cloud (dev environment).
 */

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 30 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10 * 1000,
  },

  // Multi-navigateurs + Multi-viewports
  projects: [
    // Desktop Chrome
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // Desktop Firefox
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // Desktop Safari
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // Tablet
    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad Pro'],
      },
    },
    // Mobile
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'webkit-mobile',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run test:e2e:dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
