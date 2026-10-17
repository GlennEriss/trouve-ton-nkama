/* eslint-disable no-console */
/**
 * E2E persistant strictement DEV : crée UNE annonce, lui associe UN réel,
 * vérifie la relation, puis supprime document et médias dans un finally.
 */
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const admin = require('firebase-admin')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local.dev'), quiet: true })
const DEV_PROJECT_ID = 'location-maison-dev'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const MP4 = Buffer.from('AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAGG1kYXQAAAAAAAAAAAAAAAA=', 'base64')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

async function fetchRetry(url, options, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await fetch(url, options) } catch (error) { lastError = error }
  }
  throw lastError
}

function guard() {
  assert(process.env.MOBILE_REEL_ASSOC_CONFIRM_REAL_DEV === '1', 'Confirmation DEV manquante.')
  assert(process.env.FIREBASE_PROJECT_ID === DEV_PROJECT_ID, `Projet Admin interdit : ${process.env.FIREBASE_PROJECT_ID}`)
  assert(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === DEV_PROJECT_ID, `Projet client interdit : ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)
  const url = new URL(process.env.MOBILE_PUBLISH_BASE_URL || 'http://localhost:3000')
  assert(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname), 'Serveur local DEV requis.')
  return url.toString().replace(/\/$/, '')
}

function initAdmin() {
  const credential = admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  })
  const app = admin.apps[0] || admin.initializeApp({ credential, storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET })
  return { app, db: admin.firestore(app), bucket: admin.storage(app).bucket() }
}

async function createUser(app, db, runId) {
  const email = `${runId}@example.test`
  const record = await admin.auth(app).createUser({ email, emailVerified: true, displayName: 'Mobile Reel E2E' })
  const data = { uid: record.uid, email, roles: ['User', 'Announcer'], firstname: 'Mobile', lastname: 'E2E', phoneNumbers: ['+24106000000'], callNumber: '+24106000000', credits: 3 }
  await db.collection('users').doc(record.uid).set(data)
  return data
}

async function tokenFor(app, user) {
  const customToken = await admin.auth(app).createCustomToken(user.uid)
  const response = await fetchRetry(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) })
  const payload = await response.json()
  assert(response.ok && payload.idToken, payload.error?.message || 'Échange du jeton refusé.')
  return payload.idToken
}

async function callApi(baseURL, token, endpoint, body) {
  const response = await fetchRetry(`${baseURL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => null)
  assert(response.ok && payload?.success, payload?.message || `${endpoint} a échoué (${response.status}).`)
  return payload
}

async function upload(bucket, filePath, buffer, contentType, uid, runId) {
  await bucket.file(filePath).save(buffer, { resumable: false, metadata: { contentType, metadata: { owner: uid, status: 'InProgress', e2eRun: runId, firebaseStorageDownloadTokens: randomUUID() } } })
}

async function main() {
  const baseURL = guard()
  const { app, db, bucket } = initAdmin()
  const runId = `mobile-reel-assoc-${Date.now()}-${randomUUID().slice(0, 6)}`
  const user = await createUser(app, db, runId)
  const propertyId = `${runId}-property`
  const reelId = `${runId}-reel`
  const imagePath = `property/${user.uid}-${runId}.png`
  const rawVideoPath = `reels-raw/${user.uid}/${reelId}.mp4`
  const paths = new Set([imagePath, rawVideoPath])
  let actualPropertyId = propertyId
  let failure

  console.log(`E2E association Réel/Annonce | projet=${DEV_PROJECT_ID} | run=${runId}`)
  try {
    const health = await fetchRetry(`${baseURL}/api/health`)
    assert(health.ok, `Serveur local indisponible : ${baseURL}`)
    const token = await tokenFor(app, user)
    await upload(bucket, imagePath, PNG, 'image/png', user.uid, runId)
    const created = await callApi(baseURL, token, '/api/properties/mobile-create', {
      id: propertyId,
      kind: 'immobilier', images: [{ fileURL: `gs://${bucket.name}/${imagePath}`, filePATH: imagePath }],
      isOwner: true, province: 'Estuaire', city: 'Libreville', district: 'E2E Mobile',
      draft: { typeProperty: 'Room', title: `[E2E] Association ${runId}`, description: 'Annonce temporaire.', price: 85000, area: 20, status: 'FOR_RENT', tags: ['E2E'], roomType: 'Chambre' },
    })
    actualPropertyId = created.id
    assert(actualPropertyId, 'Identifiant annonce absent.')
    await callApi(baseURL, token, '/api/reels', { reelId, propertyId: actualPropertyId, rawVideoPath, description: `Réel lié ${runId}`, contact: user.callNumber || user.phoneNumbers?.[0] || user.whatsappNumber })
    await upload(bucket, rawVideoPath, MP4, 'video/mp4', user.uid, runId)
    const reel = await db.collection('reels').doc(reelId).get()
    assert(reel.exists && reel.data()?.propertyId === actualPropertyId, 'Association propertyId non persistée.')
    assert(reel.data()?.categoryPath?.lvl0 === 'Immobilier', 'Catégorie héritée incorrecte.')
    console.log(`PASS annonce=${actualPropertyId} reel=${reelId} association vérifiée`)
    await db.collection('properties').doc(actualPropertyId).delete()
  } catch (error) { failure = error }
  finally {
    const reel = await db.collection('reels').doc(reelId).get().catch(() => null)
    for (const field of ['rawVideoPath', 'videoPath', 'thumbnailPath']) { const value = reel?.data()?.[field]; if (value) paths.add(value) }
    await db.collection('reels').doc(reelId).delete().catch(() => undefined)
    await db.collection('properties').doc(actualPropertyId).delete().catch(() => undefined)
    const [derived] = await bucket.getFiles({ prefix: `reels/${user.uid}/${reelId}/` }).catch(() => [[]])
    for (const file of derived) paths.add(file.name)
    await Promise.all([...paths].map((value) => bucket.file(value).delete({ ignoreNotFound: true }).catch(() => undefined)))
    const [property, reelAfter] = await Promise.all([db.collection('properties').doc(actualPropertyId).get(), db.collection('reels').doc(reelId).get()])
    assert(!property.exists && !reelAfter.exists, 'Nettoyage documentaire incomplet.')
    await db.collection('users').doc(user.uid).delete().catch(() => undefined)
    await admin.auth(app).deleteUser(user.uid).catch(() => undefined)
    console.log('CLEANUP PASS | properties=0 | reels=0 | medias=0')
  }
  if (failure) throw failure
}

main().catch((error) => { console.error(`E2E DEV FAIL: ${error.stack || error.message}`); process.exitCode = 1 })
