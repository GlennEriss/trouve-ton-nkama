import { hashIdempotencyPayload } from '@/lib/server/idempotency'
import { auth } from '@/next-auth/auth'
import { getFirestore } from 'firebase-admin/firestore'

let postCampaign: typeof import('@/app/api/advertising/campaigns/route').POST
let getCampaigns: typeof import('@/app/api/advertising/campaigns/route').GET

jest.mock('next/server', () => ({
  NextResponse: {
    json: (payload: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => payload,
    }),
  },
}))

jest.mock('@/next-auth/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/firebase/admin', () => ({
  adminApp: { name: 'test-admin-app' },
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => 1_000 })),
    fromMillis: jest.fn((ms: number) => ({ toMillis: () => ms })),
  },
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ __type: 'serverTimestamp' })),
  },
}))

type FakeDocRef = {
  __collection: string
  id: string
}

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const normalizedHeaders = new Map(
    Object.entries({
      'Content-Type': 'application/json',
      ...headers,
    }).map(([key, value]) => [key.toLowerCase(), value]),
  )

  return {
    headers: {
      get: (name: string) => normalizedHeaders.get(name.toLowerCase()) ?? null,
    },
    json: async () => body,
  } as Request
}

function makeSnapshot(data: Record<string, unknown> | null) {
  return {
    exists: Boolean(data),
    data: () => data,
  }
}

function makeDb(options: {
  idempotencyData?: Record<string, unknown> | null
  userCredits?: number
  campaigns?: Array<{ id: string; data: Record<string, unknown> }>
} = {}) {
  const userRef: FakeDocRef = { __collection: 'users', id: 'user-doc-1' }
  const transaction = {
    get: jest.fn(async (ref: FakeDocRef) => {
      if (ref.__collection === 'idempotency_keys') {
        return makeSnapshot(options.idempotencyData ?? null)
      }
      if (ref.__collection === 'users') {
        return makeSnapshot({ credits: options.userCredits ?? 100 })
      }
      return makeSnapshot(null)
    }),
    update: jest.fn(),
    set: jest.fn(),
    create: jest.fn(),
  }

  let docCounter = 0
  const batch = {
    update: jest.fn(),
    commit: jest.fn(async () => undefined),
  }
  const db = {
    collection: jest.fn((collectionName: string) => ({
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(async () => ({
            empty: false,
            docs: [
              {
                ref: userRef,
                data: () => ({ credits: options.userCredits ?? 100 }),
              },
            ],
          })),
        })),
        get: jest.fn(async () => ({
          docs: (options.campaigns ?? []).map((campaign) => ({
            id: campaign.id,
            data: () => campaign.data,
          })),
        })),
      })),
      doc: jest.fn((id?: string) => ({
        __collection: collectionName,
        id: id ?? `${collectionName}-${++docCounter}`,
      })),
    })),
    batch: jest.fn(() => batch),
    runTransaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  }

  return { db, transaction, batch }
}

const validBody = {
  packageId: 'discovery',
  creative: {
    imageURL: 'https://example.com/ad.png',
    headline: 'Titre pub',
    body: 'Message pub',
    ctaLabel: 'Visiter',
    ctaUrl: 'https://example.com',
  },
}

