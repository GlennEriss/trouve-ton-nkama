/* eslint-disable no-console */
/**
 * E2E persistant des publications mobiles contre Firebase DEV uniquement.
 * Crée exactement 1 annonce Immobilier, 1 annonce Mode et 1 réel, vérifie les
 * écritures, puis supprime systématiquement documents et objets Storage.
 */
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const admin = require('firebase-admin')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local.dev'), quiet: true })

const DEV_PROJECT_ID = 'location-maison-dev'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)
const MP4 = Buffer.from(
  'AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAGG1kYXQAAAAAAAAAAAAAAAA=',
  'base64',
)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function fetchWithRetry(url, options, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options)
    } catch (error) {
      lastError = error
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750))
    }
  }
  throw lastError
}

function guardEnvironment() {
  assert(process.env.MOBILE_PUBLISH_CONFIRM_REAL_DEV === '1', 'Relancez avec MOBILE_PUBLISH_CONFIRM_REAL_DEV=1.')
  assert(process.env.FIREBASE_PROJECT_ID === DEV_PROJECT_ID, `Projet Admin interdit : ${process.env.FIREBASE_PROJECT_ID}.`)
  assert(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === DEV_PROJECT_ID, `Projet client interdit : ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.`)
  const baseURL = new URL(process.env.MOBILE_PUBLISH_BASE_URL || 'http://localhost:3000')
  assert(baseURL.protocol === 'http:', 'Le serveur E2E doit être local en HTTP.')
  assert(['localhost', '127.0.0.1'].includes(baseURL.hostname), 'Le serveur E2E doit écouter localement.')
  return baseURL.toString().replace(/\/$/, '')
}

function initAdmin() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
  assert(serviceAccount.clientEmail && serviceAccount.privateKey, 'Identifiants Firebase Admin dev incomplets.')
  const app = admin.apps[0] || admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
  return { app, db: admin.firestore(app), bucket: admin.storage(app).bucket() }
}

async function findE2eAnnouncer(db) {
  const snapshot = await db.collection('users').where('roles', 'array-contains', 'Announcer').get()
  const matches = snapshot.docs.filter((doc) => {
    const user = doc.data()
    return /@example\.(com|test)$/i.test(user.email || '') && Boolean(user.callNumber || user.phoneNumbers?.[0] || user.whatsappNumber)
  })
  assert(matches.length === 1, `Un unique annonceur dev @example est requis (trouvé : ${matches.length}).`)
  return { uid: matches[0].id, ...matches[0].data() }
}

async function exchangeCustomToken(customToken) {
  const response = await fetchWithRetry(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
  )
  const payload = await response.json().catch(() => null)
  assert(response.ok && payload?.idToken, payload?.error?.message || `Échange du jeton Firebase refusé (${response.status}).`)
  return payload.idToken
}

