// Seed manuel de réels de test pour prévisualiser en local le fil /reels avec
// l'alternance de pubs. Duplique les réels réels existants (mêmes vidéos) avec
// de nouveaux id/timestamps. N'auto-nettoie pas : à supprimer via
// `node scripts/seed-reels-preview.mjs cleanup` une fois la revue terminée.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const SA = new URL(
  '../services-account-firebase/location-maison-dev-firebase-adminsdk-fbsvc-3e00fcd22d.json',
  import.meta.url,
)

admin.initializeApp({ credential: admin.credential.cert(require(SA.pathname)) })
const db = admin.firestore()

const mode = process.argv[2] ?? 'seed'
const COUNT = 50
const PREFIX = 'preview-seed-reel-'
const CACHE_COLLECTION = '_cache_entries'

async function purgeFeedCache() {
  const snap = await db.collection(CACHE_COLLECTION).get()
  const stale = snap.docs.filter((d) => d.id.startsWith('reels:feed:'))
  await Promise.all(stale.map((d) => d.ref.delete()))
  console.log(`cache feed purgé : ${stale.length} entrée(s)`)
}

if (mode === 'cleanup') {
  const snap = await db.collection('reels').get()
  const toDelete = snap.docs.filter((d) => d.id.startsWith(PREFIX))
  await Promise.all(toDelete.map((d) => d.ref.delete()))
  console.log(`${toDelete.length} réel(s) de preview supprimé(s)`)
  await purgeFeedCache()
  process.exit(0)
}

const sources = await db
  .collection('reels')
  .where('moderationStatus', '==', 'APPROVED')
  .where('processingStatus', '==', 'ready')
  .get()

if (sources.empty) {
  console.log('Aucun réel APPROVED existant à dupliquer — publie au moins un vrai réel d’abord.')
  process.exit(1)
}

const sourceDocs = sources.docs.map((d) => d.data())
const now = Date.now()

for (let i = 0; i < COUNT; i++) {
  const src = sourceDocs[i % sourceDocs.length]
  const id = `${PREFIX}${i + 1}`
  await db.collection('reels').doc(id).set({
    ...src,
    createdAt: admin.firestore.Timestamp.fromMillis(now - (i + 1) * 60_000),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    giftCount: 0,
    giftTotalAmount: 0,
    viewCount: 0,
  })
}
console.log(`${COUNT} réels de preview créés (préfixe "${PREFIX}").`)

await purgeFeedCache()
console.log('\nOuvre http://localhost:3000/reels pour prévisualiser.')
console.log('Nettoyage : node scripts/seed-reels-preview.mjs cleanup')
process.exit(0)
