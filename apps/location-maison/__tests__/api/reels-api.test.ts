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

  it('classe directement le reel via le chip categoryRoot quand aucune annonce n est presselectionnee', async () => {
    // Chip Immobilier/Mode a cote du contact (CreateOrphanReelClient) : seul moyen de classer un
    // reel qui ne sera jamais rattache a une annonce. `categoryPath.lvl0` est exactement ce que
    // getPublicReels() filtre pour les onglets du fil public (reel.db.ts).
    const { db, transaction, refFor } = makeReelsDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postReel(
      makeRequest({
        reelId: 'reel-1',
        propertyId: null,
        rawVideoPath: 'reels-raw/uid-1/reel-1.mov',
        categoryRoot: 'Mode',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, reelId: 'reel-1' })
    expect(transaction.create).toHaveBeenCalledWith(
      refFor('reels', 'reel-1'),
      expect.objectContaining({ categoryPath: { lvl0: 'Mode' } }),
    )
  })

  it('ignore le chip categoryRoot quand une annonce est presselectionnee (la categorie de l annonce prevaut)', async () => {
    const { db, transaction, refFor } = makeReelsDb({
      propertyData: { createdBy: 'uid-1', categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Vêtements' } },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postReel(
      makeRequest({
        reelId: 'reel-1',
        propertyId: 'property-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mov',
        // Ne devrait jamais arriver depuis l'UI (le chip est masque des qu'une annonce est
        // presselectionnee), mais un client pourrait l'envoyer quand meme.
        categoryRoot: 'Immobilier',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true })
    expect(transaction.create).toHaveBeenCalledWith(
      refFor('reels', 'reel-1'),
      expect.objectContaining({ categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Vêtements' } }),
    )
  })

  it('refuse une valeur de categoryRoot arbitraire (pas Immobilier/Mode)', async () => {
    const { db } = makeReelsDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postReel(
      makeRequest({
        reelId: 'reel-1',
        propertyId: null,
        rawVideoPath: 'reels-raw/uid-1/reel-1.mov',
        categoryRoot: 'Autre',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({ success: false, code: 'INVALID_CATEGORY_ROOT' })
  })

  it('classe par defaut Immobilier une annonce immobilier presselectionnee sans son propre categoryPath', async () => {
    // Une annonce immobilier n'a JAMAIS son propre categoryPath en base (seul le flux Mode
    // l'ecrit, category-listing/create/page.tsx) — sans ce repli sur typeProperty,
    // property.categoryPath reste toujours undefined pour de l'immobilier, et l'onglet
    // "Immobilier" du fil public ne recevrait donc jamais aucun reel.
    const { db, transaction, refFor } = makeReelsDb({
      propertyData: { createdBy: 'uid-1', typeProperty: 'Villa' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postReel(
      makeRequest({
        reelId: 'reel-1',
        propertyId: 'property-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mov',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true })
    expect(transaction.create).toHaveBeenCalledWith(
      refFor('reels', 'reel-1'),
      expect.objectContaining({ categoryPath: { lvl0: 'Immobilier' } }),
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

  it('refuse un trim invalide (fin avant le debut)', async () => {
    const { db } = makeReelsDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postReel(
      makeRequest({
        reelId: 'reel-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mov',
        trimStartSeconds: 10,
        trimEndSeconds: 5,
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({ success: false, code: 'INVALID_TRIM_RANGE' })
  })

  it('refuse la creation quand le profil utilisateur est introuvable', async () => {
    const { db } = makeReelsDb({ userData: null })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postReel(
      makeRequest({ reelId: 'reel-1', rawVideoPath: 'reels-raw/uid-1/reel-1.mov' }),
    )
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({ success: false, code: 'USER_NOT_FOUND' })
  })

  it('refuse la creation pour un compte non annonceur', async () => {
    const { db } = makeReelsDb({ userData: { uid: 'uid-1', roles: ['User'] } })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postReel(
      makeRequest({ reelId: 'reel-1', rawVideoPath: 'reels-raw/uid-1/reel-1.mov' }),
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({ success: false, code: 'ANNOUNCER_REQUIRED' })
  })

  it('marque un reel en echec d upload', async () => {
    const { db, transaction, refFor } = makeReelsDb({
      reelData: { createdBy: 'uid-1', processingStatus: 'uploading' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({ action: 'mark-upload-failed', reelId: 'reel-1', processingError: 'Codec non supporte.' }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, reelId: 'reel-1' })
    expect(transaction.update).toHaveBeenCalledWith(
      refFor('reels', 'reel-1'),
      expect.objectContaining({ processingStatus: 'failed', processingError: 'Codec non supporte.' }),
    )
  })

  it('refuse de marquer en echec un reel dont le statut a deja change', async () => {
    const { db, transaction } = makeReelsDb({
      reelData: { createdBy: 'uid-1', processingStatus: 'processed' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({ action: 'mark-upload-failed', reelId: 'reel-1' }),
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({ success: false, code: 'REEL_STATUS_CHANGED' })
    expect(transaction.update).not.toHaveBeenCalled()
  })

  it('rattache un reel orphelin a une annonce possedee', async () => {
    const { db, transaction, refFor } = makeReelsDb({
      reelData: { createdBy: 'uid-1', propertyId: null },
      propertyData: { createdBy: 'uid-1' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({ action: 'attach-property', reelId: 'reel-1', propertyId: 'property-1' }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, reelId: 'reel-1' })
    expect(transaction.update).toHaveBeenCalledWith(
      refFor('reels', 'reel-1'),
      expect.objectContaining({ propertyId: 'property-1' }),
    )
  })

  it('copie le categoryPath Mode de l annonce lors du rattachement (classement du fil public)', async () => {
    // categoryPath.lvl0 est ce que getPublicReels() filtre pour l'onglet "Mode" du fil public
    // (reel.db.ts) — sans cette copie, un réel rattaché à une annonce Mode resterait invisible
    // dans cet onglet malgré le rattachement réussi.
    const { db, transaction, refFor } = makeReelsDb({
      reelData: { createdBy: 'uid-1', propertyId: null },
      propertyData: { createdBy: 'uid-1', categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Vêtements' } },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({ action: 'attach-property', reelId: 'reel-1', propertyId: 'property-1' }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, reelId: 'reel-1' })
    expect(transaction.update).toHaveBeenCalledWith(
      refFor('reels', 'reel-1'),
      expect.objectContaining({
        propertyId: 'property-1',
        categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Vêtements' },
      }),
    )
  })

  it('classe par defaut Immobilier au rattachement quand l annonce n a pas son propre categoryPath', async () => {
    // Meme repli qu'a la creation (voir le test equivalent plus haut) : une annonce immobilier
    // n'ecrit jamais categoryPath elle-meme, donc sans ce repli sur typeProperty, tout rattachement
    // a de l'immobilier laisserait le reel invisible dans l'onglet "Immobilier" du fil public.
    const { db, transaction, refFor } = makeReelsDb({
      reelData: { createdBy: 'uid-1', propertyId: null },
      propertyData: { createdBy: 'uid-1', typeProperty: 'Villa' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({ action: 'attach-property', reelId: 'reel-1', propertyId: 'property-1' }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, reelId: 'reel-1' })
    expect(transaction.update).toHaveBeenCalledWith(
      refFor('reels', 'reel-1'),
      expect.objectContaining({
        propertyId: 'property-1',
        categoryPath: { lvl0: 'Immobilier' },
      }),
    )
  })

  it('refuse de rattacher un reel deja rattache', async () => {
    const { db, transaction } = makeReelsDb({
      reelData: { createdBy: 'uid-1', propertyId: 'property-existing' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({ action: 'attach-property', reelId: 'reel-1', propertyId: 'property-1' }),
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({ success: false, code: 'REEL_ALREADY_ATTACHED' })
    expect(transaction.update).not.toHaveBeenCalled()
  })

  it('renvoie la vidéo déjà publiée comme nouveau brut à recouper (retrim)', async () => {
    const { db, transaction, refFor } = makeReelsDb({
      reelData: { createdBy: 'uid-1', processingStatus: 'ready', contact: '+24166000000', description: 'Avant' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({
        action: 'retrim',
        reelId: 'reel-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mp4',
        trimStartSeconds: 1.5,
        trimEndSeconds: 6,
        muted: true,
        contact: '+24177112233',
        description: 'Nouveau montage',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, reelId: 'reel-1' })
    expect(transaction.update).toHaveBeenCalledWith(
      refFor('reels', 'reel-1'),
      expect.objectContaining({
        processingStatus: 'uploading',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mp4',
        trimStartSeconds: 1.5,
        trimEndSeconds: 6,
        muted: true,
        contact: '+24177112233',
        description: 'Nouveau montage',
      }),
    )
  })

  it('accepte un retrim sur un réel dont le traitement précédent avait échoué', async () => {
    const { db, transaction } = makeReelsDb({
      reelData: { createdBy: 'uid-1', processingStatus: 'failed', processingError: 'Codec non supporté.' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({
        action: 'retrim',
        reelId: 'reel-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mp4',
        trimStartSeconds: 0,
        trimEndSeconds: 4,
        contact: '',
        description: '',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true })
    expect(transaction.update).toHaveBeenCalled()
  })

  it('refuse un retrim pendant qu un traitement est déjà en cours', async () => {
    const { db, transaction } = makeReelsDb({
      reelData: { createdBy: 'uid-1', processingStatus: 'processing' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({
        action: 'retrim',
        reelId: 'reel-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mp4',
        trimStartSeconds: 0,
        trimEndSeconds: 4,
        contact: '',
        description: '',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({ success: false, code: 'REEL_STATUS_CHANGED' })
    expect(transaction.update).not.toHaveBeenCalled()
  })

  it('refuse un retrim dont la fin du montage est avant le début', async () => {
    const { db } = makeReelsDb({
      reelData: { createdBy: 'uid-1', processingStatus: 'ready' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({
        action: 'retrim',
        reelId: 'reel-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mp4',
        trimStartSeconds: 5,
        trimEndSeconds: 2,
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({ success: false, code: 'INVALID_TRIM_RANGE' })
  })

  it('refuse un retrim sur un réel appartenant à un autre annonceur', async () => {
    const { db, transaction } = makeReelsDb({
      reelData: { createdBy: 'other-uid', processingStatus: 'ready' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({
        action: 'retrim',
        reelId: 'reel-1',
        rawVideoPath: 'reels-raw/uid-1/reel-1.mp4',
        trimStartSeconds: 0,
        trimEndSeconds: 4,
        contact: '',
        description: '',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({ success: false, code: 'FORBIDDEN_REEL' })
    expect(transaction.update).not.toHaveBeenCalled()
  })

  it('refuse un retrim avec un rawVideoPath qui ne correspond pas à l utilisateur', async () => {
    const { db } = makeReelsDb({
      reelData: { createdBy: 'uid-1', processingStatus: 'ready' },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(
      makeRequest({
        action: 'retrim',
        reelId: 'reel-1',
        rawVideoPath: 'reels-raw/someone-else/reel-1.mp4',
        trimStartSeconds: 0,
        trimEndSeconds: 4,
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({ success: false, code: 'INVALID_RAW_VIDEO_PATH' })
  })

  it('refuse une action de modification inconnue', async () => {
    const { db } = makeReelsDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await patchReel(makeRequest({ action: 'bogus-action', reelId: 'reel-1' }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({ success: false, code: 'INVALID_ACTION' })
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

  it('traite une suppression sur un reel deja absent comme un succes idempotent', async () => {
    const storageMocks = mockStorage()
    const { db, transaction } = makeReelsDb({ reelData: null })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await deleteReel(makeRequest({ reelId: 'reel-1' }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ success: true, reelId: 'reel-1' })
    expect(transaction.delete).not.toHaveBeenCalled()
    expect(storageMocks.deleteFile).not.toHaveBeenCalled()
  })

  it('refuse de supprimer un reel qui appartient a un autre annonceur', async () => {
    const { db, transaction } = makeReelsDb({ reelData: { createdBy: 'other-uid' } })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await deleteReel(makeRequest({ reelId: 'reel-1' }))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toMatchObject({ success: false, code: 'FORBIDDEN_REEL' })
    expect(transaction.delete).not.toHaveBeenCalled()
  })

  it('traduit une exception inattendue en 500', async () => {
    const { db } = makeReelsDb()
    db.runTransaction = jest.fn(async () => {
      throw new Error('firestore unavailable')
    }) as unknown as typeof db.runTransaction
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await deleteReel(makeRequest({ reelId: 'reel-1' }))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload).toMatchObject({ success: false, code: 'INTERNAL_SERVER_ERROR' })
  })
})
