/**
 * Video 09 - Montage final.
 *
 * Sortie:
 *   videos/video-09-creation-annonce-maison-ia/final/video-09-creation-annonce-maison-ia.mp4
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-09-creation-annonce-maison-ia');
const FINAL = path.join(VIDEO_DIR, 'final');
const PARTS = path.join(VIDEO_DIR, 'parts');
const APP_ROOT = path.join(ROOT, '..', 'location-maison');
const LOGO = path.join(APP_ROOT, 'public', 'logo.webp');

fs.mkdirSync(PARTS, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

function q(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function run(cmd, label) {
  console.log(`\n${label}`);
  execSync(cmd, { stdio: 'inherit' });
}

async function makeCard(browser, { id, title, subtitle, badge, duration = 4 }) {
  const png = path.join(PARTS, `${id}.png`);
  const out = path.join(PARTS, `${id}.mp4`);
  const logoData = fs.existsSync(LOGO)
    ? `data:image/webp;base64,${fs.readFileSync(LOGO).toString('base64')}`
    : '';

  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            width: 1080px;
            height: 1920px;
            font-family: Arial, sans-serif;
            background: linear-gradient(180deg, #f7fbfa 0%, #edf8f6 58%, #ffffff 100%);
            color: #103f3d;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          main {
            width: 900px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 30px;
          }
          img {
            width: 190px;
            height: 190px;
            object-fit: contain;
            margin-bottom: 26px;
          }
          .badge {
            padding: 16px 28px;
            border-radius: 999px;
            background: #dff5f1;
            color: #146B67;
            font-size: 34px;
            font-weight: 800;
          }
          h1 {
            margin: 0;
            max-width: 880px;
            font-size: 74px;
            line-height: 1.05;
            letter-spacing: 0;
            font-weight: 800;
          }
          p {
            margin: 0;
            max-width: 850px;
            font-size: 42px;
            line-height: 1.22;
            color: #146B67;
            font-weight: 700;
          }
          .url {
            margin-top: 24px;
            padding: 18px 36px;
            border-radius: 999px;
            background: #146B67;
            color: #fff;
            font-size: 42px;
            font-weight: 800;
          }
        </style>
      </head>
      <body>
        <main>
          ${logoData ? `<img src="${logoData}" alt="" />` : ''}
          ${badge ? `<div class="badge">${badge}</div>` : ''}
          <h1>${title}</h1>
          <p>${subtitle}</p>
          ${id.includes('outro') ? '<div class="url">tonnkama.com</div>' : ''}
        </main>
      </body>
    </html>`, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: png, fullPage: false });
  await page.close();

  run(
    `ffmpeg -y -loop 1 -i ${q(png)} -t ${duration} ` +
      `-vf "fps=30,scale=1080:1920" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ${q(out)}`,
    `Creation carte ${id}`
  );
  return out;
}

function concat(parts) {
  const list = path.join(FINAL, 'concat-video-09.txt');
  fs.writeFileSync(list, parts.map((file) => `file '${file}'`).join('\n'));
  const out = path.join(FINAL, 'video-09-creation-annonce-maison-ia.mp4');
  run(
    `ffmpeg -y -f concat -safe 0 -i ${q(list)} -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart ${q(out)}`,
    'Assemblage final video-09'
  );
  fs.unlinkSync(list);
  return out;
}

async function main() {
  console.log('Montage video-09-creation-annonce-maison-ia');
  const capture = path.join(FINAL, 'video-09-creation-annonce-maison-ia-capture.mp4');
  if (!fs.existsSync(capture)) {
    throw new Error(`Capture introuvable: ${capture}`);
  }

  const browser = await chromium.launch({ headless: true });
  const parts = [
    await makeCard(browser, {
      id: '00-intro',
      badge: 'Assistant IA',
      title: "Créer une annonce avec l'IA",
      subtitle: 'Décrivez le logement, vérifiez, puis publiez',
      duration: 6,
    }),
    capture,
    await makeCard(browser, {
      id: '02-outro',
      title: 'Trouve Ton Nkama',
      subtitle: 'Publiez vos annonces plus facilement',
      duration: 8,
    }),
  ];
  await browser.close();

  const out = concat(parts);
  const { size } = fs.statSync(out);
  console.log(`\nOK ${out}`);
  console.log(`Taille: ${(size / 1024 / 1024).toFixed(1)} Mo`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
