const path = require('node:path');
const ID = 'direct-search-request-2026-10-19-01';
async function main() {
  process.env.LOCATION_MAISON_ENV_PATH = path.join(__dirname, '../.env.local.prod');
  const { admin, db } = require('./openstreetmap/firestore-admin').initFirestoreAdmin();
  if (process.env.FIREBASE_PROJECT_ID !== 'location-maison-prod-167da') throw Error('Projet inattendu');
  const ref = db.collection('search_requests').doc(ID);
  const [existing, duplicates] = await Promise.all([ref.get(), db.collection('search_requests').where('whatsappContact', '==', '+24174591576').get()]);
  if (existing.exists) { console.log(JSON.stringify({ id: ID, exists: true })); return; }
  if (!duplicates.empty) throw Error('Une demande utilise déjà ce contact : vérifier avant création');
  const data = {
    id: ID, typeProperty: 'Studio', transactionType: 'FOR_RENT',
    province: 'Estuaire', city: 'Libreville', neighborhood: 'Carrefour SNI, Lasni, IAI, Plein Ciel',
    budgetMinXaf: 0, budgetMaxXaf: 100000,
    description: 'Je recherche un studio à louer dans les zones Carrefour SNI, Lasni, IAI ou Plein Ciel. Mon budget maximum est de 100 000 FCFA par mois. Contact : +241 74 59 15 76.',
    whatsappContact: '+24174591576', secondaryContact: null,
    source: 'admin', createdByAdmin: 'platform-direct-request-import',
    paymentStatus: 'not_required', amountPaidXaf: 0,
    boostRequested: false, boostPaid: false, boostStartAt: null, boostEndAt: null,
    moderationStatus: 'APPROVED', rejectionReason: null,
    moderationReviewedAt: admin.firestore.FieldValue.serverTimestamp(), moderationReviewedBy: `import:${ID}`,
    state: 'IN_PROGRESS', createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  console.log(JSON.stringify({ id: ID, mode: process.argv.includes('--apply') ? 'APPLY' : 'DRY-RUN', type: data.typeProperty, budgetMax: data.budgetMaxXaf, zones: data.neighborhood }));
  if (!process.argv.includes('--apply')) return;
  await ref.create(data);
  const saved = (await ref.get()).data();
  console.log(JSON.stringify({ created: ID, status: saved.moderationStatus, contact: saved.whatsappContact, budgetMax: saved.budgetMaxXaf }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
