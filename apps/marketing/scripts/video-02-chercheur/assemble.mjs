/**
 * Video 02 — Assemblage final
 * Ordre : slide-intro -> seq-01 -> seq-02 -> seq-03 -> seq-04 -> slide-cta
 * Sortie : videos/video-02-chercheur/final/video-02-chercheur-final.mp4
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-02-chercheur');
const CAPTURES  = path.join(VIDEO_DIR, 'captures');
const SLIDES    = path.join(VIDEO_DIR, 'slides');
const PARTS     = path.join(VIDEO_DIR, 'parts');
const FINAL     = path.join(VIDEO_DIR, 'final');

fs.mkdirSync(PARTS, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

function run(cmd, label) {
  console.log(`\n⚙️  ${label}`);
  execSync(cmd, { stdio: 'inherit' });
  console.log(`  ✅ ${label}`);
}

function convertToMp4(src, dst, trimSec, startSec = 0) {
  if (!fs.existsSync(src)) { console.warn(`  ⚠️  ${path.basename(src)} manquant`); return false; }
  const startFlag = startSec ? `-ss ${startSec}` : '';
  const trimFlag = trimSec ? `-t ${trimSec}` : '';
  run(
    `ffmpeg -y ${startFlag} -i "${src}" ${trimFlag} \
      -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x146B67" \
      -r 30 -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -an "${dst}"`,
    `Conversion ${path.basename(src)}`
  );
  return true;
}

function assembleFinal(parts) {
  const resolved = parts
    .map(f => {
      const inSlides  = path.join(SLIDES, f);
      const inParts   = path.join(PARTS,  f);
      if (fs.existsSync(inSlides)) return inSlides;
      if (fs.existsSync(inParts))  return inParts;
      return null;
    })
    .filter(Boolean);

  const listFile = path.join(FINAL, 'concat.txt');
  fs.writeFileSync(listFile, resolved.map(p => `file '${p}'`).join('\n'));

  const out = path.join(FINAL, 'video-02-chercheur-final.mp4');
  run(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${out}"`,
    'Assemblage final'
  );
  fs.unlinkSync(listFile);
  return out;
}

async function main() {
  console.log('🎬 Assemblage video-02-chercheur\n');

  // Convertir les captures video localhost selon le scenario valide.
  convertToMp4(path.join(CAPTURES, 'seq-01-search.webm'),           path.join(PARTS, 'seq-01.mp4'), 12);
  convertToMp4(path.join(CAPTURES, 'seq-02-location-filters.webm'), path.join(PARTS, 'seq-02.mp4'), 26, 7);
  convertToMp4(path.join(CAPTURES, 'seq-03-results-detail.webm'),   path.join(PARTS, 'seq-03-results.mp4'), 10);
  convertToMp4(path.join(CAPTURES, 'seq-03-results-detail.webm'),   path.join(PARTS, 'seq-03-detail.mp4'), 8, 24);
  convertToMp4(path.join(CAPTURES, 'seq-04-contact.webm'),          path.join(PARTS, 'seq-04.mp4'), 5, 13);

  // Ordre final
  const out = assembleFinal([
    'slide-intro.mp4', // slides/
    'seq-01.mp4',      // parts/
    'seq-02.mp4',
    'seq-03-results.mp4',
    'seq-03-detail.mp4',
    'seq-04.mp4',
    'slide-cta.mp4',   // slides/
  ]);

  const { size } = fs.statSync(out);
  console.log(`\n🎉 Vidéo finale : ${out}`);
  console.log(`   Taille : ${(size / 1024 / 1024).toFixed(1)} Mo`);
  console.log('\n→ Lance ensuite : node scripts/video-02-chercheur/generate-voiceover.mjs');
}

main().catch(console.error);