async function uploadFixture(bucket, filePath, buffer, contentType, owner, runId) {
  const downloadToken = randomUUID()
  await bucket.file(filePath).save(buffer, {
    resumable: false,
    metadata: {
      contentType,
      metadata: { owner, status: 'InProgress', e2eRun: runId, firebaseStorageDownloadTokens: downloadToken },
    },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`
}

async function api(baseURL, token, endpoint, method, body) {
  const response = await fetchWithRetry(`${baseURL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  assert(response.ok && payload?.success, payload?.message || `${method} ${endpoint} a échoué (${response.status}).`)
  return payload
}

async function cleanup({ db, bucket, propertyIds, reelId, ownerId, paths }) {
  const reelSnapshot = reelId ? await db.collection('reels').doc(reelId).get() : null
  const reel = reelSnapshot?.data() || {}
  for (const value of [reel.rawVideoPath, reel.videoPath, reel.thumbnailPath]) {
    if (typeof value === 'string' && value) paths.add(value)
  }
  if (reelId && ownerId) {
    const [derivedFiles] = await bucket.getFiles({ prefix: `reels/${ownerId}/${reelId}/` })
    for (const file of derivedFiles) paths.add(file.name)
  }
  await Promise.all(propertyIds.map((id) => db.collection('properties').doc(id).delete().catch(() => undefined)))
  if (reelId) await db.collection('reels').doc(reelId).delete().catch(() => undefined)
  await Promise.all([...paths].map((filePath) => bucket.file(filePath).delete({ ignoreNotFound: true })))

  const remainingDocs = await Promise.all([
    ...propertyIds.map((id) => db.collection('properties').doc(id).get()),
    ...(reelId ? [db.collection('reels').doc(reelId).get()] : []),
  ])
  const remainingFiles = await Promise.all([...paths].map((filePath) => bucket.file(filePath).exists()))
  assert(remainingDocs.every((doc) => !doc.exists), 'Un document E2E subsiste après nettoyage.')
  assert(remainingFiles.every(([exists]) => !exists), 'Un média E2E subsiste après nettoyage.')
}

async function main() {
  const baseURL = guardEnvironment()
  const { app: adminApp, db, bucket } = initAdmin()
  const runId = `mobile-e2e-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const user = await findE2eAnnouncer(db)
  const propertyIds = []
  const paths = new Set()
  const reelId = `${runId}-reel`
  let failure = null

  console.log(`E2E publication mobile | projet=${DEV_PROJECT_ID} | run=${runId}`)
  try {
    const health = await fetchWithRetry(`${baseURL}/api/health`)
    assert(health.ok, `Serveur local indisponible : ${baseURL}.`)
    const customToken = await admin.auth(adminApp).createCustomToken(user.uid)
    const token = await exchangeCustomToken(customToken)

    const imagePath = `property/${user.uid}-${runId}.png`
    paths.add(imagePath)
    const fileURL = await uploadFixture(bucket, imagePath, PNG, 'image/png', user.uid, runId)
    const images = [{ fileURL, filePATH: imagePath }]

    const immobilier = await api(baseURL, token, '/api/properties/mobile-create', 'POST', {
      kind: 'immobilier', images, isOwner: true, province: 'Estuaire', city: 'Libreville', district: 'E2E Mobile',
      draft: {
        typeProperty: 'Room', title: `[E2E] Chambre ${runId}`,
        description: `Annonce immobilière temporaire ${runId}`, price: 85000, area: 20,
        status: 'FOR_RENT', tags: ['E2E'], roomType: 'Chambre américaine',
      },
    })
    propertyIds.push(immobilier.id)
    const immobilierDoc = await db.collection('properties').doc(immobilier.id).get()
    assert(immobilierDoc.exists && immobilierDoc.data()?.source === 'mobile', 'Annonce immobilière mobile non persistée.')
    assert(immobilierDoc.data()?.moderationStatus === 'PENDING', 'Modération immobilière incorrecte.')
    console.log(`PASS Immobilier créé et vérifié (${immobilier.id})`)

    const mode = await api(baseURL, token, '/api/properties/mobile-create', 'POST', {
      kind: 'category', images,
      draft: {
        title: `[E2E] Article Mode ${runId}`, description: `Annonce Mode temporaire ${runId}`,
        price: 10000, categoryId: 'e2e-mode', categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Test E2E' },
        cities: ['Libreville'], attributes: { color: 'test' },
      },
    })
    propertyIds.push(mode.id)
    const modeDoc = await db.collection('properties').doc(mode.id).get()
    assert(modeDoc.exists && modeDoc.data()?.categoryPath?.lvl0 === 'Mode', 'Annonce Mode mobile non persistée.')
    assert(modeDoc.data()?.moderationStatus === 'PENDING', 'Modération Mode incorrecte.')
    console.log(`PASS Mode créée et vérifiée (${mode.id})`)

    const rawVideoPath = `reels-raw/${user.uid}/${reelId}.mp4`
    paths.add(rawVideoPath)
    await api(baseURL, token, '/api/reels', 'POST', {
      reelId, propertyId: null, rawVideoPath, categoryRoot: 'Mode',
      description: `Réel temporaire ${runId}`, contact: user.callNumber || user.phoneNumbers?.[0] || user.whatsappNumber,
    })
    await uploadFixture(bucket, rawVideoPath, MP4, 'video/mp4', user.uid, runId)
    const reelDoc = await db.collection('reels').doc(reelId).get()
    assert(reelDoc.exists && reelDoc.data()?.createdBy === user.uid, 'Réel mobile non persisté.')
    assert(reelDoc.data()?.moderationStatus === 'PENDING', 'Modération du réel incorrecte.')
    console.log(`PASS Réel créé, média envoyé et vérifié (${reelId})`)
  } catch (error) {
    failure = error
  } finally {
    try {
      await cleanup({ db, bucket, propertyIds, reelId, ownerId: user.uid, paths })
      console.log(`CLEANUP PASS | properties=0 | reels=0 | medias=0 | run=${runId}`)
    } catch (cleanupError) {
      failure = failure ? new AggregateError([failure, cleanupError], 'Test et nettoyage en échec.') : cleanupError
    }
  }
  if (failure) throw failure
  console.log('E2E publication mobile DEV PASS')
}

main().catch((error) => {
  console.error(`E2E publication mobile DEV FAIL: ${error.stack || error.message}`)
  process.exitCode = 1
})
