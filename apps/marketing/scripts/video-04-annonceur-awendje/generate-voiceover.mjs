/**
 * Video 04 annonceur Awendje - Voix off synchronisee.
 *
 * Sorties:
 *   videos/video-04-annonceur-awendje/voiceover/voiceover-final.mp3
 *   videos/video-04-annonceur-awendje/final/video-04-annonceur-awendje-complet-voiceover.mp4
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const VIDEO_DIR = path.join(ROOT, 'videos', 'video-04-annonceur-awendje');
const VO_DIR = path.join(VIDEO_DIR, 'voiceover');
const FINAL_DIR = path.join(VIDEO_DIR, 'final');

fs.mkdirSync(VO_DIR, { recursive: true });
fs.mkdirSync(FINAL_DIR, { recursive: true });

const PROJECT = 'location-maison-prod-167da';
const VOICE = 'fr-FR-Studio-A';

const SEGMENTS = [
  {
    id: 'intro',
    dur: 2.5,
    rate: 0.92,
    ssml: `<speak>
      Voici comment utiliser Trouve Ton Nkama avec votre compte annonceur.
    </speak>`,
  },
  {
    id: 'access',
    dur: 16.83,
    rate: 1.02,
    ssml: `<speak>
      Pour accéder à la plateforme, ouvrez Google et recherchez Trouve Ton Nkama.
      <break time="0.4s"/>
      Cliquez sur le résultat du site.
      <break time="0.5s"/>
      Vous pouvez aussi aller plus vite en tapant directement tonnkama.com dans votre navigateur.
      <break time="0.4s"/>
      Dans les deux cas, vous arrivez sur la plateforme.
    </speak>`,
  },
  {
    id: 'login-title',
    dur: 2,
    rate: 0.92,
    ssml: `<speak>
      Maintenant, connectez-vous.
    </speak>`,
  },
  {
    id: 'create',
    dur: 48.77,
    rate: 1.0,
    ssml: `<speak>
      Saisissez l'email et le mot de passe qui vous ont été envoyés.
      <break time="0.5s"/>
      Une fois connecté, vous arrivez dans votre espace annonceur.
      <break time="0.5s"/>
      Pour publier une annonce, ouvrez le formulaire.
      <break time="0.6s"/>
      Ajoutez les photos du logement, puis complétez le titre, la description, la superficie et le prix.
      <break time="0.7s"/>
      Indiquez ensuite les détails du logement : une chambre, un salon, une cuisine américaine, une douche et un WC interne.
      <break time="0.7s"/>
      Enfin, choisissez la province, la ville et le quartier, puis ajoutez les informations utiles pour retrouver le logement à Awendjé.
      <break time="0.6s"/>
      Cliquez sur enregistrer. Votre annonce est publiée dans votre tableau de bord.
    </speak>`,
  },
  {
    id: 'archive-title',
    dur: 2,
    rate: 0.92,
    ssml: `<speak>
      Quand le logement est pris.
    </speak>`,
  },
  {
    id: 'archive',
    dur: 22.93,
    rate: 1.0,
    ssml: `<speak>
      Si votre logement est déjà occupé, vous n'avez pas besoin de supprimer l'annonce.
      <break time="0.6s"/>
      Cliquez simplement sur archiver.
      <break time="0.6s"/>
      L'annonce disparaît des annonces actives.
      <break time="0.8s"/>
      Le jour où le logement est de nouveau disponible, cliquez sur activer, puis confirmez.
      <break time="0.5s"/>
      L'annonce redevient visible pour les personnes qui cherchent un logement.
    </speak>`,
  },
  {
    id: 'outro',
    dur: 2.6,
    rate: 0.88,
    ssml: `<speak>
      Trouve Ton Nkama. Gardez vos annonces sous contrôle.
    </speak>`,
  },
];

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
      `-d @"${requestPath}"`,
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
    `ffmpeg -y -i "${src}" -af "apad=pad_dur=${dur}" -t ${dur} -c:a libmp3lame -q:a 3 "${dst}"`,
    { stdio: 'pipe' }
  );
}

async function main() {
  console.log('Voix off video-04-annonceur-awendje');

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
    `ffmpeg -y -f concat -safe 0 -i "${concatTxt}" -c:a libmp3lame -q:a 3 "${fullAudio}"`,
    { stdio: 'pipe' }
  );
  fs.unlinkSync(concatTxt);

  const videoIn = path.join(FINAL_DIR, 'video-04-annonceur-awendje-complet.mp4');
  const videoOut = path.join(FINAL_DIR, 'video-04-annonceur-awendje-complet-voiceover.mp4');

  if (!fs.existsSync(videoIn)) {
    throw new Error(`Video introuvable: ${videoIn}`);
  }

  execSync(
    `ffmpeg -y -i "${videoIn}" -i "${fullAudio}" ` +
      `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${videoOut}"`,
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
