/**
 * Video 04 annonceur Awendje - Montage final.
 *
 * Assemble les trois videos:
 * 1. acces plateforme
 * 2. connexion et creation de l'annonce
 * 3. archiver puis reactiver
 *
 * Sortie:
 *   videos/video-04-annonceur-awendje/final/video-04-annonceur-awendje-complet.mp4
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-04-annonceur-awendje');
const FINAL = path.join(VIDEO_DIR, 'final');
const PARTS = path.join(VIDEO_DIR, 'parts');
const APP_ROOT = path.join(ROOT, '..', 'location-maison');
const LOGO = path.join(APP_ROOT, 'public', 'logo.webp');

fs.mkdirSync(PARTS, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

function run(cmd, label) {
  console.log(`\n${label}`);
  execSync(cmd, { stdio: 'inherit' });
}

function q(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

async function makeCard(browser, { id, title, subtitle, duration = 2.2 }) {
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
            background:
              linear-gradient(180deg, #f7fbfa 0%, #eef8f6 54%, #ffffff 100%);
            color: #103f3d;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .wrap {
            width: 900px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 34px;
          }
          img {
            width: 190px;
            height: 190px;
            object-fit: contain;
            margin-bottom: 38px;
          }
          h1 {
            margin: 0;
            font-size: 68px;
            line-height: 1.08;
            letter-spacing: 0;
            font-weight: 800;
          }
          p {
            margin: 0;
            max-width: 850px;
            font-size: 42px;
            line-height: 1.22;
            color: #146b67;
            font-weight: 700;
          }
          .line {
            width: 760px;
            height: 5px;
            border-radius: 999px;
            background: #1fa89b;
            margin-top: 28px;
          }
        </style>
      </head>
      <body>
        <main class="wrap">
          ${logoData ? `<img src="${logoData}" alt="" />` : ''}
          <h1>${title}</h1>
          <p>${subtitle}</p>
          <div class="line"></div>
        </main>
      </body>
    </html>`, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: png, fullPage: false });
  await page.close();

  run(
    `ffmpeg -y -loop 1 -i ${q(png)} -t ${duration} ` +
      `-vf "fps=30,scale=1080:1920" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ${q(out)}`,
    `Creation transition ${id}`
  );
  return out;
}

function normalizeVideo(src, id) {
  const out = path.join(PARTS, `${id}.mp4`);
  run(
    `ffmpeg -y -i ${q(src)} ` +
      `-vf "fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=white" ` +
      `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -an ${q(out)}`,
    `Normalisation ${path.basename(src)}`
  );
  return out;
}

function concat(parts) {
  const list = path.join(FINAL, 'concat-video-04-annonceur-awendje.txt');
  fs.writeFileSync(list, parts.map((file) => `file '${file}'`).join('\n'));
  const out = path.join(FINAL, 'video-04-annonceur-awendje-complet.mp4');
  run(
    `ffmpeg -y -f concat -safe 0 -i ${q(list)} -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart ${q(out)}`,
    'Assemblage final video-04-annonceur-awendje'
  );
  fs.unlinkSync(list);
  return out;
}

async function main() {
  console.log('Montage video-04-annonceur-awendje');

  const access = path.join(FINAL, 'video-04-01-acces-plateforme.mp4');
  const create = path.join(FINAL, 'video-04-02-connexion-creation-annonce.mp4');
  const archive = path.join(FINAL, 'video-04-03-archiver-reactiver-annonce.mp4');

  for (const file of [access, create, archive]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Fichier manquant: ${file}`);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const parts = [
    await makeCard(browser, {
      id: '00-intro',
      title: 'Guide annonceur',
      subtitle: 'Accéder, publier, gérer',
      duration: 2.5,
    }),
    normalizeVideo(access, '01-access'),
    await makeCard(browser, {
      id: '02-login-title',
      title: 'Connexion',
      subtitle: 'Avec les identifiants reçus',
      duration: 2,
    }),
    normalizeVideo(create, '03-create'),
    await makeCard(browser, {
      id: '04-archive-title',
      title: 'Annonce occupée ?',
      subtitle: 'Archivez puis réactivez plus tard',
      duration: 2,
    }),
    normalizeVideo(archive, '05-archive'),
    await makeCard(browser, {
      id: '06-outro',
      title: 'Trouve Ton Nkama',
      subtitle: 'Vos annonces restent sous contrôle',
      duration: 2.6,
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
