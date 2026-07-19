/* eslint-disable no-console */

const { randomBytes } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const { chromium } = require('@playwright/test')
const admin = require('firebase-admin')
const dotenv = require('dotenv')

const DEV_PROJECT_ID = 'location-maison-dev'
const AUTH_COOKIE_NAME = 'authjs.session-token'
const SUITE_NAME = 'lot8b-real-dev-property'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local.dev'), quiet: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertRealDevGuards() {
  const projects = [
    process.env.FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  ].filter(Boolean)

  assert(
    process.env.LOT8B_CONFIRM_REAL_DEV === '1',
    'Refus du test reel. Relancez avec LOT8B_CONFIRM_REAL_DEV=1.',
  )
  assert(
    projects.length === 2 && projects.every((projectId) => projectId === DEV_PROJECT_ID),
    `Refus absolu : ce test accepte uniquement ${DEV_PROJECT_ID}.`,
  )
  assert(
    !process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST,
    'Le Lot 8B reel doit viser Firebase dev, pas les emulateurs.',
  )
  assert(process.env.NEXTAUTH_SECRET, 'NEXTAUTH_SECRET est requis.')

  const email = process.env.LOT8B_USER_EMAIL?.trim().toLowerCase()
  assert(email, 'LOT8B_USER_EMAIL est requis pour selectionner le compte annonceur dev.')

  const baseURL = new URL(process.env.LOT8B_BASE_URL || 'http://127.0.0.1:3001')
  assert(baseURL.protocol === 'http:', 'Le serveur Lot 8B doit utiliser HTTP en local.')
  assert(
    baseURL.hostname === '127.0.0.1' || baseURL.hostname === 'localhost',
    'Le serveur Lot 8B doit ecouter uniquement en local.',
  )

  return { email, baseURL: baseURL.toString().replace(/\/$/, '') }
}

function initFirebaseAdmin() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
  assert(serviceAccount.clientEmail && serviceAccount.privateKey, 'Identifiants Firebase Admin dev incomplets.')

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })
  }

  return {
    db: admin.firestore(),
    bucket: admin.storage().bucket(),
  }
}

async function findAnnouncer(db, email) {
  const snapshot = await db.collection('users').where('email', '==', email).get()
  assert(snapshot.size === 1, `Le compte ${email} doit correspondre a un seul document dev.`)

  const document = snapshot.docs[0]
  const user = document.data()
  assert(user.uid === document.id, `UID/document incoherents pour ${email}.`)
  assert(Array.isArray(user.roles) && user.roles.includes('Announcer'), `${email} n'est pas annonceur.`)
  assert(
    user.firstname && user.lastname && user.phoneNumbers?.[0] && user.birthDate,
    `${email} doit avoir un profil dev complet pour le smoke test.`,
  )
  return user
}

async function createSessionToken(user) {
  const { encode } = await import('next-auth/jwt')
  return encode({
    secret: process.env.NEXTAUTH_SECRET,
    salt: AUTH_COOKIE_NAME,
    token: {
      user: {
        uid: user.uid,
        email: user.email,
        firstname: user.firstname || 'Lot 8B',
        lastname: user.lastname || 'Dev',
        roles: user.roles,
        phoneNumbers: user.phoneNumbers || ['+24166545430'],
        birthDate: user.birthDate,
        metadata: {
          ...(user.metadata || {}),
          needsProfileCompletion: false,
        },
      },
    },
  })
}

async function propertyDocumentsForRun(db, runId) {
  const titlePrefix = `LOT8B ${runId}`
  return db
    .collection('properties')
    .where('title', '>=', titlePrefix)
    .where('title', '<=', `${titlePrefix}\uf8ff`)
    .get()
}

async function waitForSingleProperty(db, runId, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const snapshot = await propertyDocumentsForRun(db, runId)
    if (snapshot.size === 1) return snapshot.docs[0]
    if (snapshot.size > 1) throw new Error(`Double creation detectee : ${snapshot.size} annonces.`)
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('Annonce Lot 8B absente de Firestore apres le delai imparti.')
}

async function waitForPropertyDeletion(db, propertyId, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!(await db.collection('properties').doc(propertyId).get()).exists) return
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error('La suppression UI ne s est pas propagee dans Firestore.')
}

async function cleanup({ db, bucket, runId, storagePaths }) {
  const snapshot = await propertyDocumentsForRun(db, runId)
  await Promise.all(snapshot.docs.map((document) => document.ref.delete()))

  const [files] = await bucket.getFiles({ prefix: 'property/' })
  const runFiles = files.filter(
    (file) => file.name.includes(runId) || storagePaths.includes(file.name),
  )
  await Promise.all(runFiles.map((file) => file.delete({ ignoreNotFound: true })))

  const remaining = await propertyDocumentsForRun(db, runId)
  assert(remaining.empty, 'Des annonces Lot 8B subsistent apres le nettoyage.')
  return { deletedDocuments: snapshot.size, deletedFiles: runFiles.length }
}

