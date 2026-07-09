/**
 * Video 03.2 - Connexion annonceur et creation de l'annonce du studio.
 *
 * Sortie:
 *   videos/video-03-annonceur/final/video-03-02-connexion-creation-annonce.mp4
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-03-annonceur');
const CAPTURES = path.join(VIDEO_DIR, 'captures');
const FINAL = path.join(VIDEO_DIR, 'final');
const ASSETS = path.join(ROOT, 'assets', 'annonces', 'mere-huguette-belle-vue-2');

const BASE = process.env.VIDEO_BASE_URL || 'http://localhost:3000';
const VIEWPORT = { width: 540, height: 960 };
const SCALE = 2;
const EMAIL = 'merehuguette@ttn.ga';
const PASSWORD = 'merehuguette';

fs.mkdirSync(CAPTURES, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

function cleanup() {
  for (const file of fs.readdirSync(CAPTURES)) {
    if (file.startsWith('video-03-02-login-create')) {
      fs.unlinkSync(path.join(CAPTURES, file));
    }
  }
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
  await page.addStyleTag({
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
  }).catch(() => null);
}

async function slowFill(locator, value, delay = 35) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(value, { delay });
}

async function clickText(page, text) {
  const target = page.getByText(text, { exact: true });
  await target.scrollIntoViewIfNeeded();
  await target.click({ force: true });
  await page.waitForTimeout(350);
}

async function selectCombo(page, index, option) {
  const combo = page.getByRole('combobox').nth(index);
  await combo.scrollIntoViewIfNeeded();
  await combo.click();
  await page.waitForTimeout(450);
  await page.getByRole('option', { name: new RegExp(`^${option}$`, 'i') }).click();
  await page.waitForTimeout(650);
}

async function clickButtonText(page, text) {
  const button = page.locator('button').filter({ hasText: new RegExp(text, 'i') }).last();
  if (await button.count()) {
    await button.scrollIntoViewIfNeeded();
    await button.click({ force: true });
  } else {
    const visibleText = page.getByText(new RegExp(`^${text}$`, 'i')).last();
    await visibleText.scrollIntoViewIfNeeded();
    await visibleText.click({ force: true });
  }
  await page.waitForTimeout(350);
}

async function clickFirstButtonText(page, text) {
  const button = page.locator('button').filter({ hasText: new RegExp(text, 'i') }).first();
  await button.scrollIntoViewIfNeeded();
  await button.click({ force: true });
  await page.waitForTimeout(350);
}

async function capture() {
  cleanup();

  const imageFiles = fs
    .readdirSync(ASSETS)
    .filter((file) => /^photo-\d+\.jpe?g$/i.test(file))
    .sort()
    .slice(0, 5)
    .map((file) => path.join(ASSETS, file));

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    locale: 'fr-FR',
    recordVideo: {
      dir: CAPTURES,
      size: { width: 1080, height: 1920 },
    },
  });

  const page = await ctx.newPage();
  await installVideoGuards(page);

  await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(page);
  await page.waitForTimeout(1200);

  await slowFill(page.locator('input[type=email]'), EMAIL, 45);
  await page.waitForTimeout(350);
  await slowFill(page.locator('input[type=password]'), PASSWORD, 55);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Connexion/i }).click();
  await page.waitForURL(/\/property/, { timeout: 30000 });
  await addCleanStyle(page);
  await page.waitForTimeout(2400);

  await page.goto(`${BASE}/property/add/studio`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(page);
  await page.waitForURL(/\/property\/add\/studio/, { timeout: 30000 });
  await page.waitForFunction(
    () => document.body.innerText.includes("Ajout d'un studio") && document.body.innerText.includes('Tags'),
    null,
    { timeout: 45000 }
  );
  await page.waitForTimeout(2000);

  await page.locator('input[type=file]').setInputFiles(imageFiles);
  await page.waitForTimeout(2200);

  await clickText(page, 'Propriétaire direct');
  await clickFirstButtonText(page, 'Sous barrière');
  await page.waitForTimeout(250);
  await clickFirstButtonText(page, 'Transport proche').catch(() => null);
  await page.waitForTimeout(650);

  const step1Inputs = page.locator('input:not([type=file])');
  await slowFill(step1Inputs.nth(0), 'Studio a louer a Belle Vue 2', 35);
  await page.waitForTimeout(500);
  await slowFill(
    page.locator('textarea').first(),
    "Studio a louer a Belle Vue 2, en face de l'hopital chinois. Salon, coin cuisine avec placard, grande chambre, debarras, douche et toilette. Cuve d'eau personnelle devant la porte.",
    4
  );
  await page.waitForTimeout(500);
  await slowFill(step1Inputs.nth(1), '45', 70);
  await slowFill(step1Inputs.nth(2), '130000', 55);
  await page.waitForTimeout(600);
  await clickButtonText(page, 'Suivant');
  await page.waitForTimeout(1600);

  const step2Inputs = page.locator('input:not([type=file])');
  const step2Values = ['1', '1', '1', '1', '0', '01'];
  for (let i = 0; i < step2Values.length; i += 1) {
    await slowFill(step2Inputs.nth(i), step2Values[i], 55);
  }
  await page.waitForTimeout(700);
  await clickButtonText(page, 'Suivant');
  await page.waitForTimeout(2200);

  await selectCombo(page, 0, 'Estuaire');
  await selectCombo(page, 1, 'Libreville');
  await selectCombo(page, 2, 'Charbonnages');
  await slowFill(
    page.locator('textarea').first(),
    "En face de l'hopital chinois, dans la barriere. Contact: 074 10 16 17 / WhatsApp 065 69 65 96.",
    16
  );
  await page.waitForTimeout(900);
  await clickButtonText(page, 'Enregistrer');
  await page.waitForTimeout(7000);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const tmp = await video.path();
  const webm = path.join(CAPTURES, 'video-03-02-login-create.webm');
  fs.renameSync(tmp, webm);
  return webm;
}

function convert(webm) {
  const out = path.join(FINAL, 'video-03-02-connexion-creation-annonce.mp4');
  execSync(
    `ffmpeg -y -i "${webm}" -vf "crop=540:960:0:0,fps=30,scale=1080:1920" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${out}"`,
    { stdio: 'inherit' }
  );
  return out;
}

async function main() {
  console.log('Capture video-03-02 connexion et creation annonce');
  const webm = await capture();
  const out = convert(webm);
  const { size } = fs.statSync(out);
  console.log(`\\nOK ${out}`);
  console.log(`Taille: ${(size / 1024 / 1024).toFixed(1)} Mo`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
