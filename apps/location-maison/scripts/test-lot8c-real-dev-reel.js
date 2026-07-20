/* eslint-disable no-console */

const { execFile } = require('node:child_process')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { promisify } = require('node:util')

const admin = require('firebase-admin')
const dotenv = require('dotenv')
const { deleteApp, initializeApp } = require('firebase/app')
const { getAuth, signInWithCustomToken, signOut } = require('firebase/auth')
const { getStorage, ref, uploadBytes } = require('firebase/storage')

const execFileAsync = promisify(execFile)
const DEV_PROJECT_ID = 'location-maison-dev'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local.dev'), quiet: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertRealDevGuards() {
  assert(
    process.env.LOT8C_CONFIRM_REAL_DEV === '1',
    'Refus du test reel. Relancez avec LOT8C_CONFIRM_REAL_DEV=1.',
  )
  assert(
    process.env.FIREBASE_PROJECT_ID === DEV_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === DEV_PROJECT_ID,
    `Refus absolu : ce test accepte uniquement ${DEV_PROJECT_ID}.`,
  )
  assert(
    !process.env.FIRESTORE_EMULATOR_HOST &&
      !process.env.FIREBASE_AUTH_EMULATOR_HOST &&
      !process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    'Le Lot 8C reel doit viser Firebase dev, pas les emulateurs.',
  )

  const email = process.env.LOT8C_USER_EMAIL?.trim().toLowerCase()
  assert(email, 'LOT8C_USER_EMAIL est requis pour selectionner le compte annonceur dev.')

  const baseURL = new URL(process.env.LOT8C_BASE_URL || 'http://localhost:3001')
  assert(baseURL.protocol === 'http:', 'Le serveur Lot 8C doit utiliser HTTP en local.')
  assert(
    baseURL.hostname === '127.0.0.1' || baseURL.hostname === 'localhost',
    'Le serveur Lot 8C doit ecouter uniquement en local.',
  )

  return {
    email,
    baseURL: baseURL.toString().replace(/\/$/, ''),
    timeoutMs: Number(process.env.LOT8C_TIMEOUT_MS || 8 * 60_000),
  }
}

function initFirebaseAdmin() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
  assert(serviceAccount.clientEmail && serviceAccount.privateKey, 'Identifiants Firebase Admin dev incomplets.')

  const app = admin.apps.length > 0
    ? admin.apps[0]
    : admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })

  return {
    adminApp: app,
    db: admin.firestore(app),
    bucket: admin.storage(app).bucket(),
  }
}

function initFirebaseClient(runId) {
  const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }, `lot8c-${runId}`)

  return {
    app,
    auth: getAuth(app),
    storage: getStorage(app),
  }
}

async function findAnnouncer(db, email) {
  const snapshot = await db.collection('users').where('email', '==', email).get()
  assert(snapshot.size === 1, `Le compte ${email} doit correspondre a un seul document dev.`)
  const document = snapshot.docs[0]
  const user = document.data()
  assert(user.uid === document.id, `UID/document incoherents pour ${email}.`)
  assert(Array.isArray(user.roles) && user.roles.includes('Announcer'), `${email} n'est pas annonceur.`)
  return user
}

function installerPath(packageName) {
  const functionsDirectory = path.resolve(__dirname, '..', 'functions')
  const entryPath = require.resolve(packageName, { paths: [functionsDirectory] })
  return require(entryPath).path
}

async function generateMovFixture(filePath) {
  await execFileAsync(installerPath('@ffmpeg-installer/ffmpeg'), [
    '-hide_banner',
    '-loglevel', 'error',
    '-f', 'lavfi',
    '-i', 'testsrc2=s=360x640:r=24:d=3',
    '-f', 'lavfi',
    '-i', 'sine=frequency=660:duration=3',
    '-c:v', 'mpeg4',
    '-q:v', '5',
    '-c:a', 'pcm_s16le',
    '-shortest',
    filePath,
  ])
}

async function probeVideo(filePath) {
  const { stdout } = await execFileAsync(installerPath('@ffprobe-installer/ffprobe'), [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=codec_type,codec_name,height',
    '-of', 'json',
    filePath,
  ])
  const result = JSON.parse(stdout)
  const video = result.streams?.find((stream) => stream.codec_type === 'video')
  const audio = result.streams?.find((stream) => stream.codec_type === 'audio')
  return {
    durationSeconds: Number(result.format?.duration),
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
    height: video?.height ?? null,
  }
}