async function main() {
  const { email, baseURL } = assertRealDevGuards()
  const { db, bucket } = initFirebaseAdmin()
  const user = await findAnnouncer(db, email)
  const sessionToken = await createSessionToken(user)
  const runId = `${Date.now()}-${randomBytes(3).toString('hex')}`
  const initialTitle = `LOT8B ${runId} studio temporaire`
  const updatedTitle = `${initialTitle} modifie`
  const fixtureBuffer = await fs.readFile(path.resolve(__dirname, '..', 'public', 'apple-touch-icon.png'))
  const browser = await chromium.launch({ headless: true })
  let testError = null
  let propertyId = null
  let storagePaths = []

  console.log(`Lot 8B reel | projet=${DEV_PROJECT_ID} | run=${runId}`)

  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await context.addCookies([{
      name: AUTH_COOKIE_NAME,
      value: sessionToken,
      url: baseURL,
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    }])
    await context.addInitScript(({ run, title, contact }) => {
      localStorage.setItem('property_form_draft_studio', JSON.stringify({
        title,
        description: `Annonce temporaire du smoke test ${run}, supprimee automatiquement.`,
        area: 25,
        price: 40000,
        status: 'FOR_RENT',
        isOwner: true,
        tags: ['Calme'],
        address: {
          province: 'Estuaire',
          city: 'Libreville',
          district: 'Akébé Poteau',
        },
        contact,
        longitude: 9.45,
        latitude: 0.39,
        country: 'Gabon',
        countryCode: 'GA',
        isLocExact: false,
        testSuite: 'lot8b-real-dev-property',
        testRunId: run,
      }))
    }, {
      run: runId,
      title: initialTitle,
      contact: user.phoneNumbers?.[0] || '+24166545430',
    })

    const page = await context.newPage()
    await page.route('https://www.google-analytics.com/**', (route) => route.abort())
    await page.route('https://www.googletagmanager.com/**', (route) => route.abort())
    await page.goto(`${baseURL}/property/add/studio`, { waitUntil: 'domcontentloaded', timeout: 45_000 })

    await page.getByLabel("Titre de l'annonce").waitFor({ state: 'visible', timeout: 20_000 })
    await page.getByLabel('Ajouter des images du bien').setInputFiles({
      name: `lot8b-${runId}.png`,
      mimeType: 'image/png',
      buffer: fixtureBuffer,
    })
    await page.getByText('1/10 images').waitFor({ state: 'visible', timeout: 20_000 })

    await page.getByRole('button', { name: /^Suivant$/i }).click()
    await page.getByText('Numéro du studio', { exact: true }).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: /^Suivant$/i }).click()
    await page.getByText('Localisation du bien', { exact: true }).first().waitFor({ state: 'visible' })

    const submit = page.getByRole('button', { name: /^Enregistrer$/i })
    await submit.evaluate((button) => {
      button.click()
      button.click()
    })
    await page.waitForURL(/\/property\?submitted=1$/, { timeout: 90_000 })

    const createdDocument = await waitForSingleProperty(db, runId)
    propertyId = createdDocument.id
    const created = createdDocument.data()
    assert(created.createdBy === user.uid, 'L annonce a ete rattachee au mauvais utilisateur.')
    assert(created.moderationStatus === 'PENDING', 'La creation reelle doit rester PENDING.')
    assert(Array.isArray(created.images) && created.images.length === 1, 'L image reelle est absente du document.')
    storagePaths = created.images.flatMap((image) => [image.filePATH, image.thumbPATH].filter(Boolean))
    console.log('PASS creation reelle, upload Storage et double clic limite a un document')

    await page.goto(`${baseURL}/property/modify/${propertyId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    })
    const titleInput = page.getByLabel("Titre de l'annonce")
    await titleInput.waitFor({ state: 'visible', timeout: 30_000 })
    await titleInput.fill(updatedTitle)
    await page.getByRole('button', { name: /^Suivant$/i }).click()
    await page.getByRole('button', { name: /^Suivant$/i }).click()
    await page.getByRole('button', { name: /^Modifier$/i }).click()
    await page.waitForURL(/\/property$/, { timeout: 90_000 })

    const updated = (await db.collection('properties').doc(propertyId).get()).data()
    assert(updated?.title === updatedTitle, 'Le titre modifie n a pas ete persiste.')
    assert(updated?.moderationStatus === 'PENDING', 'La modification a contourne la moderation.')
    console.log('PASS modification reelle et moderation conservee')

    await page.getByPlaceholder(/Titre, description, ville, quartier/i).fill(updatedTitle)
    await page.getByRole('heading', { name: updatedTitle }).waitFor({ state: 'visible', timeout: 30_000 })
    await page.getByRole('button', { name: /^Supprimer$/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^Supprimer$/i }).click()
    await waitForPropertyDeletion(db, propertyId)
    console.log('PASS suppression reelle depuis Mes annonces')

    await context.close()
  } catch (error) {
    testError = error
  } finally {
    await browser.close()
    const cleanupSummary = await cleanup({ db, bucket, runId, storagePaths })
    console.log(
      `Nettoyage | documents=${cleanupSummary.deletedDocuments} | fichiers=${cleanupSummary.deletedFiles}`,
    )
  }

  if (testError) throw testError
  console.log(`Lot 8B reel PASS | property=${propertyId}`)
}

main().catch((error) => {
  console.error(`Lot 8B reel FAIL: ${error.stack || error.message}`)
  process.exitCode = 1
})
