const storage = {
  storage: { name: 'test-storage' },
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  updateMetadata: jest.fn(),
}

const mockImageCompression = jest.fn()

jest.mock('@/firebase/storage', () => storage)
jest.mock('browser-image-compression', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockImageCompression(...args),
}))

import { createFile, uploadPropertyImages } from '@/db/file.db'

const BUCKET = 'location-maison-prod.firebasestorage.app'

function metadata(fullPath: string, downloadTokens: string[] | undefined) {
  return { bucket: BUCKET, fullPath, downloadTokens }
}

function refFor(fullPath: string) {
  return { fullPath }
}

describe('createFile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storage.ref.mockImplementation((_storage: unknown, path: string) => refFor(path))
    // La vignette est best-effort : on la neutralise pour isoler le chemin de l'image principale.
    mockImageCompression.mockRejectedValue(new Error('compression indisponible'))
  })

  it("construit l'URL depuis les metadonnees de l'upload sans appeler getDownloadURL", async () => {
    const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
    storage.uploadBytes.mockResolvedValue({
      metadata: metadata('property/1700studio.jpg', ['tok-123']),
    })

    const image = await createFile(file, 'announcer-1', 'property')

    // Le round-trip supprimé est précisément celui qui tombait en timeout en prod alors que
    // les octets étaient déjà stockés.
    expect(storage.getDownloadURL).not.toHaveBeenCalled()
    expect(image.fileURL).toBe(
      `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/property%2F1700studio.jpg?alt=media&token=tok-123`,
    )
    // filePATH vient de la reference Storage, horodatee par timestampedFileName.
    expect(image.filePATH).toMatch(/^property\/\d+studio\.jpg$/)
  })

  it('encode les caracteres speciaux du chemin dans l URL construite', async () => {
    const file = new File(['photo'], 'plan appartement (1).jpg', { type: 'image/jpeg' })
    storage.uploadBytes.mockResolvedValue({
      metadata: metadata('property/plan appartement (1).jpg', ['tok-456']),
    })

    const image = await createFile(file, 'announcer-1', 'property')

    expect(image.fileURL).toContain('property%2Fplan%20appartement%20(1).jpg')
  })

  it('retombe sur getDownloadURL quand l upload ne renvoie pas de token', async () => {
    const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
    storage.uploadBytes.mockResolvedValue({
      metadata: metadata('property/1700studio.jpg', undefined),
    })
    storage.getDownloadURL.mockResolvedValue('https://cdn.test/fallback.jpg')

    const image = await createFile(file, 'announcer-1', 'property')

    expect(storage.getDownloadURL).toHaveBeenCalledTimes(1)
    expect(image.fileURL).toBe('https://cdn.test/fallback.jpg')
  })

  it('reessaie getDownloadURL apres un echec reseau transitoire', async () => {
    const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
    storage.uploadBytes.mockResolvedValue({
      metadata: metadata('property/1700studio.jpg', undefined),
    })
    storage.getDownloadURL
      .mockRejectedValueOnce(new Error('network glitch'))
      .mockResolvedValueOnce('https://cdn.test/after-retry.jpg')

    const image = await createFile(file, 'announcer-1', 'property')

    expect(storage.getDownloadURL).toHaveBeenCalledTimes(2)
    expect(image.fileURL).toBe('https://cdn.test/after-retry.jpg')
  })

  it('remonte une erreur lisible quand toutes les tentatives echouent', async () => {
    const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
    storage.uploadBytes.mockResolvedValue({
      metadata: metadata('property/1700studio.jpg', undefined),
    })
    storage.getDownloadURL.mockRejectedValue(new Error('network down'))

    await expect(createFile(file, 'announcer-1', 'property')).rejects.toThrow('network down')
    expect(storage.getDownloadURL).toHaveBeenCalledTimes(3)
  })

  it('joint la vignette quand sa generation aboutit', async () => {
    const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
    mockImageCompression.mockResolvedValue(new File(['thumb'], 'studio.jpg', { type: 'image/jpeg' }))
    storage.uploadBytes
      .mockResolvedValueOnce({ metadata: metadata('property/1700studio.jpg', ['tok-full']) })
      .mockResolvedValueOnce({ metadata: metadata('property/thumb_1700studio.jpg', ['tok-thumb']) })

    const image = await createFile(file, 'announcer-1', 'property')

    expect(storage.getDownloadURL).not.toHaveBeenCalled()
    expect(image.thumbURL).toContain('token=tok-thumb')
    expect(image.thumbPATH).toMatch(/^property\/thumb_\d+studio\.jpg$/)
  })

  it("n echoue pas l upload principal si la vignette casse", async () => {
    const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
    mockImageCompression.mockResolvedValue(new File(['thumb'], 'studio.jpg', { type: 'image/jpeg' }))
    storage.uploadBytes
      .mockResolvedValueOnce({ metadata: metadata('property/1700studio.jpg', ['tok-full']) })
      .mockRejectedValueOnce(new Error('thumb upload failed'))

    const image = await createFile(file, 'announcer-1', 'property')

    expect(image.fileURL).toContain('token=tok-full')
    expect(image.thumbURL).toBeUndefined()
  })

  // docs/performance-creation-modification-annonces-reels.md, point 3 : la compression de
  // vignette et l'upload principal doivent démarrer en parallèle, pas l'un après l'autre.
  describe('parallélisation vignette / upload principal', () => {
    it('la compression de la vignette démarre avant que l\'upload principal ne se résolve', async () => {
      const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
      let resolveMainUpload!: (value: { metadata: ReturnType<typeof metadata> }) => void
      storage.uploadBytes.mockImplementationOnce(
        () => new Promise((resolve) => { resolveMainUpload = resolve }),
      )
      mockImageCompression.mockImplementation(async () => {
        // Si ce point est atteint, la compression a bien démarré avant que l'upload
        // principal (toujours en attente à cet instant) n'ait été résolu.
        expect(resolveMainUpload).toBeDefined()
        return new File(['thumb'], 'studio.jpg', { type: 'image/jpeg' })
      })
      storage.uploadBytes.mockResolvedValueOnce({ metadata: metadata('property/thumb_1700studio.jpg', ['tok-thumb']) })

      const promise = createFile(file, 'announcer-1', 'property')
      // Laisse les micro-imports (Promise.all storage + browser-image-compression) et le
      // démarrage de la compression s'exécuter avant de résoudre l'upload principal.
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockImageCompression).toHaveBeenCalled()
      resolveMainUpload({ metadata: metadata('property/1700studio.jpg', ['tok-full']) })

      const image = await promise
      expect(image.fileURL).toContain('token=tok-full')
      expect(image.thumbURL).toContain('token=tok-thumb')
    })

    it('createFile ne se resout pas avant le succes de l upload principal, meme si la vignette est deja prete', async () => {
      const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
      mockImageCompression.mockResolvedValue(new File(['thumb'], 'studio.jpg', { type: 'image/jpeg' }))
      let resolveMainUpload!: (value: { metadata: ReturnType<typeof metadata> }) => void
      storage.uploadBytes
        .mockImplementationOnce(() => new Promise((resolve) => { resolveMainUpload = resolve }))
        .mockResolvedValueOnce({ metadata: metadata('property/thumb_1700studio.jpg', ['tok-thumb']) })

      let settled = false
      const promise = createFile(file, 'announcer-1', 'property').then((image) => {
        settled = true
        return image
      })

      // Laisse la branche vignette (compression + upload, tous deux déjà résolus) se terminer
      // avant l'upload principal — createFile ne doit pourtant pas se résoudre avant lui.
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(settled).toBe(false)

      resolveMainUpload({ metadata: metadata('property/1700studio.jpg', ['tok-full']) })
      const image = await promise
      expect(settled).toBe(true)
      expect(image.fileURL).toContain('token=tok-full')
    })

    it('un echec de l upload principal rejette createFile meme si la vignette reussit', async () => {
      const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
      mockImageCompression.mockResolvedValue(new File(['thumb'], 'studio.jpg', { type: 'image/jpeg' }))
      storage.uploadBytes
        .mockRejectedValueOnce(new Error('main upload failed'))
        .mockResolvedValueOnce({ metadata: metadata('property/thumb_1700studio.jpg', ['tok-thumb']) })

      await expect(createFile(file, 'announcer-1', 'property')).rejects.toThrow('main upload failed')
    })

    it('aucune promesse rejetee non geree quand upload principal ET vignette echouent', async () => {
      const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
      const unhandled: unknown[] = []
      const onUnhandled = (reason: unknown) => unhandled.push(reason)
      process.on('unhandledRejection', onUnhandled)

      try {
        mockImageCompression.mockRejectedValue(new Error('compression failed'))
        storage.uploadBytes.mockRejectedValue(new Error('main upload failed'))

        await expect(createFile(file, 'announcer-1', 'property')).rejects.toThrow('main upload failed')
        // Laisse le temps à une éventuelle rejection non gérée de se manifester.
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(unhandled).toEqual([])
      } finally {
        process.off('unhandledRejection', onUnhandled)
      }
    })

    it('les deux references (principale et vignette) partagent le meme nom unique horodate', async () => {
      const file = new File(['photo'], 'studio.jpg', { type: 'image/jpeg' })
      mockImageCompression.mockResolvedValue(new File(['thumb'], 'studio.jpg', { type: 'image/jpeg' }))
      storage.uploadBytes
        .mockResolvedValueOnce({ metadata: metadata('property/1700studio.jpg', ['tok-full']) })
        .mockResolvedValueOnce({ metadata: metadata('property/thumb_1700studio.jpg', ['tok-thumb']) })

      const image = await createFile(file, 'announcer-1', 'property')

      const uniqueName = image.filePATH.split('/').pop()
      expect(image.thumbPATH).toBe(`property/thumb_${uniqueName}`)
    })
  })
})

