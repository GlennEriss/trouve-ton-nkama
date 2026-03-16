const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv = []) {
  return argv.reduce((acc, arg, index, all) => {
    if (!arg.startsWith('--')) return acc;
    const key = arg.slice(2);
    const next = all[index + 1];
    acc[key] = next && !next.startsWith('--') ? next : true;
    return acc;
  }, {});
}

function loadMappedProperties(inputPath) {
  const resolved = path.resolve(process.cwd(), String(inputPath || ''));
  const raw = fs.readFileSync(resolved, 'utf8');
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed?.properties;

  if (!Array.isArray(list)) {
    throw new Error('Le fichier input doit contenir un tableau de propriétés.');
  }

  const bySourceId = new Map();
  let withoutSourceId = 0;
  let duplicates = 0;

  for (const item of list) {
    const sourceId = String(item?.sourceMeta?.sourceId || '').trim();
    if (!sourceId) {
      withoutSourceId += 1;
      continue;
    }
    if (bySourceId.has(sourceId)) {
      duplicates += 1;
      continue;
    }
    bySourceId.set(sourceId, item);
  }

  return {
    resolved,
    total: list.length,
    bySourceId,
    withoutSourceId,
    duplicates,
  };
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeGabonContact(value, fallback = '') {
  const raw = String(value || fallback || '').trim();
  if (!raw) return '';

  const digitsOnly = raw.replace(/[^\d]/g, '');
  if (!digitsOnly) return '';

  if (digitsOnly.startsWith('241')) {
    return `+${digitsOnly}`;
  }

  return `+241${digitsOnly}`;
}

const UPDATABLE_FIELDS = [
  'title',
  'description',
  'typeProperty',
  'price',
  'area',
  'status',
  'tags',
  'contact',
  'address',
  'street',
  'city',
  'province',
  'longitude',
  'latitude',
  'country',
  'countryCode',
  'isLocExact',
  // type-specific
  'nbrRooms',
  'nbrKitchens',
  'nbrBathrooms',
  'nbrToilets',
  'nbrFloors',
  'nbrGarages',
  'nbrLivingRoom',
  'nbrFloorApartment',
  'numeroApartment',
  'nbrFloorStudio',
  'numeroStudio',
  'nbrPiscine',
  'nbrApartments',
  'hasParking',
  'nbrToilet',
  'kioskType',
  'roomType',
];

function buildPatch(existing, mapped, options) {
  const patch = {};
  const normalizedMapped = { ...mapped };

  if (
    !Object.prototype.hasOwnProperty.call(normalizedMapped, 'nbrKitchens') &&
    Object.prototype.hasOwnProperty.call(normalizedMapped, 'nbrChickens')
  ) {
    normalizedMapped.nbrKitchens = normalizedMapped.nbrChickens;
  }

  for (const key of UPDATABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(normalizedMapped, key)) continue;
    const value = normalizedMapped[key];
    if (value === undefined) continue;
    if (key === 'price' || key === 'area') {
      patch[key] = normalizeNumber(value, 0);
      continue;
    }
    if (key === 'contact') {
      patch[key] = normalizeGabonContact(value, existing.contact || '');
      continue;
    }
    patch[key] = value;
  }

  if (options.updateSourceMeta && normalizedMapped.sourceMeta && typeof normalizedMapped.sourceMeta === 'object') {
    patch.sourceMeta = normalizedMapped.sourceMeta;
  }

  if (options.updateImages && Array.isArray(normalizedMapped.images)) {
    patch.images = normalizedMapped.images;
  }

  // Safety: remove legacy id fields from document payload.
  if (Object.prototype.hasOwnProperty.call(existing, 'id')) {
    patch.id = admin.firestore.FieldValue.delete();
  }
  if (Object.prototype.hasOwnProperty.call(existing, 'objectID')) {
    patch.objectID = admin.firestore.FieldValue.delete();
  }
  if (Object.prototype.hasOwnProperty.call(existing, 'nbrChickens')) {
    patch.nbrChickens = admin.firestore.FieldValue.delete();
  }

  return patch;
}

