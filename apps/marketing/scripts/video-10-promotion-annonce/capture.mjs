/**
 * Video 10 - Promouvoir une annonce.
 *
 * Sortie:
 *   videos/video-10-promotion-annonce/final/video-10-promotion-annonce-capture.mp4
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bufferModule = require('node:buffer');
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const APP_ROOT = path.join(ROOT, '..', 'location-maison');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-10-promotion-annonce');
const CAPTURES = path.join(VIDEO_DIR, 'captures');
const FINAL = path.join(VIDEO_DIR, 'final');

const BASE = process.env.VIDEO_BASE_URL || 'http://localhost:3000';
const VIEWPORT = { width: 540, height: 960 };
const SCALE = 2;
const EMAIL = 'monsieurleproprietaire@ttn.ga';
const PASSWORD = 'monsieurleproprietaire';
const UID = 'hjbEmxaJuPWUnXhca4Q5i4Vw1Fs2';
const PROPERTY_ID = 'video10-demo-promotion';
const REUSABLE_AUTH_STATE = path.join(
  ROOT,
  'videos',
  'video-09-creation-annonce-maison-ia',
  'captures',
  'video-09-auth-state.json'
);

fs.mkdirSync(CAPTURES, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

function cleanup() {
  for (const file of fs.readdirSync(CAPTURES)) {
    if (file.startsWith('video-10-promotion-annonce')) {
      fs.unlinkSync(path.join(CAPTURES, file));
    }
  }
}

async function prepareDemoData() {
  process.env.LOCATION_MAISON_ENV_PATH ||= path.join(APP_ROOT, '.env.local');
  const { initFirestoreAdmin } = require(path.join(APP_ROOT, 'scripts', 'openstreetmap', 'firestore-admin.js'));
  const { admin, db } = initFirestoreAdmin();
  const now = admin.firestore.Timestamp.now();

  const users = await db.collection('users').where('uid', '==', UID).get();
  if (users.empty) {
    await db.collection('users').doc(UID).set(
      {
        uid: UID,
        email: EMAIL,
        name: 'Monsieur',
        surname: 'Le Propriétaire',
        roles: ['User', 'Announcer'],
        credits: 100,
        emailVerified: true,
        state: 'IN_PROGRESS',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  } else {
    await Promise.all(users.docs.map((doc) => doc.ref.set({ credits: 100, updatedAt: now }, { merge: true })));
  }

  await db
    .collection('properties')
    .doc(PROPERTY_ID)
    .set(
      {
        id: PROPERTY_ID,
        typeProperty: 'Home',
        title: 'Maison à louer à Alenakiri',
        description:
          'Maison à louer à Alenakiri avec deux chambres, un salon, une cuisine, douche et WC interne. Située en voie secondaire.',
        area: 120,
        price: 140000,
        status: 'FOR_RENT',
        state: 'IN_PROGRESS',
        street: 'Alénakirie',
        city: 'Owendo',
        province: 'Estuaire',
        country: 'Gabon',
        countryCode: 'GA',
        latitude: 0.309,
        longitude: 9.497,
        isLocExact: false,
        additionnalInformation: 'Voie secondaire, accès facile.',
        contact: '077413382',
        isOwner: true,
        nbrRooms: 2,
        nbrKitchens: 1,
        nbrBathrooms: 1,
        nbrToilets: 1,
        nbrFloors: 1,
        nbrGarages: 0,
        nbrLivingRoom: 1,
        tags: ['Propriétaire', 'Sous barrière', 'Famille', 'Parking'],
        images: [
          {
            filePATH: 'video-demo/maison-alenakiri.webp',
            fileURL: `${BASE}/logo.webp`,
          },
        ],
        createdBy: UID,
        searchableName: 'maison a louer alenakiri owendo estuaire',
        isPromoted: false,
        promotionHistory: [],
        currentPromotion: admin.firestore.FieldValue.delete(),
        lastBoostedAt: admin.firestore.FieldValue.delete(),
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
}

async function installVideoGuards(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pwa-modal-dismissed-at', Date.now().toString());

    const selectors = [
      '#next-logo',
      '[data-next-mark]',
      '[data-nextjs-dev-tools-button]',
      '[data-issues-open]',
      '[data-issues-collapse]',
      '[data-nextjs-toast]',
      '[data-nextjs-dialog-overlay]',
      'nextjs-portal',
    ];

    const hideDevTools = () => {
      document.querySelectorAll(selectors.join(',')).forEach((el) => el.remove());
      document.querySelectorAll('button, [role="button"]').forEach((el) => {
        const label = [el.getAttribute('aria-label'), el.getAttribute('title'), el.textContent]
          .filter(Boolean)
          .join(' ');
        if (/Next\.js|Dev Tools|issues overlay|Issue/i.test(label)) el.remove();
      });
    };

    const start = () => {
      hideDevTools();
      new MutationObserver(hideDevTools).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      window.setInterval(hideDevTools, 250);
    };

    if (document.documentElement) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  });
}

async function addCleanStyle(page) {
  await page
    .addStyleTag({
      content: `
        [data-nextjs-dev-tools-button],
        #next-logo,
        [data-next-mark],
        [data-issues-open],
        [data-issues-collapse],
        [data-nextjs-toast],
        [data-nextjs-dialog-overlay],
        nextjs-portal {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `,
    })
    .catch(() => null);
}

async function slowFill(locator, value, delay = 20) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ force: true });
  await locator.fill('');
  await locator.pressSequentially(value, { delay });
}

async function ensureAuth(browser, storageState) {
  if (process.env.VIDEO_REUSE_AUTH_STATE === '1' && fs.existsSync(REUSABLE_AUTH_STATE)) {
    fs.copyFileSync(REUSABLE_AUTH_STATE, storageState);
    return;
  }

  const loginCtx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    locale: 'fr-FR',
  });
  const loginPage = await loginCtx.newPage();
  await installVideoGuards(loginPage);
  await loginPage.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(loginPage);
  await loginPage.locator('input').first().waitFor({ state: 'visible', timeout: 45000 });
  await slowFill(loginPage.locator('input').nth(0), EMAIL, 4);
  await slowFill(loginPage.locator('input').nth(1), PASSWORD, 4);
  await loginPage.getByRole('button', { name: /Connexion/i }).click();
  await Promise.race([
    loginPage.waitForURL(/\/property|\/profil/, { timeout: 45000 }).catch(() => null),
    loginPage.waitForFunction(() => document.body.innerText.includes('Publier'), null, { timeout: 45000 }).catch(() => null),
  ]);
  await loginCtx.storageState({ path: storageState });
  await loginCtx.close();
}

async function highlightLocator(page, locator, label, side = 'top') {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  const box = await locator.boundingBox();
  if (!box) return;

  await page.evaluate(
    ({ box, label, side }) => {
      document.querySelectorAll('[data-video-highlight]').forEach((el) => el.remove());
      const frame = document.createElement('div');
      frame.setAttribute('data-video-highlight', 'frame');
      Object.assign(frame.style, {
        position: 'fixed',
        left: `${box.x - 8}px`,
        top: `${box.y - 8}px`,
        width: `${box.width + 16}px`,
        height: `${box.height + 16}px`,
        border: '5px solid #f59e0b',
        borderRadius: '18px',
        zIndex: '99999',
        pointerEvents: 'none',
        boxShadow: '0 0 0 9999px rgba(0,0,0,.08)',
      });

      const callout = document.createElement('div');
      callout.setAttribute('data-video-highlight', 'callout');
      callout.textContent = label;
      Object.assign(callout.style, {
        position: 'fixed',
        left: `${Math.max(24, Math.min(box.x - 12, window.innerWidth - 285))}px`,
        top: side === 'bottom' ? `${Math.min(window.innerHeight - 82, box.y + box.height + 18)}px` : `${Math.max(24, box.y - 76)}px`,
        zIndex: '99999',
        background: '#146B67',
        color: '#ffffff',
        padding: '14px 20px',
        borderRadius: '999px',
        fontSize: '22px',
        fontWeight: '800',
        boxShadow: '0 14px 35px rgba(20,107,103,.26)',
        pointerEvents: 'none',
      });
      document.body.append(frame, callout);
    },
    { box, label, side }
  );
}

async function clearHighlights(page) {
  await page.evaluate(() => document.querySelectorAll('[data-video-highlight]').forEach((el) => el.remove()));
}

async function capture() {
  cleanup();
  await prepareDemoData();

  const browser = await chromium.launch({ headless: true });
  const storageState = path.join(CAPTURES, 'video-10-auth-state.json');
  await ensureAuth(browser, storageState);

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    locale: 'fr-FR',
    storageState,
    recordVideo: {
      dir: CAPTURES,
      size: { width: 1080, height: 1920 },
    },
  });

  const page = await ctx.newPage();
  await installVideoGuards(page);
  await page.goto(`${BASE}/property`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(page);
  await page
    .waitForFunction(
      () => document.body.innerText.includes('Gestion des annonces') && document.body.innerText.includes('Maison à louer à Alenakiri'),
      null,
      { timeout: 45000 }
    )
    .catch(async (error) => {
      const debugPath = path.join(CAPTURES, 'video-10-property-timeout.png');
      await page.screenshot({ path: debugPath, fullPage: true }).catch(() => null);
      const text = await page.locator('body').innerText().catch(() => '');
      throw new Error(`Page /property inattendue. Capture: ${debugPath}\n${text.slice(0, 2500)}\n${error.message}`);
    });
  await page.waitForTimeout(2200);

  const title = page.getByText('Maison à louer à Alenakiri').first();
  await title.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);

  const promoteButton = page.getByRole('button', { name: /Promouvoir/i }).first();
  await highlightLocator(page, promoteButton, 'Bouton Promouvoir', 'top');
  await page.waitForTimeout(1700);
  await promoteButton.click({ force: true });
  await clearHighlights(page);

  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1300);
  await page.getByText('Votre solde de crédits').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);

  await page.getByText('Mise à la une').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.getByText('Mise en tendance', { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);

  const tendance = page.getByRole('button', { name: /Sélectionner Mise en tendance - 10 crédits/i }).first();
  await highlightLocator(page, tendance, 'Option tendance', 'top');
  await page.waitForTimeout(1100);
  await tendance.click({ force: true });
  await clearHighlights(page);
  await page.waitForTimeout(1000);

  await page.getByText('Récapitulatif de votre sélection').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  const confirm = page.getByRole('button', { name: /Promouvoir maintenant/i });
  await highlightLocator(page, confirm, 'Confirmer', 'top');
  await page.waitForTimeout(1000);
  await confirm.click({ force: true });
  await clearHighlights(page);

  await page.waitForFunction(() => document.body.innerText.includes('Promotion activée'), null, { timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(2200);
  await page.getByText('Maison à louer à Alenakiri').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const activeButton = page.getByRole('button', { name: /En tendance/i }).first();
  if (await activeButton.isVisible().catch(() => false)) {
    await highlightLocator(page, activeButton, 'Annonce en tendance', 'top');
  }
  await page.waitForTimeout(2800);
  await clearHighlights(page);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const tmp = await video.path();
  const webm = path.join(CAPTURES, 'video-10-promotion-annonce.webm');
  fs.renameSync(tmp, webm);
  return webm;
}

function convert(webm) {
  const out = path.join(FINAL, 'video-10-promotion-annonce-capture.mp4');
  execSync(
    `ffmpeg -y -i "${webm}" -vf "crop=540:960:0:0,fps=30,scale=1080:1920" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${out}"`,
    { stdio: 'inherit' }
  );
  return out;
}

async function main() {
  console.log('Capture video-10 promotion annonce');
  const webm = await capture();
  const out = convert(webm);
  const { size } = fs.statSync(out);
  console.log(`\nOK ${out}`);
  console.log(`Taille: ${(size / 1024 / 1024).toFixed(1)} Mo`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
