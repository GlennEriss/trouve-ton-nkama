/**
 * Video 09 - Creation d'une annonce de maison avec l'assistant IA.
 *
 * Sortie:
 *   videos/video-09-creation-annonce-maison-ia/final/video-09-creation-annonce-maison-ia-capture.mp4
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-09-creation-annonce-maison-ia');
const CAPTURES = path.join(VIDEO_DIR, 'captures');
const FINAL = path.join(VIDEO_DIR, 'final');
const ASSETS = path.join(ROOT, 'assets', 'annonces', 'monsieur-le-proprietaire-awendje');

const BASE = process.env.VIDEO_BASE_URL || 'http://localhost:3000';
const VIEWPORT = { width: 540, height: 960 };
const SCALE = 2;
const EMAIL = 'monsieurleproprietaire@ttn.ga';
const PASSWORD = 'monsieurleproprietaire';
const REUSABLE_AUTH_STATE = path.join(
  ROOT,
  'videos',
  'video-08-creation-annonce-maison',
  'captures',
  'video-08-auth-state.json'
);

const AI_DESCRIPTION = `Maison a louer a Alenakiri, voie secondaire.
2 chambres, 1 salon, 1 cuisine, douche et WC interne.
Prix : 140000 FCFA par mois.
Situee a Owendo, province Estuaire.
Quartier accessible, voie secondaire.
Contact : 077413382.
Je suis le proprietaire direct.`;

fs.mkdirSync(CAPTURES, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

function cleanup() {
  for (const file of fs.readdirSync(CAPTURES)) {
    if (file.startsWith('video-09-creation-annonce-maison-ia')) {
      fs.unlinkSync(path.join(CAPTURES, file));
    }
  }
}

async function installVideoGuards(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('pwa-modal-dismissed-at', Date.now().toString());
    window.localStorage.removeItem('property_form_draft');

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

async function setReactTextarea(page, selector, value) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.locator(selector).first().click({ force: true });
  await page.locator(selector).first().fill(value).catch(() => null);
  await page.evaluate(
    ({ selector: innerSelector, value: nextValue }) => {
      const textarea = document.querySelector(innerSelector);
      if (!(textarea instanceof HTMLTextAreaElement)) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(textarea, nextValue);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { selector, value }
  );
}

async function closeAssistant(page) {
  if (!(await page.getByLabel('Assistant IA').isVisible().catch(() => false))) return;
  await page.keyboard.press('Escape').catch(() => null);
  await page.waitForTimeout(500);
  if (await page.getByLabel('Assistant IA').isVisible().catch(() => false)) {
    await page
      .locator('[aria-label="Assistant IA"] button')
      .first()
      .click({ force: true })
      .catch(() => null);
    await page.getByLabel('Assistant IA').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(500);
  }
}

async function showGeneratedEssentials(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1200);

  const titleInput = page.locator('input:not([type=file]):visible').nth(0);
  await titleInput.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);

  const description = page.locator('textarea:visible').first();
  if (await description.isVisible().catch(() => false)) {
    await description.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1300);
  }

  const priceInput = page.locator('input:not([type=file]):visible').nth(2);
  await priceInput.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);

  await page.getByText('Tags', { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600);
}

async function clickText(page, text) {
  const target = page.getByText(text, { exact: true });
  await target.scrollIntoViewIfNeeded();
  await target.click({ force: true });
  await page.waitForTimeout(350);
}

async function clickButtonText(page, text) {
  const button = page.locator('button:visible').filter({ hasText: new RegExp(`^\\s*${text}\\s*$`, 'i') }).last();
  await button.scrollIntoViewIfNeeded();
  await button.click({ force: true });
  await page.waitForTimeout(400);
}

async function clickFirstButtonText(page, text) {
  const button = page.locator('button').filter({ hasText: new RegExp(text, 'i') }).first();
  await button.scrollIntoViewIfNeeded();
  await button.click({ force: true });
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
  await input.click({ force: true });
  await input.fill('');
  await input.pressSequentially(query, { delay: 55 });
  await page.waitForTimeout(1600);

  const option = page.locator('button').filter({ hasText: new RegExp(optionText, 'i') }).first();
  if (await option.isVisible({ timeout: 4500 }).catch(() => false)) {
    await option.click({ force: true });
    await page.waitForTimeout(900);
    return;
  }

  await input.blur();
  await page.waitForTimeout(700);
}

async function highlightBot(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-video-highlight]').forEach((el) => el.remove());
    const launcher = document.querySelector('.fixed.right-4 button');
    if (launcher instanceof HTMLElement) {
      launcher.style.outline = '5px solid #1FA89B';
      launcher.style.outlineOffset = '8px';
      launcher.style.borderRadius = '24px';
      launcher.setAttribute('data-video-target', 'assistant');
    }

    const callout = document.createElement('div');
    callout.setAttribute('data-video-highlight', 'assistant-callout');
    callout.textContent = 'Assistant IA';
    Object.assign(callout.style, {
      position: 'fixed',
      right: '118px',
      bottom: '180px',
      zIndex: '99999',
      background: '#146B67',
      color: '#ffffff',
      padding: '16px 22px',
      borderRadius: '999px',
      fontSize: '25px',
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

async function completeMissingFields(page) {
  await page.waitForTimeout(1000);
  const visibleInputs = page.locator('input:not([type=file]):visible');
  const visibleTextareas = page.locator('textarea:visible');

  const title = visibleInputs.nth(0);
  if (!(await title.inputValue().catch(() => '')).trim()) {
    await slowFill(title, 'Maison a louer a Alenakiri', 25);
  }

  const description = visibleTextareas.first();
  if ((await description.count()) && !(await description.inputValue().catch(() => '')).trim()) {
    await slowFill(
      description,
      'Maison a louer a Alenakiri avec 2 chambres, 1 salon, 1 cuisine, douche et WC interne. Situee en voie secondaire, dans un quartier accessible.',
      3
    );
  }

  if (!(await visibleInputs.nth(1).inputValue().catch(() => '')).trim()) {
    await slowFill(visibleInputs.nth(1), '120', 45);
  }
  const price = await visibleInputs.nth(2).inputValue().catch(() => '');
  if (!price.trim() || Number(price) <= 1) {
    await slowFill(visibleInputs.nth(2), '140000', 35);
  }

  await page.waitForTimeout(800);
  if (await page.getByText('Propriétaire direct', { exact: true }).isVisible().catch(() => false)) {
    await clickText(page, 'Propriétaire direct');
  }
  await clickFirstButtonText(page, 'Sous barrière').catch(() => null);
  await page.waitForTimeout(500);
}

async function fillStep2(page) {
  await page.waitForFunction(
    () =>
      document.body.innerText.includes('Chambres') ||
      document.body.innerText.includes('Nombre') ||
      document.body.innerText.includes('Caractéristiques'),
    null,
    { timeout: 20000 }
  ).catch(() => null);
  const step2Inputs = page.locator('input:not([type=file]):visible');
  const values = ['2', '1', '1', '1', '1', '1', '0'];
  const count = Math.min(await step2Inputs.count(), values.length);
  for (let i = 0; i < count; i += 1) {
    const input = step2Inputs.nth(i);
    const current = await input.inputValue().catch(() => '');
    if (!current.trim() || current === '0') {
      await slowFill(input, values[i], 40);
    }
  }
}

async function fillStep3(page) {
  await page.waitForFunction(() => document.body.innerText.includes('Localisation du bien'), null, { timeout: 45000 }).catch(
    async () => {
      const debugPath = path.join(CAPTURES, 'video-09-step3-timeout.png');
      await page.screenshot({ path: debugPath, fullPage: true }).catch(() => null);
      const body = await page.locator('body').innerText().catch(() => '');
      throw new Error(`Etape localisation introuvable. Capture debug: ${debugPath}\n${body.slice(0, 1500)}`);
    }
  );
  await page.waitForTimeout(800);

  if (!(await page.getByText('Estuaire', { exact: true }).isVisible().catch(() => false))) {
    await selectCombo(page, 0, 'Estuaire');
  }
  await selectPlace(page, /Libreville|Port-Gentil/i, 'Owendo', 'Owendo');
  await selectPlace(page, /Glass|Akanda|Lalala/i, 'Alénakirie', 'Alénakirie');
  const districtInput = page.getByPlaceholder(/Glass|Akanda|Lalala/i).first();
  if (!(await districtInput.inputValue().catch(() => '')).trim()) {
    await slowFill(districtInput, 'Alénakirie', 35);
    await districtInput.blur();
    await page.waitForTimeout(500);
  }

  const textarea = page.locator('textarea:visible').first();
  if ((await textarea.count()) && !(await textarea.inputValue().catch(() => '')).trim()) {
    await slowFill(textarea, 'Voie secondaire, acces facile.', 12);
  }

  const contactInput = page.locator('input:not([type=file]):visible').last();
  const contact = await contactInput.inputValue().catch(() => '');
  if (!contact.includes('077413382')) {
    await slowFill(contactInput, '077413382', 35);
  }
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
    throw new Error(`Aucune photo trouvee dans ${ASSETS}.`);
  }

  const browser = await chromium.launch({ headless: true });
  const storageState = path.join(CAPTURES, 'video-09-auth-state.json');

  if (fs.existsSync(REUSABLE_AUTH_STATE)) {
    fs.copyFileSync(REUSABLE_AUTH_STATE, storageState);
  } else {
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
    await Promise.race([
      loginPage.waitForURL(/\/property|\/dashboard|\/profil/, { timeout: 45000 }).catch(() => null),
      loginPage
        .waitForFunction(
          () => document.body.innerText.includes('Annonces') || document.body.innerText.includes('Publier'),
          null,
          { timeout: 45000 }
        )
        .catch(() => null),
    ]);
    const loginText = await loginPage.locator('body').innerText().catch(() => '');
    if (/Erreur de connexion|Email ou mot de passe incorrect/i.test(loginText)) {
      throw new Error('Connexion impossible pour la capture video 09.');
    }
    await loginCtx.storageState({ path: storageState });
    await loginCtx.close();
  }

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
  await page.waitForFunction(
    () => document.body.innerText.includes("Ajout d'une maison") && document.body.innerText.includes('Tags'),
    null,
    { timeout: 45000 }
  );
  await page.waitForTimeout(2600);

  await highlightBot(page);
  await page.waitForTimeout(1600);
  await page.locator('.fixed.right-4 button').last().click({ force: true });
  await clearHighlights(page);
  await page.waitForTimeout(1200);

  await page.getByLabel('Assistant IA').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('[aria-label="Assistant IA"] input[type=file]').setInputFiles(imageFiles);
  await page.waitForTimeout(2200);
  await setReactTextarea(page, '[aria-label="Assistant IA"] textarea', AI_DESCRIPTION);
  await page.waitForTimeout(900);
  await page.locator('[aria-label="Assistant IA"] button').filter({ hasText: /Envoyer/i }).click({ force: true });
  await page.waitForFunction(
    () => {
      const title = document.querySelector('input:not([type=file])');
      return title instanceof HTMLInputElement && title.value.trim().length > 0;
    },
    null,
    { timeout: 45000 }
  ).catch(() => null);
  await page.waitForTimeout(1800);
  await closeAssistant(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);

  await completeMissingFields(page);
  await showGeneratedEssentials(page);
  await clickButtonText(page, 'Suivant');
  await page.waitForTimeout(1500);
  await fillStep2(page);
  await page.waitForTimeout(800);
  await clickButtonText(page, 'Suivant');
  await page.waitForTimeout(1600);
  await fillStep3(page);
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  await clickButtonText(page, 'Enregistrer');
  await page.waitForURL(/\/property(\?submitted=1)?/, { timeout: 18000 }).catch(() => null);
  await page.waitForTimeout(5500);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const tmp = await video.path();
  const webm = path.join(CAPTURES, 'video-09-creation-annonce-maison-ia.webm');
  fs.renameSync(tmp, webm);
  return webm;
}

function convert(webm) {
  const out = path.join(FINAL, 'video-09-creation-annonce-maison-ia-capture.mp4');
  execSync(
    `ffmpeg -y -i "${webm}" -vf "crop=540:960:0:0,fps=30,scale=1080:1920" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${out}"`,
    { stdio: 'inherit' }
  );
  return out;
}

async function main() {
  console.log('Capture video-09 creation annonce maison IA');
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
