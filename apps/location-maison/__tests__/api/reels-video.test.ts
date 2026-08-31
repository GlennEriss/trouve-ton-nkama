import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

import { auth } from '@/next-auth/auth'

let getVideo: typeof import('@/app/api/reels/[reelId]/video/route').GET

class MockResponse {
  status: number
  headers: Headers
  _body: unknown
  constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    this._body = body
    this.status = init?.status ?? 200
    this.headers = new Headers(init?.headers ?? {})
  }
  async json() {
    return this._body
  }
  static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
    return new MockResponse(body, init)
  }
}

jest.mock('next/server', () => ({ NextResponse: MockResponse }))

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

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(),
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

function makeStorage(downloadResult: Buffer | Error) {
  const download = jest.fn(async () => {
    if (downloadResult instanceof Error) throw downloadResult
    return [downloadResult]
  })
  const file = jest.fn(() => ({ download }))
  const bucket = jest.fn(() => ({ file }))
  ;(getStorage as jest.Mock).mockReturnValue({ bucket })
  return { bucket, file, download }
}

function callRoute(reelId: string) {
  return getVideo({} as never, { params: Promise.resolve({ reelId }) }) as unknown as Promise<MockResponse>
}

const ownedReadyReel = {
  createdBy: 'owner-uid',
  processingStatus: 'ready',
  videoPath: 'reels/owner-uid/reel-1/video.mp4',
}

describe('/api/reels/[reelId]/video', () => {
  beforeAll(async () => {
    ;({ GET: getVideo } = await import('@/app/api/reels/[reelId]/video/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue(null)
  })

  it('refuse une requete sans id', async () => {
    const response = await getVideo({} as never, { params: Promise.resolve({ reelId: '' }) }) as unknown as MockResponse
    expect(response.status).toBe(400)
    expect(getFirestore).not.toHaveBeenCalled()
  })

  it('refuse un visiteur non connecte', async () => {
    const db = makeDb(ownedReadyReel)
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await callRoute('reel-1')

    expect(response.status).toBe(401)
    expect(db.collection).not.toHaveBeenCalled()
  })

  it('renvoie 404 pour un reel inexistant', async () => {
    const db = makeDb(null)
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'owner-uid' } })

    const response = await callRoute('reel-1')

    expect(response.status).toBe(404)
  })

  it("masque comme introuvable un reel qui n'appartient pas au visiteur connecte", async () => {
    const db = makeDb(ownedReadyReel)
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'someone-else' } })

    const response = await callRoute('reel-1')

    expect(response.status).toBe(404)
  })

  it("renvoie 404 si le reel n'a pas encore de videoPath", async () => {
    const db = makeDb({ ...ownedReadyReel, videoPath: undefined })
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'owner-uid' } })

    const response = await callRoute('reel-1')

    expect(response.status).toBe(404)
  })

  it('sert les octets vidéo au propriétaire via le Storage Admin SDK', async () => {
    const db = makeDb(ownedReadyReel)
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'owner-uid' } })
    const fakeVideoBytes = Buffer.from('fake-mp4-bytes')
    const { file } = makeStorage(fakeVideoBytes)

    const response = await callRoute('reel-1')

    expect(response.status).toBe(200)
    expect(file).toHaveBeenCalledWith('reels/owner-uid/reel-1/video.mp4')
    expect(response.headers.get('Content-Type')).toBe('video/mp4')
    expect(Buffer.from(response._body as Uint8Array).toString()).toBe('fake-mp4-bytes')
  })

  it('traduit une exception Storage inattendue en 500', async () => {
    const db = makeDb(ownedReadyReel)
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'owner-uid' } })
    makeStorage(new Error('storage unavailable'))

    const response = await callRoute('reel-1')

    expect(response.status).toBe(500)
  })
})
