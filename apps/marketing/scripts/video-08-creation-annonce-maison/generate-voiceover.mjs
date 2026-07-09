/**
 * Video 08 creation annonce maison - Voix off synchronisee.
 *
 * Sorties:
 *   videos/video-08-creation-annonce-maison/voiceover/voiceover-final.mp3
 *   videos/video-08-creation-annonce-maison/final/video-08-creation-annonce-maison-voiceover.mp4
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-08-creation-annonce-maison');
const VO_DIR = path.join(VIDEO_DIR, 'voiceover');
const FINAL = path.join(VIDEO_DIR, 'final');

fs.mkdirSync(VO_DIR, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

const PROJECT = 'location-maison-prod-167da';
const VOICE = 'fr-FR-Studio-A';

function q(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function duration(file) {
  return Number(
    execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${q(file)}`,
      { encoding: 'utf8' }
    ).trim()
  );
}

function getToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

function getSegments() {
  const capture = path.join(FINAL, 'video-08-creation-annonce-maison-capture.mp4');
  if (!fs.existsSync(capture)) {
    throw new Error(`Capture introuvable: ${capture}`);
  }

  return [
    {
      id: 'intro',
      dur: 6,
      rate: 0.96,
      ssml: `<speak>
        Vous êtes propriétaire d'une maison et vous cherchez à publier une annonce de location ?
        <break time="0.25s"/>
        Vous êtes au bon endroit avec Trouve Ton Nkama.
      </speak>`,
    },
    {
      id: 'capture',
      dur: Number(duration(capture).toFixed(2)),
      rate: 1.02,
      ssml: `<speak>
        Sur la page maison, commencez par ajouter les photos du logement.
        <break time="0.35s"/>
        Indiquez ensuite votre rôle sur le bien.
        En choisissant propriétaire direct, votre annonce pourra afficher ce tag.
        <break time="0.45s"/>
        Ensuite, remplissez les informations principales :
        le titre, la description, la superficie, le prix et le statut à louer.
        <break time="0.45s"/>
        Ajoutez aussi quelques tags pour mieux décrire l'annonce.
        <break time="0.35s"/>
        À l'étape suivante, renseignez les caractéristiques de la maison :
        chambres, cuisine, douche, toilettes, étage, salon et garage.
        <break time="0.45s"/>
        Pour la localisation, choisissez la province, puis indiquez la ville et le quartier.
        Ici : Estuaire, Owendo, Alenakiri.
        <break time="0.4s"/>
        Ajoutez les informations utiles, le numéro de contact, puis appuyez sur enregistrer.
      </speak>`,
    },
    {
      id: 'outro',
      dur: 8,
      rate: 0.9,
      ssml: `<speak>
        Trouve Ton Nkama.
        <break time="0.4s"/>
        Publiez vos annonces gratuitement sur tonnkama.com.
      </speak>`,
    },
  ];
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
    `curl -s -X POST "https://texttospeech.googleapis.com/v1/text:synthesize" ` +
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
  console.log('Voix off video-08-creation-annonce-maison');
  const padded = [];

  for (const segment of getSegments()) {
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

  const videoIn = path.join(FINAL, 'video-08-creation-annonce-maison.mp4');
  const videoOut = path.join(FINAL, 'video-08-creation-annonce-maison-voiceover.mp4');
  if (!fs.existsSync(videoIn)) {
    throw new Error(`Video introuvable: ${videoIn}`);
  }

  execSync(
    `ffmpeg -y -i ${q(videoIn)} -i ${q(fullAudio)} ` +
      `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart ${q(videoOut)}`,
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
