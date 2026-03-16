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

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseOptionalInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  return rounded >= 0 ? rounded : null;
}

function extractInt(text, patterns) {
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (!match) continue;
    const parsed = parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function inferRooms(data, text) {
  const explicit = parseOptionalInt(data.nbrRooms);
  if (explicit !== null) return explicit;
  const parsed = extractInt(text, [
    /(\d{1,2})\s*(?:chambres?|chbre?s?|ch\b)/i,
    /(\d{1,2})\s*(?:pieces?|pi[eè]ces?)/i,
  ]);
  if (parsed !== null) return parsed;
  return /\bstudio|chambre\b/i.test(text) ? 1 : 0;
}

function inferBathrooms(data, text) {
  const explicit = parseOptionalInt(data.nbrBathrooms);
  if (explicit !== null) return explicit;
  const parsed = extractInt(text, [/(\d{1,2})\s*(?:salles?\s*d['’]?\s*(?:eau|bain)|douches?|sdb)\b/i]);
  if (parsed !== null) return parsed;
  return /\bdouche|salle d['’]eau|sdb\b/i.test(text) ? 1 : 0;
}

function inferToilets(data, text, bathrooms) {
  const explicit = parseOptionalInt(data.nbrToilets);
  if (explicit !== null) return explicit;
  const parsed = extractInt(text, [/(\d{1,2})\s*(?:toilettes?|wc)\b/i]);
  if (parsed !== null) return parsed;
  if (/\bwc|toilettes?\b/i.test(text)) return 1;
  return bathrooms > 0 ? bathrooms : 0;
}

function inferKitchens(data, text) {
  const explicit = parseOptionalInt(data.nbrKitchens ?? data.nbrChickens);
  if (explicit !== null) return explicit;
  const parsed = extractInt(text, [/(\d{1,2})\s*(?:cuisines?|kitchens?)\b/i]);
  if (parsed !== null) return parsed;
  return /\bcuisine|kitchen\b/i.test(text) ? 1 : 0;
}

function inferLivingRooms(data, text) {
  const explicit = parseOptionalInt(data.nbrLivingRoom);
  if (explicit !== null) return explicit;
  const parsed = extractInt(text, [/(\d{1,2})\s*(?:salons?|sejours?|séjours?|living)\b/i]);
  if (parsed !== null) return parsed;
  return /\bsalon|sejour|séjour|living\b/i.test(text) ? 1 : 0;
}

function inferFloorLevel(data, text, fieldName) {
  const explicit = parseOptionalInt(data[fieldName]);
  if (explicit !== null) return explicit;
  if (/\b(?:rdc|rez[- ]de[- ]chaussee)\b/i.test(text)) return 0;
  const parsed = extractInt(text, [
    /(\d{1,2})\s*(?:er|e|eme)?\s*(?:etage|étage|niveau|floor)\b/i,
    /(?:etage|étage|niveau|floor)\s*[:#-]?\s*(\d{1,2})\b/i,
  ]);
  return parsed !== null ? parsed : 0;
}

function inferFloors(data, text) {
  const explicit = parseOptionalInt(data.nbrFloors);
  if (explicit !== null) return explicit;
  const parsed = extractInt(text, [
    /(\d{1,2})\s*(?:etages?|étages?|niveaux?|floors?)\b/i,
    /(?:etages?|étages?|niveaux?|floors?)\s*[:#-]?\s*(\d{1,2})\b/i,
  ]);
  if (parsed !== null) return parsed;
  if (/\btriplex\b/i.test(text)) return 3;
  if (/\bduplex\b/i.test(text)) return 2;
  return 1;
}

function inferGarages(data, text) {
  const explicit = parseOptionalInt(data.nbrGarages);
  if (explicit !== null) return explicit;
  const parsed = extractInt(text, [/(\d{1,2})\s*(?:garages?|parkings?)\b/i]);
  if (parsed !== null) return parsed;
  return /\bgarage|parking\b/i.test(text) ? 1 : 0;
}

function inferPools(data, text) {
  const explicit = parseOptionalInt(data.nbrPiscine);
  if (explicit !== null) return explicit;
  const parsed = extractInt(text, [/(\d{1,2})\s*(?:piscines?|pools?)\b/i]);
  if (parsed !== null) return parsed;
  return /\bpiscine|pool\b/i.test(text) ? 1 : 0;
}

function inferUnitNumber(data, text, fieldName, prefix, fallbackIndex) {
  const explicit = String(data[fieldName] || '').trim();
  if (explicit) return explicit;
  const parsed = extractInt(text, [/(?:n[°o]|numero|apt|appartement|studio)\s*[:#-]?\s*(\d{1,4})\b/i]);
  if (parsed !== null) return String(parsed);
  return `${prefix}-${String(fallbackIndex + 1).padStart(2, '0')}`;
}

function inferApartments(data, text) {
  const explicit = parseOptionalInt(data.nbrApartments);
  if (explicit !== null) return explicit;
  const parsed = extractInt(text, [/(\d{1,3})\s*(?:appartements?|logements?|studios?)\b/i]);
  return parsed !== null ? parsed : 0;
}

function inferHasParking(data, text) {
  if (typeof data.hasParking === 'boolean') return data.hasParking;
  return /\bparking|garage\b/i.test(text);
}

function inferKioskType(data, text) {
  const explicit = String(data.kioskType || '').trim();
  if (explicit) return explicit;
  const normalized = normalizeText(text);
  if (/\bpharmacie\b/.test(normalized)) return 'Pharmacie';
  if (/\balimentaire|nourriture\b/.test(normalized)) return 'Alimentaire';
  if (/\bbureau|administratif\b/.test(normalized)) return 'Bureau';
  return 'Standard';
}

function inferRoomType(data, text) {
  const explicit = String(data.roomType || '').trim();
  if (explicit) return explicit;
  const normalized = normalizeText(text);
  if (/\bamericaine|américaine\b/.test(normalized)) return 'Américaine';
  if (/\bindividuelle?\b/.test(normalized)) return 'Individuelle';
  if (/\bdouble\b/.test(normalized)) return 'Double';
  if (/\bpartagee?|partagée?|colocation\b/.test(normalized)) return 'Partagée';
  if (/\bsimple\b/.test(normalized)) return 'Simple';
  return 'Standard';
}

function hasMissing(data, key) {
  if (!Object.prototype.hasOwnProperty.call(data, key)) return true;
  const value = data[key];
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
}

function buildPatch(data, index) {
  const typeProperty = String(data.typeProperty || '').trim();
  const text = `${data.title || ''}\n${data.description || ''}\n${data.street || ''}\n${data.city || ''}\n${data.province || ''}`;
  const rooms = inferRooms(data, text);
  const bathrooms = inferBathrooms(data, text);
  const toilets = inferToilets(data, text, bathrooms);
  const kitchens = inferKitchens(data, text);
  const livingRooms = inferLivingRooms(data, text);
  const patch = {};

  const ensure = (key, value) => {
    if (hasMissing(data, key)) {
      patch[key] = value;
    }
  };

  if (['Home', 'Apartment', 'Studio', 'Villa'].includes(typeProperty)) {
    ensure('nbrRooms', rooms);
    ensure('nbrKitchens', kitchens);
    ensure('nbrBathrooms', bathrooms);
    ensure('nbrToilets', toilets);
  }

  switch (typeProperty) {
    case 'Home':
      ensure('nbrFloors', inferFloors(data, text));
      ensure('nbrGarages', inferGarages(data, text));
      ensure('nbrLivingRoom', livingRooms);
      break;
    case 'Apartment':
      ensure('nbrFloorApartment', inferFloorLevel(data, text, 'nbrFloorApartment'));
      ensure('numeroApartment', inferUnitNumber(data, text, 'numeroApartment', 'APT', index));
      break;
    case 'Studio':
      ensure('nbrFloorStudio', inferFloorLevel(data, text, 'nbrFloorStudio'));
      ensure('numeroStudio', inferUnitNumber(data, text, 'numeroStudio', 'ST', index));
      break;
    case 'Villa':
      ensure('nbrFloors', inferFloors(data, text));
      ensure('nbrGarages', inferGarages(data, text));
      ensure('nbrLivingRoom', livingRooms);
      ensure('nbrPiscine', inferPools(data, text));
      break;
    case 'Building':
      ensure('nbrApartments', inferApartments(data, text));
      ensure('nbrFloors', inferFloors(data, text));
      if (typeof data.hasParking !== 'boolean') {
        patch.hasParking = inferHasParking(data, text);
      }
      break;
    case 'Desk':
      ensure('nbrRooms', rooms);
      ensure('nbrToilets', toilets);
      break;
    case 'Shop':
      ensure('nbrRooms', rooms);
      ensure('nbrToilet', parseOptionalInt(data.nbrToilet) ?? toilets);
      break;
    case 'Kiosk':
      ensure('kioskType', inferKioskType(data, text));
      break;
    case 'Room':
      ensure('roomType', inferRoomType(data, text));
      break;
    default:
      break;
  }

  return patch;
}

async function main() {
  require('dotenv').config();
  const args = parseArgs(process.argv.slice(2));
  const createdBy = args['created-by'] || process.env.CREATED_BY || '';
  const source = args.source || 'facebook_import';
  const jobId = args['job-id'] || '';
  const dryRun = String(args['dry-run'] || 'true').toLowerCase() === 'true';
  const limit = Number(args.limit || 0);

  const serviceAccount = require('./firebase-config.js');
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
  if (limit > 0) query = query.limit(limit);

  const snapshot = await query.get();
  console.log(`🔎 Candidats: ${snapshot.size}`);
  console.log(`🌍 Project: ${serviceAccount.projectId}`);
  console.log(`🧪 Dry-run: ${dryRun ? 'ON' : 'OFF'}`);
  if (createdBy) console.log(`👤 createdBy: ${createdBy}`);
  if (jobId) console.log(`🧾 jobId filter: ${jobId}`);
  console.log('');

  let scanned = 0;
  let matched = 0;
  let patched = 0;
  let unchanged = 0;

  const batchSize = 300;
  let batch = db.batch();
  let pending = 0;

  for (const [index, doc] of snapshot.docs.entries()) {
    scanned += 1;
    const data = doc.data() || {};
    if (jobId) {
      const dataJobId = data?.sourceMeta?.jobId || '';
      if (dataJobId !== jobId) continue;
    }

    matched += 1;
    const patch = buildPatch(data, index);
    const keys = Object.keys(patch);
    if (!keys.length) {
      unchanged += 1;
      continue;
    }

    patched += 1;
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
  console.log(`✅ Documents à corriger: ${patched}`);
  console.log(`🟢 Déjà conformes: ${unchanged}`);
  if (dryRun) {
    console.log('🧪 Aucune modification appliquée (dry-run).');
  }
}

main().catch((error) => {
  console.error('❌ backfill-property-type-fields failed:', error.message);
  process.exit(1);
});
