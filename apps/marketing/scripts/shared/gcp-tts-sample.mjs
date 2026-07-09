/**
 * Génère des samples audio avec les meilleures voix GCP Neural2 + Studio
 * pour choisir la voix de la vidéo marque.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.join(__dirname, '..', '..');
const OUT_DIR  = path.join(ROOT, 'assets', 'voice-samples');
fs.mkdirSync(OUT_DIR, { recursive: true });

const PROJECT = 'location-maison-prod-167da';
const TEXT    = 'Chercher un logement à Libreville. Des appels sans réponse. Des déplacements pour rien. Il existe maintenant une meilleure façon.';

// Meilleures voix françaises GCP — Neural2 + Studio
const VOICES = [
  { name: 'fr-FR-Neural2-B', gender: 'MALE',   label: 'neural2-B-homme' },
  { name: 'fr-FR-Neural2-D', gender: 'MALE',   label: 'neural2-D-homme' },
  { name: 'fr-FR-Neural2-A', gender: 'FEMALE', label: 'neural2-A-femme' },
  { name: 'fr-FR-Neural2-C', gender: 'FEMALE', label: 'neural2-C-femme' },
  { name: 'fr-FR-Neural2-E', gender: 'FEMALE', label: 'neural2-E-femme' },
  { name: 'fr-FR-Studio-D',  gender: 'MALE',   label: 'studio-D-homme'  },
  { name: 'fr-FR-Studio-A',  gender: 'FEMALE', label: 'studio-A-femme'  },
];

function getAccessToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function synthesize(voice, text, outPath) {
  const token = getAccessToken();
  const body = {
    input: { text },
    voice: { languageCode: 'fr-FR', name: voice.name, ssmlGender: voice.gender },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.95,
      pitch: 0,
    },
  };

  const tmpJson = path.join(OUT_DIR, `_req_${voice.label}.json`);
  fs.writeFileSync(tmpJson, JSON.stringify(body));

  const response = execSync(
    `curl -s -X POST \
      "https://texttospeech.googleapis.com/v1/text:synthesize" \
      -H "Authorization: Bearer ${token}" \
      -H "x-goog-user-project: ${PROJECT}" \
      -H "Content-Type: application/json" \
      -d @"${tmpJson}"`,
    { encoding: 'utf8' }
  );

  fs.unlinkSync(tmpJson);
  const { audioContent, error } = JSON.parse(response);

  if (error) {
    console.error(`  ❌ ${voice.label}: ${error.message}`);
    return;
  }

  fs.writeFileSync(outPath, Buffer.from(audioContent, 'base64'));
  console.log(`  ✅ ${path.basename(outPath)}`);
}

async function main() {
  console.log('🎙️  Génération des samples GCP Neural2 + Studio (fr-FR)\n');
  console.log(`Texte : "${TEXT}"\n`);

  for (const voice of VOICES) {
    const outPath = path.join(OUT_DIR, `gcp-${voice.label}.mp3`);
    await synthesize(voice, TEXT, outPath);
  }

  console.log('\n✅ Samples dans assets/voice-samples/');
  console.log('   Préfixe gcp-* pour distinguer des voix macOS');
  console.log('\n💡 Classement qualité : Studio > Neural2 > Wavenet > Standard');
  console.log('   Les voix Studio sont les plus naturelles (quasi-humaines).');
}

main().catch(console.error);