describe('/api/advertising/campaigns idempotency', () => {
  beforeAll(async () => {
    ;({ POST: postCampaign, GET: getCampaigns } = await import('@/app/api/advertising/campaigns/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as jest.Mock).mockResolvedValue({ user: { uid: 'uid-1' } })
  })

  it('refuse une publication payante sans cle idempotente', async () => {
    const { db } = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postCampaign(makeRequest(validBody))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    })
    expect(db.runTransaction).not.toHaveBeenCalled()
  })

  it('renvoie la campagne deja creee quand la meme cle est rejouee', async () => {
    const requestHash = hashIdempotencyPayload({
      packageId: 'discovery',
      creative: {
        imageURL: 'https://example.com/ad.png',
        videoURL: '',
        assets: null,
        headline: 'Titre pub',
        body: 'Message pub',
        ctaLabel: 'Visiter',
        ctaUrl: 'https://example.com',
      },
      targeting: null,
    })
    const { db, transaction } = makeDb({
      idempotencyData: {
        requestHash,
        status: 'completed',
        response: {
          campaignId: 'campaign-existing',
          creditsUsed: 15,
          creditsRemaining: 85,
        },
      },
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postCampaign(makeRequest(validBody, { 'Idempotency-Key': 'ad-key-1' }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      campaignId: 'campaign-existing',
      creditsUsed: 15,
      creditsRemaining: 85,
      replayed: true,
    })
    expect(transaction.update).not.toHaveBeenCalled()
    expect(transaction.set).not.toHaveBeenCalled()
    expect(transaction.create).not.toHaveBeenCalled()
  })

  it('enregistre la reponse idempotente lors de la premiere publication', async () => {
    const { db, transaction } = makeDb({ userCredits: 100 })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postCampaign(makeRequest(validBody, { 'Idempotency-Key': 'ad-key-2' }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      creditsUsed: 15,
      creditsRemaining: 85,
      replayed: false,
    })
    expect(transaction.update).toHaveBeenCalledWith(expect.objectContaining({ __collection: 'users' }), expect.objectContaining({
      credits: 85,
    }))
    expect(transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: 'idempotency_keys' }),
      expect.objectContaining({
        status: 'completed',
        response: expect.objectContaining({
          creditsUsed: 15,
          creditsRemaining: 85,
        }),
      }),
    )
  })

  it('refuse une publication sans lien au clic', async () => {
    const { db } = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postCampaign(
      makeRequest(
        {
          ...validBody,
          creative: {
            ...validBody.creative,
            ctaUrl: '',
          },
        },
        { 'Idempotency-Key': 'ad-key-no-link' },
      ),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      message: 'Ajoutez un lien au clic pour publier la publicité.',
    })
    expect(getFirestore).not.toHaveBeenCalled()
  })

  it('refuse un lien au clic invalide', async () => {
    const { db } = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postCampaign(
      makeRequest(
        {
          ...validBody,
          creative: {
            ...validBody.creative,
            ctaUrl: 'ftp://example.com/pub',
          },
        },
        { 'Idempotency-Key': 'ad-key-bad-link' },
      ),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      message: 'Lien au clic invalide. Utilisez https://, wa.me, tel: ou mailto:.',
    })
    expect(getFirestore).not.toHaveBeenCalled()
  })

  it('refuse une campagne sans visuel pour ses emplacements', async () => {
    const { db } = makeDb()
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postCampaign(
      makeRequest(
        {
          ...validBody,
          creative: {
            ...validBody.creative,
            imageURL: '',
          },
        },
        { 'Idempotency-Key': 'ad-key-no-visual' },
      ),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      success: false,
      message: 'Ajoutez un visuel par défaut ou un visuel dédié pour chaque emplacement.',
    })
    expect(getFirestore).not.toHaveBeenCalled()
  })

  it('refuse une publication lorsque les credits sont insuffisants', async () => {
    const { db, transaction } = makeDb({ userCredits: 5 })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await postCampaign(makeRequest(validBody, { 'Idempotency-Key': 'ad-key-low-credits' }))
    const payload = await response.json()

    expect(response.status).toBe(402)
    expect(payload).toMatchObject({
      success: false,
      code: 'INSUFFICIENT_CREDITS',
    })
    expect(transaction.update).not.toHaveBeenCalled()
    expect(transaction.set).not.toHaveBeenCalled()
    expect(transaction.create).not.toHaveBeenCalled()
  })

  it('liste les campagnes de l utilisateur et marque les campagnes expirees', async () => {
    const now = Date.now()
    const { db, batch } = makeDb({
      campaigns: [
        {
          id: 'campaign-old',
          data: {
            title: 'Ancienne campagne',
            status: 'active',
            placements: ['search_infeed'],
            creative: { imageURL: 'https://example.com/old.png' },
            startDate: { toMillis: () => now - 10_000 },
            endDate: { toMillis: () => now - 1_000 },
            createdAt: { toMillis: () => now - 5_000 },
            billing: { creditsUsed: 15 },
            metrics: { impressions: 4, clicks: 1 },
          },
        },
        {
          id: 'campaign-new',
          data: {
            title: 'Campagne recente',
            status: 'active',
            placements: ['reels_infeed'],
            creative: {
              assets: {
                reels_infeed: { imageURL: 'https://example.com/reels.png' },
              },
            },
            startDate: { toMillis: () => now },
            endDate: { toMillis: () => now + 10_000 },
            createdAt: { toMillis: () => now - 1_000 },
            billing: { creditsUsed: 45 },
            metrics: { impressions: 10, clicks: 2 },
          },
        },
      ],
    })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const response = await getCampaigns()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      success: true,
      campaigns: [
        expect.objectContaining({
          id: 'campaign-new',
          status: 'active',
          imageURL: 'https://example.com/reels.png',
          creditsUsed: 45,
        }),
        expect.objectContaining({
          id: 'campaign-old',
          status: 'ended',
          imageURL: 'https://example.com/old.png',
          creditsUsed: 15,
        }),
      ],
    })
    expect(batch.update).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: 'ad_campaigns', id: 'campaign-old' }),
      expect.objectContaining({ status: 'ended' }),
    )
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })
})
