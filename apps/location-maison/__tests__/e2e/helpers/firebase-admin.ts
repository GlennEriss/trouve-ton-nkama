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
  moderationStatus: 'APPROVED' | 'PENDING' | 'REJECTED'
  price: number
  area: number
  province: string
  city: string
  street: string
  // Optionnel : requis par SimpleMap.tsx (L.marker([latitude, longitude])) — sans, la page
  // preview/modifier plante avec "Invalid LatLng object". Le vrai flux de création
  // immobilier renseigne toujours ces deux champs.
  latitude?: number
  longitude?: number
  // Optionnel : uniquement pertinent avec moderationStatus 'REJECTED'.
  rejectionReason?: string
  // Optionnel : le vrai flux de création immobilier renseigne toujours ce champ (même vide),
  // contrairement au TS `Property.tags` non-optionnel qui le laisse croire garanti partout —
  // PreviewProperty.tsx fait `property.tags.map(...)` sans garde. Défaut `[]` ci-dessous pour
  // les seeds qui n'ont pas besoin de le préciser explicitement.
  tags?: string[]
  // Optionnel : un backfill en prod (2026-08-17) a posé categoryId sur ~949/950 annonces,
  // immobilier comprises (voir le commentaire de resolveScope() dans
  // /api/announcer/ads/route.ts) — categoryId seul n'est donc PAS un discriminant fiable
  // immobilier/Mode. Permet de reproduire cette donnée réaliste dans un seed de test.
  categoryId?: string
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
    properties.map(({ id, tags, ...data }) =>
      db
        .collection('properties')
        .doc(id)
        .set({
          ...data,
          tags: tags ?? [],
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

export type SeedCategoryListing = {
  id: string
  title: string
  description: string
  price: number
  province: string
  city: string
  categoryId: string
  categoryLeaf: string
  attributes?: Record<string, string>
  // Optionnel, défaut 'IN_PROGRESS' — pour reproduire une annonce déjà archivée (tests de
  // désarchivage) sans avoir à la repatcher séparément après le seed.
  state?: 'IN_PROGRESS' | 'ARCHIVED'
}

/**
 * Écrit une annonce "Mode" (hors immobilier) réaliste : PAS de `typeProperty` (le
 * discriminant utilisé partout — resolveScope() dans /api/announcer/ads, isCategoryListing
 * dans HouseDetails.tsx — pour distinguer immobilier/marketplace), `categoryId` présent. Ne
 * pose délibérément pas `tags` : la création marketplace ne renseigne jamais ce champ
 * immobilier, contrairement à ce que le type TS `Property.tags` (non optionnel) laisse
 * croire — voir le bug trouvé dans PreviewProperty.tsx (`property.tags.map(...)` sans garde).
 */
export async function seedCategoryListing(createdBy: string, listing: SeedCategoryListing): Promise<void> {
  const app = ensureAdminApp()
  const db = admin.firestore(app)
  const now = admin.firestore.Timestamp.now()
  const { id, categoryLeaf, state, ...data } = listing

  // lvl0 dérivé de categoryLeaf ("Mode > Vêtements" -> "Mode") : le vrai flux de création
  // (category-listing/create/page.tsx) pose toujours les deux (`categoryPath: { lvl0:
  // matchedCategory.rootName, lvl1: ... }`) — sans lvl0, ce seed ne représenterait pas
  // fidèlement une vraie annonce Mode, notamment pour le filtre par catégorie du fil de réels
  // public (getPublicReels, filtre sur categoryPath.lvl0).
  const rootName = categoryLeaf.split('>')[0]?.trim() || categoryLeaf

  await db
    .collection('properties')
    .doc(id)
    .set({
      ...data,
      createdBy,
      moderationStatus: 'APPROVED',
      state: state ?? 'IN_PROGRESS',
      categoryPath: { lvl0: rootName, lvl1: categoryLeaf },
      images: [],
      currentPromotion: null,
      createdAt: now,
      updatedAt: now,
      sortTimestamp: now,
    })
}

/** Reads a real `properties/{id}` doc — utilisé pour vérifier qu'une sauvegarde côté UI
 * (bouton "Enregistrer" d'EditableField) a bien persisté en base, pas juste changé l'état
 * React local. */
export async function getProperty(id: string): Promise<Record<string, unknown> | null> {
  const app = ensureAdminApp()
  const snapshot = await admin.firestore(app).collection('properties').doc(id).get()
  return snapshot.exists ? (snapshot.data() ?? null) : null
}

/**
 * Finds all `properties/{id}` docs created by a given owner — le client génère l'id lui-même
 * (`addDoc`, voir createProperty()/createModel() dans property.db.ts) donc un test qui crée une
 * annonce via la vraie UI ne peut la retrouver après coup qu'en interrogeant par `createdBy`,
 * comme findReelByOwner() pour les réels.
 */
export async function findPropertiesByOwner(uid: string): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const app = ensureAdminApp()
  const snapshot = await admin.firestore(app).collection('properties').where('createdBy', '==', uid).get()
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }))
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
export async function seedAnnouncerUser(
  uid: string,
  credits: number,
  options?: { phoneNumbers?: string[] },
): Promise<void> {
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
      // Optionnel : requis par le flux "Mode" (category-listing/create/page.tsx), qui lit
      // user.callNumber || user.phoneNumbers?.[0] et refuse de générer une annonce sans contact
      // — pas de champ téléphone dans son UI, contrairement au formulaire immobilier classique.
      ...(options?.phoneNumbers ? { phoneNumbers: options.phoneNumbers } : {}),
    })
}

