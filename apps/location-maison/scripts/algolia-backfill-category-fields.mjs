/**
 * Backfill ponctuel (2026-08-16) : pousse categoryId/categoryPath/attributes vers Algolia
 * pour toutes les annonces qui les ont déjà en Firestore mais pas encore dans l'index —
 * l'extension firestore-algolia-search n'avait jamais été redéployée avec ces champs
 * (voir docs/marketplace-multi-categories), donc aucun document existant n'a jamais
 * resynchronisé. Ce script contourne ça en écrivant directement vers Algolia depuis
 * Firestore (lecture Admin SDK), sans dépendre du redeploiement de l'extension.
 *
 * Usage :
 *   node scripts/algolia-backfill-category-fields.mjs               # dry-run (défaut)
 *   node scripts/algolia-backfill-category-fields.mjs --apply        # écriture réelle (prod)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');
const APP_ID = 'X9XCHZ509R';
const INDEX_NAME = 'location-maison_property-index';
const BATCH_SIZE = 500;

function loadEnvFile(envFilePath) {
  if (!envFilePath) return;
  const content = readFileSync(envFilePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '..', '.env.local.prod'));

const ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
if (!ADMIN_API_KEY) {
  throw new Error('ALGOLIA_ADMIN_API_KEY introuvable dans .env.local.prod');
}

function algoliaBatch(requests) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ requests });
    const options = {
      hostname: `${APP_ID}-dsn.algolia.net`,
      path: `/1/indexes/${INDEX_NAME}/batch`,
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': APP_ID,
        'X-Algolia-API-Key': ADMIN_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH = path.join(__dirname, '..', '.env.local.prod');
  const { initFirestoreAdmin } = await import('./openstreetmap/firestore-admin.js');
  const { db } = initFirestoreAdmin();

  const resolvedProjectId = process.env.FIREBASE_PROJECT_ID;
  if (resolvedProjectId !== 'location-maison-prod-167da') {
    throw new Error(`Refus : projet Firestore résolu = "${resolvedProjectId}", attendu la prod.`);
  }
  console.log(`Projet Firestore : ${resolvedProjectId}`);
  console.log(`Index Algolia : ${INDEX_NAME}`);
  console.log(APPLY ? 'Mode: APPLY (écriture réelle Algolia)' : 'Mode: DRY-RUN (aucune écriture)');
  console.log('');

  const snapshot = await db.collection('properties').where('categoryId', '!=', null).get();
  console.log(`Annonces avec categoryId en Firestore : ${snapshot.size}`);

  const updates = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      action: 'partialUpdateObject',
      body: {
        objectID: doc.id,
        categoryId: data.categoryId,
        categoryPath: data.categoryPath ?? null,
        attributes: data.attributes ?? {},
        // isOwner ("Propriétaire direct") : dans FIELDS de l'extension mais jamais
        // resynchronisé sur les docs existants — sans lui dans l'index, chaque card
        // immobilière déclenche un fetch de secours `/api/property/id` (ListingCard).
        ...(typeof data.isOwner === 'boolean' ? { isOwner: data.isOwner } : {}),
      },
    };
  });

  console.log(`À envoyer à Algolia : ${updates.length}`);
  console.log('Exemple :', JSON.stringify(updates[0], null, 2));

  if (!APPLY) {
    console.log('');
    console.log('Dry-run : aucun envoi à Algolia. Relancer avec --apply pour appliquer.');
    return;
  }

  let sent = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const result = await algoliaBatch(chunk);
    if (result.status >= 300) {
      throw new Error(`Algolia batch a échoué (status ${result.status}): ${result.body}`);
    }
    sent += chunk.length;
    console.log(`  ✓ Lot envoyé (${sent}/${updates.length})`);
  }

  console.log('');
  console.log(`Terminé : ${sent} annonces mises à jour dans Algolia.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
