/* eslint-disable no-console */
/**
 * E2E persistant de modification mobile contre Firebase DEV uniquement.
 * Invariant anti-abus : crée exactement UNE annonce, modifie CE document, puis le supprime.
 * Tous les documents et médias temporaires sont nettoyés dans finally, même en cas d'échec.
 */
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const admin = require('firebase-admin')
const dotenv = require('dotenv')
const { initializeApp, deleteApp } = require('firebase/app')
const { getAuth, signInWithCustomToken } = require('firebase/auth')
const { getFirestore, doc, getDoc, updateDoc, deleteDoc } = require('firebase/firestore')

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local.dev'), quiet: true })

const DEV_PROJECT_ID = 'location-maison-dev'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function guardEnvironment() {
  assert(process.env.MOBILE_EDIT_CONFIRM_REAL_DEV === '1', 'Relancez avec MOBILE_EDIT_CONFIRM_REAL_DEV=1.')
  assert(process.env.FIREBASE_PROJECT_ID === DEV_PROJECT_ID, `Projet Admin interdit : ${process.env.FIREBASE_PROJECT_ID}.`)
  assert(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === DEV_PROJECT_ID, `Projet client interdit : ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.`)
  const baseURL = new URL(process.env.MOBILE_PUBLISH_BASE_URL || 'http://localhost:3000')
  assert(baseURL.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(baseURL.hostname), 'Le serveur E2E doit être local en HTTP.')
  return baseURL.toString().replace(/\/$/, '')
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

async function findE2eAnnouncer(db) {
  const snapshot = await db.collection('users').where('roles', 'array-contains', 'Announcer').get()
  const matches = snapshot.docs
    .filter((entry) => {
      const user = entry.data()
      return /@example\.(com|test)$/i.test(user.email || '') && Boolean(user.callNumber || user.phoneNumbers?.[0] || user.whatsappNumber)
    })
    .sort((left, right) => left.id.localeCompare(right.id))
  assert(matches.length > 0, 'Aucun annonceur DEV @example avec numéro de contact n’est disponible.')
  return matches[0].id
}

async function uploadFixture(bucket, filePath, owner, runId) {
  const token = randomUUID()
  await bucket.file(filePath).save(PNG, { resumable: false, metadata: { contentType: 'image/png', metadata: { owner, status: 'InProgress', e2eRun: runId, firebaseStorageDownloadTokens: token } } })
  return { fileURL: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`, filePATH: filePath }
}

async function createListing(baseURL, idToken, body) {
  const response = await fetch(`${baseURL}/api/properties/mobile-create`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => null)
  assert(response.ok && payload?.success && payload?.id, payload?.message || `Création refusée (${response.status}).`)
  return payload.id
}

async function main() {
  const baseURL = guardEnvironment()
  const { app: adminApp, db: adminDb, bucket } = initAdmin()
  const runId = `mobile-edit-e2e-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const uid = await findE2eAnnouncer(adminDb)
  const paths = [`property/${uid}-${runId}-initial.png`, `property/${uid}-${runId}-new.png`]
  let propertyId = null
  let clientApp = null
  let failure = null

  console.log(`E2E modification mobile | projet=${DEV_PROJECT_ID} | run=${runId}`)
  try {
    const health = await fetch(`${baseURL}/api/health`)
    assert(health.ok, `Serveur local indisponible : ${baseURL}.`)
    const customToken = await admin.auth(adminApp).createCustomToken(uid)
    clientApp = initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }, runId)
    const credential = await signInWithCustomToken(getAuth(clientApp), customToken)
    const initialImage = await uploadFixture(bucket, paths[0], uid, runId)
    const newImage = await uploadFixture(bucket, paths[1], uid, runId)

    propertyId = await createListing(baseURL, await credential.user.getIdToken(), {
      kind: 'immobilier', images: [initialImage], isOwner: true, province: 'Estuaire', city: 'Libreville', district: 'E2E Initial',
      draft: { typeProperty: 'Studio', title: `[E2E] Initial ${runId}`, description: `Description initiale temporaire ${runId}`, price: 85000, area: 24, status: 'FOR_RENT', tags: ['E2E'] },
    })
    console.log(`PASS création unique (${propertyId})`)

    const propertyRef = doc(getFirestore(clientApp), 'properties', propertyId)
    await updateDoc(propertyRef, {
      title: `[E2E] Modifiée ${runId}`,
      description: `Description modifiée temporaire ${runId}`,
      price: 95000,
      street: 'E2E Modifié',
      images: [newImage],
      updatedAt: new Date(),
    })
    const updated = await getDoc(propertyRef)
    assert(updated.exists(), 'Annonce absente après modification.')
    assert(updated.data().title === `[E2E] Modifiée ${runId}`, 'Titre non modifié.')
    assert(updated.data().price === 95000, 'Prix non modifié.')
    assert(updated.data().images?.length === 1 && updated.data().images[0].filePATH === paths[1], 'Remplacement de photo non persisté.')
    console.log(`PASS modification du même document (${propertyId})`)

    await deleteDoc(propertyRef)
    const deleted = await getDoc(propertyRef)
    assert(!deleted.exists(), 'Annonce encore présente après suppression.')
    propertyId = null
    console.log('PASS suppression du même document')
  } catch (error) {
    failure = error
  } finally {
    if (propertyId) await adminDb.collection('properties').doc(propertyId).delete().catch(() => undefined)
    await Promise.all(paths.map((filePath) => bucket.file(filePath).delete({ ignoreNotFound: true })))
    const [remainingFiles] = await bucket.getFiles({ prefix: `property/${uid}-${runId}` })
    if (clientApp) await deleteApp(clientApp).catch(() => undefined)
    if (remainingFiles.length) failure = failure ? new AggregateError([failure, new Error('Médias E2E résiduels.')]) : new Error('Médias E2E résiduels.')
    console.log(`CLEANUP PASS | properties=0 | medias=0 | run=${runId}`)
  }
  if (failure) throw failure
  console.log('E2E modification mobile DEV PASS')
}

main().catch((error) => {
  console.error(`E2E modification mobile DEV FAIL: ${error.stack || error.message}`)
  process.exitCode = 1
})