/** Reads a real `reels/{id}` doc — utilisé pour vérifier qu'un réel créé via l'UI (bouton
 * "Ajouter un réel" -> /reels/add -> Publier) a bien été persisté en base par la vraie route
 * POST /api/reels (Admin SDK), pas juste affiché côté client. */
export async function getReel(id: string): Promise<Record<string, unknown> | null> {
  const app = ensureAdminApp()
  const snapshot = await admin.firestore(app).collection('reels').doc(id).get()
  return snapshot.exists ? (snapshot.data() ?? null) : null
}

/**
 * Finds the (single, expected) `reels/{id}` doc created by a given owner — le client génère
 * l'id lui-même (`crypto.randomUUID()`, voir CreateOrphanReelClient.tsx) donc un test ne peut
 * pas le connaître à l'avance ; interroger par `createdBy` est le seul moyen de le retrouver
 * après une vraie publication via l'UI.
 */
export async function findReelByOwner(uid: string): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const app = ensureAdminApp()
  const snapshot = await admin.firestore(app).collection('reels').where('createdBy', '==', uid).limit(1).get()
  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { id: doc.id, data: doc.data() }
}

/**
 * Deletes real `reels/{id}` docs by id, plus every Storage object they reference — contrairement
 * à property.db.ts, la création d'un réel uploade réellement un fichier vidéo (SDK client
 * Storage, voir uploadRawReelVideo dans reel.db.ts) ; supprimer seulement le document Firestore
 * laisserait l'objet orphelin dans le bucket. Lit chaque doc AVANT de le supprimer pour
 * récupérer ses vrais chemins (rawVideoPath, et videoPath/thumbnailPath si la Cloud Function de
 * transcodage a déjà tourné — même logique que getStoragePathsFromReel dans
 * /api/reels/route.ts) plutôt que de deviner un chemin/extension à l'avance. `fallbackRawPath`
 * permet quand même un nettoyage best-effort si le doc n'existe plus (ex. jamais créé, le test a
 * échoué avant).
 */
