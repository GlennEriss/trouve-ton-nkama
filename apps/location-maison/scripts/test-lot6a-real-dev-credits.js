/* eslint-disable no-console */

const { createHash, randomBytes } = require('node:crypto')
const path = require('node:path')

const admin = require('firebase-admin')
const dotenv = require('dotenv')

const DEV_PROJECT_ID = 'location-maison-dev'
const SUITE_NAME = 'lot6a-real-dev-credits'
const AUTH_COOKIE_NAME = 'authjs.session-token'
const AD_COST = 15
const BOOST_COST = 3

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
    process.env.LOT6A_CONFIRM_REAL_DEV === '1',
    'Refus du test reel. Relancez avec LOT6A_CONFIRM_REAL_DEV=1.',
  )
  assert(configuredProjects.length === 2, 'Les identifiants Firebase dev sont incomplets.')
  assert(
    configuredProjects.every((projectId) => projectId === DEV_PROJECT_ID),
    `Refus absolu : ce test accepte uniquement ${DEV_PROJECT_ID}.`,
  )
  assert(
    !process.env.FIRESTORE_EMULATOR_HOST && !process.env.FIREBASE_AUTH_EMULATOR_HOST,
    'Le Lot 6A doit viser Firebase dev reel, pas les emulateurs.',
  )

  const baseURL = new URL(process.env.LOT6A_BASE_URL || 'http://127.0.0.1:3001')
  assert(baseURL.protocol === 'http:', 'Le serveur Lot 6A doit etre local et utiliser HTTP.')
  assert(
    baseURL.hostname === '127.0.0.1' || baseURL.hostname === 'localhost',
    'Le serveur Lot 6A doit ecouter uniquement en local.',
  )

  const email = process.env.LOT6A_USER_EMAIL?.trim().toLowerCase()
  assert(email, 'LOT6A_USER_EMAIL est requis pour selectionner le compte annonceur dev.')
  assert(process.env.NEXTAUTH_SECRET, 'NEXTAUTH_SECRET est requis pour la session du smoke test.')

  return { baseURL: baseURL.toString().replace(/\/$/, ''), email }
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

function idempotencyDocumentId(scope, uid, key) {
  return createHash('sha256').update(`${scope}:${uid}:${key}`).digest('hex')
}

async function findSingleUser(db, email) {
  const snapshot = await db.collection('users').where('email', '==', email).get()
  assert(snapshot.size === 1, `Le compte ${email} doit correspondre a un seul document dev.`)

  const document = snapshot.docs[0]
  const data = document.data()
  assert(data.uid === document.id, `UID/document incoherents pour ${email}.`)
  assert(Array.isArray(data.roles) && data.roles.includes('Announcer'), `${email} n'est pas annonceur.`)

  return { document, data }
}

async function createSessionCookie(user) {
  const { encode } = await import('next-auth/jwt')
  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET,
    salt: AUTH_COOKIE_NAME,
    token: {
      user: {
        uid: user.uid,
        email: user.email,
        firstname: user.firstname || 'Lot 6A',
        lastname: user.lastname || 'Dev',
        roles: user.roles,
      },
    },
  })

  return `${AUTH_COOKIE_NAME}=${token}`
}

async function requestJSON(baseURL, cookie, pathname, init = {}) {
  const response = await fetch(`${baseURL}${pathname}`, {
    ...init,
    headers: {
      accept: 'application/json',
      cookie,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text.slice(0, 500) }
  }
  return { status: response.status, body }
}

async function postTwice(baseURL, cookie, pathname, body, idempotencyKey) {
  const send = () => requestJSON(baseURL, cookie, pathname, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
  })

  return Promise.all([send(), send()])
}

function assertIdempotentPair(responses, label) {
  assert(
    responses.every((response) => response.status === 200 && response.body?.success === true),
    `${label}: les deux requetes doivent reussir (${responses.map((response) => response.status).join(', ')}).`,
  )
  assert(
    responses.map((response) => response.body.replayed).sort().join(',') === 'false,true',
    `${label}: une seule requete doit etre marquee comme rejouee.`,
  )
}

async function getCredits(userRef) {
  return Number((await userRef.get()).data()?.credits ?? 0)
}

async function queryTransactions(db, field, value) {
  return db.collection('credit_transactions').where(field, '==', value).get()
}

