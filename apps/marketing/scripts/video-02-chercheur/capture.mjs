/**
 * Video 02 - Capture du scenario valide : parcours chercheur.
 *
 * Prerequis :
 *   cd ../location-maison
 *   npm run dev
 *
 * Sorties :
 *   videos/video-02-chercheur/captures/seq-01-search.webm
 *   videos/video-02-chercheur/captures/seq-02-location-filters.webm
 *   videos/video-02-chercheur/captures/seq-03-results-detail.webm
 *   videos/video-02-chercheur/captures/seq-04-contact.webm
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const CAPTURES = path.join(ROOT, 'videos', 'video-02-chercheur', 'captures');

const BASE = process.env.VIDEO_BASE_URL || 'http://localhost:3000';
const ONLY_SEQUENCE = process.env.VIDEO_SEQUENCE || 'all';
const FEATURED_PROPERTY_ID = 'QOv12JIjA08LxbMmSHiq';
const FEATURED_PROPERTY_URL = `${BASE}/houseDetails/${FEATURED_PROPERTY_ID}`;
const SEARCH_URL = `${BASE}/search`;
const FILTERED_SEARCH_URL =
  `${BASE}/search?query=appartement&province=Estuaire&city=Libreville` +
  '&typeProperty=Apartment&maxPrice=500000&minNbrRooms=2&maxNbrRooms=3';

const VIEWPORT = { width: 540, height: 960 };
const SCALE = 2;
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const CARD_SEL = '[role="button"][class*="cursor-pointer"]';
const SEARCH_INPUT_SEL =
  'input[type="search"], input[placeholder*="Rechercher"], input[placeholder*="rechercher"], input[placeholder*="annonce"]';

fs.mkdirSync(CAPTURES, { recursive: true });

function cleanCaptures() {
  fs.readdirSync(CAPTURES)
    .filter((file) => file.endsWith('.webm') || file.endsWith('.png'))
    .forEach((file) => fs.unlinkSync(path.join(CAPTURES, file)));
}

async function newRecordingPage(browser) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    locale: 'fr-FR',
    userAgent: MOBILE_UA,
    recordVideo: {
      dir: CAPTURES,
      size: { width: 1080, height: 1920 },
    },
  });

  const page = await ctx.newPage();
  await page.addInitScript(() => {
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
      if (!document.documentElement) return;

      document.querySelectorAll(selectors.join(',')).forEach((el) => el.remove());
      document.querySelectorAll('button, [role="button"]').forEach((el) => {
        const label = [
          el.getAttribute('aria-label'),
          el.getAttribute('title'),
          el.textContent,
        ]
          .filter(Boolean)
          .join(' ');

        if (/Next\.js|Dev Tools|issues overlay|Collapse issues/i.test(label)) {
          el.remove();
        }
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
  });
  return { ctx, page };
}

async function closeAndSaveVideo(ctx, page, filename) {
  const video = page.video();
  await ctx.close();

  if (!video) throw new Error(`Aucune video Playwright creee pour ${filename}`);

  const tmpPath = await video.path();
  const finalPath = path.join(CAPTURES, filename);
  fs.renameSync(tmpPath, finalPath);
  console.log(`  video ${filename}`);
}

async function dismissPWA(page) {
  const pwa = page.locator('button', { hasText: /plus tard/i });
  if (await pwa.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pwa.click();
    await page.waitForTimeout(400);
  }
}

async function waitForCards(page) {
  await page.waitForSelector(CARD_SEL, { timeout: 20000 });
  await page.waitForTimeout(800);
}

async function waitForSearchResultsReady(page) {
  await page
    .waitForFunction(() => {
      const text = document.body.innerText;
      return /\d+\s+r[ée]sultats?\s+trouv[ée]s?/.test(text) && !/0\s+r[ée]sultat/.test(text);
    }, { timeout: 20000 })
    .catch(() => null);
  await waitForCards(page);
  await page.waitForTimeout(600);
}

async function waitForImages(page, minCount = 1) {
  await page
    .waitForFunction(
      (count) => {
        const images = [...document.querySelectorAll('img[src]')].filter(
          (img) => img.src && !img.src.includes('/_next/') && !img.src.startsWith('data:')
        );

        return images.filter((img) => img.complete && img.naturalWidth > 80).length >= count;
      },
      minCount,
      { timeout: 20000 }
    )
    .catch(() => null);

  await page.waitForTimeout(600);
}

async function openSearch() {
  return SEARCH_URL;
}

async function showFilterArrow(page) {
  await page.evaluate(() => {
    document.querySelector('#video-filter-arrow')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'video-filter-arrow';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        right: 70px;
        top: 185px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 10px;
        pointer-events: none;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: #146B67;
          color: white;
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 22px;
          font-weight: 800;
          box-shadow: 0 8px 24px rgba(0,0,0,.22);
        ">Filtres</div>
        <div style="
          width: 74px;
          height: 4px;
          background: #146B67;
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,.18);
        ">
          <div style="
            position: absolute;
            right: -2px;
            top: -10px;
            width: 0;
            height: 0;
            border-top: 12px solid transparent;
            border-bottom: 12px solid transparent;
            border-left: 20px solid #146B67;
          "></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  });
}

async function hideFilterArrow(page) {
  await page.evaluate(() => document.querySelector('#video-filter-arrow')?.remove());
}

async function typeSearch(page, value) {
  const searchInput = page.locator(SEARCH_INPUT_SEL).first();
  if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchInput.click();
    await page.keyboard.type(value, { delay: 90 });
    await page.waitForTimeout(900);
  }
}

async function openFilters(page) {
  const filterBtn = page.locator('[title="Ouvrir les filtres de recherche"]').first();

  await filterBtn.scrollIntoViewIfNeeded().catch(() => null);
  await showFilterArrow(page);
  await page.waitForTimeout(1800);
  await filterBtn.click();
  await hideFilterArrow(page);
  await page.waitForSelector('text=Filtres de recherche', { timeout: 8000 });
  await page.waitForTimeout(700);
}

async function selectComboboxByPlaceholder(page, placeholder, optionName) {
  const combo = page.getByRole('combobox').filter({ hasText: placeholder }).first();
  await combo.scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  await combo.click();
  await page.waitForTimeout(700);
  await page.getByRole('option', { name: optionName, exact: true }).click();
  await page.waitForTimeout(1000);
}

async function fillNumberByName(page, name, value) {
  const input = page.locator(`input[name="${name}"]`).first();
  await input.scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  await input.click();
  await page.keyboard.press('Meta+A').catch(() => null);
  await page.keyboard.press('Control+A').catch(() => null);
  await page.keyboard.type(value, { delay: 80 });
  await page.waitForTimeout(800);
}

async function setUsefulCriteria(page) {
  await fillNumberByName(page, 'maxPrice', '500000');

  const typeButton = page.locator('button', { hasText: /Types d'annonces/i }).first();
  if (await typeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await typeButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
    await typeButton.click();
    await page.waitForTimeout(700);
    const apartmentOption = page.getByText('Appartement', { exact: true }).last();
    if (await apartmentOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await apartmentOption.click();
      await page.waitForTimeout(800);
      await page.keyboard.press('Escape').catch(() => null);
      await page.waitForTimeout(500);
    }
  }

  // Le formulaire mobile actuel n'affiche pas encore le filtre chambres.
  // On garde une pause sur le filtre type/prix pour rester lisible.
  await page.waitForTimeout(700);
}

async function applyFilters(page) {
  const apply = page.locator('button', { hasText: /^Appliquer$/i }).first();
  await apply.scrollIntoViewIfNeeded().catch(() => null);
  if (await apply.isVisible({ timeout: 5000 }).catch(() => false)) {
    await apply.click();
    await page.waitForTimeout(1300);
  } else {
    await page.keyboard.press('Escape').catch(() => null);
    await page.waitForTimeout(600);
  }
}

async function sequenceSearch(browser) {
  console.log('\nSequence 1 - recherche + scroll + filtre');
  const { ctx, page } = await newRecordingPage(browser);

  await page.goto(await openSearch(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissPWA(page);
  await waitForCards(page);
  await waitForImages(page, 2);

  await page.waitForTimeout(1000);
  await typeSearch(page, 'appartement');
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(1200);
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, -760);
  await page.waitForTimeout(700);
  await openFilters(page);
  await page.waitForTimeout(700);

  await closeAndSaveVideo(ctx, page, 'seq-01-search.webm');
}

async function sequenceLocationFilters(browser) {
  console.log('\nSequence 2 - Estuaire + Libreville + criteres');
  const { ctx, page } = await newRecordingPage(browser);

  await page.goto(`${SEARCH_URL}?query=appartement`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissPWA(page);
  await waitForSearchResultsReady(page);
  await openFilters(page);

  await selectComboboxByPlaceholder(page, 'Sélectionnez une province', 'Estuaire');
  await selectComboboxByPlaceholder(page, 'Sélectionnez une ville', 'Libreville');
  await setUsefulCriteria(page);
  await applyFilters(page);

  await closeAndSaveVideo(ctx, page, 'seq-02-location-filters.webm');
}

async function sequenceResultsDetail(browser) {
  console.log('\nSequence 3 - resultats filtres + detail');
  const { ctx, page } = await newRecordingPage(browser);

  await page.goto(FILTERED_SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissPWA(page);
  await waitForCards(page);
  await waitForImages(page, 2);

  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 430);
  await page.waitForTimeout(1100);
  await page.mouse.wheel(0, 360);
  await page.waitForTimeout(900);

  await page.goto(FEATURED_PROPERTY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
  await waitForImages(page, 1);
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, 260);
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 320);
  await page.waitForTimeout(1200);

  await closeAndSaveVideo(ctx, page, 'seq-03-results-detail.webm');
}

async function sequenceContact(browser) {
  console.log('\nSequence 4 - contact direct');
  const { ctx, page } = await newRecordingPage(browser);

  await page.goto(FEATURED_PROPERTY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissPWA(page);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
  await waitForImages(page, 1);

  const contactBtn = page.locator('a[href*="whatsapp"], a[href*="wa.me"], a[href*="tel:"]').first();
  for (let i = 0; i < 10; i++) {
    if (await contactBtn.isVisible({ timeout: 500 }).catch(() => false)) break;
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(250);
  }

  await contactBtn.scrollIntoViewIfNeeded().catch(() => null);
  await page.waitForTimeout(2200);
  await closeAndSaveVideo(ctx, page, 'seq-04-contact.webm');
}

async function main() {
  console.log(`Capture video-02 depuis ${BASE}`);

  if (ONLY_SEQUENCE === 'all') {
    cleanCaptures();
  }

  const browser = await chromium.launch({ headless: false });

  try {
    if (ONLY_SEQUENCE === 'all' || ONLY_SEQUENCE === 'seq01') {
      await sequenceSearch(browser);
    }
    if (ONLY_SEQUENCE === 'all' || ONLY_SEQUENCE === 'seq02') {
      await sequenceLocationFilters(browser);
    }
    if (ONLY_SEQUENCE === 'all' || ONLY_SEQUENCE === 'seq03') {
      await sequenceResultsDetail(browser);
    }
    if (ONLY_SEQUENCE === 'all' || ONLY_SEQUENCE === 'seq04') {
      await sequenceContact(browser);
    }
  } finally {
    await browser.close();
  }

  console.log('\nTermine. Verifie les .webm avant assemblage :');
  console.log(`  ${CAPTURES}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
