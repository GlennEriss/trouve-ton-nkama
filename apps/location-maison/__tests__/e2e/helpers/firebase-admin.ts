/**
 * Admin SDK helper for e2e tests that need to provision/clean up real data
 * (not mocked) around a test run — e.g. deleting a Firebase test-phone-number
 * account before a signup journey so the flow is exercised fresh every run.
 *
 * Self-contained: loads its own env (mirrors scripts/firebase/firestore-admin.js)
 * instead of depending on playwright.config.ts having already populated
 * process.env in this worker process.
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import * as admin from 'firebase-admin'

let initialized = false

function ensureAdminApp() {
  if (initialized) return admin.app()

  const envFile = `.env.local.${process.env.E2E_ENV || 'dev'}`
  loadEnv({ path: path.resolve(process.cwd(), envFile) })

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n'),
      } as admin.ServiceAccount),
    })
  }
  initialized = true
  return admin.app()
}

/**
 * Deletes the Firebase Auth user (and matching Firestore `users/{uid}` doc)
 * for a phone number, if one exists. Used before a signup e2e test so the
 * test phone number is always a fresh account — Firebase reuses the same uid
 * for a given test number across runs, so without this cleanup only the
 * first-ever run exercises the real "new account → /complete-profile" path.
 */
export async function deleteAccountByPhoneNumber(phoneE164: string): Promise<void> {
  const app = ensureAdminApp()
  const auth = admin.auth(app)

  let uid: string
  try {
    const user = await auth.getUserByPhoneNumber(phoneE164)
    uid = user.uid
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'auth/user-not-found') return
    throw err
  }

  await admin.firestore(app).collection('users').doc(uid).delete()
  await auth.deleteUser(uid)
}

/**
 * Creates a Firestore `users/{uid}` doc shaped exactly like a fresh phone
 * signup (mirrors createMinimalPhoneUser in phone-auth.service.ts), WITHOUT
 * going through real Firebase Phone Auth. Paired with a forged NextAuth
 * session cookie for the same uid (see helpers/auth.ts), this lands directly
 * on /complete-profile — for iterating on that form without Firebase's
 * non-deterministic reCAPTCHA gate in the loop.
 */
export async function provisionIncompletePhoneUser(uid: string, phone: string): Promise<void> {
  const app = ensureAdminApp()
  const now = admin.firestore.Timestamp.now()
  await admin
    .firestore(app)
    .collection('users')
    .doc(uid)
    .set({
      uid,
      login: phone,
      firstname: '',
      lastname: '',
      email: null,
      phoneNumbers: [phone],
      phoneNumberVerified: true,
      roles: ['User', 'Announcer'],
      emailVerified: false,
      providers: ['PHONE'],
      metadata: { needsProfileCompletion: true },
      favoris: [],
      credits: 3,
      state: 'IN_PROGRESS',
      createdAt: now,
      updatedAt: now,
    })
}

/** Deletes a Firestore `users/{uid}` doc directly (no matching Firebase Auth user expected). */
export async function deleteUserDoc(uid: string): Promise<void> {
  const app = ensureAdminApp()
  await admin.firestore(app).collection('users').doc(uid).delete()
}

/** Deletes the Firebase Auth user (and matching Firestore `users/{uid}` doc) for an email, if one exists. */
export async function deleteAccountByEmail(email: string): Promise<void> {
  const app = ensureAdminApp()
  const auth = admin.auth(app)

  let uid: string
  try {
    const user = await auth.getUserByEmail(email)
    uid = user.uid
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'auth/user-not-found') return
    throw err
  }

  await admin.firestore(app).collection('users').doc(uid).delete()
  await auth.deleteUser(uid)
}

export type SeedProperty = {
  id: string
  title: string
  description: string
  typeProperty: string
  status: 'FOR_RENT' | 'FOR_SALE'
  state: 'IN_PROGRESS' | 'ARCHIVED'
  moderationStatus: 'APPROVED'
  price: number
  area: number
  province: string
  city: string
  street: string
}

/**
 * Writes real `properties/{id}` docs directly via Admin SDK, all owned by the
 * same `createdBy` uid — so /api/announcer/ads (which queries Firestore for
 * `createdBy == uid`, then filters/sorts server-side in memory) has real data
 * to search and filter against. No network mocking: exercises the real
 * server-side filter logic in src/app/api/announcer/ads/route.ts.
 */
export async function seedProperties(createdBy: string, properties: SeedProperty[]): Promise<void> {
  const app = ensureAdminApp()
  const db = admin.firestore(app)
  const now = admin.firestore.Timestamp.now()

  await Promise.all(
    properties.map(({ id, ...data }) =>
      db
        .collection('properties')
        .doc(id)
        .set({
          ...data,
          createdBy,
          images: [],
          currentPromotion: null,
          createdAt: now,
          updatedAt: now,
          sortTimestamp: now,
        }),
    ),
  )
}

/** Deletes `properties/{id}` docs by id. */
export async function deleteProperties(ids: string[]): Promise<void> {
  const app = ensureAdminApp()
  const db = admin.firestore(app)
  await Promise.all(ids.map((id) => db.collection('properties').doc(id).delete()))
}

/**
 * Creates a real `users/{uid}` doc with a starting credits balance. Needed
 * for /api/property/promote, which queries Firestore for the real user doc
 * (`where('uid', '==', uid)`) and debits `credits` inside a transaction —
 * unlike most other routes here, this one is not satisfied by the forged
 * NextAuth session alone.
 */
export async function seedAnnouncerUser(uid: string, credits: number): Promise<void> {
  const app = ensureAdminApp()
  const db = admin.firestore(app)
  const now = admin.firestore.Timestamp.now()
  await db
    .collection('users')
    .doc(uid)
    .set({
      uid,
      firstname: 'Test',
      lastname: 'Announcer',
      email: `${uid}@example.com`,
      roles: ['User', 'Announcer'],
      credits,
      favoris: [],
      providers: ['CREDENTIALS'],
      createdAt: now,
      updatedAt: now,
    })
}
