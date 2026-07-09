/**
 * Génère les slides texte (Acte 1 + Acte 3) via Playwright HTML → PNG → MP4
 * Sortie : videos/video-01-brand/slides/
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = path.join(__dirname, '..', '..', 'videos', 'video-01-brand');
const SLIDES    = path.join(VIDEO_DIR, 'slides');

fs.mkdirSync(SLIDES, { recursive: true });

const W = 1080, H = 1920;
const GREEN = '#146B67';

// ─── helper : rendu HTML → PNG ───────────────────────────────────────────────

async function renderSlide(browser, html, filename) {
  const ctx  = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SLIDES, filename) });
  await ctx.close();
  console.log(`  → ${filename}`);
}

// ─── helper : images → MP4 ───────────────────────────────────────────────────

function imagesToMp4(inputs, outputName, fps = 30) {
  const lines = inputs.map(([file, dur]) =>
    `file '${path.join(SLIDES, file)}'\nduration ${dur}`
  ).join('\n');
  const last = inputs[inputs.length - 1][0];
  const concat = lines + `\nfile '${path.join(SLIDES, last)}'`;

  const concatFile = path.join(SLIDES, `${outputName}.concat.txt`);
  fs.writeFileSync(concatFile, concat);

  const out = path.join(SLIDES, outputName);
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatFile}" \
      -vf "scale=${W}:${H},fps=${fps}" \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${out}"`,
    { stdio: 'inherit' }
  );
  fs.unlinkSync(concatFile);
  console.log(`  ✅ ${outputName}`);
}

// ─── ACTE 1 : problème (fond noir, textes blancs) ────────────────────────────

const act1Slides = [
  {
    file: 'act1-0-silence.png',
    dur: 1,
    html: `<!DOCTYPE html><html><body style="margin:0;background:#000;width:${W}px;height:${H}px"></body></html>`,
  },
  {
    file: 'act1-1.png',
    dur: 3,
    html: `<!DOCTYPE html><html><body style="margin:0;background:#000;width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center">
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:72px;text-align:center;padding:60px;line-height:1.3">
        Chercher un logement<br>à Libreville…
      </p></body></html>`,
  },
  {
    file: 'act1-2.png',
    dur: 3,
    html: `<!DOCTYPE html><html><body style="margin:0;background:#000;width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center">
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:72px;text-align:center;padding:60px;line-height:1.3">
        Des appels<br>sans réponse.
      </p></body></html>`,
  },
  {
    file: 'act1-3.png',
    dur: 2,
    html: `<!DOCTYPE html><html><body style="margin:0;background:#000;width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center">
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:72px;text-align:center;padding:60px;line-height:1.3">
        Des déplacements<br>pour rien.
      </p></body></html>`,
  },
  // Slide "Des frais d'agence surprises" supprimé volontairement
];

// ─── ACTE 3 : CTA (fond vert Tonnkama) ───────────────────────────────────────

const act3Slides = [
  {
    file: 'act3-1.png',
    dur: 3,
    html: `<!DOCTYPE html><html><body style="margin:0;background:${GREEN};width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px">
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:100px;text-align:center;margin:0;padding:0 60px;line-height:1.2">
        Trouve<br>Ton Nkama
      </p></body></html>`,
  },
  {
    file: 'act3-2.png',
    dur: 3,
    html: `<!DOCTYPE html><html><body style="margin:0;background:${GREEN};width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px">
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:100px;text-align:center;margin:0;padding:0 60px;line-height:1.2">
        Trouve<br>Ton Nkama
      </p>
      <p style="color:rgba(255,255,255,0.9);font-family:'Arial',sans-serif;font-weight:400;font-size:64px;text-align:center;margin:0">
        tonnkama.com
      </p></body></html>`,
  },
  {
    file: 'act3-3.png',
    dur: 3,
    html: `<!DOCTYPE html><html><body style="margin:0;background:${GREEN};width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px">
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:100px;text-align:center;margin:0;padding:0 60px;line-height:1.2">
        Trouve<br>Ton Nkama
      </p>
      <p style="color:rgba(255,255,255,0.9);font-family:'Arial',sans-serif;font-weight:400;font-size:64px;text-align:center;margin:0">
        tonnkama.com
      </p>
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:700;font-size:56px;text-align:center;margin:0">
        Gratuit · Rapide · Fiable
      </p></body></html>`,
  },
  {
    file: 'act3-4.png',
    dur: 3,
    html: `<!DOCTYPE html><html><body style="margin:0;background:${GREEN};width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px">
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:900;font-size:100px;text-align:center;margin:0;padding:0 60px;line-height:1.2">
        Trouve<br>Ton Nkama
      </p>
      <p style="color:rgba(255,255,255,0.9);font-family:'Arial',sans-serif;font-weight:400;font-size:64px;text-align:center;margin:0">
        tonnkama.com
      </p>
      <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:700;font-size:56px;text-align:center;margin:0">
        Gratuit · Rapide · Fiable
      </p>
      <div style="background:rgba(255,255,255,0.2);border-radius:60px;padding:24px 60px;margin-top:20px">
        <p style="color:#fff;font-family:'Arial',sans-serif;font-weight:700;font-size:48px;text-align:center;margin:0">
          Publiez ou trouvez votre logement →
        </p>
      </div></body></html>`,
  },
];

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎨 Génération des slides — video-01-brand\n');
  const browser = await chromium.launch({ headless: true });

  console.log('Acte 1 — problème :');
  for (const s of act1Slides) await renderSlide(browser, s.html, s.file);
  imagesToMp4(act1Slides.map(s => [s.file, s.dur]), 'act1-problem.mp4');

  console.log('\nActe 3 — CTA :');
  for (const s of act3Slides) await renderSlide(browser, s.html, s.file);
  imagesToMp4(act3Slides.map(s => [s.file, s.dur]), 'act3-cta.mp4');

  await browser.close();
  console.log('\n✅ Slides dans videos/video-01-brand/slides/');
}

main().catch(console.error);
