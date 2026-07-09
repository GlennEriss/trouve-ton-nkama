/**
 * Video 07 - Creation de compte.
 *
 * Sortie:
 *   videos/video-07-creation-compte/final/video-07-creation-compte-capture.mp4
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-07-creation-compte');
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

function run(cmd, label) {
  console.log(`\n${label}`);
  execSync(cmd, { stdio: 'inherit' });
}

function cleanup() {
  for (const file of fs.readdirSync(CAPTURES)) {
    if (file.startsWith('video-07-creation')) {
      fs.unlinkSync(path.join(CAPTURES, file));
    }
  }
}

async function cleanDevUi(page) {
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

async function dismissPwa(page) {
  for (let i = 0; i < 4; i += 1) {
    const later = page.getByRole('button', { name: /plus tard/i });
    if (await later.isVisible({ timeout: 800 }).catch(() => false)) {
      await later.click();
      await page.waitForTimeout(400);
      return;
    }
    await page.waitForTimeout(250);
  }
}

async function typeSlow(locator, text, delay = 45) {
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(text, { delay });
}

async function addHint(page, text, box, direction = 'down') {
  await page.evaluate(({ text, box, direction }) => {
    document.querySelector('#video-hint-layer')?.remove();
    const layer = document.createElement('div');
    layer.id = 'video-hint-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:999999;pointer-events:none;font-family:Arial,sans-serif;';

    const bubble = document.createElement('div');
    bubble.textContent = text;
    bubble.style.cssText = `
      position:fixed;
      left:${Math.max(16, Math.min(190, box.x - 28))}px;
      top:${direction === 'down' ? Math.max(20, box.y - 72) : Math.min(window.innerHeight - 80, box.y + box.height + 18)}px;
      max-width:240px;
      padding:10px 14px;
      border-radius:999px;
      background:#146B67;
      color:white;
      font-size:16px;
      line-height:1.15;
      font-weight:800;
      box-shadow:0 14px 28px rgba(20,107,103,.28);
      text-align:center;
    `;

    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position:fixed;
      left:${box.x + box.width / 2 - 2}px;
      top:${direction === 'down' ? box.y - 28 : box.y + box.height + 4}px;
      width:4px;
      height:30px;
      border-radius:999px;
      background:#146B67;
      box-shadow:0 10px 18px rgba(20,107,103,.22);
    `;
    const head = document.createElement('div');
    head.style.cssText = `
      position:fixed;
      left:${box.x + box.width / 2 - 10}px;
      top:${direction === 'down' ? box.y - 8 : box.y + box.height + 28}px;
      width:0;height:0;
      border-left:10px solid transparent;
      border-right:10px solid transparent;
      ${direction === 'down' ? 'border-top:14px solid #146B67;' : 'border-bottom:14px solid #146B67;'}
    `;
    layer.append(bubble, arrow, head);
    document.body.appendChild(layer);
  }, { text, box, direction });
}

async function removeHint(page) {
  await page.evaluate(() => document.querySelector('#video-hint-layer')?.remove()).catch(() => null);
}

async function mockGooglePicker(page) {
  await page.setContent(`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            width: 390px;
            height: 693px;
            font-family: Arial, sans-serif;
            color: #202124;
            background: #fff;
          }
          .top { height: 54px; display: flex; align-items: center; padding: 0 18px; border-bottom: 1px solid #eee; }
          .g { display: flex; gap: 1px; font-size: 24px; font-weight: 800; }
          .b { color: #4285f4; } .r { color: #ea4335; } .y { color: #fbbc05; } .gr { color: #34a853; }
          main { padding: 42px 28px; }
          h1 { margin: 0 0 12px; font-size: 26px; line-height: 1.16; font-weight: 500; }
          p { margin: 0 0 30px; color: #5f6368; font-size: 15px; line-height: 1.45; }
          .account {
            display: flex; align-items: center; gap: 14px;
            padding: 14px 2px; border-top: 1px solid #e8eaed; border-bottom: 1px solid #e8eaed;
          }
          .avatar {
            width: 42px; height: 42px; border-radius: 999px;
            background: linear-gradient(135deg, #146B67, #1FA89B);
            color: white; display: grid; place-items: center; font-weight: 800;
          }
          .name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
          .email {
            width: 190px; height: 12px; border-radius: 999px;
            background: repeating-linear-gradient(90deg, #d1d5db 0 12px, #e5e7eb 12px 22px);
          }
          .mask {
            margin-top: 30px; padding: 14px 16px; border-radius: 18px;
            background: #eef8f6; color: #146B67; font-weight: 800; text-align: center;
          }
          .button {
            position: fixed; left: 28px; right: 28px; bottom: 28px;
            height: 48px; border-radius: 999px; background: #146B67; color: white;
            display: grid; place-items: center; font-weight: 800;
          }
        </style>
      </head>
      <body>
        <div class="top">
          <div class="g"><span class="b">G</span><span class="r">o</span><span class="y">o</span><span class="b">g</span><span class="gr">l</span><span class="r">e</span></div>
        </div>
        <main>
          <h1>Choisir un compte</h1>
          <p>Pour continuer vers Trouve Ton Nkama.</p>
          <div class="account">
            <div class="avatar">T</div>
            <div>
              <div class="name">Compte de démonstration</div>
              <div class="email"></div>
            </div>
          </div>
          <div class="mask">Adresse email masquée dans la vidéo</div>
        </main>
        <div class="button">Continuer</div>
      </body>
    </html>`, { waitUntil: 'domcontentloaded' });
}

async function mockCompleteProfile(page) {
  await page.setContent(`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          body { margin:0; width:390px; min-height:693px; font-family:Arial,sans-serif; background:#fff; color:#111827; }
          main { padding: 28px 18px 40px; }
          .brand { display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:24px; color:#146B67; font-weight:800; font-size:20px; }
          .logo { width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg,#146B67,#1FA89B); }
          h1 { margin:0; text-align:center; font-size:28px; line-height:1.08; }
          .sub { text-align:center; color:#6b7280; margin:10px 0 20px; line-height:1.35; }
          .connected { border:1px solid #a7f3d0; background:#ecfdf5; color:#047857; border-radius:18px; padding:12px 14px; margin-bottom:18px; }
          .connected b { display:block; margin-bottom:7px; }
          .mask { width:205px; height:12px; border-radius:999px; background:repeating-linear-gradient(90deg,#94a3b8 0 12px,#cbd5e1 12px 23px); }
          label { display:block; font-size:13px; font-weight:700; color:#374151; margin-bottom:8px; }
          .roles { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
          .role { border:1px solid #e5e7eb; border-radius:16px; padding:12px; }
          .role.active { border-color:#1FA89B; background:#ecfdf5; }
          .role b { display:block; font-size:14px; margin-bottom:4px; }
          .role span { font-size:11px; color:#6b7280; line-height:1.2; display:block; }
          input { width:100%; height:46px; border:1px solid #d1d5db; border-radius:14px; padding:0 14px; font-size:15px; margin-bottom:12px; color:#111827; }
          .row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
          .check { display:flex; gap:9px; align-items:flex-start; color:#4b5563; font-size:13px; line-height:1.3; margin:10px 0 16px; }
          .box { width:18px; height:18px; border-radius:5px; background:#146B67; flex:0 0 auto; margin-top:1px; }
          button { width:100%; height:48px; border:0; border-radius:999px; background:linear-gradient(180deg,#1FA89B,#146B67); color:white; font-weight:800; font-size:15px; }
        </style>
      </head>
      <body>
        <main>
          <div class="brand"><div class="logo"></div> Trouve Ton Nkama</div>
          <h1>Compléter le profil</h1>
          <p class="sub">Connexion Google validée, finalisez votre compte.</p>
          <div class="connected"><b>Compte Google connecté</b><div class="mask"></div></div>
          <label>Type de compte</label>
          <div class="roles">
            <div class="role active"><b>Utilisateur</b><span>Rechercher et enregistrer des annonces</span></div>
            <div class="role"><b>Annonceur</b><span>Publier et gérer vos annonces</span></div>
          </div>
          <input value="Utilisateur" aria-label="Prénom" />
          <input value="Test" aria-label="Nom" />
          <input value="66 00 00 00" aria-label="Téléphone" />
          <div class="row">
            <input value="01" aria-label="Jour" />
            <input value="01" aria-label="Mois" />
            <input value="1995" aria-label="Année" />
          </div>
          <div class="check"><div class="box"></div><div>J'accepte la politique de confidentialité et les conditions d'utilisation.</div></div>
          <button>Finaliser mon compte</button>
        </main>
      </body>
    </html>`, { waitUntil: 'domcontentloaded' });
}

async function fillClassicSignup(page) {
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await cleanDevUi(page);
  await dismissPwa(page);
  await page.waitForTimeout(900);

  const announcer = page.getByRole('button', { name: /annonceur/i }).first();
  await announcer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await announcer.boundingBox();
  if (box) await addHint(page, 'Choisir annonceur', box, 'down');
  await page.waitForTimeout(900);
  await announcer.click();
  await page.waitForTimeout(500);
  await removeHint(page);

  await typeSlow(page.getByPlaceholder(/nom/i).first(), 'Demo');
  await typeSlow(page.getByPlaceholder(/prénom/i).first(), 'Annonceur');
  await typeSlow(page.getByPlaceholder(/email/i).first(), `demo.video07.${Date.now()}@ttn.ga`);
  await page.waitForTimeout(500);

  const phone = page.locator('input[name="phone"], input[type="tel"]').first();
  if (await phone.isVisible().catch(() => false)) {
    await typeSlow(phone, '66000000');
  }

  await page.evaluate(() => window.scrollBy({ top: 260, behavior: 'smooth' }));
  await page.waitForTimeout(700);

  const passwordFields = page.locator('input[type="password"]');
  if (await passwordFields.nth(0).isVisible().catch(() => false)) {
    await typeSlow(passwordFields.nth(0), 'Demo2026!');
    await typeSlow(passwordFields.nth(1), 'Demo2026!');
  }

  await page.evaluate(() => window.scrollBy({ top: 460, behavior: 'smooth' }));
  await page.waitForTimeout(600);
  const checks = page.locator('button[role="checkbox"], input[type="checkbox"]');
  const count = await checks.count();
  for (let i = 0; i < count; i += 1) {
    const item = checks.nth(i);
    if (await item.isVisible().catch(() => false)) {
      await item.click({ force: true }).catch(() => null);
      await page.waitForTimeout(250);
    }
  }

  const submit = page.getByRole('button', { name: /créer un compte|créer mon compte/i }).first();
  if (await submit.isVisible().catch(() => false)) {
    const submitBox = await submit.boundingBox();
    if (submitBox) await addHint(page, 'Créer le compte', submitBox, 'down');
    await page.waitForTimeout(1300);
    await removeHint(page);
  }
}

async function main() {
  cleanup();
  const capturePath = path.join(CAPTURES, 'video-07-creation-compte.webm');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    userAgent: MOBILE_UA,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    recordVideo: { dir: CAPTURES, size: VIEWPORT },
  });

  const page = await context.newPage();
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await cleanDevUi(page);
  await dismissPwa(page);
  await page.waitForTimeout(1200);

  const google = page.getByRole('button', { name: /continuer avec google/i }).first();
  await google.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const googleBox = await google.boundingBox();
  if (googleBox) await addHint(page, 'Inscription avec Google', googleBox, 'down');
  await page.waitForTimeout(1600);
  await removeHint(page);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(700);
  const userBtn = page.getByRole('button', { name: /utilisateur/i }).first();
  const announcerBtn = page.getByRole('button', { name: /annonceur/i }).first();
  const userBox = await userBtn.boundingBox();
  if (userBox) await addHint(page, 'Deux types de compte', userBox, 'down');
  await page.waitForTimeout(1000);
  await announcerBtn.click();
  await page.waitForTimeout(450);
  await userBtn.click();
  await page.waitForTimeout(800);
  await removeHint(page);

  await mockGooglePicker(page);
  await page.waitForTimeout(3600);
  await mockCompleteProfile(page);
  await page.waitForTimeout(5600);
  await fillClassicSignup(page);
  await page.waitForTimeout(4200);

  await context.close();
  await browser.close();

  const files = fs
    .readdirSync(CAPTURES)
    .filter((file) => file.endsWith('.webm') && file !== path.basename(capturePath))
    .map((file) => path.join(CAPTURES, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (!files.length) {
    throw new Error('Aucune capture video generee.');
  }

  fs.renameSync(files[0], capturePath);
  const out = path.join(FINAL, 'video-07-creation-compte-capture.mp4');
  run(
    `ffmpeg -y -i ${q(capturePath)} ` +
      `-vf "fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=white" ` +
      `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -an -movflags +faststart ${q(out)}`,
    'Conversion capture video-07'
  );

  const { size } = fs.statSync(out);
  console.log(`\nOK ${out}`);
  console.log(`Taille: ${(size / 1024 / 1024).toFixed(1)} Mo`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