async function cleanupRun(context) {
  const {
    db,
    userRef,
    initialCredits,
    propertyRef,
    campaignTitle,
    adIdempotencyRef,
    promotionIdempotencyRef,
  } = context

  const [adIdempotency, promotionIdempotency] = await Promise.all([
    adIdempotencyRef.get(),
    promotionIdempotencyRef.get(),
  ])

  const campaignIds = new Set()
  const idempotentCampaignId = adIdempotency.data()?.response?.campaignId
  if (typeof idempotentCampaignId === 'string') campaignIds.add(idempotentCampaignId)

  const campaignsByTitle = await db.collection('ad_campaigns').where('title', '==', campaignTitle).get()
  campaignsByTitle.docs.forEach((document) => campaignIds.add(document.id))

  const transactionDocuments = new Map()
  const propertyTransactions = await queryTransactions(db, 'propertyId', propertyRef.id)
  propertyTransactions.docs.forEach((document) => transactionDocuments.set(document.id, document))

  for (const campaignId of campaignIds) {
    const campaignTransactions = await queryTransactions(db, 'campaignId', campaignId)
    campaignTransactions.docs.forEach((document) => transactionDocuments.set(document.id, document))
  }

  const creditsToRestore = [...transactionDocuments.values()].reduce((total, document) => {
    const spent = Number(document.data().credits ?? 0)
    return total + (spent < 0 ? Math.abs(spent) : 0)
  }, 0)

  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef)
    assert(userSnapshot.exists, 'Le compte dev a disparu pendant le nettoyage.')

    const currentCredits = Number(userSnapshot.data()?.credits ?? 0)
    transaction.update(userRef, {
      credits: currentCredits + creditsToRestore,
      updatedAt: admin.firestore.Timestamp.now(),
    })
    transaction.delete(propertyRef)
    transaction.delete(adIdempotencyRef)
    transaction.delete(promotionIdempotencyRef)
    transactionDocuments.forEach((document) => transaction.delete(document.ref))
    campaignIds.forEach((campaignId) => transaction.delete(db.collection('ad_campaigns').doc(campaignId)))
  })

  const finalCredits = await getCredits(userRef)
  assert(
    finalCredits === initialCredits,
    `Nettoyage incomplet : solde initial ${initialCredits}, solde final ${finalCredits}.`,
  )

  const [propertyAfter, adKeyAfter, promotionKeyAfter] = await Promise.all([
    propertyRef.get(),
    adIdempotencyRef.get(),
    promotionIdempotencyRef.get(),
  ])
  assert(!propertyAfter.exists && !adKeyAfter.exists && !promotionKeyAfter.exists, 'Des documents Lot 6A subsistent.')

  return {
    restoredCredits: creditsToRestore,
    deletedCampaigns: campaignIds.size,
    deletedTransactions: transactionDocuments.size,
    finalCredits,
  }
}