async function main() {
  require('dotenv').config();
  const args = parseArgs(process.argv.slice(2));

  const input = args.input || '';
  const createdBy = args['created-by'] || process.env.CREATED_BY || '';
  const source = args.source || 'facebook_import';
  const jobId = args['job-id'] || '';
  const dryRun = parseBoolean(args['dry-run'], true);
  const updateSourceMeta = parseBoolean(args['update-source-meta'], false);
  const updateImages = parseBoolean(args['update-images'], false);
  const limit = Number(args.limit || 0);

  if (!input) {
    throw new Error('Argument requis: --input <mapped-properties.json>');
  }
  if (!createdBy && !jobId) {
    throw new Error('Fournir au moins --created-by <uid> ou --job-id <id>.');
  }

  const mapped = loadMappedProperties(input);
  const serviceAccount = require('./firebase-config.js');

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Configuration Firebase incomplète (projectId/clientEmail/privateKey).');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.projectId}.firebasestorage.app`,
    });
  }

  const db = admin.firestore();
  let query = db.collection('properties');
  if (createdBy) query = query.where('createdBy', '==', createdBy);
  if (source) query = query.where('source', '==', source);
  if (limit > 0) query = query.limit(limit);

  const snapshot = await query.get();

  console.log(`🌍 Project: ${serviceAccount.projectId}`);
  console.log(`🧪 Dry-run: ${dryRun ? 'ON' : 'OFF'}`);
  console.log(`📥 Input: ${mapped.resolved}`);
  console.log(`📦 Input total: ${mapped.total}`);
  console.log(`🧾 Input with sourceId: ${mapped.bySourceId.size}`);
  if (mapped.withoutSourceId > 0) console.log(`⚠️ Input sans sourceId: ${mapped.withoutSourceId}`);
  if (mapped.duplicates > 0) console.log(`⚠️ Input sourceId dupliqués ignorés: ${mapped.duplicates}`);
  if (createdBy) console.log(`👤 createdBy: ${createdBy}`);
  if (source) console.log(`🏷️ source: ${source}`);
  if (jobId) console.log(`🧷 jobId filter: ${jobId}`);
  console.log(`🔎 Candidats Firestore: ${snapshot.size}`);
  console.log('');

  let scanned = 0;
  let matched = 0;
  let missingSourceId = 0;
  let missingInInput = 0;
  let toUpdate = 0;
  let unchanged = 0;

  const samples = [];
  const batchSize = 300;
  let batch = db.batch();
  let pending = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data() || {};

    if (jobId) {
      const dataJobId = String(data?.sourceMeta?.jobId || '');
      if (dataJobId !== jobId) continue;
    }

    matched += 1;

    const sourceId = String(data?.sourceMeta?.sourceId || '').trim();
    if (!sourceId) {
      missingSourceId += 1;
      continue;
    }

    const mappedItem = mapped.bySourceId.get(sourceId);
    if (!mappedItem) {
      missingInInput += 1;
      continue;
    }

    const patch = buildPatch(data, mappedItem, { updateSourceMeta, updateImages });
    const patchKeys = Object.keys(patch);
    if (!patchKeys.length) {
      unchanged += 1;
      continue;
    }

    toUpdate += 1;
    if (samples.length < 5) {
      samples.push({
        docId: doc.id,
        sourceId,
        fromPrice: data.price ?? null,
        toPrice: patch.price ?? data.price ?? null,
        fromStatus: data.status ?? null,
        toStatus: patch.status ?? data.status ?? null,
      });
    }

    if (!dryRun) {
      batch.update(doc.ref, {
        ...patch,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      pending += 1;
      if (pending >= batchSize) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
  }

  if (!dryRun && pending > 0) {
    await batch.commit();
  }

  console.log(`📊 Scannés: ${scanned}`);
  console.log(`🎯 Match filtre: ${matched}`);
  console.log(`✅ Documents à mettre à jour: ${toUpdate}`);
  console.log(`🟢 Déjà conformes: ${unchanged}`);
  console.log(`⚠️ Sans sourceMeta.sourceId: ${missingSourceId}`);
  console.log(`⚠️ Sans match dans input: ${missingInInput}`);
  if (samples.length) {
    console.log('\n🔍 Exemples de patch:');
    for (const sample of samples) {
      console.log(
        `- ${sample.docId} | price ${sample.fromPrice} -> ${sample.toPrice} | status ${sample.fromStatus} -> ${sample.toStatus}`
      );
    }
  }
  if (dryRun) {
    console.log('\n🧪 Aucune modification appliquée (dry-run).');
  }
}

main().catch((error) => {
  console.error('❌ reconcile-properties-from-mapped failed:', error.message);
  process.exit(1);
});
