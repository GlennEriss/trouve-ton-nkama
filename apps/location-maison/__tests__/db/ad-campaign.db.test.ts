import { getActiveCampaignForPlacement, getActiveCampaignsForPlacement, incrementCampaignMetric } from '@/db/ad-campaign.db'
import { getFirestore } from 'firebase-admin/firestore'

const mockCache = { setIfAbsent: jest.fn(), del: jest.fn() }
jest.mock('@/lib/cache', () => ({ getCacheStore: () => mockCache }))
jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn() }) }))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  FieldValue: { serverTimestamp: () => 'SERVER_TIME', increment: (value: number) => ({ increment: value }) },
}))

const now = Date.now()
const campaigns = [
  { id: 'high', priority: 10, startDate: new Date(now - 1000), endDate: { seconds: (now + 100000) / 1000 }, createdAt: '2026-02-01', placements: ['search_infeed'], targeting: { provinces: ['Estuaire'], cities: ['Libreville'] }, creative: { imageURL: 'default.jpg', headline: 'High', assets: { immobilier_infeed: { imageURL: 'sibling.jpg' } } } },
  { id: 'low', priority: 1, startDate: { toMillis: () => now - 1000 }, endDate: now + 100000, createdAt: new Date('2026-01-01'), creative: { imageURL: 'low.jpg', videoURL: 'low.mp4', headline: 'Low' } },
  { id: 'future', priority: 20, startDate: now + 100000, endDate: now + 200000, creative: { imageURL: 'future.jpg' } },
  { id: 'expired', startDate: now - 200000, endDate: now - 100000, creative: { imageURL: 'old.jpg' } },
]

function makeDb(options: { count?: number; updateError?: unknown } = {}) {
  const update = options.updateError ? jest.fn().mockRejectedValue(options.updateError) : jest.fn().mockResolvedValue(undefined)
  const tx = { get: jest.fn(async () => ({ exists: true, data: () => ({ count: options.count ?? 0 }) })), set: jest.fn() }
  const db = {
    collection: jest.fn((name: string) => ({
      where: jest.fn(() => ({ where: jest.fn(() => ({ get: jest.fn(async () => ({ docs: campaigns.map((campaign) => ({ id: campaign.id, data: () => campaign })) })) })) })),
      doc: jest.fn(() => ({ update })),
    })),
    runTransaction: jest.fn(async (callback: any) => callback(tx)),
  }
  return { db, tx, update }
}

describe('ad-campaign.db', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCache.setIfAbsent.mockResolvedValue(true)
    mockCache.del.mockResolvedValue(undefined)
    ;(getFirestore as jest.Mock).mockReturnValue(makeDb().db)
  })

  it('filtre dates et ciblage puis sert la priorité la plus haute', async () => {
    const creative = await getActiveCampaignForPlacement('search_infeed', { province: 'Estuaire', city: 'Libreville' })
    expect(creative).toMatchObject({ campaignId: 'high', placement: 'search_infeed', imageURL: 'sibling.jpg', headline: 'High', videoURL: undefined })
  })

  it('fait tourner équitablement plusieurs campagnes', async () => {
    const { db, tx } = makeDb({ count: 1 })
    ;(getFirestore as jest.Mock).mockReturnValue(db)
    const creative = await getActiveCampaignForPlacement('search_infeed', { province: 'Estuaire', city: 'Libreville' })
    expect(creative?.campaignId).toBe('low')
    expect(tx.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ count: 2, province: 'Estuaire', city: 'Libreville' }), { merge: true })
  })

  it('retourne toutes les campagnes et autorise un ciblage sans contexte', async () => {
    const list = await getActiveCampaignsForPlacement('reels_infeed')
    expect(list.map((item) => item.campaignId)).toEqual(['high', 'low'])
    expect(list[1]).toMatchObject({ videoURL: 'low.mp4' })
  })

  it('retourne null ou vide quand Firestore échoue', async () => {
    ;(getFirestore as jest.Mock).mockImplementationOnce(() => { throw new Error('down') })
    await expect(getActiveCampaignForPlacement('home')).resolves.toBeNull()
    ;(getFirestore as jest.Mock).mockImplementationOnce(() => { throw new Error('down') })
    await expect(getActiveCampaignsForPlacement('home')).resolves.toEqual([])
  })

  it('déduplique les métriques avec des TTL distincts', async () => {
    mockCache.setIfAbsent.mockResolvedValueOnce(false)
    await expect(incrementCampaignMetric('c1', 'impressions', 'visitor', 'home')).resolves.toBe('duplicate')
    expect(mockCache.setIfAbsent).toHaveBeenCalledWith(expect.stringContaining('impressions'), true, 1800)
    await expect(incrementCampaignMetric('c1', 'clicks', 'visitor', 'home')).resolves.toBe('tracked')
    expect(mockCache.setIfAbsent).toHaveBeenLastCalledWith(expect.stringContaining('clicks'), true, 5)
  })

  it.each([{ code: 5 }, { code: 'not-found' }])('libère la réservation et traduit une campagne absente', async (error) => {
    ;(getFirestore as jest.Mock).mockReturnValueOnce(makeDb({ updateError: error }).db)
    await expect(incrementCampaignMetric('missing', 'clicks', 'actor', 'reels')).resolves.toBe('not-found')
    expect(mockCache.del).toHaveBeenCalled()
  })

  it('libère la réservation puis propage une panne inattendue', async () => {
    ;(getFirestore as jest.Mock).mockReturnValueOnce(makeDb({ updateError: new Error('write failed') }).db)
    await expect(incrementCampaignMetric('c1', 'clicks', 'actor', 'home')).rejects.toThrow('write failed')
    expect(mockCache.del).toHaveBeenCalled()
  })
})
