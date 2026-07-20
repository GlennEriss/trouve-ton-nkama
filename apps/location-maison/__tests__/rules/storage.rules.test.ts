/**
 * @jest-environment node
 */

import fs from 'node:fs'
import path from 'node:path'

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteObject,
  getBytes,
  ref,
  uploadBytes,
} from 'firebase/storage'

const PROJECT_ID = `location-maison-storage-rules-${Date.now()}`
const FILE_CONTENT = new Uint8Array([0, 1, 2, 3])

let testEnv: RulesTestEnvironment

function emulatorHostAndPort() {
  const raw = process.env.FIREBASE_STORAGE_EMULATOR_HOST
    ?? process.env.STORAGE_EMULATOR_HOST
    ?? '127.0.0.1:9199'
  const [host, portRaw] = raw.split(':')
  return {
    host: host || '127.0.0.1',
    port: Number(portRaw || 9199),
  }
}

function authedStorage(uid: string) {
  return testEnv.authenticatedContext(uid).storage()
}

function anonStorage() {
  return testEnv.unauthenticatedContext().storage()
}

async function seedStorageObject(pathName: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await uploadBytes(ref(context.storage(), pathName), FILE_CONTENT)
  })
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      ...emulatorHostAndPort(),
      rules: fs.readFileSync(path.join(__dirname, '../../storage.rules'), 'utf8'),
    },
  })
})

beforeEach(async () => {
  await testEnv.clearStorage()
})

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup()
  }
})

describe('storage.rules reels bruts', () => {
  const rawPath = 'reels-raw/owner-1/reel-1.mov'

  it('autorise uniquement le proprietaire authentifie a creer le fichier', async () => {
    await assertSucceeds(uploadBytes(ref(authedStorage('owner-1'), rawPath), FILE_CONTENT))
    await assertFails(uploadBytes(ref(authedStorage('owner-2'), 'reels-raw/owner-1/reel-2.mov'), FILE_CONTENT))
    await assertFails(uploadBytes(ref(anonStorage(), 'reels-raw/owner-1/reel-3.mov'), FILE_CONTENT))
  })

  it('refuse toute lecture et toute reecriture du fichier brut', async () => {
    const immutableRawPath = 'reels-raw/owner-1/reel-immutable.mov'
    await assertSucceeds(uploadBytes(ref(authedStorage('owner-1'), immutableRawPath), FILE_CONTENT))
    await assertFails(getBytes(ref(authedStorage('owner-1'), immutableRawPath)))
    await assertFails(getBytes(ref(anonStorage(), immutableRawPath)))
    await assertFails(uploadBytes(ref(authedStorage('owner-1'), immutableRawPath), FILE_CONTENT))
    await assertFails(deleteObject(ref(authedStorage('owner-1'), immutableRawPath)))
  })
})

describe('storage.rules reels traites', () => {
  const videoPath = 'reels/owner-1/reel-1/video.mp4'

  it('autorise la lecture publique mais reserve les ecritures a Admin', async () => {
    await seedStorageObject(videoPath)
    await assertSucceeds(getBytes(ref(anonStorage(), videoPath)))
    await assertFails(uploadBytes(ref(authedStorage('owner-1'), videoPath), FILE_CONTENT))
    await assertFails(uploadBytes(ref(anonStorage(), 'reels/owner-1/reel-1/thumbnail.jpg'), FILE_CONTENT))
  })
})

describe('storage.rules compatibilite historique', () => {
  it('conserve la creation et la lecture publiques des images property existantes', async () => {
    const propertyPath = 'property/existing-image.jpeg'
    await assertSucceeds(uploadBytes(ref(anonStorage(), propertyPath), FILE_CONTENT))
    await assertSucceeds(getBytes(ref(anonStorage(), propertyPath)))
  })

  it('protege aussi les creations publicitaires du catch-all ouvert', async () => {
    await assertSucceeds(uploadBytes(
      ref(authedStorage('owner-1'), 'ad-campaigns/owner-1/ad.jpeg'),
      FILE_CONTENT,
    ))
    await assertFails(uploadBytes(
      ref(authedStorage('owner-2'), 'ad-campaigns/owner-1/other.jpeg'),
      FILE_CONTENT,
    ))
    await assertFails(uploadBytes(
      ref(anonStorage(), 'ad-campaigns-video/owner-1/ad.mp4'),
      FILE_CONTENT,
    ))
  })
})
