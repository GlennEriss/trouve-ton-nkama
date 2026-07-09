/**
 * Video 02 — Génère la voix off Studio-A synchronisée
 * Durée totale cible : ~67s
 *
 * Ordre : intro (3s) -> seq-01 (12s) -> seq-02 (26s) -> seq-03 (18s) -> seq-04 (5s) -> slide-cta (3s)
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-02-chercheur');
const VO_DIR    = path.join(VIDEO_DIR, 'voiceover');
const FINAL_DIR = path.join(VIDEO_DIR, 'final');
fs.mkdirSync(VO_DIR,   { recursive: true });
fs.mkdirSync(FINAL_DIR,{ recursive: true });

const PROJECT = 'location-maison-prod-167da';
const VOICE   = 'fr-FR-Studio-A';

// Durées mesurées après assemblage (à ajuster si besoin)
const SEGMENTS = [
  {
    id:   'intro',
    dur:  3.0,
    rate: 0.92,
    ssml: `<speak>
      Vous recherchez un logement au Gabon ?
      <break time="0.8s"/>
    </speak>`,
  },
  {
    id:   'seq-01',
    dur:  12.0,
    rate: 0.98,
    ssml: `<speak>
      Avec Trouve Ton Nkama, commencez par ouvrir la recherche.
      <break time="0.4s"/>
      Tapez d'abord le type de logement que vous cherchez.
      <break time="0.5s"/>
      Les premières annonces apparaissent déjà.
    </speak>`,
  },
  {
    id:   'seq-02',
    dur:  26.0,
    rate: 0.98,
    ssml: `<speak>
      Ouvrez ensuite les filtres pour préciser votre recherche.
      <break time="0.5s"/>
      C'est ici que la recherche devient plus précise.
      <break time="0.5s"/>
      Choisissez d'abord la province.
      <break time="0.4s"/>
      Ici, Estuaire.
      <break time="0.5s"/>
      Puis sélectionnez la ville.
      <break time="0.4s"/>
      Pour cette recherche : Libreville.
      <break time="0.5s"/>
      Ajoutez les critères importants : type de bien, budget, nombre de chambres.
    </speak>`,
  },
  {
    id:   'seq-03',
    dur:  18.0,
    rate: 0.98,
    ssml: `<speak>
      Vous revenez alors à une liste plus claire, avec des annonces qui correspondent.
      <break time="0.6s"/>
      Quand une annonce vous intéresse, ouvrez-la pour vérifier les détails.
      <break time="0.5s"/>
      Sur la fiche, vous vérifiez la photo, le prix, le quartier et la personne à contacter.
    </speak>`,
  },
  {
    id:   'seq-04',
    dur:  5.0,
    rate: 1.00,
    ssml: `<speak>
      Si l'annonce vous convient, contactez directement par WhatsApp ou par téléphone.
    </speak>`,
  },
  {
    id:   'cta',
    dur:  3.0,
    rate: 0.90,
    ssml: `<speak>
      Trouve Ton Nkama.
      <break time="0.3s"/>
      Cherchez plus simplement.
    </speak>`,
  },
];

function getToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

function synthesize(segment, outMp3) {
  const token = getToken();
  const body  = {
    input: { ssml: segment.ssml },
    voice: { languageCode: 'fr-FR', name: VOICE, ssmlGender: 'FEMALE' },
    audioConfig: {
      audioEncoding:    'MP3',
      speakingRate:     segment.rate,
      pitch:            -1.0,
      effectsProfileId: ['headphone-class-device'],
    },
  };
  const tmp = path.join(VO_DIR, `_req_${segment.id}.json`);
  fs.writeFileSync(tmp, JSON.stringify(body));
  const resp = execSync(
    `curl -s -X POST \
      "https://texttospeech.googleapis.com/v1/text:synthesize" \
      -H "Authorization: Bearer ${token}" \
      -H "x-goog-user-project: ${PROJECT}" \
      -H "Content-Type: application/json" \
      -d @"${tmp}"`,
    { encoding: 'utf8' }
  );
  fs.unlinkSync(tmp);
  const { audioContent, error } = JSON.parse(resp);
  if (error) throw new Error(`[${segment.id}] ${error.message}`);
  fs.writeFileSync(outMp3, Buffer.from(audioContent, 'base64'));
}

function pad(src, dst, dur) {
  execSync(
    `ffmpeg -y -i "${src}" -af "apad=pad_dur=${dur}" -t ${dur} \
      -c:a libmp3lame -q:a 3 "${dst}"`,
    { stdio: 'pipe' }
  );
}

async function main() {
  console.log('🎙️  Voix off video-02-chercheur — Studio-A\n');

  const padded = [];
  for (const seg of SEGMENTS) {
    const raw = path.join(VO_DIR, `${seg.id}-raw.mp3`);
    const out = path.join(VO_DIR, `${seg.id}-padded.mp3`);
    process.stdout.write(`  ${seg.id} (${seg.dur}s)… `);
    synthesize(seg, raw);
    pad(raw, out, seg.dur);
    padded.push(out);
    console.log('✅');
  }

  // Concat audio
  const concatTxt = path.join(VO_DIR, 'concat.txt');
  fs.writeFileSync(concatTxt, padded.map(f => `file '${f}'`).join('\n'));
  const fullAudio = path.join(VO_DIR, 'voiceover-final.mp3');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatTxt}" \
      -c:a libmp3lame -q:a 3 "${fullAudio}"`,
    { stdio: 'pipe' }
  );
  fs.unlinkSync(concatTxt);
  console.log(`\n  ✅ ${fullAudio}`);

  // Mixer avec la vidéo finale
  const videoIn  = path.join(FINAL_DIR, 'video-02-chercheur-final.mp4');
  const videoOut = path.join(FINAL_DIR, 'video-02-chercheur-with-voiceover.mp4');

  if (!fs.existsSync(videoIn)) {
    console.log('\n⚠️  Vidéo finale pas encore assemblée — lance assemble.mjs d\'abord');
    return;
  }

  console.log('\n  Mixage voix off + vidéo…');
  execSync(
    `ffmpeg -y -i "${videoIn}" -i "${fullAudio}" \
      -map 0:v -map 1:a \
      -c:v copy -c:a aac -b:a 192k -shortest \
      "${videoOut}"`,
    { stdio: 'pipe' }
  );
  const { size } = fs.statSync(videoOut);
  console.log(`\n🎉 ${videoOut}`);
  console.log(`   Taille : ${(size / 1024 / 1024).toFixed(1)} Mo`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
