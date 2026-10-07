/* eslint-disable no-console */
const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const admin = require('firebase-admin')
const dotenv = require('dotenv')
const { initializeApp, deleteApp } = require('firebase/app')
const { getAuth, signInWithCustomToken } = require('firebase/auth')

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local.dev'), quiet: true })

const PROJECT = 'location-maison-dev'
const EMAIL = 'mobile-e2e@example.test'
const PASSWORD = 'MobileE2E2026!'
const TITLE = '[TEST MOBILE] Studio à modifier'
const BASE_URL = 'http://localhost:3000'

function assert(value, message) { if (!value) throw new Error(message) }

async function main() {
  assert(process.env.MOBILE_E2E_CONFIRM_REAL_DEV === '1', 'Confirmation DEV manquante.')
  assert(process.env.FIREBASE_PROJECT_ID === PROJECT && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === PROJECT, 'Projet Firebase non DEV interdit.')
  const credential = admin.credential.cert({ projectId: PROJECT, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') })
  const adminApp = admin.apps[0] || admin.initializeApp({ credential, storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET })
  const auth = admin.auth(adminApp)
  const db = admin.firestore(adminApp)
  const bucket = admin.storage(adminApp).bucket()
  let user
  try { user = await auth.getUserByEmail(EMAIL); await auth.updateUser(user.uid, { password: PASSWORD, emailVerified: true }) }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; user = await auth.createUser({ email: EMAIL, password: PASSWORD, emailVerified: true, displayName: 'Mobile E2E' }) }
  await db.collection('users').doc(user.uid).set({ uid: user.uid, email: EMAIL, firstName: 'Mobile', lastName: 'E2E', pseudo: 'mobile-e2e', roles: ['Announcer'], callNumber: '+24106000000', phoneNumbers: ['+24106000000'], phoneNumberVerified: true, e2e: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })

  const previous = await db.collection('properties').where('createdBy', '==', user.uid).where('title', '==', TITLE).get()
  for (const item of previous.docs) {
    for (const image of item.data().images || []) if (image.filePATH) await bucket.file(image.filePATH).delete({ ignoreNotFound: true })
    await item.ref.delete()
  }

  const filePath = `property/${user.uid}-manual-edit-fixture.png`
  const token = randomUUID()
  const imageBytes = fs.readFileSync(path.resolve(__dirname, '../../mobile/assets/icon.png'))
  await bucket.file(filePath).save(imageBytes, { resumable: false, metadata: { contentType: 'image/png', metadata: { owner: user.uid, status: 'InProgress', e2eManual: 'true', firebaseStorageDownloadTokens: token } } })
  const image = { filePATH: filePath, fileURL: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}` }

  const clientApp = initializeApp({ apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: PROJECT, storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID }, `manual-${Date.now()}`)
  try {
    const signed = await signInWithCustomToken(getAuth(clientApp), await auth.createCustomToken(user.uid))
    const response = await fetch(`${BASE_URL}/api/properties/mobile-create`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await signed.user.getIdToken()}` }, body: JSON.stringify({ kind: 'immobilier', images: [image], isOwner: true, province: 'Estuaire', city: 'Libreville', district: 'Nzeng-Ayong', draft: { typeProperty: 'Studio', title: TITLE, description: 'Annonce DEV créée pour tester manuellement la modification, l’ajout et la suppression de photos dans l’application mobile.', price: 85000, area: 25, status: 'FOR_RENT', tags: ['TEST MOBILE'] } }) })
    const payload = await response.json()
    assert(response.ok && payload.success, payload.message || `Création refusée (${response.status}).`)
    console.log(JSON.stringify({ project: PROJECT, uid: user.uid, email: EMAIL, password: PASSWORD, propertyId: payload.id, title: TITLE }, null, 2))
  } finally { await deleteApp(clientApp) }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1 })
