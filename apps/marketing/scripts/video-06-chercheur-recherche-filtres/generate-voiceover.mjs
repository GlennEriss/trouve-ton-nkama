/**
 * Video 06 - Voix off synchronisee.
 *
 * Sorties:
 *   videos/video-06-chercheur-recherche-filtres/voiceover/voiceover-final.mp3
 *   videos/video-06-chercheur-recherche-filtres/final/video-06-chercheur-recherche-filtres-voiceover.mp4
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-06-chercheur-recherche-filtres');
const VO_DIR = path.join(VIDEO_DIR, 'voiceover');
const FINAL_DIR = path.join(VIDEO_DIR, 'final');

fs.mkdirSync(VO_DIR, { recursive: true });
fs.mkdirSync(FINAL_DIR, { recursive: true });

const PROJECT = 'location-maison-prod-167da';
const VOICE = 'fr-FR-Studio-A';

const SEGMENTS = [
  {
    id: 'seq-01',
    dur: 14.08,
    rate: 1.03,
    ssml: `<speak>
      Vous cherchez un logement au Gabon ?
      <break time="0.2s"/>
      Ouvrez Trouve Ton Nkama.
      <break time="0.3s"/>
      Commencez par taper ce que vous cherchez.
      <break time="0.3s"/>
      Les annonces s'affichent avec les photos, les prix et les quartiers.
      <break time="0.2s"/>
      Quand une annonce vous intéresse, ouvrez-la pour voir les détails.
    </speak>`,
  },
  {
    id: 'seq-02',
    dur: 19.6,
    rate: 1.04,
    ssml: `<speak>
      Vous pouvez aussi préciser votre recherche avec les filtres.
      <break time="0.3s"/>
      Le bouton filtre se trouve ici.
      <break time="0.3s"/>
      Ici, on cherche une maison à louer.
      <break time="0.3s"/>
      Choisissez la zone : Estuaire, puis Libreville.
      <break time="0.3s"/>
      On ajoute Awendjé, puis on applique les filtres.
    </speak>`,
  },
  {
    id: 'seq-03',
    dur: 10.32,
    rate: 1.0,
    ssml: `<speak>
      Vous obtenez une liste plus ciblée.
      <break time="0.5s"/>
      Ouvrez ensuite l'annonce qui vous intéresse.
    </speak>`,
  },
  {
    id: 'seq-04',
    dur: 9,
    rate: 0.96,
    ssml: `<speak>
      Dans les détails, allez jusqu'aux contacts.
      <break time="0.4s"/>
      Vous pouvez appeler l'annonceur ou lui écrire directement sur WhatsApp.
    </speak>`,
  },
  {
    id: 'outro',
    dur: 3.93,
    rate: 0.9,
    ssml: `<speak>
      Trouve Ton Nkama.
      <break time="0.3s"/>
      Disponible sur tonnkama.com.
    </speak>`,
  },
];

function q(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function getToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

function synthesize(segment, outMp3) {
  const token = getToken();
  const requestPath = path.join(VO_DIR, `_req_${segment.id}.json`);
  const body = {
    input: { ssml: segment.ssml },
    voice: { languageCode: 'fr-FR', name: VOICE, ssmlGender: 'FEMALE' },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: segment.rate,
      pitch: -1.0,
      effectsProfileId: ['headphone-class-device'],
    },
  };

  fs.writeFileSync(requestPath, JSON.stringify(body));
  const response = execSync(
    `curl -s -X POST ` +
      `"https://texttospeech.googleapis.com/v1/text:synthesize" ` +
      `-H "Authorization: Bearer ${token}" ` +
      `-H "x-goog-user-project: ${PROJECT}" ` +
      `-H "Content-Type: application/json" ` +
      `-d @${q(requestPath)}`,
    { encoding: 'utf8' }
  );
  fs.unlinkSync(requestPath);

  const payload = JSON.parse(response);
  if (payload.error) {
    throw new Error(`[${segment.id}] ${payload.error.message}`);
  }

  fs.writeFileSync(outMp3, Buffer.from(payload.audioContent, 'base64'));
}

function padAudio(src, dst, dur) {
  execSync(
    `ffmpeg -y -i ${q(src)} -af "apad=pad_dur=${dur}" -t ${dur} -c:a libmp3lame -q:a 3 ${q(dst)}`,
    { stdio: 'pipe' }
  );
}

async function main() {
  console.log('Voix off video-06-chercheur-recherche-filtres');

  const padded = [];
  for (const segment of SEGMENTS) {
    const raw = path.join(VO_DIR, `${segment.id}-raw.mp3`);
    const out = path.join(VO_DIR, `${segment.id}-padded.mp3`);
    process.stdout.write(`  ${segment.id} (${segment.dur}s)... `);
    synthesize(segment, raw);
    padAudio(raw, out, segment.dur);
    padded.push(out);
    console.log('OK');
  }

  const concatTxt = path.join(VO_DIR, 'concat.txt');
  fs.writeFileSync(concatTxt, padded.map((file) => `file '${file}'`).join('\n'));

  const fullAudio = path.join(VO_DIR, 'voiceover-final.mp3');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i ${q(concatTxt)} -c:a libmp3lame -q:a 3 ${q(fullAudio)}`,
    { stdio: 'pipe' }
  );
  fs.unlinkSync(concatTxt);

  const videoIn = path.join(FINAL_DIR, 'video-06-chercheur-recherche-filtres.mp4');
  const videoOut = path.join(FINAL_DIR, 'video-06-chercheur-recherche-filtres-voiceover.mp4');

  if (!fs.existsSync(videoIn)) {
    throw new Error(`Video introuvable: ${videoIn}`);
  }

  execSync(
    `ffmpeg -y -i ${q(videoIn)} -i ${q(fullAudio)} ` +
      `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest ${q(videoOut)}`,
    { stdio: 'pipe' }
  );

  const { size } = fs.statSync(videoOut);
  console.log(`\nOK ${videoOut}`);
  console.log(`Taille: ${(size / 1024 / 1024).toFixed(1)} Mo`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
