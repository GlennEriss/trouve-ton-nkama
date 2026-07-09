/**
 * Video 06 - Montage final.
 *
 * Sortie:
 *   videos/video-06-chercheur-recherche-filtres/final/video-06-chercheur-recherche-filtres.mp4
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-06-chercheur-recherche-filtres');
const CAPTURES = path.join(VIDEO_DIR, 'captures');
const PARTS = path.join(VIDEO_DIR, 'parts');
const FINAL = path.join(VIDEO_DIR, 'final');
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

function normalizeVideo(src, id, duration, start = 0) {
  if (!fs.existsSync(src)) {
    throw new Error(`Capture manquante: ${src}`);
  }

  const out = path.join(PARTS, `${id}.mp4`);
  const startFlag = start ? `-ss ${start}` : '';
  const durationFlag = duration ? `-t ${duration}` : '';
  run(
    `ffmpeg -y ${startFlag} -i ${q(src)} ${durationFlag} ` +
      `-vf "fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=white" ` +
      `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -an ${q(out)}`,
    `Normalisation ${id}`
  );
  return out;
}

async function makeOutro(browser) {
  const png = path.join(PARTS, '05-outro.png');
  const out = path.join(PARTS, '05-outro.mp4');
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
            background: linear-gradient(180deg, #f7fbfa 0%, #effaf8 54%, #ffffff 100%);
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
            gap: 32px;
          }
          img {
            width: 190px;
            height: 190px;
            object-fit: contain;
            margin-bottom: 34px;
          }
          h1 {
            margin: 0;
            font-size: 72px;
            line-height: 1.05;
            letter-spacing: 0;
            font-weight: 800;
          }
          p {
            margin: 0;
            max-width: 850px;
            font-size: 44px;
            line-height: 1.2;
            color: #146B67;
            font-weight: 700;
          }
          .url {
            margin-top: 24px;
            padding: 18px 34px;
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
          <h1>Trouve Ton Nkama</h1>
          <p>Cherchez un logement plus simplement.</p>
          <div class="url">tonnkama.com</div>
        </main>
      </body>
    </html>`, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: png, fullPage: false });
  await page.close();

  run(
    `ffmpeg -y -loop 1 -i ${q(png)} -t 4 -vf "fps=30,scale=1080:1920" ` +
      `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ${q(out)}`,
    'Creation outro'
  );
  return out;
}

function concat(parts) {
  const list = path.join(FINAL, 'concat-video-06.txt');
  fs.writeFileSync(list, parts.map((file) => `file '${file}'`).join('\n'));
  const out = path.join(FINAL, 'video-06-chercheur-recherche-filtres.mp4');
  run(
    `ffmpeg -y -f concat -safe 0 -i ${q(list)} -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart ${q(out)}`,
    'Assemblage final video-06'
  );
  fs.unlinkSync(list);
  return out;
}

async function main() {
  console.log('Montage video-06-chercheur-recherche-filtres');

  const browser = await chromium.launch({ headless: true });
  const parts = [
    normalizeVideo(path.join(CAPTURES, 'seq-01-search-detail.webm'), '01-search-detail', 23),
    normalizeVideo(path.join(CAPTURES, 'seq-02-filters.webm'), '02-filters', 32),
    normalizeVideo(path.join(CAPTURES, 'seq-03-filtered-detail.webm'), '03-filtered-detail', 12),
    normalizeVideo(path.join(CAPTURES, 'seq-04-contact.webm'), '04-contact', 9),
    await makeOutro(browser),
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
