import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import * as admin from 'firebase-admin'

/**
 * Playwright `globalTeardown` : après TOUT le run, supprime les comptes Firebase
 * Auth (et leur doc Firestore `users/{uid}`) créés par les specs.
 *
 * Pourquoi un teardown global plutôt que (seulement) par spec : une spec qui
 * plante avant son `afterAll` fuitait quand même son utilisateur. Chaque spec
 * forge une session pour un uid unique par run (`e2e-<feature>-owner-<uuid>`,
 * `announcer-e2e-lot8d-<ts>`...) et, dès que le vrai pont Firebase tourne
 * (`signInWithCustomToken` via /api/generate-token), Firebase crée
 * l'enregistrement Auth correspondant. ~400 comptes s'étaient ainsi accumulés
 * dans location-maison-dev avant l'ajout de ce nettoyage.
 *
 * Ne touche qu'aux uids qui matchent un motif e2e sans ambiguïté, et jamais aux
 * comptes réels (email @ttn.ga, le compte du dev, le fixture réutilisé
 * `announcer-e2e`).
 */

const PROTECTED_UIDS = new Set(['announcer-e2e'])
const PROTECTED_EMAIL = /@ttn\.ga$|^glenneriss@gmail\.com$/i

function isE2eUser(user: admin.auth.UserRecord): boolean {
  if (PROTECTED_UIDS.has(user.uid)) return false
  if (user.email && PROTECTED_EMAIL.test(user.email)) return false
  return (
    /e2e/i.test(user.uid) ||
    /^lot\d/i.test(user.uid) ||
    /^tmp-/i.test(user.uid) ||
    /^debug-checkbox/i.test(user.uid) ||
    /-owner-[0-9a-f]{8}-[0-9a-f]{4}-/i.test(user.uid) ||
    /@example\.(test|com)$/i.test(user.email ?? '')
  )
}

function ensureAdminApp(): admin.app.App {
  const appName = 'e2e-global-teardown'
  const existing = admin.apps.find((a) => a?.name === appName)
  if (existing) return existing

  loadEnv({ path: path.resolve(process.cwd(), `.env.local.${process.env.E2E_ENV || 'dev'}`) })

  return admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n'),
      } as admin.ServiceAccount),
    },
    appName,
  )
}

export default async function globalTeardown(): Promise<void> {
  // Filet de sécurité : ne jamais purger les comptes d'un projet qui n'est pas dev.
  const env = process.env.E2E_ENV || 'dev'
  if (env !== 'dev') {
    console.log(`[e2e teardown] E2E_ENV=${env} — purge des comptes e2e ignorée (dev uniquement).`)
    return
  }

  let app: admin.app.App
  try {
    app = ensureAdminApp()
  } catch (err) {
    console.warn('[e2e teardown] identifiants Firebase Admin absents — purge ignorée.', err)
    return
  }

  const auth = admin.auth(app)
  const db = admin.firestore(app)

  const all: admin.auth.UserRecord[] = []
  let pageToken: string | undefined
  do {
    const res = await auth.listUsers(1000, pageToken)
    all.push(...res.users)
    pageToken = res.pageToken
  } while (pageToken)

  const stale = all.filter(isE2eUser)
  if (stale.length === 0) return

  const uids = stale.map((u) => u.uid)
  for (let i = 0; i < uids.length; i += 1000) {
    await auth.deleteUsers(uids.slice(i, i + 1000))
  }
  await Promise.allSettled(uids.map((uid) => db.collection('users').doc(uid).delete()))

  // Objets Storage laissés par ces uids : vidéos de réels (dont les sorties du transcodeur,
  // écrites en asynchrone donc souvent après le teardown de la spec) et créatives de pub.
  // Le quota Storage du projet dev saturait à cause de ces orphelins accumulés run après run.
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET
  if (bucketName) {
    const bucket = admin.storage(app).bucket(bucketName)
    await Promise.allSettled(
      uids.flatMap((uid) => [
        bucket.deleteFiles({ prefix: `reels/${uid}/`, force: true }),
        bucket.deleteFiles({ prefix: `reels-raw/${uid}/`, force: true }),
        bucket.deleteFiles({ prefix: `ad-campaigns/${uid}/`, force: true }),
      ]),
    )
  }

  console.log(`[e2e teardown] ${stale.length} compte(s) e2e + objets Storage associés supprimés de ${process.env.FIREBASE_PROJECT_ID}.`)
}
