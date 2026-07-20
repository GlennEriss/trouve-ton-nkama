import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore'

const DEV_PROJECT_ID = 'location-maison-dev'

export type Lot8ESearchSeed = {
  propertyId: string
  ownerId: string
  db: Firestore
  hit: Record<string, unknown>
  cleanup: () => Promise<void>
}

function requireDevAdminApp(): App {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId !== DEV_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== DEV_PROJECT_ID) {
    throw new Error(`Lot 8E refusé : le projet doit être ${DEV_PROJECT_ID}.`)
  }
  if (!clientEmail || !privateKey) {
    throw new Error('Lot 8E refusé : identifiants Firebase Admin Dev incomplets.')
  }

  const appName = 'lot8e-e2e-dev'
  return getApps().find((app) => app.name === appName) ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  }, appName)
}

export async function seedLot8ESearch(runId: string): Promise<Lot8ESearchSeed> {
  const db = getFirestore(requireDevAdminApp())
  const propertyId = `lot8e-property-${runId}`
  const ownerId = `lot8e-owner-${runId}`
  const now = Date.now()
  const title = `Studio Lot 8E ${runId}`
  const description = 'Studio lumineux et calme à Akébé, proche des commerces.'

  await db.collection('users').doc(ownerId).set({
    uid: ownerId,
    firstname: 'Annonceur',
    lastname: 'Lot 8E',
    email: `${ownerId}@example.test`,
    roles: ['User', 'Announcer'],
    phoneNumbers: ['+24166545430'],
    phoneNumberVerified: true,
    state: 'IN_PROGRESS',
    createdAt: Timestamp.fromMillis(now - 86_400_000),
    updatedAt: Timestamp.fromMillis(now),
  })

  const property = {
    title,
    description,
    typeProperty: 'Studio',
    status: 'FOR_RENT',
    state: 'IN_PROGRESS',
    moderationStatus: 'APPROVED',
    price: 40000,
    area: 28,
    nbrRooms: 1,
    nbrBathrooms: 1,
    street: 'Akébé Poteau',
    city: 'Libreville',
    province: 'Estuaire',
    countryCode: 'GA',
    contact: '+24166545430',
    images: [],
    tags: ['Courant inclus'],
    additionnalInformation: '',
    latitude: 0.3901,
    longitude: 9.4544,
    createdBy: ownerId,
    createdAt: Timestamp.fromMillis(now - 60_000),
    updatedAt: Timestamp.fromMillis(now),
  }

  await db.collection('properties').doc(propertyId).set(property)

  return {
    propertyId,
    ownerId,
    db,
    hit: {
      ...property,
      objectID: propertyId,
      createdAt: { seconds: Math.floor((now - 60_000) / 1000), nanoseconds: 0 },
      updatedAt: { seconds: Math.floor(now / 1000), nanoseconds: 0 },
    },
    cleanup: async () => {
      await Promise.all([
        db.collection('property_statistics').doc(propertyId).delete().catch(() => undefined),
        db.collection('properties').doc(propertyId).delete(),
        db.collection('users').doc(ownerId).delete(),
      ])
    },
  }
}
