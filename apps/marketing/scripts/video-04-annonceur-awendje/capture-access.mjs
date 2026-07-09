/**
 * Video 04.1 - Acceder a Trouve Ton Nkama.
 *
 * Sortie:
 *   videos/video-04-annonceur-awendje/final/video-04-01-acces-plateforme.mp4
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-04-annonceur-awendje');
const CAPTURES = path.join(VIDEO_DIR, 'captures');
const FINAL = path.join(VIDEO_DIR, 'final');

const BASE = process.env.VIDEO_BASE_URL || 'http://localhost:3000';
const VIEWPORT = { width: 1080, height: 1920 };
const SCALE = 1;
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

fs.mkdirSync(CAPTURES, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

function cleanup() {
  for (const file of fs.readdirSync(CAPTURES)) {
    if (file.startsWith('video-04-01-access')) {
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
          min-height: 960px;
          background: #f8fafc;
          color: #111827;
          font-family: Arial, sans-serif;
        }
        .browser {
          min-height: 960px;
          background: #fff;
        }
        .top {
          height: 72px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          background: #f1f5f9;
          border-bottom: 1px solid #e5e7eb;
        }
        .dot { width: 10px; height: 10px; border-radius: 999px; background: #cbd5e1; }
        .bar {
          flex: 1;
          height: 42px;
          border-radius: 999px;
          background: white;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          padding: 0 16px;
          color: #334155;
          font-size: 18px;
          overflow: hidden;
          white-space: nowrap;
        }
        main {
          padding: 64px 34px 40px;
        }
        .google {
          display: flex;
          justify-content: center;
          gap: 2px;
          font-size: 60px;
          font-weight: 800;
          letter-spacing: 0;
          margin-bottom: 34px;
        }
        .g1 { color: #4285f4; }
        .g2 { color: #ea4335; }
        .g3 { color: #fbbc05; }
        .g4 { color: #4285f4; }
        .g5 { color: #34a853; }
        .g6 { color: #ea4335; }
        .search {
          height: 58px;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          display: flex;
          align-items: center;
          padding: 0 22px;
          box-shadow: 0 12px 34px rgba(15, 23, 42, .08);
          font-size: 22px;
        }
        .cursor {
          display: inline-block;
          width: 2px;
          height: 28px;
          margin-left: 2px;
          background: #111827;
          animation: blink .8s steps(1) infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
        .results {
          margin-top: 34px;
          opacity: 0;
          transform: translateY(12px);
          transition: .45s ease;
        }
        .results.visible { opacity: 1; transform: translateY(0); }
        .result {
          border-bottom: 1px solid #e5e7eb;
          padding: 18px 0;
        }
        .url { color: #146B67; font-size: 15px; margin-bottom: 7px; }
        .title { color: #1d4ed8; font-size: 23px; font-weight: 700; line-height: 1.25; }
        .desc { color: #475569; font-size: 16px; line-height: 1.4; margin-top: 8px; }
        .hint {
          position: fixed;
          left: 30px;
          right: 30px;
          bottom: 32px;
          border-radius: 28px;
          background: #146B67;
          color: white;
          padding: 18px 22px;
          font-weight: 800;
          font-size: 24px;
          text-align: center;
          box-shadow: 0 18px 40px rgba(20, 107, 103, .25);
          opacity: 0;
          transform: translateY(18px);
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
            <div class="result" id="first-result">
              <div class="url">tonnkama.com</div>
              <div class="title">Trouve Ton Nkama - Immobilier au Gabon</div>
              <div class="desc">Publiez et gerez vos annonces de location et de vente immobiliere.</div>
            </div>
            <div class="result">
              <div class="url">tonnkama.com/search</div>
              <div class="title">Rechercher un logement</div>
              <div class="desc">Maisons, studios, chambres et appartements disponibles.</div>
            </div>
          </section>
        </main>
        <div class="hint" id="hint">Cliquez sur le resultat Trouve Ton Nkama</div>
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
    `,
  }).catch(() => null);
}

async function dismissPWA(page) {
  for (let i = 0; i < 4; i += 1) {
    const pwa = page.getByRole('button', { name: /plus tard/i });
    if (await pwa.isVisible({ timeout: 1500 }).catch(() => false)) {
      await pwa.click();
      await page.waitForTimeout(600);
      return;
    }
    await page.waitForTimeout(500);
  }
}

async function capture() {
  cleanup();
  const browser = await chromium.launch({ headless: true });
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
    window.localStorage.setItem('pwa-modal-dismissed-at', Date.now().toString());

    const removeDev = () => {
      document
        .querySelectorAll('[data-nextjs-dev-tools-button], #next-logo, [data-next-mark], [data-issues-open], [data-issues-collapse], nextjs-portal')
        .forEach((el) => el.remove());
      document.querySelectorAll('button, [role="button"]').forEach((el) => {
        const label = [el.getAttribute('aria-label'), el.getAttribute('title'), el.textContent]
          .filter(Boolean)
          .join(' ');
        if (/Next\.js|Dev Tools|issues overlay|Issue/i.test(label)) el.remove();
      });
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
  await page.waitForTimeout(800);

  const query = 'Trouve Ton Nkama';
  for (let i = 0; i < query.length; i += 1) {
    await page.evaluate((value) => window.demo.setQuery(value), query.slice(0, i + 1));
    await page.waitForTimeout(80);
  }
  await page.evaluate((value) => window.demo.setQuery(value), query);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.demo.showResults());
  await page.waitForTimeout(900);
  await page.evaluate(() => window.demo.showHint('Cliquez sur le resultat Trouve Ton Nkama'));
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.demo.hideHint());
  await page.waitForTimeout(300);

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(page);
  await dismissPWA(page);
  await page.waitForTimeout(1400);

  await page.setContent(googleMockHtml(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.demo.setAddress('');
    window.demo.showHint('Vous pouvez aussi taper directement tonnkama.com');
  });
  await page.waitForTimeout(600);
  const url = 'tonnkama.com';
  for (let i = 0; i < url.length; i += 1) {
    await page.evaluate((value) => window.demo.setAddress(value), url.slice(0, i + 1));
    await page.waitForTimeout(85);
  }
  await page.waitForTimeout(700);
  await page.evaluate(() => window.demo.hideHint());
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(page);
  await dismissPWA(page);
  await page.waitForTimeout(1600);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const tmp = await video.path();
  const webm = path.join(CAPTURES, 'video-04-01-access.webm');
  fs.renameSync(tmp, webm);
  return webm;
}

function convert(webm) {
  const out = path.join(FINAL, 'video-04-01-acces-plateforme.mp4');
  execSync(
    `ffmpeg -y -i "${webm}" -vf "fps=30,scale=1080:1920" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${out}"`,
    { stdio: 'inherit' }
  );
  return out;
}

async function main() {
  console.log('Capture video-04-01 acces plateforme');
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
