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

function parseBoolean(value, defaultValue = true) {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function formatYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDayRange(dateYmd) {
  const base = dateYmd ? new Date(`${dateYmd}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    throw new Error(`Date invalide: ${dateYmd}. Format attendu: YYYY-MM-DD`);
  }

  const start = new Date(base);
  start.setHours(0, 0, 0, 0);

  const end = new Date(base);
  end.setHours(23, 59, 59, 999);

  return { start, end, ymd: formatYmd(base) };
}

function normalizeGabonContact(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const digitsOnly = raw.replace(/[^\d]/g, '');
  if (!digitsOnly) return '';

  if (digitsOnly.startsWith('241')) return `+${digitsOnly}`;
  return `+241${digitsOnly}`;
}

function normalizeContactsList(value) {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((item) => normalizeGabonContact(item))
    .filter(Boolean);
  return [...new Set(normalized)];
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function main() {
  require('dotenv').config();
  const args = parseArgs(process.argv.slice(2));

  const dryRun = parseBoolean(args['dry-run'], true);
  const dateArg = args.date || ''; // YYYY-MM-DD, default: today
  const source = Object.prototype.hasOwnProperty.call(args, 'source')
    ? String(args.source || '')
    : 'facebook_import';
  const createdBy = String(args['created-by'] || process.env.CREATED_BY || '').trim();
  const jobId = String(args['job-id'] || '').trim();
  const limit = Number(args.limit || 0);

  const { start, end, ymd } = getDayRange(dateArg);

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
  const startTs = admin.firestore.Timestamp.fromDate(start);
  const endTs = admin.firestore.Timestamp.fromDate(end);

  let query = db
    .collection('properties')
    .where('createdAt', '>=', startTs)
    .where('createdAt', '<=', endTs);

  if (limit > 0) query = query.limit(limit);

  const snapshot = await query.get();

  console.log(`🌍 Project: ${serviceAccount.projectId}`);
  console.log(`📅 Date ciblée: ${ymd}`);
  console.log(`⏱️ Fenêtre: ${start.toISOString()} -> ${end.toISOString()}`);
  console.log(`🧪 Dry-run: ${dryRun ? 'ON' : 'OFF'}`);
  if (source) console.log(`🏷️ source filter: ${source}`);
  if (createdBy) console.log(`👤 createdBy filter: ${createdBy}`);
  if (jobId) console.log(`🧾 jobId filter: ${jobId}`);
  console.log(`🔎 Candidats date: ${snapshot.size}`);
  console.log('');

  let scanned = 0;
  let matched = 0;
  let patched = 0;
  let unchanged = 0;
  const samples = [];

  const batchSize = 300;
  let batch = db.batch();
  let pending = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data() || {};

    if (source && String(data.source || '') !== source) continue;
    if (createdBy && String(data.createdBy || '') !== createdBy) continue;
    if (jobId && String(data?.sourceMeta?.jobId || '') !== jobId) continue;

    matched += 1;

    const currentContact = String(data.contact || '').trim();
    const currentContacts = Array.isArray(data.contacts) ? data.contacts : [];

    const nextContact = normalizeGabonContact(currentContact);
    const nextContacts = normalizeContactsList(currentContacts);

    const patch = {};
    if (nextContact && nextContact !== currentContact) {
      patch.contact = nextContact;
    }
    if (Array.isArray(currentContacts) && !arraysEqual(nextContacts, currentContacts)) {
      patch.contacts = nextContacts;
    }

    const hasPatch = Object.keys(patch).length > 0;
    if (!hasPatch) {
      unchanged += 1;
      continue;
    }

    patched += 1;
    if (samples.length < 8) {
      samples.push({
        docId: doc.id,
        fromContact: currentContact || '(vide)',
        toContact: patch.contact || nextContact || '(vide)',
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
  console.log(`🎯 Match filtres: ${matched}`);
  console.log(`✅ À corriger: ${patched}`);
  console.log(`🟢 Déjà conformes: ${unchanged}`);

  if (samples.length) {
    console.log('\n🔍 Exemples:');
    for (const sample of samples) {
      console.log(`- ${sample.docId} | ${sample.fromContact} -> ${sample.toContact}`);
    }
  }

  if (dryRun) {
    console.log('\n🧪 Aucune modification appliquée (dry-run).');
  }
}

main().catch((error) => {
  console.error('❌ backfill-contact-prefix failed:', error.message);
  process.exit(1);
});

