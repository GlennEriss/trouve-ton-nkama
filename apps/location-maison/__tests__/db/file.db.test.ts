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

import { createFile } from '@/db/file.db'

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
})