export async function deleteReels(
  entries: Array<{ id: string; uid: string; fallbackExtension?: string }>,
): Promise<void> {
  const app = ensureAdminApp()
  const db = admin.firestore(app)
  // Nom de bucket explicite : l'app Admin (ci-dessus) n'a pas de storageBucket dans sa config,
  // et le bucket réel de ce projet (*.firebasestorage.app) ne suit pas le nom par défaut que
  // `bucket()` sans argument devinerait (*.appspot.com) — même logique que /api/reels/route.ts.
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET
  const bucket = admin.storage(app).bucket(bucketName)

  await Promise.all(
    entries.map(async ({ id, uid, fallbackExtension = 'mp4' }) => {
      const ref = db.collection('reels').doc(id)
      const snapshot = await ref.get()
      const data = snapshot.data() ?? {}
      const paths = [data.rawVideoPath, data.videoPath, data.thumbnailPath].filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
      if (paths.length === 0) {
        paths.push(`reels-raw/${uid}/${id}.${fallbackExtension}`)
      }

      await Promise.all([
        ref.delete(),
        ...paths.map((filePath) => bucket.file(filePath).delete({ ignoreNotFound: true })),
      ])
    }),
  )
}

export type SeedReel = {
  id: string
  description?: string
  propertyId?: string | null
  processingStatus?: 'uploading' | 'processing' | 'ready' | 'failed'
  moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  // Optionnel — un `data:` URI généré à partir d'un vrai fichier vidéo permet de vérifier une
  // lecture réelle (currentTime qui avance) sans dépendre du pipeline d'upload/transcodage ni
  // d'une ressource externe (voir reels-mine-play.spec.ts).
  videoUrl?: string
  thumbnailUrl?: string
}

/**
 * Writes a `reels/{id}` doc directly (pas d'upload Storage réel) — pour les tests qui n'ont
 * besoin que d'un réel existant à retrouver dans une liste (ex. "Mes réels"), pas de vérifier le
 * pipeline d'upload/transcodage lui-même (voir property-add-reel.spec.ts pour ce cas). Mêmes
 * champs minimaux que seedLot8DReels (helpers/reels-dev.ts), exposé ici comme les autres helpers
 * de seed de ce fichier plutôt que dupliqué.
 */
export async function seedReel(createdBy: string, reel: SeedReel): Promise<void> {
  const app = ensureAdminApp()
  const db = admin.firestore(app)
  const now = admin.firestore.Timestamp.now()
  const { id, ...data } = reel

  await db
    .collection('reels')
    .doc(id)
    .set({
      ...data,
      propertyId: data.propertyId ?? null,
      processingStatus: data.processingStatus ?? 'ready',
      moderationStatus: data.moderationStatus ?? 'APPROVED',
      createdBy,
      rawVideoPath: `reels-raw/${createdBy}/${id}.mp4`,
      state: 'IN_PROGRESS',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      giftCount: 0,
      giftTotalAmount: 0,
      createdAt: now,
      updatedAt: now,
    })
}

/**
 * Reads a real `ad_campaigns/{id}` doc — vérifie ce que POST /api/advertising/campaigns a
 * réellement écrit (Admin SDK), pas juste ce que le dashboard affiche côté client.
 */
export async function getAdCampaign(id: string): Promise<Record<string, unknown> | null> {
  const app = ensureAdminApp()
  const snapshot = await admin.firestore(app).collection('ad_campaigns').doc(id).get()
  return snapshot.exists ? (snapshot.data() ?? null) : null
}

/**
 * Finds the (single, expected) `ad_campaigns/{id}` doc created by a given owner — le client ne
 * connaît l'id de la campagne créée que via la réponse JSON (`campaignId`), donc un test qui ne
 * l'a pas capturée directement (ex. vérification après la redirection vers /advertising) doit
 * la retrouver par `createdBy`.
 */
export async function findAdCampaignByOwner(
  uid: string,
): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const app = ensureAdminApp()
  const snapshot = await admin
    .firestore(app)
    .collection('ad_campaigns')
    .where('createdBy', '==', uid)
    .limit(1)
    .get()
  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { id: doc.id, data: doc.data() }
}

/**
 * Deletes real `ad_campaigns/{id}` docs, the Storage object their créative référence (POST
 * /api/advertising/upload écrit réellement dans Storage, contrairement à property.db.ts) et
 * leurs `credit_transactions` associées (créées dans la même transaction Firestore que la
 * campagne, voir /api/advertising/campaigns/route.ts). Lit chaque doc AVANT de le supprimer
 * pour récupérer son vrai chemin d'image plutôt que d'en deviner un — même logique que
 * deleteReels ci-dessus.
 */
