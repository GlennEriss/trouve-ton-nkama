export {};
let GET: typeof import('@/app/api/og/property/[id]/route').GET

const getPublicPropertyById = jest.fn()

jest.mock('next/og', () => ({
  ImageResponse: jest.fn(function (this: any, element: unknown, options: unknown) {
    this.element = element
    this.options = options
  }),
}))
jest.mock('@/lib/seo/public-listings', () => ({ getPublicPropertyById }))
jest.mock('@/lib/property-images', () => ({
  getPrimaryPropertyImageUrl: (images: unknown) => (Array.isArray(images) && images.length > 0 ? `https://cdn/${images[0]}` : null),
}))
jest.mock('@/lib/seo/listing-share', () => ({
  formatListingPrice: () => '250 000 FCFA/mois',
  getListingLocationLabel: () => 'Nkembo, Libreville',
  getListingStatusLabel: () => 'À louer',
}))

const params = (id: string) => Promise.resolve({ id })

describe('/api/og/property/[id]', () => {
  const originalEnv = process.env
  beforeAll(async () => {
    // FALLBACK_IMAGE_URL est calculee au chargement du module: fixer l'env avant l'import.
    process.env = { ...originalEnv, NEXT_PUBLIC_HOST: 'https://tonnkama.com' }
    ;({ GET } = await import('@/app/api/og/property/[id]/route'))
  })
  beforeEach(() => {
    jest.clearAllMocks()
  })
  afterAll(() => {
    process.env = originalEnv
  })

  it('genere une image 1200x630 avec la photo et le bandeau prix/quartier', async () => {
    getPublicPropertyById.mockResolvedValueOnce({
      images: ['p1.jpg'],
      status: 'IN_PROGRESS',
      price: 250000,
    })
    const { ImageResponse } = await import('next/og')
    const response = (await GET({} as any, { params: params('prop-1') })) as unknown as { options: unknown }
    expect(response.options).toMatchObject({ width: 1200, height: 630 })
    expect(ImageResponse).toHaveBeenCalledTimes(1)
  })

  it('retombe sur l image de secours quand l annonce est introuvable', async () => {
    getPublicPropertyById.mockResolvedValueOnce(null)
    await GET({} as any, { params: params('missing') })
    const { ImageResponse } = await import('next/og')
    const [element] = (ImageResponse as unknown as jest.Mock).mock.calls[0]
    const img = element.props.children[0]
    expect(img.props.src).toBe('https://tonnkama.com/assets/og_img.png')
    // pas de bandeau prix/quartier quand l'annonce est introuvable
    expect(element.props.children[1]).toBeFalsy()
  })

  it('retombe sur l image de secours quand l annonce n a pas de photo', async () => {
    getPublicPropertyById.mockResolvedValueOnce({ images: [], status: 'IN_PROGRESS', price: 100 })
    await GET({} as any, { params: params('no-photo') })
    const { ImageResponse } = await import('next/og')
    const [element] = (ImageResponse as unknown as jest.Mock).mock.calls[0]
    const img = element.props.children[0]
    expect(img.props.src).toBe('https://tonnkama.com/assets/og_img.png')
  })
})
