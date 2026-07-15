import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const SA = new URL(
  '../services-account-firebase/location-maison-dev-firebase-adminsdk-fbsvc-3e00fcd22d.json',
  import.meta.url,
)
admin.initializeApp({ credential: admin.credential.cert(require(SA.pathname)) })
const db = admin.firestore()

if (process.argv[2] === 'cleanup') {
  await db.collection('ad_campaigns').doc('preview-seed-house-campaign').delete()
  console.log('campagne maison de preview supprimée')
  process.exit(0)
}

const srcSnap = await db.collection('reels').where('moderationStatus', '==', 'APPROVED').limit(1).get()
const thumb = srcSnap.docs[0]?.data()?.thumbnailUrl ?? ''

await db.collection('ad_campaigns').doc('preview-seed-house-campaign').set({
  advertiserId: 'preview-seed',
  name: 'Preview pub maison réels',
  status: 'active',
  placements: ['reels_infeed'],
  creative: {
    imageURL: thumb,
    headline: 'Pub maison — aperçu',
    body: 'Campagne maison affichée en alternance avec AdSense sur le fil réels.',
    ctaLabel: 'En savoir plus',
    ctaUrl: 'https://example.com',
  },
  startDate: admin.firestore.Timestamp.fromMillis(Date.now() - 3600_000),
  endDate: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 3600_000),
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
})
console.log('campagne maison de preview créée (emplacement reels_infeed)')
process.exit(0)
