/* eslint-disable no-console */

const path = require('node:path')

const APPLY = process.argv.includes('--apply')
const PROJECT_ID = 'location-maison-prod-167da'
const TARGET_NAME = 'landry ivanga'
const PROPERTY_IDS = [
  'direct-housing-2026-10-08-01',
  'direct-housing-2026-10-08-02',
]

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function names(data) {
  return [
    data.pseudo,
    data.displayName,
    [data.firstname, data.lastname].filter(Boolean).join(' '),
    [data.firstName, data.lastName].filter(Boolean).join(' '),
  ].filter(Boolean)
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH ||= path.join(__dirname, '..', '.env.local.prod')
  const { initFirestoreAdmin } = require('./openstreetmap/firestore-admin')
  const { admin, db } = initFirestoreAdmin()
  if (process.env.FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error(`Projet refusé : ${process.env.FIREBASE_PROJECT_ID}`)
  }

  const users = await db.collection('users').get()
  const matches = users.docs.filter((doc) => names(doc.data()).some((name) => normalize(name) === TARGET_NAME))
  if (matches.length !== 1) {
    throw new Error(`Landry Ivanga : ${matches.length} correspondance(s), une seule attendue.`)
  }
  const target = matches[0]
  const targetData = target.data()
  if (targetData.isPlatformAnnouncer !== true) {
    throw new Error(`Le compte ${target.id} n'est pas marqué isPlatformAnnouncer=true.`)
  }

  const snapshots = await db.getAll(...PROPERTY_IDS.map((id) => db.collection('properties').doc(id)))
  snapshots.forEach((snapshot) => {
    if (!snapshot.exists) throw new Error(`Annonce introuvable : ${snapshot.id}`)
  })

  console.log(`Projet : ${PROJECT_ID}`)
  console.log(APPLY ? 'Mode : APPLY' : 'Mode : DRY-RUN')
  console.log(`Compte cible : Landry Ivanga (${target.id})`)
  snapshots.forEach((snapshot) => {
    const data = snapshot.data()
    console.log(`- ${snapshot.id}: ${data.createdBy} -> ${target.id}; isOwner=${data.isOwner}`)
  })
  if (!APPLY) return console.log('Dry-run terminé : aucune écriture.')

  const batch = db.batch()
  snapshots.forEach((snapshot) => {
    batch.update(snapshot.ref, {
      createdBy: target.id,
      ownerUids: [target.id],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  })
  await batch.commit()
  console.log(`✓ ${snapshots.length} annonces réattribuées à Landry Ivanga.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