async function apiRequest(baseURL, idToken, method, body) {
  const response = await fetch(`${baseURL}/api/reels`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => null)
  assert(response.ok && result?.success, result?.message || `API reels ${method} en echec (${response.status}).`)
  return result
}

async function waitForReelTerminalStatus(db, reelId, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  const statuses = []
  while (Date.now() < deadline) {
    const snapshot = await db.collection('reels').doc(reelId).get()
    assert(snapshot.exists, 'Le document reel a disparu pendant le traitement.')
    const data = snapshot.data()
    if (statuses.at(-1) !== data.processingStatus) {
      statuses.push(data.processingStatus)
      console.log(`Statut reel : ${data.processingStatus}`)
    }
    if (data.processingStatus === 'ready' || data.processingStatus === 'failed') {
      return { data, statuses }
    }
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  throw new Error(`Le reel n a pas atteint un statut final apres ${Math.round(timeoutMs / 1000)}s.`)
}

async function waitForStorageDeletion(bucket, filePath, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const [exists] = await bucket.file(filePath).exists()
    if (!exists) return
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Le fichier temporaire ${filePath} n a pas ete nettoye.`)
}

async function cleanup({ db, bucket, reelId, ownerId }) {
  const reelRef = db.collection('reels').doc(reelId)
  const snapshot = await reelRef.get()
  const data = snapshot.data() || {}
  const exactPaths = [
    data.rawVideoPath,
    data.videoPath,
    data.thumbnailPath,
    `reels-raw/${ownerId}/${reelId}.mov`,
  ].filter(Boolean)
  await reelRef.delete().catch(() => undefined)
  await Promise.all(exactPaths.map((filePath) => bucket.file(filePath).delete({ ignoreNotFound: true })))
  const [prefixFiles] = await bucket.getFiles({ prefix: `reels/${ownerId}/${reelId}/` })
  await Promise.all(prefixFiles.map((file) => file.delete({ ignoreNotFound: true })))
  assert(!(await reelRef.get()).exists, 'Le document reel Lot 8C subsiste apres nettoyage.')
  return { files: new Set([...exactPaths, ...prefixFiles.map((file) => file.name)]).size }
}

async function main() {
  const { email, baseURL, timeoutMs } = assertRealDevGuards()
  const { adminApp, db, bucket } = initFirebaseAdmin()
  const user = await findAnnouncer(db, email)
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const reelId = `lot8c-${runId}`
  const rawVideoPath = `reels-raw/${user.uid}/${reelId}.mov`
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lot8c-real-'))
  const sourcePath = path.join(workDir, `${reelId}.mov`)
  const outputPath = path.join(workDir, `${reelId}.mp4`)
  const client = initFirebaseClient(runId)
  let idToken = null
  let testError = null

  console.log(`Lot 8C reel | projet=${DEV_PROJECT_ID} | run=${runId}`)

  try {
    const health = await fetch(`${baseURL}/api/health`)
    assert(health.ok, `Le serveur local ${baseURL} n est pas disponible.`)

    await generateMovFixture(sourcePath)
    const sourceMetadata = await probeVideo(sourcePath)
    assert(sourceMetadata.videoCodec === 'mpeg4', 'La fixture doit forcer le chemin de reencodage.')
    assert(sourceMetadata.audioCodec === 'pcm_s16le', 'La fixture MOV doit contenir un audio PCM.')

    const customToken = await admin.auth(adminApp).createCustomToken(user.uid)
    const credential = await signInWithCustomToken(client.auth, customToken)
    idToken = await credential.user.getIdToken()

    await apiRequest(baseURL, idToken, 'POST', {
      reelId,
      propertyId: null,
      rawVideoPath,
      contact: user.phoneNumbers?.[0] || '+24166545430',
      description: `LOT8C ${runId} video temporaire`,
      trimStartSeconds: 0.5,
      trimEndSeconds: 2.5,
      muted: true,
    })

    const sourceBuffer = await fs.readFile(sourcePath)
    await uploadBytes(ref(client.storage, rawVideoPath), sourceBuffer, {
      contentType: 'video/quicktime',
      customMetadata: { ownerId: user.uid, reelId },
    })

    const terminal = await waitForReelTerminalStatus(db, reelId, timeoutMs)
    assert(terminal.data.processingStatus === 'ready', terminal.data.processingError || 'Le transcodage a echoue.')
    assert(terminal.data.processingAttemptCount === 1, 'Le pipeline doit effectuer une seule tentative de transcodage.')
    assert(terminal.data.createdBy === user.uid, 'Le reel est rattache au mauvais utilisateur.')
    assert(terminal.data.moderationStatus === 'PENDING', 'Le transcodage ne doit pas contourner la moderation.')
    assert(terminal.data.videoPath && terminal.data.thumbnailPath, 'Les chemins de sortie sont incomplets.')
    assert(terminal.data.durationSeconds > 1.5 && terminal.data.durationSeconds < 2.5, 'La duree decoupee est incorrecte.')

    await waitForStorageDeletion(bucket, rawVideoPath)
    const [videoMetadata] = await bucket.file(terminal.data.videoPath).getMetadata()
    const [thumbnailMetadata] = await bucket.file(terminal.data.thumbnailPath).getMetadata()
    assert(videoMetadata.contentType === 'video/mp4', 'Le fichier final n est pas un MP4.')
    assert(videoMetadata.cacheControl?.includes('immutable'), 'Le cache immuable manque sur la video.')
    assert(thumbnailMetadata.contentType === 'image/jpeg', 'La miniature finale n est pas un JPEG.')

    const videoResponse = await fetch(terminal.data.videoUrl)
    assert(videoResponse.ok, `La video finale n est pas lisible publiquement (${videoResponse.status}).`)
    await fs.writeFile(outputPath, Buffer.from(await videoResponse.arrayBuffer()))
    const outputMetadata = await probeVideo(outputPath)
    assert(outputMetadata.videoCodec === 'h264', 'Le codec final doit etre H264.')
    assert(outputMetadata.audioCodec === null, 'Le reel demande comme muet contient encore une piste audio.')
    assert(outputMetadata.height <= 1920, 'La hauteur finale depasse 1920 px.')

    const thumbnailResponse = await fetch(terminal.data.thumbnailUrl)
    assert(thumbnailResponse.ok, `La miniature n est pas lisible publiquement (${thumbnailResponse.status}).`)
    assert((await thumbnailResponse.arrayBuffer()).byteLength > 0, 'La miniature est vide.')
    console.log('PASS MOV reel -> MP4 H264 muet, miniature, duree et cache')

    await uploadBytes(ref(client.storage, rawVideoPath), sourceBuffer, {
      contentType: 'video/quicktime',
      customMetadata: { ownerId: user.uid, reelId },
    })
    await waitForStorageDeletion(bucket, rawVideoPath)
    const afterReplay = (await db.collection('reels').doc(reelId).get()).data()
    assert(afterReplay.processingStatus === 'ready', 'Le rejeu a degrade le statut du reel.')
    assert(afterReplay.processingAttemptCount === 1, 'Le rejeu a relance FFmpeg.')
    console.log('PASS rejeu Storage ignore, brut nettoye et tentative unique')

    const updatedDescription = `LOT8C ${runId} description modifiee`
    await apiRequest(baseURL, idToken, 'PATCH', {
      action: 'update-details',
      reelId,
      contact: user.phoneNumbers?.[0] || '+24166545430',
      description: updatedDescription,
    })
    assert(
      (await db.collection('reels').doc(reelId).get()).data()?.description === updatedDescription,
      'La description modifiee n a pas ete persistee.',
    )

    await apiRequest(baseURL, idToken, 'DELETE', { reelId })
    assert(!(await db.collection('reels').doc(reelId).get()).exists, 'La suppression API du reel a echoue.')
    await waitForStorageDeletion(bucket, terminal.data.videoPath)
    await waitForStorageDeletion(bucket, terminal.data.thumbnailPath)
    console.log('PASS modification, suppression API et nettoyage des sorties')
  } catch (error) {
    testError = error
  } finally {
    await signOut(client.auth).catch(() => undefined)
    await deleteApp(client.app).catch(() => undefined)
    const cleanupSummary = await cleanup({ db, bucket, reelId, ownerId: user.uid })
    await fs.rm(workDir, { recursive: true, force: true })
    console.log(`Nettoyage | reel=0 | chemins_controles=${cleanupSummary.files}`)
  }

  if (testError) throw testError
  console.log(`Lot 8C reel PASS | reel=${reelId}`)
}

main().catch((error) => {
  console.error(`Lot 8C reel FAIL: ${error.stack || error.message}`)
  process.exitCode = 1
})
