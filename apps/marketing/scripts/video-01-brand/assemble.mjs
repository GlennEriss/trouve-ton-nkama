/**
 * Assemblage final — video-01-brand
 * Lit les parties dans videos/video-01-brand/{captures,slides,parts}
 * Sortie : videos/video-01-brand/final/video-01-brand-final.mp4
 *
 * Prérequis : avoir lancé capture.mjs + generate-slides.mjs
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = path.join(__dirname, '..', '..', 'videos', 'video-01-brand');
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

// ─── Convertir capture WebM → MP4 normalisé 1080×1920 30fps ─────────────────

function convertToMp4(srcFile, dstName) {
  const src = path.join(CAPTURES, srcFile);
  const dst = path.join(PARTS, dstName);
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠️  ${srcFile} non trouvé, ignoré`);
    return false;
  }
  run(
    `ffmpeg -y -i "${src}" \
      -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black" \
      -r 30 -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -an "${dst}"`,
    `Conversion ${srcFile} → ${dstName}`
  );
  return true;
}

// ─── Assembler dans l'ordre ───────────────────────────────────────────────────

function assembleFinal(order) {
  const resolved = order
    .map(([, file]) => {
      const inSlides = path.join(SLIDES, file);
      const inParts  = path.join(PARTS,  file);
      if (fs.existsSync(inSlides)) return inSlides;
      if (fs.existsSync(inParts))  return inParts;
      return null;
    })
    .filter(Boolean);

  const listFile = path.join(FINAL, 'concat.txt');
  fs.writeFileSync(listFile, resolved.map(p => `file '${p}'`).join('\n'));

  const out = path.join(FINAL, 'video-01-brand-final.mp4');
  run(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" \
      -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${out}"`,
    'Assemblage final'
  );
  fs.unlinkSync(listFile);
  return out;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎬 Assemblage video-01-brand — Trouve Ton Nkama\n');

  // Étape 1 : Convertir les captures brutes
  const captures = [
    ['seq-01-search-scroll.webm',  'seq-01.mp4'],
    ['seq-02-filter-modal.webm',   'seq-02.mp4'],
    ['seq-03-libreville.webm',     'seq-03.mp4'],
    ['seq-04-property-cards.webm', 'seq-04.mp4'],
    ['seq-05-property-detail.webm','seq-05.mp4'],
    ['seq-06-homepage.webm',       'seq-06.mp4'],
  ];
  for (const [src, dst] of captures) convertToMp4(src, dst);

  // Étape 2 : Assemblage dans l'ordre du script vidéo
  const order = [
    ['Acte 1 — problème',   'act1-problem.mp4'], // slides/
    ['Seq 06 — homepage',   'seq-06.mp4'],        // parts/
    ['Seq 01 — search',     'seq-01.mp4'],
    ['Seq 02 — filtres',    'seq-02.mp4'],
    ['Seq 03 — Libreville', 'seq-03.mp4'],
    ['Seq 04 — cards',      'seq-04.mp4'],
    ['Seq 05 — détail',     'seq-05.mp4'],
    ['Acte 3 — CTA',        'act3-cta.mp4'],      // slides/
  ];

  const out = assembleFinal(order);

  const { size } = fs.statSync(out);
  console.log(`\n🎉 Vidéo finale : ${out}`);
  console.log(`   Taille : ${(size / 1024 / 1024).toFixed(1)} Mo`);
  console.log('\n💡 Ajouter musique :');
  console.log(`   ffmpeg -i "${out}" -i ../../assets/music/track.mp3 \\`);
  console.log(`          -filter_complex "[1:a]volume=0.25[a]" -map 0:v -map "[a]" \\`);
  console.log(`          -shortest videos/video-01-brand/final/video-01-brand-with-music.mp4`);
}

main().catch(console.error);
