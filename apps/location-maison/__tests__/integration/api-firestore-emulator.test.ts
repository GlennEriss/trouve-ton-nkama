/**
 * @jest-environment node
 */

import { getFirestore } from 'firebase-admin/firestore'

import firebaseCollectionNames from '@/constantes/firebase-collection-name'

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID ?? 'location-maison-dev'
const HAS_FIRESTORE_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const USER_UID = 'lot4e-announcer'

process.env.GCLOUD_PROJECT = PROJECT_ID
process.env.FIREBASE_PROJECT_ID = PROJECT_ID
if (HAS_FIRESTORE_EMULATOR) {
  process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST
}

let db: FirebaseFirestore.Firestore
let postVerifyCode: typeof import('@/app/api/credits/verify-code/route').POST
let postPromote: typeof import('@/app/api/property/promote/route').POST
let postCampaign: typeof import('@/app/api/advertising/campaigns/route').POST
let getCampaigns: typeof import('@/app/api/advertising/campaigns/route').GET
let postReel: typeof import('@/app/api/reels/route').POST
let patchReel: typeof import('@/app/api/reels/route').PATCH
let deleteReel: typeof import('@/app/api/reels/route').DELETE

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => payload,
    }),
  },
}))

jest.mock('@/next-auth/auth', () => ({
  auth: jest.fn(async () => ({ user: { uid: 'lot4e-announcer' } })),
}))

jest.mock('@/firebase/admin', () => {
  const admin = require('firebase-admin')
  const projectId = process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID ?? 'location-maison-dev'
  const appName = 'lot4e-firestore-emulator'
  const existingApp = admin.apps.find((app: { name: string }) => app?.name === appName)
  const adminApp = existingApp ?? admin.initializeApp({ projectId }, appName)

  return {
    adminApp,
    adminAuth: {
      verifyIdToken: jest.fn(async () => ({ uid: 'lot4e-announcer' })),
    },
  }
})

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

function makeRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  )

  return {
    headers: {
      get: (name: string) => normalizedHeaders.get(name.toLowerCase()) ?? null,
    },
    json: async () => body,
  } as any
}

function bearerRequest(body: Record<string, unknown>) {
  return makeRequest(body, { Authorization: 'Bearer emulator-token' })
}

