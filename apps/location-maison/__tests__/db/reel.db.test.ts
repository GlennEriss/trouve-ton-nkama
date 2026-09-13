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
  uploadBytesResumable: jest.fn(),
}

/**
 * Fausse UploadTask Firebase (uploadBytesResumable) — voir
 * docs/performance-creation-modification-annonces-reels.md, point 6. `on('state_changed',
 * progressCb, errorCb, completeCb)` déclenche `progressCb` pour chaque snapshot fourni, puis
 * `completeCb` (succès) ou `errorCb` (échec) de façon asynchrone (microtask), comme le ferait
 * la tâche réelle.
 */
function makeFakeUploadTask(options: {
  snapshots?: Array<{ bytesTransferred: number; totalBytes: number }>
  error?: Error
} = {}) {
  const cancel = jest.fn(() => true)
  const task = {
    cancel,
    on: (
      _event: 'state_changed',
      progressCb?: (snapshot: { bytesTransferred: number; totalBytes: number }) => void,
      errorCb?: (error: Error) => void,
      completeCb?: () => void,
    ) => {
      queueMicrotask(() => {
        for (const snapshot of options.snapshots ?? []) {
          progressCb?.(snapshot)
        }
        if (options.error) {
          errorCb?.(options.error)
        } else {
          completeCb?.()
        }
      })
    },
  }
  return { task, cancel }
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
  retrimReel,
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
    storage.uploadBytesResumable.mockReturnValue(makeFakeUploadTask().task)
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

  it('recoupe un reel deja publie et remonte une erreur metier', async () => {
    fetchMock.mockResolvedValueOnce(response({ success: true }))
    await expect(retrimReel('reel-1', 'reels-published/owner-1/reel-1.mp4', 2, 8, true, '066545430', 'Nouvelle description'))
      .resolves.toBe(true)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/reels', expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({ Authorization: 'Bearer firebase-token' }),
      body: JSON.stringify({
        action: 'retrim',
        reelId: 'reel-1',
        rawVideoPath: 'reels-published/owner-1/reel-1.mp4',
        trimStartSeconds: 2,
        trimEndSeconds: 8,
        muted: true,
        contact: '066545430',
        description: 'Nouvelle description',
      }),
    }))

    fetchMock.mockResolvedValueOnce(response({ success: false, message: 'Traitement deja en cours' }, false))
    await expect(retrimReel('reel-1', 'reels-published/owner-1/reel-1.mp4', 2, 8, false, '', ''))
      .rejects.toThrow('Traitement deja en cours')
  })

  it('refuse le recoupage sans session Firebase', async () => {
    authState.auth.currentUser = null
    await expect(retrimReel('reel-1', 'reels-published/owner-1/reel-1.mp4', 0, 5, false, '', ''))
      .rejects.toThrow('Session Firebase')
    expect(fetchMock).not.toHaveBeenCalled()
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
    const docs = [
      reelDoc('reel-1', { createdBy: 'owner-1' }),
      reelDoc('reel-2', { createdBy: 'owner-1' }),
      reelDoc('reel-3', { createdBy: 'owner-1' }),
    ]
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
    expect(firestore.limit).toHaveBeenCalledWith(3)
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
      reelDoc('reel-3', { processingStatus: 'ready', moderationStatus: 'APPROVED' }),
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
    expect(firestore.limit).toHaveBeenCalledWith(3)
  })

  it('ne produit pas de curseur pour une derniere page exactement pleine', async () => {
    firestore.getDocs.mockResolvedValue({ docs: [
      reelDoc('reel-1', { processingStatus: 'ready' }),
      reelDoc('reel-2', { processingStatus: 'ready' }),
    ] })

    await expect(getPublicReels({ limitPerPage: 2, cursor: null })).resolves.toMatchObject({
      nextCursor: null,
    })
  })

  it('upload la video brute avec les metadonnees de proprietaire', async () => {
    const file = new File(['video'], 'visite.mov', { type: 'video/quicktime' })
    await expect(uploadRawReelVideo(file, 'owner-1', 'reel-1'))
      .resolves.toBe('reels-raw/owner-1/reel-1.mov')

    expect(storage.uploadBytesResumable).toHaveBeenCalledWith(
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
    storage.uploadBytesResumable.mockReturnValue(
      makeFakeUploadTask({ error: Object.assign(new Error('provider message'), { code }) }).task,
    )
    const file = new File(['video'], 'visite.mov')
    await expect(uploadRawReelVideo(file, 'owner-1', 'reel-1')).rejects.toThrow(expectedMessage)
  })

  // docs/performance-creation-modification-annonces-reels.md, point 6 : progression réelle
  // (abonnement state_changed, 0/intermédiaire/100 sans division par zéro) + annulation.
  describe('progression et annulation (upload Reel reprenable)', () => {
    it('abonnement correct a state_changed : progression 0, intermediaire et 100', async () => {
      storage.uploadBytesResumable.mockReturnValue(
        makeFakeUploadTask({
          snapshots: [
            { bytesTransferred: 0, totalBytes: 1000 },
            { bytesTransferred: 500, totalBytes: 1000 },
            { bytesTransferred: 1000, totalBytes: 1000 },
          ],
        }).task,
      )
      const onProgress = jest.fn()
      const file = new File(['video'], 'visite.mov')

      await uploadRawReelVideo(file, 'owner-1', 'reel-1', { onProgress })

      expect(onProgress.mock.calls.map(([p]) => p.percent)).toEqual([0, 50, 100])
    })

    it('ne divise jamais par zero quand totalBytes est absent/nul', async () => {
      storage.uploadBytesResumable.mockReturnValue(
        makeFakeUploadTask({ snapshots: [{ bytesTransferred: 0, totalBytes: 0 }] }).task,
      )
      const onProgress = jest.fn()

      await uploadRawReelVideo(new File(['video'], 'visite.mov'), 'owner-1', 'reel-1', { onProgress })

      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ percent: expect.any(Number) }))
      expect(Number.isNaN(onProgress.mock.calls[0][0].percent)).toBe(false)
    })

    it('resout avec le meme chemin apres succes, avec ou sans callback de progression', async () => {
      storage.uploadBytesResumable.mockReturnValue(makeFakeUploadTask().task)
      await expect(uploadRawReelVideo(new File(['video'], 'visite.mov'), 'owner-1', 'reel-1'))
        .resolves.toBe('reels-raw/owner-1/reel-1.mov')
    })

    it('annule la tache Storage quand le signal d\'abandon est declenche', async () => {
      const { task, cancel } = makeFakeUploadTask({
        // Ne se termine jamais : simule un envoi long, seule l'annulation compte ici.
        snapshots: [],
      })
      // Neutralise la résolution automatique pour ce test — on veut observer l'annulation,
      // pas la fin naturelle de l'upload.
      task.on = () => {}
      storage.uploadBytesResumable.mockReturnValue(task)

      const controller = new AbortController()
      const promise = uploadRawReelVideo(new File(['video'], 'visite.mov'), 'owner-1', 'reel-1', {
        signal: controller.signal,
      })
      // Laisse le "await getStorage()" interne se résoudre avant d'abandonner : le signal
      // reste "aborted" quoi qu'il arrive, donc l'ordre exact importe peu, seul le fait que
      // le listener finisse par être posé compte ici.
      await Promise.resolve()
      controller.abort()
      await Promise.resolve()

      expect(cancel).toHaveBeenCalledTimes(1)
      // La promesse reste volontairement pendante (task.on ne résout jamais) : on ne
      // l'attend pas, seul l'appel à cancel() est vérifié.
      void promise.catch(() => {})
    })

    it('annule la tache Storage quand le timeout d\'upload expire', async () => {
      jest.useFakeTimers()
      const { task, cancel } = makeFakeUploadTask({ snapshots: [] })
      task.on = () => {} // ne résout ni ne rejette jamais : seul le timeout doit intervenir
      storage.uploadBytesResumable.mockReturnValue(task)

      const promise = uploadRawReelVideo(new File(['video'], 'visite.mov'), 'owner-1', 'reel-1')
      const assertion = expect(promise).rejects.toThrow('Upload vidéo a pris trop de temps.')
      // Version asynchrone : laisse les microtasks (dont le "await getStorage()" interne, qui
      // doit se résoudre avant que withTimeout ne pose son setTimeout) s'intercaler entre
      // chaque avancée de l'horloge simulée — un advanceTimersByTime synchrone avancerait une
      // horloge sans qu'aucun minuteur n'ait encore été programmé.
      await jest.advanceTimersByTimeAsync(600_000)
      await assertion
      expect(cancel).toHaveBeenCalledTimes(1)

      jest.useRealTimers()
    })
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
