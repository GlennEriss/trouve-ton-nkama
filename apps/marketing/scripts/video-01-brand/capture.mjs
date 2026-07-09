/**
 * Tonnkama — Capture des séquences vidéo pour la vidéo marque
 * Viewport : 393 × 852 (iPhone 15) deviceScaleFactor 2 → rendu effectif 786×1704 ≈ 9:16
 * Sortie    : exports/seq-XX.webm  (vidéos) + exports/shot-XX.png (screenshots)
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORTS = path.join(__dirname, '..', 'exports');
fs.mkdirSync(EXPORTS, { recursive: true });

const BASE_URL = 'https://tonnkama.com';

// Viewport mobile 9:16
const VIEWPORT = { width: 393, height: 852 };
const SCALE   = 2;

// Attente réseau + rendu
const WAIT = 2500;

// ─── helpers ────────────────────────────────────────────────────────────────

function videoPath(name) {
  return path.join(EXPORTS, `${name}.webm`);
}
function shotPath(name) {
  return path.join(EXPORTS, `${name}.png`);
}

async function newPage(browser, recordName) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    locale: 'fr-FR',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    recordVideo: recordName
      ? { dir: EXPORTS, size: VIEWPORT }
      : undefined,
  });
  const page = await ctx.newPage();
  return { ctx, page };
}

async function saveVideo(ctx, name) {
  await ctx.close(); // flush video
  // Playwright nomme le fichier avec un UUID — on le renomme
  const files = fs.readdirSync(EXPORTS).filter(f => f.endsWith('.webm'));
  const latest = files
    .map(f => ({ f, t: fs.statSync(path.join(EXPORTS, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0]?.f;
  if (latest && latest !== `${name}.webm`) {
    fs.renameSync(path.join(EXPORTS, latest), videoPath(name));
  }
  console.log(`  ✅ ${name}.webm`);
}

// ─── séquence 1 : page /search — annonces qui défilent ──────────────────────

async function seq01_searchScroll(browser) {
  console.log('\n📹 Séq 01 — Search scroll...');
  const { ctx, page } = await newPage(browser, true);

  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(WAIT);

  // Scroll lent pour montrer les annonces
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(1000);

  // Screenshot de l'état final
  await page.screenshot({ path: shotPath('01-search'), fullPage: false });

  await saveVideo(ctx, 'seq-01-search-scroll');
}

// ─── séquence 2 : ouverture du filtre mobile ────────────────────────────────

async function seq02_filterModal(browser) {
  console.log('\n📹 Séq 02 — Filtre mobile...');
  const { ctx, page } = await newPage(browser, true);

  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(WAIT);

  // Clic sur le bouton filtre (icône SlidersHorizontal)
  const filterBtn = page.locator('[title="Ouvrir les filtres de recherche"]').first();
  if (await filterBtn.isVisible()) {
    await filterBtn.click();
    await page.waitForTimeout(800);
  } else {
    // Fallback : cherche tout bouton avec l'icône filtre
    await page.locator('button').filter({ hasText: /filtre/i }).first().click();
    await page.waitForTimeout(800);
  }

  // Screenshot modal ouvert
  await page.screenshot({ path: shotPath('02-filter-open'), fullPage: false });
  await page.waitForTimeout(1500);

  // Scroll dans la modal pour montrer les options
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(1000);

  await saveVideo(ctx, 'seq-02-filter-modal');
}

// ─── séquence 3 : carte interactive ─────────────────────────────────────────

async function seq03_map(browser) {
  console.log('\n📹 Séq 03 — Carte interactive...');
  const { ctx, page } = await newPage(browser, true);

  // Tente la page carte dédiée en premier
  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(WAIT);

  // Cherche un bouton/lien "Carte" ou "Map"
  const mapBtn = page.locator('a[href*="map"], button').filter({ hasText: /carte|map/i }).first();
  if (await mapBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await mapBtn.click();
    await page.waitForTimeout(2500);
  }

  await page.screenshot({ path: shotPath('03-map'), fullPage: false });
  await page.waitForTimeout(2000);

  await saveVideo(ctx, 'seq-03-map');
}

// ─── séquence 4 : card annonce + badge propriétaire ─────────────────────────

async function seq04_propertyCard(browser) {
  console.log('\n📹 Séq 04 — Cards annonces...');
  const { ctx, page } = await newPage(browser, true);

  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(WAIT);

  // Scroll léger pour voir les cards
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(500);

  await page.screenshot({ path: shotPath('04-property-cards'), fullPage: false });
  await page.waitForTimeout(2500);

  await saveVideo(ctx, 'seq-04-property-cards');
}

// ─── séquence 5 : détail d'une annonce ──────────────────────────────────────

async function seq05_propertyDetail(browser) {
  console.log('\n📹 Séq 05 — Détail annonce...');
  const { ctx, page } = await newPage(browser, true);

  await page.goto(`${BASE_URL}/search`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(WAIT);

  // Clique sur la première card disponible
  const card = page.locator('[role="button"]').first();
  if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
    await card.click();
    await page.waitForTimeout(2500);
  }

  await page.screenshot({ path: shotPath('05-property-detail'), fullPage: false });

  // Scroll pour voir les détails
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(1000);

  await saveVideo(ctx, 'seq-05-property-detail');
}

// ─── séquence 6 : homepage / landing ────────────────────────────────────────

async function seq06_homepage(browser) {
  console.log('\n📹 Séq 06 — Homepage...');
  const { ctx, page } = await newPage(browser, true);

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(WAIT);

  await page.screenshot({ path: shotPath('06-homepage'), fullPage: false });

  // Scroll lent
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(700);
  }

  await saveVideo(ctx, 'seq-06-homepage');
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Lancement des captures — tonnkama.com');
  console.log(`📁 Sortie : ${EXPORTS}\n`);

  const browser = await chromium.launch({ headless: false }); // headless:false pour voir

  try {
    await seq01_searchScroll(browser);
    await seq02_filterModal(browser);
    await seq03_map(browser);
    await seq04_propertyCard(browser);
    await seq05_propertyDetail(browser);
    await seq06_homepage(browser);
  } finally {
    await browser.close();
  }

  console.log('\n✅ Toutes les captures sont dans exports/');
  console.log('   → Lance ensuite : npm run assemble');
}

main().catch(console.error);
