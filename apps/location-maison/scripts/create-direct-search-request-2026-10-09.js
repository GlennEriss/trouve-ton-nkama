/* eslint-disable no-console */
const path = require('node:path')

const APPLY = process.argv.includes('--apply')
const PROJECT_ID = 'location-maison-prod-167da'
const REQUEST_ID = 'direct-search-request-2026-10-09-01'

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH ||= path.join(__dirname, '..', '.env.local.prod')
  const { initFirestoreAdmin } = require('./openstreetmap/firestore-admin')
  const { admin, db } = initFirestoreAdmin()
  if (process.env.FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error(`Projet refusé : ${process.env.FIREBASE_PROJECT_ID}`)
  }

  const ref = db.collection('search_requests').doc(REQUEST_ID)
  const existing = await ref.get()
  console.log(`Projet : ${PROJECT_ID}`)
  console.log(APPLY ? 'Mode : APPLY' : 'Mode : DRY-RUN')
  console.log(`Demande : ${REQUEST_ID} — ${existing.exists ? 'EXISTE DÉJÀ' : 'À CRÉER'}`)
  console.log('Maison · location · Libreville · 100 000 à 120 000 FCFA · +24177351974')
  if (!APPLY || existing.exists) {
    return console.log(APPLY ? 'Aucune écriture : demande déjà présente.' : 'Dry-run terminé : aucune écriture.')
  }

  await ref.create({
    id: REQUEST_ID,
    typeProperty: 'Home',
    transactionType: 'FOR_RENT',
    province: 'Estuaire',
    city: 'Libreville',
    neighborhood: null,
    budgetMinXaf: 100000,
    budgetMaxXaf: 120000,
    description: 'Je recherche à Libreville une maison comprenant une chambre, un salon, une cuisine et une douche. Budget compris entre 100 000 et 120 000 FCFA par mois.',
    whatsappContact: '+24177351974',
    secondaryContact: null,
    source: 'admin',
    createdByAdmin: 'platform-direct-request-import',
    paymentStatus: 'not_required',
    amountPaidXaf: 0,
    boostRequested: false,
    boostPaid: false,
    boostStartAt: null,
    boostEndAt: null,
    moderationStatus: 'APPROVED',
    rejectionReason: null,
    moderationReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    moderationReviewedBy: 'import:direct-search-request-2026-10-09',
    state: 'IN_PROGRESS',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  console.log(`✓ ${REQUEST_ID} créée et approuvée.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
