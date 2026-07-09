/**
 * Re-capture ciblée — corrections seq-03 (carte) et seq-06 (homepage PWA)
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORTS = path.join(__dirname, '..', 'exports');

const BASE_URL = 'https://tonnkama.com';
const VIEWPORT = { width: 393, height: 852 };
const SCALE    = 2;

async function newPage(browser) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    locale: 'fr-FR',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    recordVideo: { dir: EXPORTS, size: VIEWPORT },
  });
  const page = await ctx.newPage();
  return { ctx, page };
}

async function saveVideo(ctx, name) {
  await ctx.close();
  const files = fs.readdirSync(EXPORTS)
    .filter(f => f.endsWith('.webm') && !f.startsWith('seq-'))
    .map(f => ({ f, t: fs.statSync(path.join(EXPORTS, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  const latest = files[0]?.f;
  if (latest) {
    const dst = path.join(EXPORTS, `${name}.webm`);
    fs.renameSync(path.join(EXPORTS, latest), dst);
    console.log(`  ✅ ${name}.webm`);
  }
}

// ─── seq-03 : carte interactive /map ────────────────────────────────────────

async function seq03_libreville(browser) {
  console.log('\n📹 Séq 03 — Annonces Libreville (Estuaire)...');
  const { ctx, page } = await newPage(browser);

  // Recherche pré-filtrée sur Libreville
  await page.goto(`${BASE_URL}/search?province=Estuaire&city=Libreville`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });
  await page.waitForTimeout(3500);

  await page.screenshot({ path: path.join(EXPORTS, '03-libreville.png') });

  // Scroll lent pour montrer les annonces locales
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 280);
    await page.waitForTimeout(550);
  }
  await page.waitForTimeout(800);

  await saveVideo(ctx, 'seq-03-libreville');
}

// ─── seq-06 : homepage sans modale PWA ──────────────────────────────────────

async function seq06_homepage(browser) {
  console.log('\n📹 Séq 06 — Homepage (sans PWA)...');
  const { ctx, page } = await newPage(browser);

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Fermer la modale PWA si présente
  const pwaBtn = page.locator('button', { hasText: /plus tard/i });
  if (await pwaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pwaBtn.click();
    console.log('  → Modale PWA fermée');
    await page.waitForTimeout(600);
  }

  // Fermer tout autre overlay/dialog éventuel
  const closeBtn = page.locator('[aria-label="Close"], [aria-label="Fermer"], button').filter({ hasText: /fermer|close|×/i }).first();
  if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: path.join(EXPORTS, '06-homepage.png') });

  // Scroll lent pour montrer le contenu
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(800);

  await saveVideo(ctx, 'seq-06-homepage');
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 Re-capture des séquences 03 et 06\n');
  const browser = await chromium.launch({ headless: false });

  try {
    await seq03_libreville(browser);
    await seq06_homepage(browser);
  } finally {
    await browser.close();
  }

  console.log('\n✅ Re-capture terminée — exports/ mis à jour');
}

main().catch(console.error);