async function main() {
  const { baseURL, email } = assertRealDevGuards()
  const db = initFirestore()
  const runId = `${Date.now()}-${randomBytes(3).toString('hex')}`
  const adKey = `lot6a-ad-${runId}`
  const promotionKey = `lot6a-boost-${runId}`
  const campaignTitle = `LOT6A ${runId} - Publicite credits reels`

  const { document: userDocument, data: user } = await findSingleUser(db, email)
  const userRef = userDocument.ref
  const initialCredits = Number(user.credits ?? 0)
  assert(initialCredits >= AD_COST + BOOST_COST, `Solde insuffisant : ${initialCredits} credits.`)

  const propertyRef = db.collection('properties').doc(`lot6a-${runId}-property`)
  const adIdempotencyRef = db
    .collection('idempotency_keys')
    .doc(idempotencyDocumentId('advertising_campaign_create', user.uid, adKey))
  const promotionIdempotencyRef = db
    .collection('idempotency_keys')
    .doc(idempotencyDocumentId('property_promote', user.uid, promotionKey))
  const cleanupContext = {
    db,
    userRef,
    initialCredits,
    propertyRef,
    campaignTitle,
    adIdempotencyRef,
    promotionIdempotencyRef,
  }

  let testError = null
  let cleanupSummary = null

  console.log(`Lot 6A | projet=${DEV_PROJECT_ID} | run=${runId} | solde initial=${initialCredits}`)

  try {
    await propertyRef.create({
      id: propertyRef.id,
      createdBy: user.uid,
      title: `Annonce temporaire Lot 6A ${runId}`,
      state: 'IN_PROGRESS',
      moderationStatus: 'APPROVED',
      testSuite: SUITE_NAME,
      testRunId: runId,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    })

    const cookie = await createSessionCookie(user)
    const initialBalanceResponse = await requestJSON(baseURL, cookie, '/api/credits/balance')
    assert(initialBalanceResponse.status === 200, `API balance indisponible (${initialBalanceResponse.status}).`)
    assert(initialBalanceResponse.body?.credits === initialCredits, 'Le solde HTTP initial differe de Firestore dev.')
    console.log('PASS session reelle et solde HTTP/Firestore coherents')

    const advertisingBody = {
      title: campaignTitle,
      packageId: 'discovery',
      creative: {
        imageURL: 'https://placehold.co/1200x630/0f766e/ffffff/png?text=LOT6A',
        headline: 'Campagne de validation Lot 6A',
        body: 'Publication temporaire pour valider les credits reels en dev.',
        ctaLabel: 'Voir le test',
        ctaUrl: 'https://songo-game.com/download',
      },
    }
    const adResponses = await postTwice(
      baseURL,
      cookie,
      '/api/advertising/campaigns',
      advertisingBody,
      adKey,
    )
    assertIdempotentPair(adResponses, 'Publicite')
    const campaignIds = new Set(adResponses.map((response) => response.body.campaignId))
    assert(campaignIds.size === 1, 'Publicite: deux campagnes differentes ont ete creees.')
    const campaignId = [...campaignIds][0]
    assert(await getCredits(userRef) === initialCredits - AD_COST, 'Le debit publicite doit etre unique et valoir 15.')

    const campaignSnapshot = await db.collection('ad_campaigns').doc(campaignId).get()
    const adTransactions = await queryTransactions(db, 'campaignId', campaignId)
    assert(campaignSnapshot.exists, 'La campagne reelle est absente de Firestore dev.')
    assert(campaignSnapshot.data()?.createdBy === user.uid, 'La campagne appartient au mauvais annonceur.')
    assert(campaignSnapshot.data()?.billing?.creditsUsed === AD_COST, 'Le cout de campagne enregistre est incorrect.')
    assert(adTransactions.size === 1, 'La publicite doit produire une seule transaction de credits.')
    assert(Number(adTransactions.docs[0].data().credits) === -AD_COST, 'La transaction publicite vaut autre chose que -15.')
    console.log('PASS publication reelle, debit de 15 credits et rejeu concurrent idempotent')

    const promotionBody = { propertyId: propertyRef.id, promotionType: 'boost' }
    const promotionResponses = await postTwice(
      baseURL,
      cookie,
      '/api/property/promote',
      promotionBody,
      promotionKey,
    )
    assertIdempotentPair(promotionResponses, 'Boost')
    const promotionTransactionIds = new Set(
      promotionResponses.map((response) => response.body.transactionId),
    )
    assert(promotionTransactionIds.size === 1, 'Boost: deux transactions differentes ont ete creees.')
    assert(
      await getCredits(userRef) === initialCredits - AD_COST - BOOST_COST,
      'Le debit cumule publicite + boost doit valoir 18 credits.',
    )

    const promotedProperty = await propertyRef.get()
    const promotionTransactions = await queryTransactions(db, 'propertyId', propertyRef.id)
    assert(promotedProperty.data()?.currentPromotion?.type === 'boost', "Le boost reel n'est pas actif.")
    assert(promotionTransactions.size === 1, 'Le boost doit produire une seule transaction de credits.')
    assert(Number(promotionTransactions.docs[0].data().credits) === -BOOST_COST, 'La transaction boost vaut autre chose que -3.')
    console.log('PASS boost reel, debit de 3 credits et rejeu concurrent idempotent')

    const mismatchResponse = await requestJSON(baseURL, cookie, '/api/advertising/campaigns', {
      method: 'POST',
      headers: { 'Idempotency-Key': adKey },
      body: JSON.stringify({
        ...advertisingBody,
        creative: { ...advertisingBody.creative, headline: 'Contenu volontairement different' },
      }),
    })
    assert(
      mismatchResponse.status === 409 && mismatchResponse.body?.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH',
      'Une cle reutilisee avec un autre payload doit etre refusee en 409.',
    )
    assert(
      await getCredits(userRef) === initialCredits - AD_COST - BOOST_COST,
      'Le payload divergent a provoque un debit supplementaire.',
    )
    console.log('PASS payload divergent refuse sans debit supplementaire')

    const [balanceResponse, historyResponse] = await Promise.all([
      requestJSON(baseURL, cookie, '/api/credits/balance'),
      requestJSON(baseURL, cookie, '/api/credits/history?type=spend&limit=50'),
    ])
    assert(balanceResponse.status === 200, "Le solde final n'est pas lisible via l'API.")
    assert(
      balanceResponse.body?.credits === initialCredits - AD_COST - BOOST_COST,
      'Le solde visible ne correspond pas au solde Firestore apres debits.',
    )
    assert(historyResponse.status === 200, "L'historique reel n'est pas lisible via l'API.")
    const historyIds = new Set((historyResponse.body?.transactions || []).map((transaction) => transaction.id))
    assert(historyIds.has(adTransactions.docs[0].id), "La transaction publicite manque dans l'historique API.")
    assert(historyIds.has(promotionTransactions.docs[0].id), "La transaction boost manque dans l'historique API.")
    console.log('PASS solde et historique API conformes aux documents Firestore dev')
  } catch (error) {
    testError = error
  } finally {
    try {
      cleanupSummary = await cleanupRun(cleanupContext)
      console.log(
        `CLEANUP credits restaures=${cleanupSummary.restoredCredits}, campagnes=${cleanupSummary.deletedCampaigns}, transactions=${cleanupSummary.deletedTransactions}`,
      )
    } catch (cleanupError) {
      if (testError) {
        testError = new AggregateError([testError, cleanupError], 'Le test et son nettoyage ont echoue.')
      } else {
        testError = cleanupError
      }
    }
  }

  if (testError) throw testError

  console.log(`PASS Lot 6A termine | solde restaure=${cleanupSummary.finalCredits} | aucune donnee de test restante`)
}

main()
  .catch((error) => {
    console.error('FAIL Lot 6A:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await Promise.all(admin.apps.map((app) => app.delete()))
  })
