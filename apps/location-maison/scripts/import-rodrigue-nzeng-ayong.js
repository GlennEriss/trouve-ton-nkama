/* Import ponctuel, idempotent ; dry-run par défaut. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const ID = 'direct-housing-rodrigue-nzeng-ayong-20261019';
const UID = 'btF9lbkEbJle0pO9Fav4';
const ROOT = path.resolve(__dirname, '../../../imports/rodrigue-bekale-nzeng-ayong/images');
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
async function main() {
  process.env.LOCATION_MAISON_ENV_PATH = path.join(__dirname, '../.env.local.prod');
  const { admin, db } = require('./openstreetmap/firestore-admin').initFirestoreAdmin();
  if (process.env.FIREBASE_PROJECT_ID !== 'location-maison-prod-167da') throw Error('Projet inattendu');
  const [user, existing, root, category, duplicates] = await Promise.all([
    db.collection('users').doc(UID).get(), db.collection('properties').doc(ID).get(),
    db.collection('listing_categories').doc('immobilier').get(),
    db.collection('listing_categories').doc('home').get(),
    db.collection('properties').where('contact', '==', '+24174124961').get(),
  ]);
  const u = user.data() || {};
  const names = [u.pseudo, u.displayName, [u.firstname, u.lastname].filter(Boolean).join(' ')];
  if (!names.some(n => n && normalize(n) === 'rodrigue bekale') || !u.isPlatformAnnouncer) throw Error('Compte cible non confirmé');
  if (!root.exists || !category.exists) throw Error('Catégories absentes');
  if (existing.exists) { console.log(JSON.stringify({ exists: true, id: ID, owner: existing.data().createdBy, photos: existing.data().images?.length })); return; }
  if (!duplicates.empty) throw Error('Une annonce possède déjà ce contact : vérifier les doublons avant publication');
  const files = fs.readdirSync(ROOT).filter(n => /\.(png|jpe?g|webp)$/i.test(n)).sort();
  if (files.length !== 6) throw Error('Six photos attendues');
  const hashes = new Set();
  const prepared = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(ROOT, file));
    const hash = crypto.createHash('sha256').update(source).digest('hex');
    if (hashes.has(hash)) throw Error('Photo dupliquée');
    hashes.add(hash);
    const metadata = await sharp(source).metadata();
    if (!metadata.width || !metadata.height) throw Error('Photo invalide');
    const transform = size => sharp(source).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#fff' }).jpeg({ quality: 88, progressive: true }).toBuffer();
    prepared.push(await Promise.all([transform(1600), transform(640)]));
  }
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'APPLY' : 'DRY-RUN', account: 'Rodrigue Bekale', id: ID, photos: files.length, price: 200000, isOwner: true }));
  if (!process.argv.includes('--apply')) return;
  const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  const images = [];
  // Unique prefix prevents overwriting media in concurrent attempts. Keep uploaded media on
  // ambiguous Firestore errors rather than risk deleting files referenced by a committed write.
  const run = crypto.randomUUID();
  for (let i = 0; i < prepared.length; i++) {
    const image = {};
    for (const [j, prefix] of ['file', 'thumb'].entries()) {
      const name = `property/${ID}/${run}/${prefix}_${i + 1}.jpg`;
      const token = crypto.randomUUID();
      await bucket.file(name).save(prepared[i][j], { resumable: false, metadata: {
        contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable',
        metadata: { owner: UID, status: 'InProgress', firebaseStorageDownloadTokens: token },
      } });
      image[`${prefix}PATH`] = name;
      image[`${prefix}URL`] = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(name)}?alt=media&token=${token}`;
    }
    images.push(image);
  }
  const title = 'Maison de 2 chambres à louer à Nzeng-Ayong, Nouvelle Cité';
  await db.collection('properties').doc(ID).create({
    title, description: 'Maison à louer à Nzeng-Ayong, Nouvelle Cité, en bordure de route, dans une concession clôturée, juste à côté du LMB. Elle comprend deux chambres, un salon, une cuisine et une douche avec WC. Compteur d’électricité personnel. Loyer : 200 000 FCFA par mois. Modalités : caution + un mois de loyer. Contact : +24174124961.',
    price: 200000, area: 0, images, typeProperty: 'Home', status: 'FOR_RENT', categoryId: 'home',
    categoryPath: { lvl0: root.data().name, lvl1: `${root.data().name} > ${category.data().name}` }, attributes: {},
    nbrRooms: 2, nbrLivingRoom: 1, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1,
    street: 'Nzeng-Ayong, Nouvelle Cité, à côté du LMB', city: 'Libreville', province: 'Estuaire', country: 'Gabon', countryCode: 'GA',
    latitude: 0.4162, longitude: 9.4673, isLocExact: false, locationSource: 'UNVERIFIED',
    contact: '+24174124961', whatsappContact: '', callContact: '', additionalContacts: [],
    isOwner: true, createdBy: UID, ownerUids: [UID], searchableName: normalize(title),
    moderationStatus: 'APPROVED', moderationReviewedAt: admin.firestore.FieldValue.serverTimestamp(), moderationReviewedBy: `import:${ID}`,
    rejectionReason: null, state: 'IN_PROGRESS', tags: [], importSource: ID, importSourceId: ID, ogImageRepairSource: 'jpeg-at-import',
    createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const saved = (await db.collection('properties').doc(ID).get()).data();
  console.log(JSON.stringify({ created: ID, owner: saved.createdBy, isOwner: saved.isOwner, price: saved.price, photos: saved.images.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
