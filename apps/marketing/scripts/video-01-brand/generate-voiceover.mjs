/**
 * Génère la voix off complète (Studio-A femme) synchronisée avec chaque
 * segment de la vidéo, puis assemble la piste audio finale.
 *
 * Ordre de la vidéo finale :
 *   act1-problem  (15s) → seq-06 (6.87s) → seq-01 (13.87s) → seq-02 (10.57s)
 *   → seq-03 (7.57s) → seq-04 (11.03s) → seq-05 (13.63s) → act3-cta (15s)
 *   Total : ~93.5 s
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.join(__dirname, '..', '..');
const VIDEO_DIR  = path.join(ROOT, 'videos', 'video-01-brand');
const VO_DIR     = path.join(VIDEO_DIR, 'voiceover');
const FINAL_DIR  = path.join(VIDEO_DIR, 'final');

fs.mkdirSync(VO_DIR,   { recursive: true });
fs.mkdirSync(FINAL_DIR,{ recursive: true });

const PROJECT = 'location-maison-prod-167da';
const VOICE   = 'fr-FR-Studio-A';
const GENDER  = 'FEMALE';

// ─── Narration par segment (texte + durée cible du segment vidéo) ─────────────
// speakingRate ajusté pour tenir dans la durée cible
const SEGMENTS = [
  {
    id:    'act1',
    dur:   11.0,
    rate:  0.90,
    ssml: `<speak>
      <break time="1.2s"/>
      Chercher un logement à Libreville…
      <break time="0.8s"/>
      Des appels sans réponse.
      <break time="0.8s"/>
      Des déplacements pour rien.
      <break time="0.3s"/>
    </speak>`,
  },
  {
    id:   'seq-06',
    dur:  6.87,
    rate: 0.90,
    ssml: `<speak>
      Il existe maintenant une meilleure façon.
    </speak>`,
  },
  {
    id:   'seq-01',
    dur:  13.87,
    rate: 0.88,
    ssml: `<speak>
      Des centaines d'annonces de maisons, villas, appartements, studios…
      <break time="0.5s"/>
      tout est là, en un seul endroit.
    </speak>`,
  },
  {
    id:   'seq-02',
    dur:  10.57,
    rate: 0.90,
    ssml: `<speak>
      Filtrez par quartier, par prix, par type de bien.
      <break time="0.4s"/>
      En quelques secondes.
    </speak>`,
  },
  {
    id:   'seq-03',
    dur:  7.57,
    rate: 0.90,
    ssml: `<speak>
      Libreville, Port-Gentil, Owendo…
      <break time="0.3s"/>
      trouvez dans votre ville.
    </speak>`,
  },
  {
    id:   'seq-04',
    dur:  11.03,
    rate: 0.88,
    ssml: `<speak>
      Chaque annonce indique clairement si vous contactez
      un propriétaire direct ou une agence.
      <break time="0.5s"/>
      Vous savez à quoi vous attendre, avant même d'appeler.
    </speak>`,
  },
  {
    id:   'seq-05',
    dur:  13.63,
    rate: 0.88,
    ssml: `<speak>
      Contactez directement le bon interlocuteur.
      <break time="0.5s"/>
      Propriétaire ou agence,
      <break time="0.3s"/>
      en toute transparence.
    </speak>`,
  },
  {
    id:   'act3',
    dur:  15.0,
    rate: 0.85,
    ssml: `<speak>
      Trouve Ton Nkama.
      <break time="0.8s"/>
      Disponible sur <say-as interpret-as="characters">tonnkama</say-as> point com.
      <break time="0.7s"/>
      Gratuit, rapide, et fiable.
      <break time="0.8s"/>
      Publiez votre bien ou trouvez votre logement dès aujourd'hui.
    </speak>`,
  },
];

// ─── helper TTS ───────────────────────────────────────────────────────────────

function getToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

function synthesize(segment, outMp3) {
  const token = getToken();
  const body = {
    input: { ssml: segment.ssml },
    voice: { languageCode: 'fr-FR', name: VOICE, ssmlGender: GENDER },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: segment.rate,
      pitch: -1.0,       // léger grave pour plus de chaleur
      effectsProfileId: ['headphone-class-device'],
    },
  };
  const tmpReq = path.join(VO_DIR, `_req_${segment.id}.json`);
  fs.writeFileSync(tmpReq, JSON.stringify(body));

  const resp = execSync(
    `curl -s -X POST \
      "https://texttospeech.googleapis.com/v1/text:synthesize" \
      -H "Authorization: Bearer ${token}" \
      -H "x-goog-user-project: ${PROJECT}" \
      -H "Content-Type: application/json" \
      -d @"${tmpReq}"`,
    { encoding: 'utf8' }
  );
  fs.unlinkSync(tmpReq);

  const { audioContent, error } = JSON.parse(resp);
  if (error) throw new Error(`TTS error [${segment.id}]: ${error.message}`);

  fs.writeFileSync(outMp3, Buffer.from(audioContent, 'base64'));
}

// ─── helper : pad/trim l'audio pour correspondre exactement à durTarget ───────

function padToduration(src, dst, durTarget) {
  // apad ajoute du silence si l'audio est plus court, -t coupe s'il est plus long
  execSync(
    `ffmpeg -y -i "${src}" \
      -af "apad=pad_dur=${durTarget}" \
      -t ${durTarget} \
      -c:a libmp3lame -q:a 3 "${dst}"`,
    { stdio: 'pipe' }
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎙️  Génération voix off — Studio-A — video-01-brand\n');

  const paddedFiles = [];

  for (const seg of SEGMENTS) {
    const rawMp3    = path.join(VO_DIR, `${seg.id}-raw.mp3`);
    const paddedMp3 = path.join(VO_DIR, `${seg.id}-padded.mp3`);

    process.stdout.write(`  Segment ${seg.id} (cible ${seg.dur}s)… `);
    synthesize(seg, rawMp3);
    padToMaison(rawMp3, paddedMp3, seg.dur);
    paddedFiles.push(paddedMp3);
    console.log('✅');
  }

  // Concaténer toutes les pistes paddées en une seule piste audio
  console.log('\n  Assemblage de la piste audio complète…');
  const concatTxt = path.join(VO_DIR, 'concat.txt');
  fs.writeFileSync(concatTxt, paddedFiles.map(f => `file '${f}'`).join('\n'));

  const fullAudio = path.join(VO_DIR, 'voiceover-final.mp3');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatTxt}" \
      -c:a libmp3lame -q:a 3 "${fullAudio}"`,
    { stdio: 'pipe' }
  );
  fs.unlinkSync(concatTxt);
  console.log(`  ✅ ${fullAudio}`);

  // Mixer voix off + vidéo finale
  const videoIn  = path.join(FINAL_DIR, 'video-01-brand-final.mp4');
  const videoOut = path.join(FINAL_DIR, 'video-01-brand-with-voiceover.mp4');

  console.log('\n  Mixage voix off + vidéo…');
  execSync(
    `ffmpeg -y \
      -i "${videoIn}" \
      -i "${fullAudio}" \
      -map 0:v \
      -map 1:a \
      -c:v copy \
      -c:a aac -b:a 192k \
      -shortest \
      "${videoOut}"`,
    { stdio: 'pipe' }
  );

  const { size } = fs.statSync(videoOut);
  console.log(`\n🎉 Vidéo avec voix off : ${videoOut}`);
  console.log(`   Taille : ${(size / 1024 / 1024).toFixed(1)} Mo`);
  console.log('\n💡 Pour ajouter aussi la musique de fond :');
  console.log(`   node scripts/video-01-brand/add-music.mjs`);
}

// alias pour la fonction pad (typo corrigée)
function padToMaison(src, dst, dur) { return padToduration(src, dst, dur); }

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
