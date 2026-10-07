/* eslint-disable no-console */
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const admin = require('firebase-admin')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local.dev'), quiet: true })

const DEV_PROJECT_ID = 'location-maison-dev'
const action = process.argv[2]
const uidToDelete = process.argv[3]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function initialize() {
  assert(process.env.MOBILE_E2E_CONFIRM_REAL_DEV === '1', 'Relancez avec MOBILE_E2E_CONFIRM_REAL_DEV=1.')
  assert(process.env.FIREBASE_PROJECT_ID === DEV_PROJECT_ID, `Projet Firebase interdit : ${process.env.FIREBASE_PROJECT_ID}.`)
  const credential = admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  })
  return admin.apps[0] || admin.initializeApp({ credential })
}

async function setup(app) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`
  const email = `mobile-e2e-${suffix}@example.test`
  const password = `TtnE2e${randomUUID().replace(/-/g, '').slice(0, 14)}9`
  const user = await admin.auth(app).createUser({ email, password, emailVerified: true, displayName: 'Mobile E2E' })
  try {
    await admin.firestore(app).collection('users').doc(user.uid).set({
      email,
      firstName: 'Mobile',
      lastName: 'E2E',
      pseudo: `mobile-e2e-${suffix}`,
      roles: ['Announcer'],
      callNumber: '+24106000000',
      phoneNumbers: ['+24106000000'],
      phoneNumberVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      e2e: true,
    })
  } catch (error) {
    await admin.auth(app).deleteUser(user.uid).catch(() => undefined)
    throw error
  }
  console.log(JSON.stringify({ uid: user.uid, email, password }))
}

async function cleanup(app) {
  assert(uidToDelete && /^[A-Za-z0-9_-]{10,128}$/.test(uidToDelete), 'UID E2E invalide.')
  const userRef = admin.firestore(app).collection('users').doc(uidToDelete)
  const snapshot = await userRef.get()
  assert(snapshot.exists && snapshot.data()?.e2e === true, 'Refus de supprimer un compte qui n’est pas marqué E2E.')
  await userRef.delete()
  await admin.auth(app).deleteUser(uidToDelete)
  console.log(JSON.stringify({ deleted: uidToDelete }))
}

async function main() {
  assert(action === 'setup' || action === 'cleanup', 'Action attendue : setup ou cleanup.')
  const app = initialize()
  if (action === 'setup') await setup(app)
  else await cleanup(app)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