async function clearFirestoreEmulator() {
  const response = await fetch(
    `http://${EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  )

  if (!response.ok) {
    throw new Error(`Firestore emulator cleanup failed with status ${response.status}`)
  }
}

async function seedAnnouncer(credits: number) {
  await db.collection(firebaseCollectionNames.users).doc(USER_UID).set({
    uid: USER_UID,
    roles: ['User', 'Announcer'],
    credits,
    state: 'IN_PROGRESS',
    metadata: {},
  })
}

async function countDocs(collectionName: string) {
  const snapshot = await db.collection(collectionName).get()
  return snapshot.size
}

(HAS_FIRESTORE_EMULATOR ? describe : describe.skip)('Lot 4E API avec Firestore emulator', () => {
  beforeAll(async () => {
    const adminModule = await import('@/firebase/admin')
    db = getFirestore(adminModule.adminApp as any)
    ;({ POST: postVerifyCode } = await import('@/app/api/credits/verify-code/route'))
    ;({ POST: postPromote } = await import('@/app/api/property/promote/route'))
    ;({ POST: postCampaign, GET: getCampaigns } = await import('@/app/api/advertising/campaigns/route'))
    ;({ POST: postReel, PATCH: patchReel, DELETE: deleteReel } = await import('@/app/api/reels/route'))
  })

  beforeEach(async () => {
    await clearFirestoreEmulator()
  })

  afterAll(async () => {
    const admin = require('firebase-admin')
    type AdminAppLike = { name?: string; delete: () => Promise<void> }
    await Promise.all(
      (admin.apps as Array<AdminAppLike | null>)
        .filter((app): app is AdminAppLike => app?.name === 'lot4e-firestore-emulator')
        .map((app) => app.delete()),
    )
  })

  it('credite un compte avec un code et bloque le rejeu concurrent', async () => {
    await seedAnnouncer(12)
    await db.collection('credit_payments').doc('payment-lot4e').set({
      code: 'LOT4E70',
      name: 'Pack Lot 4E',
      credits: 70,
      amount: 10_000,
      status: 'pending',
      phoneNumber: '077000000',
    })

    const [firstResponse, secondResponse] = await Promise.all([
      postVerifyCode(bearerRequest({ code: 'LOT4E70', amount: 10_000 })),
      postVerifyCode(bearerRequest({ code: 'LOT4E70', amount: 10_000 })),
    ])
    const firstPayload = await firstResponse.json()
    const secondPayload = await secondResponse.json()

    expect([firstResponse.status, secondResponse.status].sort()).toEqual([200, 400])
    expect([firstPayload.success, secondPayload.success].sort()).toEqual([false, true])

    const user = await db.collection(firebaseCollectionNames.users).doc(USER_UID).get()
    const payment = await db.collection('credit_payments').doc('payment-lot4e').get()
    const transactions = await db
      .collection(firebaseCollectionNames.credit_transactions)
      .where('uid', '==', USER_UID)
      .where('type', '==', 'purchase')
      .get()

    expect(user.data()?.credits).toBe(82)
    expect(payment.data()).toMatchObject({
      status: 'success',
      usedBy: USER_UID,
    })
    expect(transactions.size).toBe(1)
    expect(transactions.docs[0].data()).toMatchObject({
      credits: 70,
      amount: 10_000,
      status: 'success',
      paymentCodeId: 'payment-lot4e',
    })
  })

  it('debite une promotion boost une seule fois avec la meme cle idempotente', async () => {
    await seedAnnouncer(20)
    await db.collection(firebaseCollectionNames.properties).doc('property-lot4e').set({
      id: 'property-lot4e',
      createdBy: USER_UID,
      title: 'Studio Lot 4E',
      state: 'IN_PROGRESS',
      moderationStatus: 'APPROVED',
    })

    const body = { propertyId: 'property-lot4e', promotionType: 'boost' }
    const headers = { 'Idempotency-Key': 'lot4e-property-boost' }
    const [firstResponse, secondResponse] = await Promise.all([
      postPromote(makeRequest(body, headers)),
      postPromote(makeRequest(body, headers)),
    ])
    const firstPayload = await firstResponse.json()
    const secondPayload = await secondResponse.json()

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
    expect([firstPayload.replayed, secondPayload.replayed].sort()).toEqual([false, true])

    const user = await db.collection(firebaseCollectionNames.users).doc(USER_UID).get()
    const property = await db.collection(firebaseCollectionNames.properties).doc('property-lot4e').get()
    const transactions = await db
      .collection(firebaseCollectionNames.credit_transactions)
      .where('uid', '==', USER_UID)
      .where('propertyId', '==', 'property-lot4e')
      .get()

    expect(user.data()?.credits).toBe(17)
    expect(property.data()).toMatchObject({
      isPromoted: true,
      currentPromotion: expect.objectContaining({
        type: 'boost',
        creditsUsed: 3,
        isActive: true,
      }),
    })
    expect(transactions.size).toBe(1)
    expect(transactions.docs[0].data()).toMatchObject({
      type: 'spend',
      credits: -3,
      service: 'Boost',
      status: 'success',
    })
    expect(await countDocs(firebaseCollectionNames.idempotency_keys)).toBe(1)
  })

  it('publie une campagne publicitaire une seule fois et liste la campagne creee', async () => {
    await seedAnnouncer(100)

    const body = {
      packageId: 'brand',
      creative: {
        imageURL: 'https://example.com/lot4e-ad.png',
        headline: 'Campagne Lot 4E',
        body: 'Test reel des credits en emulateur.',
        ctaLabel: 'Contacter',
        ctaUrl: 'wa.me/24166545430',
      },
    }
    const headers = { 'Idempotency-Key': 'lot4e-ad-brand' }
    const [firstResponse, secondResponse] = await Promise.all([
      postCampaign(makeRequest(body, headers)),
      postCampaign(makeRequest(body, headers)),
    ])
    const firstPayload = await firstResponse.json()
    const secondPayload = await secondResponse.json()

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
    expect([firstPayload.replayed, secondPayload.replayed].sort()).toEqual([false, true])

    const user = await db.collection(firebaseCollectionNames.users).doc(USER_UID).get()
    const campaigns = await db
      .collection(firebaseCollectionNames.ad_campaigns)
      .where('createdBy', '==', USER_UID)
      .get()
    const transactions = await db
      .collection(firebaseCollectionNames.credit_transactions)
      .where('uid', '==', USER_UID)
      .where('campaignId', '==', firstPayload.campaignId)
      .get()
    const listResponse = await getCampaigns()
    const listPayload = await listResponse.json()

    expect(user.data()?.credits).toBe(30)
    expect(campaigns.size).toBe(1)
    expect(campaigns.docs[0].data()).toMatchObject({
      createdBy: USER_UID,
      status: 'active',
      billing: expect.objectContaining({
        mode: 'user_credits',
        paymentStatus: 'paid',
        creditsUsed: 70,
      }),
      creative: expect.objectContaining({
        imageURL: 'https://example.com/lot4e-ad.png',
        ctaUrl: 'https://wa.me/24166545430',
      }),
    })
    expect(transactions.size).toBe(1)
    expect(transactions.docs[0].data()).toMatchObject({
      type: 'spend',
      credits: -70,
      status: 'success',
    })
    expect(listResponse.status).toBe(200)
    expect(listPayload.campaigns).toHaveLength(1)
    expect(listPayload.campaigns[0]).toMatchObject({
      title: 'Campagne Lot 4E',
      creditsUsed: 70,
      imageURL: 'https://example.com/lot4e-ad.png',
    })
  })

  it('cree, modifie puis supprime un reel dans Firestore emulator', async () => {
    await seedAnnouncer(10)

    const reelId = 'reel-lot4e'
    const createBody = {
      reelId,
      propertyId: null,
      rawVideoPath: `reels-raw/${USER_UID}/${reelId}.mp4`,
      contact: '+24166545430',
      description: 'Visite rapide Lot 4E.',
    }

    const firstCreate = await postReel(bearerRequest(createBody))
    const secondCreate = await postReel(bearerRequest(createBody))
    expect(firstCreate.status).toBe(200)
    expect(secondCreate.status).toBe(409)

    const created = await db.collection(firebaseCollectionNames.reels).doc(reelId).get()
    expect(created.exists).toBe(true)
    expect(created.data()).toMatchObject({
      createdBy: USER_UID,
      propertyId: null,
      processingStatus: 'uploading',
      moderationStatus: 'PENDING',
      contact: '+24166545430',
      description: 'Visite rapide Lot 4E.',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
    })

    const updateResponse = await patchReel(bearerRequest({
      action: 'update-details',
      reelId,
      contact: '+24177000000',
      description: 'Description corrigee Lot 4E.',
    }))
    expect(updateResponse.status).toBe(200)

    const updated = await db.collection(firebaseCollectionNames.reels).doc(reelId).get()
    expect(updated.data()).toMatchObject({
      contact: '+24177000000',
      description: 'Description corrigee Lot 4E.',
    })

    const deleteResponse = await deleteReel(bearerRequest({ reelId }))
    const secondDeleteResponse = await deleteReel(bearerRequest({ reelId }))
    expect(deleteResponse.status).toBe(200)
    expect(secondDeleteResponse.status).toBe(200)

    const deleted = await db.collection(firebaseCollectionNames.reels).doc(reelId).get()
    expect(deleted.exists).toBe(false)
  })
})
