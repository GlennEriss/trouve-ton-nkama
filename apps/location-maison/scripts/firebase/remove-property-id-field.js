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

async function main() {
  require('dotenv').config();
  const serviceAccount = require('./firebase-config.js');

  const args = parseArgs(process.argv.slice(2));
  const createdBy = args['created-by'] || process.env.CREATED_BY || '';
  const source = args.source || 'facebook_import';
  const jobId = args['job-id'] || '';
  const dryRun = String(args['dry-run'] || 'false').toLowerCase() === 'true';

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Configuration Firebase incomplète (projectId/clientEmail/privateKey).');
  }

  if (!createdBy && !jobId) {
    throw new Error('Fournir au moins --created-by <uid> ou --job-id <id>.');
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

  const snapshot = await query.get();
  console.log(`🔎 Documents candidates: ${snapshot.size}`);

  let scanned = 0;
  let matched = 0;
  let updated = 0;

  const batchSize = 300;
  let batch = db.batch();
  let pendingInBatch = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data() || {};

    if (jobId) {
      const dataJobId = data?.sourceMeta?.jobId || '';
      if (dataJobId !== jobId) continue;
    }

    const hasIdField = Object.prototype.hasOwnProperty.call(data, 'id');
    const hasObjectIdField = Object.prototype.hasOwnProperty.call(data, 'objectID');
    if (!hasIdField && !hasObjectIdField) continue;

    matched += 1;

    if (!dryRun) {
      const payload = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (hasIdField) payload.id = admin.firestore.FieldValue.delete();
      if (hasObjectIdField) payload.objectID = admin.firestore.FieldValue.delete();

      batch.update(doc.ref, payload);
      pendingInBatch += 1;
      updated += 1;

      if (pendingInBatch >= batchSize) {
        await batch.commit();
        batch = db.batch();
        pendingInBatch = 0;
      }
    }
  }

  if (!dryRun && pendingInBatch > 0) {
    await batch.commit();
  }

  console.log(`📊 Scannés: ${scanned}`);
  console.log(`📌 Avec champ id/objectID: ${matched}`);
  if (dryRun) {
    console.log('🧪 Dry-run activé: aucune modification appliquée.');
  } else {
    console.log(`✅ Documents mis à jour: ${updated}`);
  }
}

main().catch((error) => {
  console.error('❌ remove-property-id-field failed:', error.message);
  process.exit(1);
});
