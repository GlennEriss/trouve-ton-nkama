/**
 * Video 08 - Creation manuelle d'une annonce de maison a louer.
 *
 * Sortie:
 *   videos/video-08-creation-annonce-maison/final/video-08-creation-annonce-maison-capture.mp4
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-08-creation-annonce-maison');
const CAPTURES = path.join(VIDEO_DIR, 'captures');
const FINAL = path.join(VIDEO_DIR, 'final');
const ASSETS = path.join(ROOT, 'assets', 'annonces', 'monsieur-le-proprietaire-awendje');

const BASE = process.env.VIDEO_BASE_URL || 'http://localhost:3000';
const VIEWPORT = { width: 540, height: 960 };
const SCALE = 2;
const EMAIL = 'monsieurleproprietaire@ttn.ga';
const PASSWORD = 'monsieurleproprietaire';

fs.mkdirSync(CAPTURES, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

function cleanup() {
  for (const file of fs.readdirSync(CAPTURES)) {
    if (file.startsWith('video-08-creation-annonce-maison')) {
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
        if (/Next\.js|Dev Tools|issues overlay|Issue|assistant|chat/i.test(label)) el.remove();
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
      [aria-label*="assistant" i],
      [aria-label*="chat" i] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      .fixed.right-4.bottom-4,
      .fixed.md\\:right-6.md\\:bottom-6 {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      body * {
        scroll-margin-bottom: 220px;
      }
    `,
  }).catch(() => null);
}

async function slowFill(locator, value, delay = 35) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ force: true });
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

async function selectPlace(page, placeholder, query, optionText = query) {
  const input = page.getByPlaceholder(placeholder).first();
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await input.fill('');
  await input.pressSequentially(query, { delay: 55 });
  await page.waitForTimeout(1600);

  const option = page.locator('button').filter({ hasText: new RegExp(optionText, 'i') }).first();
  if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
    await option.click({ force: true });
    await page.waitForTimeout(900);
    return;
  }

  await input.blur();
  await page.waitForTimeout(700);
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

async function highlightRoleField(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-video-highlight]').forEach((el) => el.remove());

    const nodes = Array.from(document.querySelectorAll('body *'));
    const label = nodes.find((el) => /Votre rôle sur ce bien/i.test(el.textContent || ''));
    const owner = nodes.find((el) => /^Propriétaire direct$/i.test((el.textContent || '').trim()));
    const target = owner?.closest('button, label, [role="button"], div') || label;

    if (target instanceof HTMLElement) {
      target.style.outline = '5px solid #1FA89B';
      target.style.outlineOffset = '6px';
      target.style.borderRadius = '18px';
      target.setAttribute('data-video-target', 'role-owner');
    }

    const callout = document.createElement('div');
    callout.setAttribute('data-video-highlight', 'role-callout');
    callout.textContent = 'Tag Propriétaire direct';
    Object.assign(callout.style, {
      position: 'fixed',
      left: '38px',
      top: '585px',
      zIndex: '99999',
      background: '#146B67',
      color: '#ffffff',
      padding: '16px 22px',
      borderRadius: '999px',
      fontSize: '24px',
      fontWeight: '800',
      boxShadow: '0 16px 40px rgba(20, 107, 103, 0.25)',
      pointerEvents: 'none',
    });
    document.body.appendChild(callout);
  });
}

async function clearHighlights(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-video-highlight]').forEach((el) => el.remove());
    document.querySelectorAll('[data-video-target]').forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.borderRadius = '';
        el.removeAttribute('data-video-target');
      }
    });
  });
}

async function capture() {
  cleanup();

  const imageFiles = fs
    .readdirSync(ASSETS)
    .filter((file) => /^photo-\d+\.jpe?g$/i.test(file))
    .sort()
    .slice(0, 5)
    .map((file) => path.join(ASSETS, file));

  if (imageFiles.length === 0) {
    throw new Error(`Aucune photo trouvee dans ${ASSETS}. Ajoute des fichiers photo-01.jpeg, photo-02.jpeg, etc.`);
  }

  const browser = await chromium.launch({ headless: true });
  const storageState = path.join(CAPTURES, 'video-08-auth-state.json');

  const loginCtx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    locale: 'fr-FR',
  });

  const loginPage = await loginCtx.newPage();
  await installVideoGuards(loginPage);
  await loginPage.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(loginPage);
  await loginPage.waitForTimeout(1200);

  await loginPage.locator('input').first().waitFor({ state: 'visible', timeout: 45000 });
  await slowFill(loginPage.locator('input').nth(0), EMAIL, 5);
  await slowFill(loginPage.locator('input').nth(1), PASSWORD, 5);
  await loginPage.getByRole('button', { name: /Connexion/i }).click();
  await loginPage.waitForURL(/\/property/, { timeout: 30000 });
  await loginCtx.storageState({ path: storageState });
  await loginCtx.close();

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

  await page.goto(`${BASE}/property/add/home`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(page);
  await page.waitForURL(/\/property\/add\/home/, { timeout: 30000 });
  await page.waitForFunction(
    () => document.body.innerText.includes("Ajout d'une maison") && document.body.innerText.includes('Tags'),
    null,
    { timeout: 45000 }
  );
  await page.waitForTimeout(2000);

  await page.locator('input[type=file]').setInputFiles(imageFiles);
  await page.waitForTimeout(2200);

  await page.getByText(/Votre rôle sur ce bien/i).scrollIntoViewIfNeeded().catch(() => null);
  await highlightRoleField(page);
  await page.waitForTimeout(1800);
  await clickText(page, 'Propriétaire direct');
  await clearHighlights(page);
  await page.waitForTimeout(900);
  await clickFirstButtonText(page, 'Sous barrière');
  await page.waitForTimeout(250);
  await clickFirstButtonText(page, 'Transport proche').catch(() => null);
  await page.waitForTimeout(650);

  const step1Inputs = page.locator('input:not([type=file]):visible');
  await slowFill(step1Inputs.nth(0), 'Maison a louer a Alenakiri', 35);
  await page.waitForTimeout(500);
  await slowFill(
    page.locator('textarea').first(),
    "Maison a louer a Alenakiri avec 2 chambres, 1 salon, 1 cuisine, douche et WC interne. Situee en voie secondaire, dans un quartier accessible.",
    4
  );
  await page.waitForTimeout(500);
  await slowFill(step1Inputs.nth(1), '120', 70);
  await slowFill(step1Inputs.nth(2), '140000', 55);
  await page.waitForTimeout(600);
  await clickButtonText(page, 'Suivant');
  await page.waitForTimeout(1600);

  const step2Inputs = page.locator('input:not([type=file]):visible');
  const step2Values = ['2', '1', '1', '1', '1', '1', '0'];
  for (let i = 0; i < step2Values.length; i += 1) {
    await slowFill(step2Inputs.nth(i), step2Values[i], 55);
  }
  await page.waitForTimeout(700);
  await clickButtonText(page, 'Suivant');
  await page.waitForTimeout(2200);

  await page.waitForFunction(
    () => document.body.innerText.includes('Localisation du bien'),
    null,
    { timeout: 45000 }
  );
  await page.waitForTimeout(900);
  await selectCombo(page, 0, 'Estuaire');
  await selectPlace(page, /Libreville|Port-Gentil/i, 'Owendo', 'Owendo');
  await selectPlace(page, /Glass|Akanda|Lalala/i, 'Alenakiri', 'Alenakiri');
  await slowFill(
    page.locator('textarea').first(),
    "Voie secondaire, acces facile.",
    16
  );
  await page.waitForTimeout(900);
  const contactInput = page.locator('input:not([type=file]):visible').last();
  await slowFill(contactInput, '077413382', 45);
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  await clickButtonText(page, 'Enregistrer');
  await page.waitForURL(/\/property(\?submitted=1)?/, { timeout: 18000 }).catch(() => null);
  await page.waitForTimeout(6500);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const tmp = await video.path();
  const webm = path.join(CAPTURES, 'video-08-creation-annonce-maison.webm');
  fs.renameSync(tmp, webm);
  return webm;
}

function convert(webm) {
  const out = path.join(FINAL, 'video-08-creation-annonce-maison-capture.mp4');
  execSync(
    `ffmpeg -y -i "${webm}" -vf "crop=540:960:0:0,fps=30,scale=1080:1920" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${out}"`,
    { stdio: 'inherit' }
  );
  return out;
}

async function main() {
  console.log('Capture video-08 creation annonce maison');
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
