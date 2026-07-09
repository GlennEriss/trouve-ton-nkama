/**
 * Video 04.3 - Archiver puis reactiver une annonce.
 *
 * Sortie:
 *   videos/video-04-annonceur-awendje/final/video-04-03-archiver-reactiver-annonce.mp4
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
const VIEWPORT = { width: 540, height: 960 };
const SCALE = 2;
const EMAIL = 'monsieurleproprietaire@ttn.ga';
const PASSWORD = 'monsieurleproprietaire';

fs.mkdirSync(CAPTURES, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

function cleanup() {
  for (const file of fs.readdirSync(CAPTURES)) {
    if (file.startsWith('video-04-03-archive')) {
      fs.unlinkSync(path.join(CAPTURES, file));
    }
  }
}

async function installVideoGuards(page) {
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
        if (/Next\.js|Dev Tools|issues overlay|Issue|assistant|chat/i.test(label)) el.remove();
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
}

async function addCleanStyle(page) {
  await page.addStyleTag({
    content: `
      [data-nextjs-dev-tools-button], #next-logo, [data-next-mark],
      [data-issues-open], [data-issues-collapse], nextjs-portal {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      [aria-label*="assistant" i],
      [aria-label*="chat" i] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `,
  }).catch(() => null);
}

async function login(page) {
  await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(page);
  await page.waitForTimeout(900);
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 45000 });
  await page.locator('input').nth(0).fill(EMAIL);
  await page.locator('input').nth(1).fill(PASSWORD);
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Connexion/i }).click();
  await page.waitForURL(/\/property/, { timeout: 30000 });
  await addCleanStyle(page);
}

async function clickAction(page, label) {
  const button = page.locator('button').filter({ hasText: new RegExp(label, 'i') }).first();
  await button.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await button.click({ force: true });
  await page.waitForTimeout(700);
}

async function capture() {
  cleanup();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    locale: 'fr-FR',
    recordVideo: {
      dir: CAPTURES,
      size: { width: 1080, height: 1920 },
    },
  });
  const page = await ctx.newPage();
  await installVideoGuards(page);

  await login(page);
  await page.goto(`${BASE}/property`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await addCleanStyle(page);
  await page.waitForTimeout(2500);
  await page.locator('text=Chambre salon a louer a Awendje').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  await clickAction(page, 'Archiver');
  await page.getByText('Archiver cette annonce ?', { exact: true }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(900);
  await page.locator('button').filter({ hasText: /^Archiver$/ }).last().click({ force: true });
  await page.waitForTimeout(4500);

  await page.locator('text=Chambre salon a louer a Awendje').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await clickAction(page, 'Activer');
  await page.getByText('Réactiver cette annonce ?', { exact: true }).waitFor({ timeout: 10000 }).catch(() => null);
  await page.waitForTimeout(800);
  await page.locator('button').filter({ hasText: /^Réactiver$/ }).last().click({ force: true });
  await page.waitForTimeout(4500);

  const video = page.video();
  await ctx.close();
  await browser.close();
  const tmp = await video.path();
  const webm = path.join(CAPTURES, 'video-04-03-archive.webm');
  fs.renameSync(tmp, webm);
  return webm;
}

function convert(webm) {
  const out = path.join(FINAL, 'video-04-03-archiver-reactiver-annonce.mp4');
  execSync(
    `ffmpeg -y -i "${webm}" -vf "crop=540:960:0:0,fps=30,scale=1080:1920" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${out}"`,
    { stdio: 'inherit' }
  );
  return out;
}

async function main() {
  console.log('Capture video-04-03 archiver/reactiver annonce');
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
