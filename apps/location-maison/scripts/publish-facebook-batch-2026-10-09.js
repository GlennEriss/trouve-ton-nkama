/* eslint-disable no-console */
const path = require('node:path')

const PROPERTY_IDS = ['01', '02', '03', '04', '06', '07', '08', '09', '10']
  .map((sequence) => `direct-housing-batch-2026-10-09-${sequence}`)
const REQUEST_ID = 'direct-search-request-2026-10-09-01'
const PROJECT_ID = 'location-maison-prod-167da'
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function transitionToApproved(ref) {
  const snapshot = await ref.get()
  if (!snapshot.exists) throw new Error(`Document absent : ${ref.path}`)
  if (snapshot.data()?.facebookPost?.id) {
    console.log(`= déjà publié : ${ref.path} (${snapshot.data().facebookPost.id})`)
    return false
  }

  await ref.update({ moderationStatus: 'PENDING' })
  await ref.update({ moderationStatus: 'APPROVED' })
  console.log(`→ publication déclenchée : ${ref.path}`)
  return true
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH ||= path.join(__dirname, '..', '.env.local.prod')
  const { db } = require('./openstreetmap/firestore-admin').initFirestoreAdmin()
  if (process.env.FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error(`Projet refusé : ${process.env.FIREBASE_PROJECT_ID}`)
  }

  const refs = [
    ...PROPERTY_IDS.map((id) => db.collection('properties').doc(id)),
    db.collection('search_requests').doc(REQUEST_ID),
  ]

  for (const ref of refs) {
    await transitionToApproved(ref)
  }

  const deadline = Date.now() + 90_000
  let pending = refs
  while (pending.length && Date.now() < deadline) {
    await delay(3_000)
    const results = await Promise.all(pending.map(async (ref) => ({ ref, snapshot: await ref.get() })))
    pending = []
    for (const { ref, snapshot } of results) {
      const postId = snapshot.data()?.facebookPost?.id
      if (postId) console.log(`✓ ${ref.path} → ${postId}`)
      else pending.push(ref)
    }
  }

  if (pending.length) {
    throw new Error(`Publication non confirmée après 90 s : ${pending.map((ref) => ref.path).join(', ')}`)
  }
  console.log('✓ Les 10 publications Facebook sont confirmées.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
