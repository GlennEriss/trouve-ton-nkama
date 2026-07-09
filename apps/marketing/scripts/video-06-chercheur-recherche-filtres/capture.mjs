/**
 * Video 06 - Recherche, filtres et contact.
 *
 * Sorties:
 *   videos/video-06-chercheur-recherche-filtres/captures/seq-01-search-detail.webm
 *   videos/video-06-chercheur-recherche-filtres/captures/seq-02-filters.webm
 *   videos/video-06-chercheur-recherche-filtres/captures/seq-03-filtered-detail.webm
 *   videos/video-06-chercheur-recherche-filtres/captures/seq-04-contact.webm
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-06-chercheur-recherche-filtres');
const CAPTURES = path.join(VIDEO_DIR, 'captures');

const BASE = process.env.VIDEO_BASE_URL || 'http://localhost:3000';
const SEARCH_URL = `${BASE}/search`;
const FILTERED_URL = `${BASE}/search?province=Estuaire&city=Libreville&street=Awendj%C3%A9&typeProperty=Home&status=FOR_RENT`;
const FILTERED_PROPERTY_URL = `${BASE}/houseDetails/naM6XJk1YCJorulMq5IO`;
const ONLY_SEQUENCE = process.env.VIDEO_SEQUENCE || 'all';

const VIEWPORT = { width: 405, height: 720 };
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

fs.mkdirSync(CAPTURES, { recursive: true });

function cleanCaptures() {
  for (const file of fs.readdirSync(CAPTURES)) {
    if (file.endsWith('.webm') || file.endsWith('.png')) {
      fs.unlinkSync(path.join(CAPTURES, file));
    }
  }
}

async function newRecordingPage(browser) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'fr-FR',
    userAgent: MOBILE_UA,
    recordVideo: {
      dir: CAPTURES,
      size: VIEWPORT,
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
        const label = [el.getAttribute('aria-label'), el.getAttribute('title'), el.textContent]
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
      html { scroll-behavior: smooth; }
    `,
  });

  return { ctx, page };
}

async function closeAndSaveVideo(ctx, page, filename) {
  const video = page.video();
  await ctx.close();
  if (!video) throw new Error(`Aucune video Playwright creee pour ${filename}`);

  const tmpPath = await video.path();
  fs.renameSync(tmpPath, path.join(CAPTURES, filename));
  console.log(`  video ${filename}`);
}

async function dismissPWA(page) {
  for (let i = 0; i < 3; i += 1) {
    const later = page.getByRole('button', { name: /plus tard/i });
    if (await later.isVisible({ timeout: 800 }).catch(() => false)) {
      await later.click();
      await page.waitForTimeout(400);
      return;
    }
    await page.waitForTimeout(300);
  }
}

async function waitForReady(page) {
  await page
    .waitForFunction(() => /\d+\s+r[ée]sultats?\s+trouv[ée]s?/.test(document.body.innerText), {
      timeout: 20000,
    })
    .catch(() => null);
  await page.waitForTimeout(900);
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

async function typeSearch(page, value) {
  const input = page
    .locator(
      'input[type="search"], input[placeholder*="Rechercher"], input[placeholder*="rechercher"], input[placeholder*="Logement"]'
    )
    .first();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })).catch(() => null);
  await page.waitForTimeout(600);
  await input.scrollIntoViewIfNeeded().catch(() => null);
  await input.click({ timeout: 5000 });
  await page.keyboard.type(value, { delay: 95 });
  await page.waitForTimeout(1300);
}

async function showFilterArrow(page) {
  const btn = page.locator('[title="Ouvrir les filtres de recherche"]').first();
  await btn.scrollIntoViewIfNeeded().catch(() => null);
  const box = await btn.boundingBox();
  if (!box) return;

  await page.evaluate((target) => {
    document.querySelector('#video-filter-arrow')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'video-filter-arrow';
    overlay.innerHTML = `
      <div class="arrow">↑</div>
      <div class="label">Filtres</div>
    `;
    Object.assign(overlay.style, {
      position: 'fixed',
      left: `${target.x + target.width / 2}px`,
      top: `${target.y + target.height + 10}px`,
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      pointerEvents: 'none',
      fontFamily: 'Arial, sans-serif',
    });
    const arrow = overlay.querySelector('.arrow');
    Object.assign(arrow.style, {
      color: '#146B67',
      fontSize: '46px',
      lineHeight: '34px',
      fontWeight: '900',
      textShadow: '0 6px 18px rgba(255,255,255,.95)',
    });
    const label = overlay.querySelector('.label');
    Object.assign(label.style, {
      background: '#146B67',
      color: '#fff',
      borderRadius: '999px',
      padding: '9px 15px',
      fontSize: '18px',
      fontWeight: '800',
      boxShadow: '0 10px 28px rgba(20,107,103,.35)',
    });
    document.body.appendChild(overlay);
  }, box);
}

async function hideFilterArrow(page) {
  await page.evaluate(() => document.querySelector('#video-filter-arrow')?.remove()).catch(() => null);
}

async function openFilters(page) {
  const btn = page.locator('[title="Ouvrir les filtres de recherche"]').first();
  await showFilterArrow(page);
  await page.waitForTimeout(1500);
  await btn.click({ timeout: 5000 });
  await hideFilterArrow(page);
  await page.waitForSelector('text=Filtres de recherche', { timeout: 10000 });
  await page.waitForTimeout(700);
}

async function clickText(page, text) {
  const item = page.getByText(text, { exact: true }).last();
  await item.scrollIntoViewIfNeeded().catch(() => null);
  await item.click({ timeout: 5000 });
  await page.waitForTimeout(700);
}

async function selectCombobox(page, placeholder, option) {
  const combo = page.getByRole('combobox').filter({ hasText: placeholder }).first();
  await combo.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await combo.click({ timeout: 5000 });
  await page.waitForTimeout(550);
  await clickText(page, option);
}

async function selectMulti(page, triggerText, optionText) {
  const trigger = page.locator('button').filter({ hasText: triggerText }).first();
  await trigger.scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  await trigger.click({ timeout: 5000 });
  await page.waitForTimeout(650);
  await clickText(page, optionText);
  await page.getByText('Fermer', { exact: true }).last().click({ timeout: 3000 }).catch(() => null);
  await page.waitForTimeout(500);
}

async function applyFilters(page) {
  const apply = page.locator('button').filter({ hasText: /^Appliquer$/ }).first();
  await apply.scrollIntoViewIfNeeded().catch(() => null);
  await page.waitForTimeout(600);
  await apply.click({ timeout: 5000 }).catch(() => null);
  await page.waitForTimeout(2400);

  const text = await page.locator('body').innerText().catch(() => '');
  if (!/Maison à louer à Awendjé|1\s+r[ée]sultat/.test(text)) {
    await page.goto(FILTERED_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForReady(page);
  }
}

async function showContactLabels(page) {
  await page.evaluate(() => {
    document.querySelector('#video-contact-labels')?.remove();
    const whats = document.querySelector('a[href*="wa.me"], a[href*="whatsapp"]');
    const tel = document.querySelector('a[href^="tel:"]');
    const overlay = document.createElement('div');
    overlay.id = 'video-contact-labels';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '2147483647';
    overlay.style.pointerEvents = 'none';
    overlay.style.fontFamily = 'Arial, sans-serif';

    const makeLabel = (el, text, color) => {
      if (!el) return;
      const box = el.getBoundingClientRect();
      const label = document.createElement('div');
      label.textContent = text;
      Object.assign(label.style, {
        position: 'fixed',
        left: `${Math.max(16, box.left - 178)}px`,
        top: `${box.top + box.height / 2 - 20}px`,
        background: color,
        color: '#fff',
        borderRadius: '999px',
        padding: '10px 15px',
        fontSize: '17px',
        fontWeight: '800',
        boxShadow: '0 12px 30px rgba(0,0,0,.22)',
      });
      const ring = document.createElement('div');
      Object.assign(ring.style, {
        position: 'fixed',
        left: `${box.left - 8}px`,
        top: `${box.top - 8}px`,
        width: `${box.width + 16}px`,
        height: `${box.height + 16}px`,
        border: `4px solid ${color}`,
        borderRadius: '999px',
        boxShadow: `0 0 0 8px ${color}33`,
      });
      overlay.appendChild(label);
      overlay.appendChild(ring);
    };

    makeLabel(tel, 'Appeler', '#146B67');
    makeLabel(whats, 'WhatsApp', '#1FA89B');
    document.body.appendChild(overlay);
  });
}

async function sequenceSearchDetail(browser) {
  console.log('\nSequence 1 - recherche studio + premier detail');
  const { ctx, page } = await newRecordingPage(browser);

  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissPWA(page);
  await waitForReady(page);
  await waitForImages(page, 2);
  await page.waitForTimeout(900);

  await typeSearch(page, 'studio');
  await page.mouse.wheel(0, 440);
  await page.waitForTimeout(1100);
  await page.mouse.wheel(0, 360);
  await page.waitForTimeout(900);

  const studioCard = page.locator('div[role="button"]').filter({ hasText: /Studio a louer|Studio à louer/i }).first();
  await studioCard.scrollIntoViewIfNeeded().catch(() => null);
  await page.waitForTimeout(1000);
  await studioCard.click({ timeout: 5000 }).catch(async () => {
    await page.goto(`${BASE}/houseDetails/tgGEV6Yf6smHtdFAelH5`, { waitUntil: 'domcontentloaded' });
  });
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await waitForImages(page, 1);
  await page.waitForTimeout(1900);

  await closeAndSaveVideo(ctx, page, 'seq-01-search-detail.webm');
}

async function sequenceFilters(browser) {
  console.log('\nSequence 2 - filtre maison a louer Estuaire Libreville');
  const { ctx, page } = await newRecordingPage(browser);

  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissPWA(page);
  await page.waitForTimeout(500);
  await openFilters(page);

  await selectCombobox(page, 'Sélectionnez une province', 'Estuaire').catch(() => null);
  await selectCombobox(page, 'Sélectionnez une ville', 'Libreville').catch(() => null);
  await selectCombobox(page, 'Sélectionnez un quartier', 'Awendjé').catch(() => null);
  await selectMulti(page, 'Sélectionnez le statut', 'À louer').catch(() => null);
  await selectMulti(page, "Types d'annonces", 'Maison').catch(() => null);
  await applyFilters(page);
  await page.waitForTimeout(1000);

  await closeAndSaveVideo(ctx, page, 'seq-02-filters.webm');
}

async function sequenceFilteredDetail(browser) {
  console.log('\nSequence 3 - resultats filtres + detail annonce');
  const { ctx, page } = await newRecordingPage(browser);

  await page.goto(FILTERED_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissPWA(page);
  await waitForReady(page);
  await waitForImages(page, 1);
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 280);
  await page.waitForTimeout(1100);
  await page.mouse.wheel(0, -160);
  await page.waitForTimeout(700);

  const card = page.locator('div[role="button"]').filter({ hasText: /Maison à louer à Awendjé/i }).first();
  await card.scrollIntoViewIfNeeded().catch(() => null);
  await page.waitForTimeout(900);
  await card.click({ timeout: 5000 }).catch(async () => {
    await page.goto(FILTERED_PROPERTY_URL, { waitUntil: 'domcontentloaded' });
  });
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await waitForImages(page, 1);
  await page.waitForTimeout(1600);

  await closeAndSaveVideo(ctx, page, 'seq-03-filtered-detail.webm');
}

async function sequenceContact(browser) {
  console.log('\nSequence 4 - contacts appel et WhatsApp');
  const { ctx, page } = await newRecordingPage(browser);

  await page.goto(FILTERED_PROPERTY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissPWA(page);
  await waitForImages(page, 1);
  await page.waitForTimeout(800);

  const contact = page.locator('a[href^="tel:"], a[href*="wa.me"], a[href*="whatsapp"]').first();
  for (let i = 0; i < 12; i += 1) {
    if (await contact.isVisible({ timeout: 500 }).catch(() => false)) break;
    await page.mouse.wheel(0, 360);
    await page.waitForTimeout(250);
  }
  await contact.scrollIntoViewIfNeeded().catch(() => null);
  await page.waitForTimeout(900);
  await showContactLabels(page);
  await page.waitForTimeout(4800);

  await closeAndSaveVideo(ctx, page, 'seq-04-contact.webm');
}

async function main() {
  console.log(`Capture video-06 depuis ${BASE}`);
  if (ONLY_SEQUENCE === 'all') cleanCaptures();

  const browser = await chromium.launch({ headless: true });
  try {
    if (ONLY_SEQUENCE === 'all' || ONLY_SEQUENCE === 'seq01') await sequenceSearchDetail(browser);
    if (ONLY_SEQUENCE === 'all' || ONLY_SEQUENCE === 'seq02') await sequenceFilters(browser);
    if (ONLY_SEQUENCE === 'all' || ONLY_SEQUENCE === 'seq03') await sequenceFilteredDetail(browser);
    if (ONLY_SEQUENCE === 'all' || ONLY_SEQUENCE === 'seq04') await sequenceContact(browser);
  } finally {
    await browser.close();
  }

  console.log(`\nTermine: ${CAPTURES}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
