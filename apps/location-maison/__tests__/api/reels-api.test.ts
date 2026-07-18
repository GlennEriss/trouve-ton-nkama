import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

import { adminAuth } from '@/firebase/admin'

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

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

jest.mock('@/firebase/admin', () => ({
  adminApp: { name: 'test-admin-app' },
  adminAuth: {
    verifyIdToken: jest.fn(),
  },
}))

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ __type: 'serverTimestamp' })),
    delete: jest.fn(() => ({ __type: 'delete' })),
  },
}))

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(),
}))

type FakeRef = {
  __collection: string
  id: string
  get?: jest.Mock
}

function makeRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = { authorization: 'Bearer valid-token' },
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

function makeSnapshot(data: Record<string, unknown> | null) {
  return {
    exists: Boolean(data),
    data: () => data,
  }
}

function makeReelsDb(options: {
  userData?: Record<string, unknown> | null
  reelData?: Record<string, unknown> | null
  propertyData?: Record<string, unknown> | null
} = {}) {
  const userData = options.userData === undefined
    ? { uid: 'uid-1', roles: ['User', 'Announcer'] }
    : options.userData
  const reelData = options.reelData === undefined ? null : options.reelData
  const propertyData = options.propertyData === undefined
    ? { id: 'property-1', createdBy: 'uid-1' }
    : options.propertyData

  const refsByKey = new Map<string, FakeRef>()
  const refFor = (collectionName: string, id: string): FakeRef => {
    const key = `${collectionName}/${id}`
    const existing = refsByKey.get(key)
    if (existing) return existing

    const ref: FakeRef = {
      __collection: collectionName,
      id,
    }
    if (collectionName === 'users') {
      ref.get = jest.fn(async () => makeSnapshot(userData))
    }
    refsByKey.set(key, ref)
    return ref
  }

  const transaction = {
    get: jest.fn(async (ref: FakeRef) => {
      if (ref.__collection === 'reels') return makeSnapshot(reelData)
      if (ref.__collection === 'properties') return makeSnapshot(propertyData)
      return makeSnapshot(null)
    }),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }

  const db = {
    collection: jest.fn((collectionName: string) => ({
      doc: jest.fn((id: string) => refFor(collectionName, id)),
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(async () => ({
            empty: !userData,
            docs: userData ? [{ ref: refFor('users', 'user-doc-1'), data: () => userData }] : [],
          })),
        })),
      })),
    })),
    runTransaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  }

  return {
    db,
    transaction,
    refFor,
  }
}

function mockStorage() {
  const deleteFile = jest.fn(async () => undefined)
  const bucket = {
    file: jest.fn(() => ({
      delete: deleteFile,
    })),
  }
  const storage = {
    bucket: jest.fn(() => bucket),
  }
  ;(getStorage as jest.Mock).mockReturnValue(storage)
  return { storage, bucket, deleteFile }
}

describe('/api/reels', () => {
  beforeAll(async () => {
    ;({ POST: postReel, PATCH: patchReel, DELETE: deleteReel } = await import('@/app/api/reels/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'uid-1' })
    mockStorage()
  })

  it('refuse une creation sans token bearer', async () => {
    const { db } = makeReelsDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postReel(makeRequest({ reelId: 'reel-1' }, {}))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      success: false,
      code: 'UNAUTHENTICATED',
    })
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
    expect(getFirestore).not.toHaveBeenCalled()
  })

  it('cree un reel orphelin avec description facultative', async () => {
    const { db, transaction, refFor } = makeReelsDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postReel(
      makeRequest({
        reelId: 'reel-1',
        propertyId: null,
        rawVideoPath: 'reels-raw/uid-1/reel-1.mov',
        contact: '+24166545430',
        description: 'Visite rapide, quartier calme.',
        trimStartSeconds: 0,
        trimEndSeconds: 5,
        muted: true,
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      reelId: 'reel-1',
    })
    expect(transaction.create).toHaveBeenCalledWith(
      refFor('reels', 'reel-1'),
      expect.objectContaining({
        propertyId: null,
        createdBy: 'uid-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mov',
        processingStatus: 'uploading',
        moderationStatus: 'PENDING',
        contact: '+24166545430',
        description: 'Visite rapide, quartier calme.',
        viewCount: 0,
        likeCount: 0,
        shareCount: 0,
      }),
    )
  })

  it('refuse de recreer un reel existant avec le meme reelId', async () => {
    const { db, transaction } = makeReelsDb({
      reelData: {
        createdBy: 'uid-1',
      },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postReel(
      makeRequest({
        reelId: 'reel-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mov',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({
      success: false,
      code: 'REEL_ALREADY_EXISTS',
    })
    expect(transaction.create).not.toHaveBeenCalled()
  })

  it('modifie les details d un reel appartenant a l annonceur', async () => {
    const { db, transaction, refFor } = makeReelsDb({
      reelData: {
        createdBy: 'uid-1',
        processingStatus: 'processed',
      },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({
        action: 'update-details',
        reelId: 'reel-1',
        contact: '+24177445566',
        description: 'Numero corrige et nouvelle description.',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      reelId: 'reel-1',
    })
    expect(transaction.update).toHaveBeenCalledWith(
      refFor('reels', 'reel-1'),
      expect.objectContaining({
        contact: '+24177445566',
        description: 'Numero corrige et nouvelle description.',
      }),
    )
  })

  it('refuse de modifier un reel qui appartient a un autre annonceur', async () => {
    const { db, transaction } = makeReelsDb({
      reelData: {
        createdBy: 'other-uid',
        processingStatus: 'processed',
      },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({
        action: 'update-details',
        reelId: 'reel-1',
        contact: '+24177445566',
        description: 'Tentative interdite.',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({
      success: false,
      code: 'FORBIDDEN_REEL',
    })
    expect(transaction.update).not.toHaveBeenCalled()
  })

  it('supprime un reel possede et nettoie les fichiers storage associes', async () => {
    const storageMocks = mockStorage()
    const { db, transaction, refFor } = makeReelsDb({
      reelData: {
        createdBy: 'uid-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mov',
        videoPath: 'reels/uid-1/reel-1.mp4',
        thumbnailPath: 'reels-thumbnails/uid-1/reel-1.jpg',
      },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await deleteReel(makeRequest({ reelId: 'reel-1' }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      reelId: 'reel-1',
    })
    expect(transaction.delete).toHaveBeenCalledWith(refFor('reels', 'reel-1'))
    expect(storageMocks.bucket.file).toHaveBeenCalledTimes(3)
    expect(storageMocks.deleteFile).toHaveBeenCalledTimes(3)
  })
})
