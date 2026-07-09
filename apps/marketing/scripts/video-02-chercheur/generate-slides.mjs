/**
 * Video 02 — Génère les slides texte intro + CTA
 * Sortie : videos/video-02-chercheur/slides/
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES = path.join(__dirname, '..', '..', 'videos', 'video-02-chercheur', 'slides');
const APP_PUBLIC = path.join(__dirname, '..', '..', '..', 'location-maison', 'public');
fs.mkdirSync(SLIDES, { recursive: true });

const W = 1080, H = 1920;
const GREEN = '#146B67';
const LOGO_SRC = `data:image/webp;base64,${fs.readFileSync(path.join(APP_PUBLIC, 'logo.webp')).toString('base64')}`;

async function renderSlide(browser, html, filename) {
  const ctx  = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SLIDES, filename) });
  await ctx.close();
  console.log(`  → ${filename}`);
}

function imagesToMp4(inputs, outputName, fps = 30) {
  const clips = inputs.map(([file, duration], index) => {
    const clip = path.join(SLIDES, `${outputName}.${index}.part.mp4`);
    execSync(
      `ffmpeg -y -loop 1 -t ${duration} -i "${path.join(SLIDES, file)}" \
        -vf "scale=${W}:${H},fps=${fps}" \
        -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
        "${clip}"`,
      { stdio: 'inherit' }
    );
    return clip;
  });

  const txt = path.join(SLIDES, `${outputName}.concat.txt`);
  fs.writeFileSync(txt, clips.map((clip) => `file '${clip}'`).join('\n'));
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${txt}" \
      -c:v copy \
      "${path.join(SLIDES, outputName)}"`,
    { stdio: 'inherit' }
  );
  fs.unlinkSync(txt);
  clips.forEach((clip) => fs.unlinkSync(clip));
  console.log(`  ✅ ${outputName}`);
}

// ─── Slide intro (3s) ─────────────────────────────────────────────────────────

const introSlides = [
  {
    file: 'intro-1.png',
    dur: 3,
    html: `<!DOCTYPE html><html><body style="margin:0;background:${GREEN};width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px;padding:80px;box-sizing:border-box">
      <div style="width:230px;height:230px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 22px 60px rgba(0,0,0,.2);margin-bottom:20px">
        <img src="${LOGO_SRC}" style="width:174px;height:174px;object-fit:contain;display:block" />
      </div>
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:88px;text-align:center;margin:0;line-height:1.2">
        Vous recherchez<br>un logement au Gabon ?
      </p>
      <p style="color:rgba(255,255,255,0.75);font-family:'Arial',sans-serif;font-weight:400;font-size:52px;text-align:center;margin:0">
        Trouve Ton Nkama vous accompagne.
      </p>
    </body></html>`,
  },
];

// ─── Slide CTA (3s) ───────────────────────────────────────────────────────────

const ctaSlides = [
  {
    file: 'cta-1.png',
    dur: 1,
    html: `<!DOCTYPE html><html><body style="margin:0;background:${GREEN};width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px">
      <div style="width:210px;height:210px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 22px 60px rgba(0,0,0,.2);margin-bottom:12px">
        <img src="${LOGO_SRC}" style="width:158px;height:158px;object-fit:contain;display:block" />
      </div>
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:104px;text-align:center;margin:0;padding:0 60px;line-height:1.2">
        Trouve<br>Ton Nkama
      </p>
    </body></html>`,
  },
  {
    file: 'cta-2.png',
    dur: 1,
    html: `<!DOCTYPE html><html><body style="margin:0;background:${GREEN};width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px">
      <div style="width:210px;height:210px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 22px 60px rgba(0,0,0,.2);margin-bottom:12px">
        <img src="${LOGO_SRC}" style="width:158px;height:158px;object-fit:contain;display:block" />
      </div>
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:104px;text-align:center;margin:0;padding:0 60px;line-height:1.2">
        Trouve<br>Ton Nkama
      </p>
      <p style="color:rgba(255,255,255,0.9);font-family:'Arial',sans-serif;font-size:64px;text-align:center;margin:0">
        tonnkama.com
      </p>
    </body></html>`,
  },
  {
    file: 'cta-3.png',
    dur: 1,
    html: `<!DOCTYPE html><html><body style="margin:0;background:${GREEN};width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px">
      <div style="width:210px;height:210px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 22px 60px rgba(0,0,0,.2);margin-bottom:12px">
        <img src="${LOGO_SRC}" style="width:158px;height:158px;object-fit:contain;display:block" />
      </div>
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:104px;text-align:center;margin:0;padding:0 60px;line-height:1.2">
        Trouve<br>Ton Nkama
      </p>
      <p style="color:rgba(255,255,255,0.9);font-family:'Arial',sans-serif;font-size:64px;text-align:center;margin:0">
        tonnkama.com
      </p>
      <div style="background:rgba(255,255,255,0.2);border-radius:60px;padding:20px 56px">
        <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:700;font-size:56px;text-align:center;margin:0">
          Recherche rapide
        </p>
      </div>
    </body></html>`,
  },
];

async function main() {
  console.log('🎨 Génération des slides — video-02-chercheur\n');
  const browser = await chromium.launch({ headless: true });

  console.log('Intro :');
  for (const s of introSlides) await renderSlide(browser, s.html, s.file);
  imagesToMp4(introSlides.map(s => [s.file, s.dur]), 'slide-intro.mp4');

  console.log('\nCTA :');
  for (const s of ctaSlides) await renderSlide(browser, s.html, s.file);
  imagesToMp4(ctaSlides.map(s => [s.file, s.dur]), 'slide-cta.mp4');

  await browser.close();
  console.log('\n✅ Slides dans videos/video-02-chercheur/slides/');
}

main().catch(console.error);
