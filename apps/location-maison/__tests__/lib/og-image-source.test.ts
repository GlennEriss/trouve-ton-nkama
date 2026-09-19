const sharpToBuffer = jest.fn()
const sharpPng = jest.fn(() => ({ toBuffer: sharpToBuffer }))
const sharpMock = jest.fn(() => ({ png: sharpPng }))

jest.mock('sharp', () => ({
  __esModule: true,
  default: sharpMock,
}))

import { isRemoteWebp, prepareOgImageSource } from '@/lib/seo/og-image-source'

describe('OG image source', () => {
  const fallback = 'https://tonnkama.com/assets/og_img.png'
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('reconnait un WebP Firebase dont le chemin est encode dans l URL', () => {
    expect(
      isRemoteWebp(
        'https://firebasestorage.googleapis.com/v0/b/bucket/o/property%2Flisting%2F01.webp?alt=media&token=x',
      ),
    ).toBe(true)
  })

  it('laisse les JPEG distants inchanges sans les telecharger', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as typeof fetch

    const source = await prepareOgImageSource('https://cdn.example/photo.jpeg', fallback)

    expect(source).toBe('https://cdn.example/photo.jpeg')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('convertit un WebP distant en data URL PNG compatible avec next/og', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    }) as typeof fetch
    sharpToBuffer.mockResolvedValue(Buffer.from('png-content'))

    const source = await prepareOgImageSource('https://cdn.example/photo.webp', fallback)

    expect(sharpMock).toHaveBeenCalledWith(Buffer.from([1, 2, 3]))
    expect(sharpPng).toHaveBeenCalledWith({ compressionLevel: 8 })
    expect(source).toBe(`data:image/png;base64,${Buffer.from('png-content').toString('base64')}`)
  })

  it('utilise l image de secours si le telechargement ou la conversion echoue', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network failure')) as typeof fetch

    await expect(prepareOgImageSource('https://cdn.example/photo.webp', fallback)).resolves.toBe(fallback)
  })
})
