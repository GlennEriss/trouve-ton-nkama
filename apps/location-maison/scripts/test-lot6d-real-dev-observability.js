/* eslint-disable no-console */

const { createHash, randomBytes } = require('node:crypto')
const path = require('node:path')

const { Redis } = require('@upstash/redis')
const admin = require('firebase-admin')
const dotenv = require('dotenv')

const DEV_PROJECT_ID = 'location-maison-dev'
const SUITE_NAME = 'lot6d-real-dev-observability'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local.dev'), quiet: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertRealDevGuards() {
  const configuredProjects = [
    process.env.FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  ].filter(Boolean)

  assert(
    process.env.LOT6D_CONFIRM_REAL_DEV === '1',
    'Refus du test reel. Relancez avec LOT6D_CONFIRM_REAL_DEV=1.',
  )
  assert(
    configuredProjects.length === 2
      && configuredProjects.every((projectId) => projectId === DEV_PROJECT_ID),
    `Refus absolu : ce test accepte uniquement ${DEV_PROJECT_ID}.`,
  )
  assert(
    !process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST,
    'Le Lot 6D doit viser Firebase dev reel, pas les emulateurs.',
  )
  assert(
    process.env.CACHE_BACKEND === 'redis',
    'Le serveur et le script Lot 6D doivent etre lances avec CACHE_BACKEND=redis.',
  )
  assert(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
    'Identifiants Upstash dev manquants.',
  )

  const baseURL = new URL(process.env.LOT6D_BASE_URL || 'http://127.0.0.1:3001')
  assert(baseURL.protocol === 'http:', 'Le serveur Lot 6D doit utiliser HTTP en local.')
  assert(
    baseURL.hostname === '127.0.0.1' || baseURL.hostname === 'localhost',
    'Le serveur Lot 6D doit ecouter uniquement en local.',
  )

  return baseURL.toString().replace(/\/$/, '')
}

function initFirestore() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
  assert(serviceAccount.clientEmail && serviceAccount.privateKey, 'Identifiants Firebase Admin dev incomplets.')

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  }
  return admin.firestore()
}

function actorId(visitorId) {
  return createHash('sha256').update(`visitor:${visitorId}`).digest('hex').slice(0, 32)
}

async function post(baseURL, pathname, body) {
  const response = await fetch(`${baseURL}${pathname}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-request-id': `lot6d-${randomBytes(8).toString('hex')}`,
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  assert(response.status === 200, `${pathname}: statut inattendu ${response.status}.`)
  assert(response.headers.get('x-request-id'), `${pathname}: x-request-id absent.`)
  return payload
}

async function main() {
  const baseURL = assertRealDevGuards()
  const db = initFirestore()
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    enableAutoPipelining: false,
  })
  const runId = `${Date.now()}-${randomBytes(3).toString('hex')}`
  const reelId = `lot6d-${runId}`
  const visitorId = `ttn_lot6d_${randomBytes(12).toString('hex')}`
  const actor = actorId(visitorId)
  const reelRef = db.collection('reels').doc(reelId)
  const cacheKeys = [
    `reel-stat:view:${reelId}:${actor}`,
    `reel-stat:like-state:${reelId}:${actor}`,
    `reel-stat:like-lock:${reelId}:${actor}`,
    `reel-stat:share:${reelId}:${actor}:whatsapp`,
  ]
  const fallbackRefs = cacheKeys.map((key) => db.collection('_cache_entries').doc(key.replace(/\//g, '_')))
  let redisAvailable = false

  let testError = null
  try {
    const healthResponse = await fetch(`${baseURL}/api/health`, { cache: 'no-store' })
    assert(healthResponse.status === 200, `Health check local en echec: ${healthResponse.status}.`)

    try {
      await redis.ping()
      redisAvailable = true
    } catch {
      redisAvailable = false
    }

    await Promise.all(fallbackRefs.map((ref) => ref.delete()))
    if (redisAvailable) {
      await Promise.all(cacheKeys.map((key) => redis.del(key)))
    }
    await reelRef.set({
      createdBy: SUITE_NAME,
      processingStatus: 'ready',
      moderationStatus: 'APPROVED',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      shareTargets: {},
      state: 'IN_PROGRESS',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    const viewPath = `/api/reels/${reelId}/statistics/view`
    const likePath = `/api/reels/${reelId}/statistics/like`
    const sharePath = `/api/reels/${reelId}/statistics/share`

    const firstView = await post(baseURL, viewPath, { visitorId })
    const duplicateView = await post(baseURL, viewPath, { visitorId })
    const firstLike = await post(baseURL, likePath, { visitorId, liked: true })
    const duplicateLike = await post(baseURL, likePath, { visitorId, liked: true })
    const unlike = await post(baseURL, likePath, { visitorId, liked: false })
    const firstShare = await post(baseURL, sharePath, { visitorId, target: 'whatsapp' })
    const duplicateShare = await post(baseURL, sharePath, { visitorId, target: 'whatsapp' })

    assert(firstView.deduplicated === false && duplicateView.deduplicated === true, 'Deduplication des vues invalide.')
    assert(firstLike.deduplicated === false && duplicateLike.deduplicated === true, 'Deduplication des likes invalide.')
    assert(unlike.deduplicated === false, 'Transition unlike non appliquee.')
    assert(firstShare.deduplicated === false && duplicateShare.deduplicated === true, 'Deduplication des partages invalide.')

    const reel = (await reelRef.get()).data() ?? {}
    assert(reel.viewCount === 1, `Compteur de vues inattendu: ${reel.viewCount}.`)
    assert(reel.likeCount === 0, `Compteur de likes inattendu: ${reel.likeCount}.`)
    assert(reel.shareCount === 1, `Compteur de partages inattendu: ${reel.shareCount}.`)
    assert(reel.shareTargets?.whatsapp === 1, 'Compteur WhatsApp inattendu.')

    const [viewClaim, likeState, shareClaim] = redisAvailable
      ? await Promise.all([
          redis.get(cacheKeys[0]),
          redis.get(cacheKeys[1]),
          redis.get(cacheKeys[3]),
        ])
      : await Promise.all([fallbackRefs[0], fallbackRefs[1], fallbackRefs[3]].map(async (ref) => {
          const snapshot = await ref.get()
          return snapshot.data()?.value
        }))
    assert(viewClaim === true, 'Reservation Redis de la vue absente.')
    assert(likeState === false, 'Etat Redis du like invalide.')
    assert(shareClaim === true, 'Reservation Redis du partage absente.')

    console.log(JSON.stringify({
      suite: SUITE_NAME,
      status: 'PASS',
      firebaseProject: DEV_PROJECT_ID,
      configuredCacheBackend: 'redis',
      effectiveCacheBackend: redisAvailable ? 'redis' : 'firestore-fallback',
      counters: {
        views: reel.viewCount,
        likes: reel.likeCount,
        shares: reel.shareCount,
      },
      deduplication: {
        view: duplicateView.deduplicated,
        like: duplicateLike.deduplicated,
        share: duplicateShare.deduplicated,
      },
    }, null, 2))
  } catch (error) {
    testError = error
  } finally {
    await Promise.allSettled([
      reelRef.delete(),
      ...fallbackRefs.map((ref) => ref.delete()),
      ...cacheKeys.map((key) => redis.del(key)),
    ])
  }

  if (testError) throw testError
}

main().catch((error) => {
  console.error(`[${SUITE_NAME}] FAIL:`, error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
