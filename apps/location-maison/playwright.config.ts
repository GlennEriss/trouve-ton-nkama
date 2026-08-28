import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { config } from 'dotenv';

/**
 * Playwright Configuration
 * 
 * E2E tests configuration for the Location Maison application.
 * Supports multiple environments: dev, preprod, prod
 */

// Load environment variables based on E2E_ENV
const e2eEnv = process.env.E2E_ENV || 'dev';
const envFile = `.env.local.${e2eEnv}`;
const envPath = path.resolve(process.cwd(), envFile);

// Try to load environment file
try {
  config({ path: envPath });
  console.log(`✅ Loaded environment from: ${envFile}`);
} catch (error) {
  console.warn(`⚠️  Could not load ${envFile}, using default environment variables`);
}

const serverUrl = process.env.E2E_BASE_URL || 'http://localhost:3001';

// En CI, toujours démarrer le serveur
// En local, réutiliser le serveur s'il existe (reuseExistingServer: true)
// Playwright vérifiera automatiquement si le serveur répond avant de démarrer un nouveau
const reuseExistingServer = process.env.CI === 'true' ? false : true;

if (reuseExistingServer) {
  console.log(`ℹ️  Configuration: réutilisation du serveur existant si disponible sur ${serverUrl}`);
} else {
  console.log(`🚀 Configuration: démarrage d'un nouveau serveur sur ${serverUrl}`);
}

export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 30 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    baseURL: serverUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10 * 1000,
    // Refuse la géolocalisation par défaut : sans ça, le navigateur affiche
    // une vraie invite native ("Connaître votre position ?") qui bloque la
    // vue en mode --headed et peut perturber le timing des tests.
    permissions: [],
    geolocation: undefined,
  },

  // Multi-navigateurs + Multi-viewports
  projects: [
      // DEV Environment - Desktop Chrome
      {
        name: 'chromium-desktop-dev',
        use: {
          ...devices['Desktop Chrome'],
          viewport: { width: 1920, height: 1080 },
        },
      },
      // PREPROD Environment - Desktop Chrome
      {
        name: 'chromium-desktop-preprod',
        use: {
          ...devices['Desktop Chrome'],
          viewport: { width: 1920, height: 1080 },
        },
      },
      // PROD Environment - Desktop Chrome (use with caution)
      {
        name: 'chromium-desktop-prod',
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
    command: e2eEnv === 'preprod' 
      ? 'npm run test:e2e:preprod'
      : e2eEnv === 'prod'
      ? 'npm run test:e2e:prod'
      : 'npm run test:e2e:dev',
    url: serverUrl,
    reuseExistingServer: reuseExistingServer, // Réutiliser le serveur s'il est déjà démarré (en local)
    timeout: 180 * 1000, // Increased timeout to 3 minutes
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      E2E_ENV: e2eEnv,
      NEXT_IGNORE_INCORRECT_LOCKFILE: '1',
    },
  },
});
