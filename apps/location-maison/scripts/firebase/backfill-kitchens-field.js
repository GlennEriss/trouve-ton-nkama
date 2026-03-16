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

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  return rounded >= 0 ? rounded : null;
}

function resolveKitchenCount(data) {
  const newValue = parseOptionalInt(data.nbrKitchens);
  if (newValue !== null) return newValue;
  const oldValue = parseOptionalInt(data.nbrChickens);
  if (oldValue !== null) return oldValue;
  return 0;
}

function parseUtcDayRange(dateValue) {
  const raw = String(dateValue || '').trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`Format de date invalide: "${raw}". Utilise YYYY-MM-DD.`);
  }
  const start = new Date(`${raw}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

async function main() {
  require('dotenv').config();
  const args = parseArgs(process.argv.slice(2));

  const createdBy = String(args['created-by'] || process.env.CREATED_BY || '').trim();
  const source = String(args.source || '').trim();
  const jobId = String(args['job-id'] || '').trim();
  const dryRun = parseBoolean(args['dry-run'], true);
  const limit = Number(args.limit || 0);
  const dateRange = parseUtcDayRange(args.date);

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

  if (createdBy) {
    query = query.where('createdBy', '==', createdBy);
  }
  if (source) {
    query = query.where('source', '==', source);
  }
  if (dateRange) {
    query = query
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(dateRange.start))
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(dateRange.end));
  }
  if (limit > 0) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();

  console.log(`🌍 Project: ${serviceAccount.projectId}`);
  console.log(`🧪 Dry-run: ${dryRun ? 'ON' : 'OFF'}`);
  if (createdBy) console.log(`👤 createdBy: ${createdBy}`);
  if (source) console.log(`🏷️ source: ${source}`);
  if (jobId) console.log(`🧷 jobId: ${jobId}`);
  if (dateRange) {
    console.log(`📅 date(UTC): ${args.date}`);
  }
  console.log(`🔎 Candidats: ${snapshot.size}\n`);

  let scanned = 0;
  let matched = 0;
  let toUpdate = 0;
  let unchanged = 0;
  let removedLegacyOnly = 0;

  const batchSize = 300;
  let pending = 0;
  let batch = db.batch();

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data() || {};

    if (jobId) {
      const dataJobId = String(data?.sourceMeta?.jobId || '');
      if (dataJobId !== jobId) continue;
    }

    matched += 1;
    const hasOldField = Object.prototype.hasOwnProperty.call(data, 'nbrChickens');
    const hasNewField = Object.prototype.hasOwnProperty.call(data, 'nbrKitchens');
    const targetKitchenCount = resolveKitchenCount(data);

    const patch = {};
    const currentKitchenCount = parseOptionalInt(data.nbrKitchens);
    const shouldSetCanonical =
      !hasNewField ||
      currentKitchenCount === null ||
      currentKitchenCount !== targetKitchenCount;

    if (shouldSetCanonical) {
      patch.nbrKitchens = targetKitchenCount;
    }
    if (hasOldField) {
      patch.nbrChickens = admin.firestore.FieldValue.delete();
    }

    if (!Object.keys(patch).length) {
      unchanged += 1;
      continue;
    }

    toUpdate += 1;
    if (!shouldSetCanonical && hasOldField) {
      removedLegacyOnly += 1;
    }

    if (!dryRun) {
      batch.update(doc.ref, patch);
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
  console.log(`✅ Documents à corriger: ${toUpdate}`);
  console.log(`🟢 Déjà conformes: ${unchanged}`);
  console.log(`🧹 Legacy supprimé seul: ${removedLegacyOnly}`);
  if (dryRun) {
    console.log('🧪 Aucune modification appliquée (dry-run).');
  }
}

main().catch((error) => {
  console.error('❌ backfill-kitchens-field failed:', error?.message || error);
  process.exit(1);
});
