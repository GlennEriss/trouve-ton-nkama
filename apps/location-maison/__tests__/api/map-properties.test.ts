const firestore = {
  db: {},
  collection: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}

jest.mock('@/firebase/firestore', () => firestore)
jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      headers: new Headers(),
      json: async () => payload,
    }),
  },
}))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

import { GET } from '@/app/api/map/properties/route'

describe('/api/map/properties', () => {
  const request = (url: string) => ({ url, headers: new Headers() }) as any

  beforeEach(() => {
    jest.clearAllMocks()
    firestore.collection.mockReturnValue({})
    firestore.where.mockImplementation((...args) => ({ where: args }))
    firestore.limit.mockImplementation((value) => ({ limit: value }))
    firestore.query.mockImplementation((...args) => ({ query: args }))
    firestore.getDocs.mockResolvedValue({ docs: [] })
  })

  it('exige un quartier', async () => {
    const response = await GET(request('http://localhost/api/map/properties'))
    expect(response.status).toBe(400)
    expect(firestore.getDocs).not.toHaveBeenCalled()
  })

  it('ne lit que les annonces publiques et plafonne les resultats', async () => {
    const response = await GET(request(
      'http://localhost/api/map/properties?quarter=Akebe&province=Estuaire&city=Libreville',
    ))

    expect(response.status).toBe(200)
    expect(firestore.where).toHaveBeenCalledWith('state', '==', 'IN_PROGRESS')
    expect(firestore.where).toHaveBeenCalledWith('moderationStatus', '==', 'APPROVED')
    expect(firestore.where).toHaveBeenCalledWith('province', '==', 'Estuaire')
    expect(firestore.where).toHaveBeenCalledWith('city', '==', 'Libreville')
    expect(firestore.limit).toHaveBeenCalledWith(200)
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=300')
  })
})
