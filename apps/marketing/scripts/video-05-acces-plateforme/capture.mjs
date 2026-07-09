/**
 * Video 05 - Acces plateforme.
 *
 * Sortie:
 *   videos/video-05-acces-plateforme/final/video-05-acces-plateforme-capture.mp4
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-05-acces-plateforme');
const CAPTURES = path.join(VIDEO_DIR, 'captures');
const FINAL = path.join(VIDEO_DIR, 'final');

const BASE = process.env.VIDEO_BASE_URL || 'http://localhost:3000';
const VIEWPORT = { width: 390, height: 693 };
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

fs.mkdirSync(CAPTURES, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

function q(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function cleanup() {
  for (const file of fs.readdirSync(CAPTURES)) {
    if (file.startsWith('video-05-access')) {
      fs.unlinkSync(path.join(CAPTURES, file));
    }
  }
}

function googleMockHtml() {
  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          width: 100vw;
          min-height: 1920px;
          background: #f8fafc;
          color: #111827;
          font-family: Arial, sans-serif;
        }
        .browser { min-height: 1920px; background: #fff; }
        .top {
          height: 112px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 24px;
          background: #f1f5f9;
          border-bottom: 1px solid #e5e7eb;
        }
        .dot { width: 14px; height: 14px; border-radius: 999px; background: #cbd5e1; }
        .bar {
          flex: 1;
          height: 58px;
          border-radius: 999px;
          background: white;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          padding: 0 22px;
          color: #334155;
          font-size: 24px;
          overflow: hidden;
          white-space: nowrap;
        }
        main { padding: 160px 48px 40px; }
        .google {
          display: flex;
          justify-content: center;
          gap: 2px;
          font-size: 86px;
          font-weight: 800;
          letter-spacing: 0;
          margin-bottom: 50px;
        }
        .g1 { color: #4285f4; } .g2 { color: #ea4335; } .g3 { color: #fbbc05; }
        .g4 { color: #4285f4; } .g5 { color: #34a853; } .g6 { color: #ea4335; }
        .search {
          height: 76px;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          display: flex;
          align-items: center;
          padding: 0 30px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, .1);
          font-size: 32px;
        }
        .cursor {
          display: inline-block;
          width: 3px;
          height: 36px;
          margin-left: 3px;
          background: #111827;
          animation: blink .8s steps(1) infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
        .results {
          margin-top: 54px;
          opacity: 0;
          transform: translateY(16px);
          transition: .45s ease;
        }
        .results.visible { opacity: 1; transform: translateY(0); }
        .result {
          border-bottom: 1px solid #e5e7eb;
          padding: 24px 0;
        }
        .url { color: #146B67; font-size: 22px; margin-bottom: 10px; }
        .title { color: #1d4ed8; font-size: 32px; font-weight: 800; line-height: 1.25; }
        .desc { color: #475569; font-size: 23px; line-height: 1.35; margin-top: 10px; }
        .hint {
          position: fixed;
          left: 38px;
          right: 38px;
          bottom: 44px;
          border-radius: 30px;
          background: #146B67;
          color: white;
          padding: 24px 28px;
          font-weight: 800;
          font-size: 32px;
          text-align: center;
          box-shadow: 0 22px 50px rgba(20, 107, 103, .28);
          opacity: 0;
          transform: translateY(20px);
          transition: .35s ease;
        }
        .hint.visible { opacity: 1; transform: translateY(0); }
      </style>
    </head>
    <body>
      <div class="browser">
        <div class="top">
          <div class="dot"></div><div class="dot"></div><div class="dot"></div>
          <div class="bar" id="address">google.com</div>
        </div>
        <main>
          <div class="google">
            <span class="g1">G</span><span class="g2">o</span><span class="g3">o</span><span class="g4">g</span><span class="g5">l</span><span class="g6">e</span>
          </div>
          <div class="search"><span id="query"></span><span class="cursor"></span></div>
          <section class="results" id="results">
            <div class="result">
              <div class="url">tonnkama.com</div>
              <div class="title">Trouve Ton Nkama - Immobilier au Gabon</div>
              <div class="desc">Trouvez facilement des maisons, studios, chambres et appartements à louer.</div>
            </div>
            <div class="result">
              <div class="url">tonnkama.com/search</div>
              <div class="title">Rechercher une annonce</div>
              <div class="desc">Consultez les logements disponibles au Gabon.</div>
            </div>
          </section>
        </main>
        <div class="hint" id="hint">Cliquez sur le résultat Trouve Ton Nkama</div>
      </div>
      <script>
        window.demo = {
          setQuery(value) { document.querySelector('#query').textContent = value; },
          showResults() { document.querySelector('#results').classList.add('visible'); },
          showHint(value) {
            const hint = document.querySelector('#hint');
            hint.textContent = value;
            hint.classList.add('visible');
          },
          hideHint() { document.querySelector('#hint').classList.remove('visible'); },
          setAddress(value) { document.querySelector('#address').textContent = value; },
        };
      </script>
    </body>
  </html>`;
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
      html { scroll-behavior: smooth; }
    `,
  }).catch(() => null);
}

async function dismissPWA(page) {
  for (let i = 0; i < 4; i += 1) {
    const pwa = page.getByRole('button', { name: /plus tard/i });
    if (await pwa.isVisible({ timeout: 1200 }).catch(() => false)) {
      await pwa.click();
      await page.waitForTimeout(500);
      return;
    }
    await page.waitForTimeout(400);
  }
}

async function showSearchButtonArrow(page, box) {
  await page.evaluate((targetBox) => {
    document.querySelector('#video-search-arrow')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'video-search-arrow';
    overlay.innerHTML = `
      <div class="arrow">↑</div>
      <div class="label">Appuyez ici</div>
    `;
    const top = Math.min(window.innerHeight - 150, targetBox.y + targetBox.height + 16);
    Object.assign(overlay.style, {
      position: 'fixed',
      left: `${targetBox.x + targetBox.width / 2}px`,
      top: `${top}px`,
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      pointerEvents: 'none',
      fontFamily: 'Arial, sans-serif',
    });
    const label = overlay.querySelector('.label');
    Object.assign(label.style, {
      background: '#146B67',
      color: 'white',
      padding: '18px 30px',
      borderRadius: '999px',
      fontSize: '20px',
      fontWeight: '800',
      boxShadow: '0 18px 44px rgba(20,107,103,.28)',
    });
    const arrow = overlay.querySelector('.arrow');
    Object.assign(arrow.style, {
      color: '#146B67',
      fontSize: '54px',
      lineHeight: '38px',
      fontWeight: '900',
      textShadow: '0 6px 20px rgba(255,255,255,.9)',
    });
    document.body.appendChild(overlay);
  }, box);
}

async function removeSearchButtonArrow(page) {
  await page.evaluate(() => document.querySelector('#video-search-arrow')?.remove()).catch(() => null);
}

async function clickSearchEntry(page) {
  const candidates = [
    page.getByRole('link', { name: /rechercher une annonce/i }).first(),
    page.getByRole('button', { name: /rechercher une annonce/i }).first(),
    page.getByText(/rechercher une annonce/i).first(),
  ];

  for (const locator of candidates) {
    if (await locator.isVisible({ timeout: 1500 }).catch(() => false)) {
      await locator.scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(400);
      const box = await locator.boundingBox();
      if (box) {
        await showSearchButtonArrow(page, box);
      }
      await page.waitForTimeout(1800);
      await removeSearchButtonArrow(page);
      await locator.click({ force: true });
      return;
    }
  }

  await page.goto(`${BASE}/search`, { waitUntil: 'domcontentloaded', timeout: 30000 });
}

async function capture() {
  cleanup();
  const browser = await chromium.launch({ headless: true });
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
    window.localStorage.setItem('pwa-modal-dismissed-at', Date.now().toString());
    const removeDev = () => {
      document
        .querySelectorAll('[data-nextjs-dev-tools-button], #next-logo, [data-next-mark], [data-issues-open], [data-issues-collapse], nextjs-portal')
        .forEach((el) => el.remove());
    };
    const start = () => {
      removeDev();
      new MutationObserver(removeDev).observe(document.documentElement, { childList: true, subtree: true });
      window.setInterval(removeDev, 250);
    };
    if (document.documentElement) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  });

  await page.setContent(googleMockHtml(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  const query = 'Trouve Ton Nkama';
  for (let i = 0; i < query.length; i += 1) {
    await page.evaluate((value) => window.demo.setQuery(value), query.slice(0, i + 1));
    await page.waitForTimeout(95);
  }
  await page.waitForTimeout(450);
  await page.evaluate(() => window.demo.showResults());
  await page.waitForTimeout(900);
  await page.evaluate(() => window.demo.showHint('Cliquez sur tonnkama.com'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.demo.hideHint());
  await page.waitForTimeout(250);

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(page);
  await dismissPWA(page);
  await page.waitForTimeout(1600);

  await page.setContent(googleMockHtml(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.demo.setAddress('');
    window.demo.showHint('Ou tapez directement tonnkama.com');
  });
  await page.waitForTimeout(650);
  const url = 'tonnkama.com';
  for (let i = 0; i < url.length; i += 1) {
    await page.evaluate((value) => window.demo.setAddress(value), url.slice(0, i + 1));
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(700);
  await page.evaluate(() => window.demo.hideHint());

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(page);
  await dismissPWA(page);
  await page.waitForTimeout(1300);

  await page.waitForTimeout(1400);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(2100);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const tmp = await video.path();
  const webm = path.join(CAPTURES, 'video-05-access.webm');
  fs.renameSync(tmp, webm);
  return webm;
}

function convert(webm) {
  const out = path.join(FINAL, 'video-05-acces-plateforme-capture.mp4');
  execSync(
    `ffmpeg -y -i ${q(webm)} -vf "fps=30,scale=1080:1920" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ${q(out)}`,
    { stdio: 'inherit' }
  );
  return out;
}

async function main() {
  console.log('Capture video-05 acces plateforme');
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
