/* eslint-disable no-console */
const path = require('node:path')

const PROPERTY_IDS = ['01', '02', '03', '04', '06', '07', '08', '09', '10']
  .map((sequence) => `direct-housing-batch-2026-10-09-${sequence}`)
const REQUEST_ID = 'direct-search-request-2026-10-09-01'

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH ||= path.join(__dirname, '..', '.env.local.prod')
  const { db } = require('./openstreetmap/firestore-admin').initFirestoreAdmin()

  for (const id of PROPERTY_IDS) {
    const snapshot = await db.collection('properties').doc(id).get()
    const data = snapshot.data() || {}
    console.log(JSON.stringify({
      collection: 'properties', id, exists: snapshot.exists,
      moderationStatus: data.moderationStatus,
      facebookPost: data.facebookPost || null,
    }))
  }

  const snapshot = await db.collection('search_requests').doc(REQUEST_ID).get()
  const data = snapshot.data() || {}
  console.log(JSON.stringify({
    collection: 'search_requests', id: REQUEST_ID, exists: snapshot.exists,
    moderationStatus: data.moderationStatus,
    facebookPost: data.facebookPost || null,
  }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
