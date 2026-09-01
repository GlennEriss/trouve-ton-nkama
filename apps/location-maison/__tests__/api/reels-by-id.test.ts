import { getFirestore } from 'firebase-admin/firestore'

import { auth } from '@/next-auth/auth'

let getReel: typeof import('@/app/api/reels/[reelId]/route').GET

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
}))

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}))

jest.mock('@/next-auth/auth', () => ({
  auth: jest.fn(),
}))

function makeSnapshot(data: Record<string, unknown> | null, id = 'reel-1') {
  return {
    exists: Boolean(data),
    id,
    data: () => data,
  }
}

function makeDb(reelData: Record<string, unknown> | null) {
  const get = jest.fn(async () => makeSnapshot(reelData))
  const doc = jest.fn(() => ({ get }))
  const collection = jest.fn(() => ({ doc }))
  return { collection, doc, get }
}

function callRoute(reelId: string) {
  return getReel({} as never, { params: Promise.resolve({ reelId }) })
}

const approvedReel = {
  createdBy: 'owner-uid',
  processingStatus: 'ready',
  moderationStatus: 'APPROVED',
  description: 'Villa avec piscine.',
}

describe('/api/reels/[reelId]', () => {
  beforeAll(async () => {
    ;({ GET: getReel } = await import('@/app/api/reels/[reelId]/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(null)
  })

  it('refuse une requete sans id', async () => {
    const response = await getReel({} as never, { params: Promise.resolve({ reelId: '' }) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
    expect(getFirestore).not.toHaveBeenCalled()
  })

  it('sert un reel public approuve a un visiteur anonyme', async () => {
    const db = makeDb(approvedReel)
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await callRoute('reel-1')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ reel: { id: 'reel-1', ...approvedReel } })
  })

  it("masque comme introuvable un reel non approuve pour un visiteur anonyme", async () => {
    const db = makeDb({ ...approvedReel, moderationStatus: 'PENDING' })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await callRoute('reel-1')
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
  })

  it("masque comme introuvable un reel non approuve pour un utilisateur connecte qui n'en est pas le proprietaire", async () => {
    const db = makeDb({ ...approvedReel, moderationStatus: 'PENDING' })
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'someone-else' } })

    const response = await callRoute('reel-1')
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
  })

  it("laisse le proprietaire lire son propre reel encore en attente de moderation (bug rapporte)", async () => {
    const db = makeDb({ ...approvedReel, moderationStatus: 'PENDING' })
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'owner-uid' } })

    const response = await callRoute('reel-1')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ reel: { moderationStatus: 'PENDING', createdBy: 'owner-uid' } })
  })

  it('laisse le proprietaire lire son propre reel rejete', async () => {
    const db = makeDb({ ...approvedReel, moderationStatus: 'REJECTED' })
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'owner-uid' } })

    const response = await callRoute('reel-1')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ reel: { moderationStatus: 'REJECTED' } })
  })

  it('renvoie 404 pour un reel inexistant', async () => {
    const db = makeDb(null)
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'owner-uid' } })

    const response = await callRoute('reel-inconnu')
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
  })

  it("ne plante pas si la session NextAuth echoue a se resoudre (traite comme anonyme)", async () => {
    const db = makeDb(approvedReel)
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockRejectedValue(new Error('session lookup failed'))

    const response = await callRoute('reel-1')
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ reel: { id: 'reel-1' } })
  })
})