export async function deleteAdCampaigns(ids: string[]): Promise<void> {
  const app = ensureAdminApp()
  const db = admin.firestore(app)
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET
  const bucket = admin.storage(app).bucket(bucketName)

  await Promise.all(
    ids.map(async (id) => {
      const ref = db.collection('ad_campaigns').doc(id)
      const snapshot = await ref.get()
      const data = snapshot.data() ?? {}
      const imagePATH =
        typeof (data as any).creative?.imagePATH === 'string' ? (data as any).creative.imagePATH : ''

      const transactionsSnap = await db.collection('credit_transactions').where('campaignId', '==', id).get()

      await Promise.all([
        ref.delete(),
        ...(imagePATH ? [bucket.file(imagePATH).delete({ ignoreNotFound: true })] : []),
        ...transactionsSnap.docs.map((doc) => doc.ref.delete()),
      ])
    }),
  )
}

/**
 * Reads a real `users/{uid}` doc's `credits` field — pour vérifier qu'une création de campagne
 * (POST /api/advertising/campaigns) a réellement débité le compte, pas seulement renvoyé un
 * `creditsRemaining` dans la réponse JSON.
 */
export async function getUserCredits(uid: string): Promise<number | null> {
  const app = ensureAdminApp()
  const snapshot = await admin.firestore(app).collection('users').where('uid', '==', uid).limit(1).get()
  if (snapshot.empty) return null
  const credits = snapshot.docs[0].data().credits
  return typeof credits === 'number' ? credits : null
}

export type SeedSearchRequest = {
  id: string
  typeProperty: string
  transactionType: 'FOR_RENT' | 'FOR_SALE'
  province: string
  city: string
  neighborhood?: string
  budgetMinXaf: number
  budgetMaxXaf: number
  description: string
  whatsappContact: string
  moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  state?: 'IN_PROGRESS' | 'ARCHIVED'
  /** Pose boostRequested/boostPaid/boostStartAt/boostEndAt si fourni — matérialise une
   * "recherche urgente" (voir getBoostedSearchRequests, reel.db.ts). */
  boostEndAt?: Date | null
}

/**
 * Writes a real `search_requests/{id}` doc directement (pas de vrai paiement MyPayGa — la
 * création réelle passe uniquement par la Cloud Function initiateSearchRequestPayment, hors
 * d'atteinte d'un test e2e sans dépenser de vrai argent, voir search-request.db.ts). Même champs
 * minimaux que produirait le webhook de confirmation, pour que getSearchRequests()/
 * getBoostedSearchRequests() (lues par SearchRequestsListClient, vraie lecture Firestore client)
 * les retrouvent exactement comme une vraie demande confirmée.
 */
export async function seedSearchRequest(request: SeedSearchRequest): Promise<void> {
  const app = ensureAdminApp()
  const db = admin.firestore(app)
  const now = admin.firestore.Timestamp.now()
  const { id, boostEndAt, ...data } = request

  await db
    .collection('search_requests')
    .doc(id)
    .set({
      ...data,
      moderationStatus: data.moderationStatus ?? 'APPROVED',
      state: data.state ?? 'IN_PROGRESS',
      source: 'public',
      provider: 'mypayga',
      paymentStatus: 'confirmed',
      amountPaidXaf: 500,
      boostRequested: Boolean(boostEndAt),
      boostPaid: Boolean(boostEndAt),
      ...(boostEndAt
        ? { boostStartAt: now, boostEndAt: admin.firestore.Timestamp.fromDate(boostEndAt) }
        : {}),
      createdAt: now,
      updatedAt: now,
    })
}

export async function deleteSearchRequests(ids: string[]): Promise<void> {
  const app = ensureAdminApp()
  const db = admin.firestore(app)
  await Promise.all(ids.map((id) => db.collection('search_requests').doc(id).delete()))
}
