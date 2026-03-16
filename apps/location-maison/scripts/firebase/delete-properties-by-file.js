const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseCliArgs(argv = []) {
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
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function extractStoragePathFromUrl(urlValue) {
  const raw = String(urlValue || '').trim();
  if (!raw) return '';

  const firebaseUrlMatch = raw.match(/\/o\/([^?]+)/);
  if (firebaseUrlMatch?.[1]) {
    return decodeURIComponent(firebaseUrlMatch[1]).trim();
  }

  try {
    const parsedUrl = new URL(raw);
    const pathname = parsedUrl.pathname.replace(/^\/+/, '');
    const parts = pathname.split('/');
    if (parts.length >= 2) {
      return parts.slice(1).join('/').trim();
    }
  } catch (_error) {
    // ignore invalid URL
  }

  return '';
}

function collectImagePaths(images = []) {
  const paths = [];
  for (const image of images) {
    if (!image) continue;
    if (typeof image === 'string') {
      const fromUrl = extractStoragePathFromUrl(image);
      if (fromUrl) paths.push(fromUrl);
      continue;
    }
    if (typeof image === 'object') {
      if (image.filePATH) {
        paths.push(String(image.filePATH).trim());
      } else if (image.fileURL) {
        const fromUrl = extractStoragePathFromUrl(image.fileURL);
        if (fromUrl) paths.push(fromUrl);
      }
    }
  }
  return [...new Set(paths.filter((value) => value.startsWith('properties/')))];
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const inputFile = path.resolve(
    process.cwd(),
    String(args.input || 'scripts/firebase/processed-properties.json')
  );
  const dryRun = parseBoolean(args['dry-run'], true);
  const createdByFilter = String(args['created-by'] || '').trim();
  const sourceFilter = String(args.source || '').trim();

  require('dotenv').config();
  const serviceAccount = require('./firebase-config.js');
  const projectId = serviceAccount.projectId;
  const serviceAccountEmail = serviceAccount.clientEmail || '';
  const isProduction = projectId === 'location-maison-prod-167da';

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
    });
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const content = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const items = Array.isArray(content) ? content : content.properties || [];
  const ids = [...new Set(items.map((item) => String(item?.id || '').trim()).filter(Boolean))];

  console.log('🗑️  Suppression ciblée par IDs');
  console.log(`🌍 Project: ${projectId}`);
  console.log(`👤 Service account: ${serviceAccountEmail}`);
  console.log(`📄 Input: ${inputFile}`);
  console.log(`📌 IDs fournis: ${ids.length}`);
  if (createdByFilter) console.log(`👤 Filtre createdBy: ${createdByFilter}`);
  if (sourceFilter) console.log(`🏷️ Filtre source: ${sourceFilter}`);
  console.log(`🧪 Dry-run: ${dryRun ? 'ON' : 'OFF'}`);
  if (isProduction) console.log('⚠️  MODE PRODUCTION');
  console.log('');

  if (ids.length === 0) {
    console.log('✅ Aucun ID trouvé dans le fichier.');
    return;
  }

  const targets = [];
  const missingIds = [];
  for (const id of ids) {
    const snap = await db.collection('properties').doc(id).get();
    if (!snap.exists) {
      missingIds.push(id);
      continue;
    }

    const data = snap.data() || {};
    if (createdByFilter && String(data.createdBy || '') !== createdByFilter) {
      continue;
    }
    if (sourceFilter && String(data.source || '') !== sourceFilter) {
      continue;
    }

    targets.push({
      id,
      ref: snap.ref,
      createdBy: String(data.createdBy || ''),
      source: String(data.source || ''),
      imagePaths: collectImagePaths(data.images || []),
    });
  }

  console.log(`📊 IDs introuvables: ${missingIds.length}`);
  console.log(`📊 Documents candidats: ${targets.length}`);

  if (targets.length === 0) {
    console.log('✅ Rien à supprimer après filtres.');
    return;
  }

  const totalImagePaths = targets.reduce((sum, item) => sum + item.imagePaths.length, 0);
  console.log(`🖼️ Images candidates (references): ${totalImagePaths}`);

  if (dryRun) {
    targets.slice(0, 20).forEach((item, index) => {
      console.log(
        `- [${index + 1}] ${item.id} | createdBy=${item.createdBy} | source=${item.source} | images=${item.imagePaths.length}`
      );
    });
    if (targets.length > 20) {
      console.log(`... +${targets.length - 20} autres`);
    }
    console.log('🧪 Dry-run actif: aucune suppression effectuée.');
    return;
  }

  let imagesDeleted = 0;
  let imageDeleteErrors = 0;

  for (const target of targets) {
    for (const imagePath of target.imagePaths) {
      try {
        await bucket.file(imagePath).delete();
        imagesDeleted += 1;
      } catch (_error) {
        imageDeleteErrors += 1;
      }
    }
  }

  let docsDeleted = 0;
  const batchLimit = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const target of targets) {
    batch.delete(target.ref);
    batchCount += 1;
    docsDeleted += 1;

    if (batchCount >= batchLimit) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log('');
  console.log('✅ Suppression terminée');
  console.log(`🧾 Documents supprimés: ${docsDeleted}`);
  console.log(`🖼️ Images supprimées: ${imagesDeleted}`);
  console.log(`⚠️ Erreurs suppression images: ${imageDeleteErrors}`);
}

main().catch((error) => {
  console.error('❌ delete-properties-by-file failed:', error?.message || error);
  process.exit(1);
});

