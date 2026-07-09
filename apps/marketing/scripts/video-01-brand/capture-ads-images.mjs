/**
 * Capture des visuels publicitaires Facebook — v2
 * Attend que les vraies annonces Algolia soient chargées avant le screenshot.
 *
 * Formats :
 *   1080×1080 (carré 1:1)      → Feed Facebook/Instagram
 *   1200×628  (paysage 1.91:1) → Feed desktop Facebook
 *   1080×1920 (vertical 9:16)  → Stories / Reels
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT  = path.join(__dirname, '..', '..');
const OUT   = path.join(ROOT, 'videos', 'video-01-brand', 'ad-images');
fs.mkdirSync(OUT, { recursive: true });

const BASE = 'https://tonnkama.com';

// Sélecteur qui prouve qu'il y a de vraies annonces chargées
const CARD_SELECTOR  = '[role="button"][class*="cursor-pointer"]';
// URL garantissant des résultats (665+ annonces)
const SEARCH_URL     = `${BASE}/search`;

const FORMATS = {
  square:    { w: 1080, h: 1080, scale: 1,  label: '1080x1080', mobile: false },
  landscape: { w: 1200, h: 628,  scale: 1,  label: '1200x628',  mobile: false },
  vertical:  { w: 390,  h: 844,  scale: 2,  label: '1080x1920', mobile: true  },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function mobileUA() {
  return 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
}
function desktopUA() {
  return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
}

async function openPage(browser, fmt, url) {
  const ctx = await browser.newContext({
    viewport:          { width: fmt.w, height: fmt.h },
    deviceScaleFactor: fmt.scale,
    locale:            'fr-FR',
    userAgent:         fmt.mobile ? mobileUA() : desktopUA(),
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

  // Fermer modale PWA si présente
  const pwa = page.locator('button', { hasText: /plus tard/i });
  if (await pwa.isVisible({ timeout: 1500 }).catch(() => false)) {
    await pwa.click();
    await page.waitForTimeout(400);
  }

  // Attendre qu'il y ait de vraies annonces chargées (max 12s)
  await page.waitForSelector(CARD_SELECTOR, { timeout: 12000 })
    .catch(() => console.warn('    ⚠️  Cards pas encore chargées — screenshot quand même'));

  // Attendre que les images Firebase soient chargées (pas de src vide ni en erreur)
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('img')];
    if (imgs.length === 0) return true;
    const loaded = imgs.filter(img =>
      img.complete && img.naturalWidth > 0 && img.src && !img.src.startsWith('data:')
    );
    // Au moins 2 vraies images chargées = les photos des annonces sont là
    return loaded.length >= 2;
  }, { timeout: 8000 }).catch(() => null);

  await page.waitForTimeout(600);
  return { ctx, page };
}

async function shot(page, filename) {
  const out = path.join(OUT, filename);
  await page.screenshot({ path: out, type: 'png' });
  return out;
}

function resizeCrop(src, w, h) {
  const tmp = src + '.tmp.png';
  execSync(
    `ffmpeg -y -i "${src}" \
      -vf "scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}" \
      "${tmp}"`,
    { stdio: 'pipe' }
  );
  fs.renameSync(tmp, src);
}

async function capture(browser, fmt, url, name, interact) {
  const { ctx, page } = await openPage(browser, fmt, url);
  if (interact) await interact(page);
  await page.waitForTimeout(300);
  const file = await shot(page, `${name}-${fmt.label}.png`);
  await ctx.close();
  // Recadrer aux dimensions exactes (deviceScaleFactor peut décaler)
  resizeCrop(file, fmt.w * fmt.scale, fmt.h * fmt.scale);
  console.log(`  ✅  ${path.basename(file)}`);
}

// ─── Visuels ──────────────────────────────────────────────────────────────────

// 1. Grille d'annonces — tous formats
async function vis01_search(browser) {
  console.log('\n📸  vis01 — Grille d\'annonces');
  for (const fmt of Object.values(FORMATS)) {
    await capture(browser, fmt, SEARCH_URL, 'vis01-search', async (page) => {
      await page.mouse.wheel(0, fmt.mobile ? 160 : 250);
      await page.waitForTimeout(500);
    });
  }
}

// 2. Homepage — tous formats
async function vis02_homepage(browser) {
  console.log('\n📸  vis02 — Homepage');
  for (const fmt of Object.values(FORMATS)) {
    await capture(browser, fmt, BASE, 'vis02-homepage', async (page) => {
      // pas de CARD_SELECTOR ici, juste attendre le contenu
      await page.waitForTimeout(1000);
    });
  }
}

// 3. Détail d'une annonce — mobile + carré (le paysage desktop coupe mal)
async function vis03_detail(browser) {
  console.log('\n📸  vis03 — Détail annonce');
  for (const fmt of [FORMATS.vertical, FORMATS.square]) {
    await capture(browser, fmt, SEARCH_URL, 'vis03-detail', async (page) => {
      const card = page.locator(CARD_SELECTOR).first();
      if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
        await card.click();
        await page.waitForTimeout(2500);
      }
    });
  }
}

// 4. Filtre ouvert — mobile vertical + carré
async function vis04_filter(browser) {
  console.log('\n📸  vis04 — Filtre de recherche');
  for (const fmt of [FORMATS.vertical, FORMATS.square]) {
    await capture(browser, fmt, SEARCH_URL, 'vis04-filter', async (page) => {
      if (fmt.mobile) {
        const btn = page.locator('[title="Ouvrir les filtres de recherche"]').first();
        if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(900);
        }
      }
    });
  }
}

// 5. Annonces Libreville — tous formats
async function vis05_libreville(browser) {
  console.log('\n📸  vis05 — Annonces Libreville');
  const url = `${SEARCH_URL}?province=Estuaire&city=Libreville`;
  for (const fmt of Object.values(FORMATS)) {
    await capture(browser, fmt, url, 'vis05-libreville', async (page) => {
      await page.mouse.wheel(0, fmt.mobile ? 120 : 200);
      await page.waitForTimeout(600);
    });
  }
}

// ─── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📸  Capture visuels pub Facebook — Trouve Ton Nkama');
  console.log('    Attend le chargement réel des annonces Algolia\n');

  const browser = await chromium.launch({ headless: false });
  try {
    await vis01_search(browser);
    await vis02_homepage(browser);
    await vis03_detail(browser);
    await vis04_filter(browser);
    await vis05_libreville(browser);
  } finally {
    await browser.close();
  }

  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).sort();
  console.log(`\n✅  ${files.length} visuels dans videos/video-01-brand/ad-images/`);
  files.forEach(f => console.log(`    ${f}`));
}

main().catch(console.error);
