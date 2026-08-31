const authState = {
  auth: {
    currentUser: {
      uid: 'owner-1',
      getIdToken: jest.fn().mockResolvedValue('firebase-token'),
    } as { uid: string; getIdToken: jest.Mock } | null,
  },
}

const firestore = {
  db: { name: 'test-db' },
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  where: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  startAfter: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: { fromDate: jest.fn((date: Date) => ({ date })) },
}

const storage = {
  storage: { name: 'test-storage' },
  ref: jest.fn(),
  uploadBytes: jest.fn(),
}

jest.mock('@/firebase/auth', () => authState)
jest.mock('@/firebase/firestore', () => firestore)
jest.mock('@/firebase/storage', () => storage)

import {
  attachReelToProperty,
  buildRawReelVideoPath,
  createReel,
  deleteReel,
  getPublicReels,
  getReelById,
  getReelsByOwner,
  markReelUploadFailed,
  subscribeToReel,
  updateReelDetails,
  uploadRawReelVideo,
} from '@/db/reel.db'

const fetchMock = jest.fn()

function reelDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data, exists: () => true }
}

function response(body: Record<string, unknown>, ok = true) {
  return { ok, json: jest.fn().mockResolvedValue(body) }
}

describe('reel database and API client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    authState.auth.currentUser = {
      uid: 'owner-1',
      getIdToken: jest.fn().mockResolvedValue('firebase-token'),
    }
    Object.defineProperty(global, 'fetch', { configurable: true, value: fetchMock })
    fetchMock.mockResolvedValue(response({ success: true, reelId: 'reel-1' }))
    firestore.collection.mockImplementation((_db, name) => ({ name }))
    firestore.doc.mockImplementation((_db, collectionName, id) => ({ collectionName, id }))
    firestore.where.mockImplementation((...args) => ({ kind: 'where', args }))
    firestore.orderBy.mockImplementation((...args) => ({ kind: 'orderBy', args }))
    firestore.limit.mockImplementation((value) => ({ kind: 'limit', value }))
    firestore.startAfter.mockImplementation((value) => ({ kind: 'startAfter', value }))
    firestore.query.mockImplementation((...args) => ({ args }))
    storage.ref.mockImplementation((_storage, path) => ({ path }))
    storage.uploadBytes.mockResolvedValue({})
  })

  it('construit un chemin brut stable avec extension ou mp4 par defaut', () => {
    expect(buildRawReelVideoPath(new File([], 'visite.MOV'), 'owner-1', 'reel-1'))
      .toBe('reels-raw/owner-1/reel-1.MOV')
    expect(buildRawReelVideoPath(new File([], 'video'), 'owner-1', 'reel-2'))
      .toBe('reels-raw/owner-1/reel-2.mp4')
  })

  it('cree un reel via l API avec toutes les options', async () => {
    await expect(createReel(
      'reel-1',
      null,
      'owner-1',
      'reels-raw/owner-1/reel-1.mov',
      '+24166545430',
      'Studio lumineux',
      { trimStartSeconds: 1, trimEndSeconds: 4, muted: true },
    )).resolves.toBe('reel-1')

    expect(fetchMock).toHaveBeenCalledWith('/api/reels', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer firebase-token' }),
      body: JSON.stringify({
        reelId: 'reel-1',
        propertyId: null,
        rawVideoPath: 'reels-raw/owner-1/reel-1.mov',
        contact: '+24166545430',
        description: 'Studio lumineux',
        trimStartSeconds: 1,
        trimEndSeconds: 4,
        muted: true,
      }),
    }))
  })

  it('refuse la creation sans session ou pour un autre proprietaire', async () => {
    authState.auth.currentUser = null
    await expect(createReel('reel-1', null, 'owner-1', 'raw.mov')).rejects.toThrow('Session Firebase')

    authState.auth.currentUser = {
      uid: 'owner-2',
      getIdToken: jest.fn().mockResolvedValue('token'),
    }
    await expect(createReel('reel-1', null, 'owner-1', 'raw.mov')).rejects.toThrow('Session Firebase')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('remonte le message serveur lors d un echec de creation', async () => {
    fetchMock.mockResolvedValue(response({ success: false, message: 'Identifiant deja utilise' }, false))
    await expect(createReel('reel-1', null, 'owner-1', 'raw.mov'))
      .rejects.toThrow('Identifiant deja utilise')
  })

  it('rattache un reel et retourne false si l API refuse', async () => {
    fetchMock.mockResolvedValueOnce(response({ success: true }))
    await expect(attachReelToProperty('reel-1', 'property-1')).resolves.toBe(true)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/reels', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ action: 'attach-property', reelId: 'reel-1', propertyId: 'property-1' }),
    }))

    fetchMock.mockResolvedValueOnce(response({ success: false, message: 'Deja rattache' }, false))
    await expect(attachReelToProperty('reel-1', 'property-2')).resolves.toBe(false)
  })

  it('modifie les details et remonte une erreur metier', async () => {
    fetchMock.mockResolvedValueOnce(response({ success: true }))
    await expect(updateReelDetails('reel-1', '066545430', 'Nouvelle description')).resolves.toBe(true)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/reels', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        action: 'update-details',
        reelId: 'reel-1',
        contact: '066545430',
        description: 'Nouvelle description',
      }),
    }))

    fetchMock.mockResolvedValueOnce(response({ success: false, message: 'Interdit' }, false))
    await expect(updateReelDetails('reel-1', '', '')).rejects.toThrow('Interdit')
  })

  it('supprime un reel authentifie', async () => {
    fetchMock.mockResolvedValue(response({ success: true }))
    await expect(deleteReel('reel-1')).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('/api/reels', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ reelId: 'reel-1' }),
    }))
  })

  it('marque un upload echoue sans propager l erreur API', async () => {
    fetchMock.mockResolvedValueOnce(response({ success: true }))
    await expect(markReelUploadFailed('reel-1', 'Fichier invalide')).resolves.toBe(true)

    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await expect(markReelUploadFailed('reel-1', 'Fichier invalide')).resolves.toBe(false)
  })

  it('pagine les reels du proprietaire avec dates et curseur', async () => {
    const docs = [reelDoc('reel-1', { createdBy: 'owner-1' }), reelDoc('reel-2', { createdBy: 'owner-1' })]
    firestore.getDoc.mockResolvedValue({ exists: () => true, id: 'cursor-1' })
    firestore.getDocs.mockResolvedValue({ docs })
    const startDate = new Date('2026-01-01T00:00:00Z')
    const endDate = new Date('2026-12-31T23:59:59Z')

    await expect(getReelsByOwner('owner-1', {
      limitPerPage: 2,
      cursor: 'cursor-1',
      startDate,
      endDate,
    })).resolves.toEqual({
      reels: [
        { id: 'reel-1', createdBy: 'owner-1' },
        { id: 'reel-2', createdBy: 'owner-1' },
      ],
      nextCursor: 'reel-2',
    })

    expect(firestore.Timestamp.fromDate).toHaveBeenCalledWith(startDate)
    expect(firestore.Timestamp.fromDate).toHaveBeenCalledWith(endDate)
    expect(firestore.startAfter).toHaveBeenCalled()
  })

  it('lit un reel par identifiant ou retourne null', async () => {
    firestore.getDoc.mockResolvedValueOnce(reelDoc('reel-1', { description: 'Test' }))
    await expect(getReelById('reel-1')).resolves.toEqual({ id: 'reel-1', description: 'Test' })

    firestore.getDoc.mockResolvedValueOnce({ exists: () => false })
    await expect(getReelById('missing')).resolves.toBeNull()
  })

  it('ne sert que les reels publics et calcule le curseur suivant', async () => {
    const docs = [
      reelDoc('reel-1', { processingStatus: 'ready', moderationStatus: 'APPROVED' }),
      reelDoc('reel-2', { processingStatus: 'ready', moderationStatus: 'APPROVED' }),
    ]
    firestore.getDocs.mockResolvedValue({ docs })

    await expect(getPublicReels({ limitPerPage: 2, cursor: null })).resolves.toEqual({
      reels: [
        expect.objectContaining({ id: 'reel-1' }),
        expect.objectContaining({ id: 'reel-2' }),
      ],
      nextCursor: 'reel-2',
    })
    expect(firestore.where).toHaveBeenCalledWith('processingStatus', '==', 'ready')
    expect(firestore.where).toHaveBeenCalledWith('moderationStatus', '==', 'APPROVED')
  })

  it('upload la video brute avec les metadonnees de proprietaire', async () => {
    const file = new File(['video'], 'visite.mov', { type: 'video/quicktime' })
    await expect(uploadRawReelVideo(file, 'owner-1', 'reel-1'))
      .resolves.toBe('reels-raw/owner-1/reel-1.mov')

    expect(storage.uploadBytes).toHaveBeenCalledWith(
      { path: 'reels-raw/owner-1/reel-1.mov' },
      file,
      { customMetadata: { owner: 'owner-1', reelId: 'reel-1' } },
    )
  })

  it.each([
    ['storage/unauthorized', "Vous n'avez pas l'autorisation d'uploader cette vidéo."],
    ['storage/canceled', 'Envoi annulé.'],
    ['storage/retry-limit-exceeded', 'Envoi trop long (délai dépassé). Vérifiez la connexion puis réessayez.'],
  ])('traduit l erreur Storage %s', async (code, expectedMessage) => {
    storage.uploadBytes.mockRejectedValue(Object.assign(new Error('provider message'), { code }))
    const file = new File(['video'], 'visite.mov')
    await expect(uploadRawReelVideo(file, 'owner-1', 'reel-1')).rejects.toThrow(expectedMessage)
  })

  it('abonne puis desabonne proprement un reel', async () => {
    const unsubscribe = jest.fn()
    const onChange = jest.fn()
    firestore.onSnapshot.mockImplementation((_ref, next) => {
      next(reelDoc('reel-1', { description: 'En direct' }))
      return unsubscribe
    })

    const stop = subscribeToReel('reel-1', onChange)
    await Promise.resolve()
    await Promise.resolve()

    expect(onChange).toHaveBeenCalledWith({ id: 'reel-1', description: 'En direct' })
    stop()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
