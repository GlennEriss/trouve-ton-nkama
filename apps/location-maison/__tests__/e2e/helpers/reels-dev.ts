import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore'

const DEV_PROJECT_ID = 'location-maison-dev'

export type Lot8DSeed = {
  uid: string
  reelIds: {
    edit: string
    remove: string
    processing: string
  }
  db: Firestore
  cleanup: () => Promise<void>
}

function requireDevAdminApp(): App {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId !== DEV_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== DEV_PROJECT_ID) {
    throw new Error(`Lot 8D refusé : le projet doit être ${DEV_PROJECT_ID}.`)
  }
  if (!clientEmail || !privateKey) {
    throw new Error('Lot 8D refusé : identifiants Firebase Admin Dev incomplets.')
  }

  const appName = 'lot8d-e2e-dev'
  return getApps().find((app) => app.name === appName) ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  }, appName)
}

export async function seedLot8DReels(runId: string): Promise<Lot8DSeed> {
  const db = getFirestore(requireDevAdminApp())
  const uid = `announcer-e2e-lot8d-${runId}`
  const reelIds = {
    edit: `lot8d-edit-${runId}`,
    remove: `lot8d-delete-${runId}`,
    processing: `lot8d-processing-${runId}`,
  }
  const now = Date.now()

  await db.collection('users').doc(uid).set({
    uid,
    firstname: 'Glenn',
    lastname: 'Lot 8D',
    email: `${uid}@example.test`,
    roles: ['User', 'Announcer'],
    phoneNumbers: ['+24166545430'],
    phoneNumberVerified: true,
    credits: 169,
    state: 'IN_PROGRESS',
    metadata: { needsProfileCompletion: false },
    createdAt: Timestamp.fromMillis(now - 86_400_000),
    updatedAt: Timestamp.fromMillis(now),
  })

  const common = {
    createdBy: uid,
    propertyId: null,
    rawVideoPath: '',
    state: 'IN_PROGRESS',
    contact: '+24166545430',
    viewCount: 0,
    likeCount: 0,
    shareCount: 0,
    giftCount: 0,
    giftTotalAmount: 0,
    updatedAt: Timestamp.fromMillis(now),
  }

  await Promise.all([
    db.collection('reels').doc(reelIds.edit).set({
      ...common,
      description: 'Studio lumineux à modifier pendant le test.',
      processingStatus: 'ready',
      moderationStatus: 'APPROVED',
      thumbnailUrl: '/apple-touch-icon.png',
      viewCount: 120,
      likeCount: 12,
      shareCount: 5,
      createdAt: Timestamp.fromMillis(now - 3_000),
    }),
    db.collection('reels').doc(reelIds.remove).set({
      ...common,
      description: 'Réel destiné au test de suppression.',
      processingStatus: 'ready',
      moderationStatus: 'PENDING',
      viewCount: 8,
      likeCount: 2,
      shareCount: 1,
      createdAt: Timestamp.fromMillis(now - 2_000),
    }),
    db.collection('reels').doc(reelIds.processing).set({
      ...common,
      description: 'Réel en cours de traitement.',
      processingStatus: 'processing',
      moderationStatus: 'PENDING',
      createdAt: Timestamp.fromMillis(now - 1_000),
    }),
  ])

  return {
    uid,
    reelIds,
    db,
    cleanup: async () => {
      await Promise.all([
        ...Object.values(reelIds).map((reelId) => db.collection('reels').doc(reelId).delete()),
        db.collection('users').doc(uid).delete(),
      ])
    },
  }
}
