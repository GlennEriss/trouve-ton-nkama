import { chromium } from 'playwright-core';
import { encode } from 'next-auth/jwt';
import { config } from 'dotenv';
config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';
const AUTH_COOKIE_NAME = 'authjs.session-token';

const E2E_ANNOUNCER = {
  uid: 'announcer-e2e',
  firstname: 'Glenn',
  lastname: 'Eriss',
  email: 'glenn.e2e@example.com',
  roles: ['Announcer'],
  phoneNumbers: ['+24166545430'],
  phoneNumberVerified: true,
  birthDate: '1990-01-01',
  credits: 169,
  favoris: [],
  providers: ['CREDENTIALS'],
  notificationParameter: {
    isNew: false,
    isAccountActivity: false,
    isNewAnnouncement: false,
    isFavoris: false,
    isPersonalizedSuggestions: false,
    isSystemUpdated: false,
  },
  metadata: { needsProfileCompletion: false },
};

const secret = process.env.NEXTAUTH_SECRET;
if (!secret) {
  console.error('NEXTAUTH_SECRET missing');
  process.exit(1);
}

const value = await encode({ secret, salt: AUTH_COOKIE_NAME, token: { user: E2E_ANNOUNCER } });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1200 } });
await context.addCookies([
  { name: AUTH_COOKIE_NAME, value, url: BASE_URL, httpOnly: true, sameSite: 'Lax', secure: false },
]);

const page = await context.newPage();
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

await page.goto(`${BASE_URL}/my-balance/history`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('text=Historique de crédits', { timeout: 15000 });
await page.screenshot({ path: '/private/tmp/claude-501/-Users-glenneriss-Documents-projets/e61b1a0e-7843-43f0-a224-c3a476594889/scratchpad/history-after.png', fullPage: false });

// Grab bounding boxes to measure alignment precisely, not just visually.
const breadcrumbBox = await page.locator('nav[aria-label="breadcrumb"], [data-slot="breadcrumb"]').first().boundingBox().catch(() => null);
const titleBox = await page.locator('text=Historique de crédits').first().boundingBox().catch(() => null);

console.log('breadcrumbBox', breadcrumbBox);
console.log('titleBox', titleBox);
console.log('console errors', errors);

await browser.close();