// docs/performance-creation-modification-annonces-reels.md, point 4 : concurrence bornée
// (mapWithConcurrency) plutôt qu'un Promise.all illimité — service partagé par le hook
// immobilier et les deux pages IA.
describe('uploadPropertyImages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    storage.ref.mockImplementation((_storage: unknown, path: string) => refFor(path))
    mockImageCompression.mockRejectedValue(new Error('compression indisponible'))
  })

  it('tableau vide accepté', async () => {
    expect(await uploadPropertyImages([], 'announcer-1', 'property')).toEqual([])
    expect(storage.uploadBytes).not.toHaveBeenCalled()
  })

  it('convertit un Blob en File nommé image_<index>.jpeg, comme avant la centralisation', async () => {
    const blob = new Blob(['photo'], { type: 'image/png' })
    storage.uploadBytes.mockResolvedValue({ metadata: metadata('property/1700image_0.jpeg', ['tok']) })

    await uploadPropertyImages([blob], 'announcer-1', 'property')

    // uploadBytes(fileRef, file, metadata) — le fichier est le 2e argument.
    const uploadedFile = storage.uploadBytes.mock.calls[0][1]
    expect(uploadedFile).toBeInstanceOf(File)
    expect(uploadedFile.name).toBe('image_0.jpeg')
  })

  it('conserve l\'ordre des images malgré des résolutions désordonnées, avec une concurrence bornée', async () => {
    const files = [0, 1, 2, 3, 4].map((i) => new File([`photo-${i}`], `photo-${i}.jpg`, { type: 'image/jpeg' }))
    const delaysMs = [30, 5, 20, 0, 10]
    let active = 0
    let maxActive = 0

    storage.uploadBytes.mockImplementation(async (_ref: unknown, file: File) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      const index = Number(file.name.match(/photo-(\d+)\.jpg/)?.[1])
      await new Promise((resolve) => setTimeout(resolve, delaysMs[index]))
      active -= 1
      return { metadata: metadata(`property/${file.name}`, [`tok-${index}`]) }
    })

    const images = await uploadPropertyImages(files, 'announcer-1', 'property', 2)

    expect(images.map((img) => img.fileURL)).toEqual(
      files.map((_, index) => expect.stringContaining(`tok-${index}`)),
    )
    // La vignette est neutralisée (mockImageCompression rejette) : un seul uploadBytes par
    // image (le principal), donc au plus concurrency(2) uploads Storage actifs en même temps.
    expect(maxActive).toBeLessThanOrEqual(2)
  })

  it('remonte une erreur enrichie avec l\'index et le nom du fichier fautif', async () => {
    const file = new File(['photo'], 'studio-cassee.jpg', { type: 'image/jpeg' })
    storage.uploadBytes.mockRejectedValue(new Error('storage/unauthorized'))

    await expect(uploadPropertyImages([file], 'announcer-1', 'property')).rejects.toMatchObject({
      index: 0,
      fileName: 'studio-cassee.jpg',
    })
  })

  it('n\'enrichit l\'erreur qu\'avec le nom du fichier, jamais son contenu', async () => {
    const file = new File(['contenu-sensible'], 'photo.jpg', { type: 'image/jpeg' })
    storage.uploadBytes.mockRejectedValue(new Error('boom'))

    const error = await uploadPropertyImages([file], 'announcer-1', 'property').catch((e) => e)
    expect(Object.keys(error)).toEqual(expect.arrayContaining(['index', 'fileName']))
    expect(error.fileName).toBe('photo.jpg')
  })
})
