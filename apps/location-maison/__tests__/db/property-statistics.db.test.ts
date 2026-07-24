const getPropertyById = jest.fn()
const cache = {
  get: jest.fn(),
  set: jest.fn(),
  setIfAbsent: jest.fn(),
  del: jest.fn(),
}

const adminFirestoreMock = {
  getFirestore: jest.fn(),
  FieldValue: {
    increment: jest.fn((n: number) => ({ __op: 'increment', n })),
    serverTimestamp: jest.fn(() => 'ADMIN_SERVER_TS'),
  },
}

const clientFirestoreMock = {
  Timestamp: {},
  db: { name: 'client-db' },
  doc: jest.fn((_db: unknown, collectionName: string, id: string) => ({ __collection: collectionName, id })),
  getDoc: jest.fn(),
  updateDoc: jest.fn(async () => undefined),
  increment: jest.fn((n: number) => ({ __op: 'increment', n })),
  serverTimestamp: jest.fn(() => 'CLIENT_SERVER_TS'),
}

jest.mock('@/db/property.db', () => ({
  getPropertyById: (...args: unknown[]) => getPropertyById(...args),
}))

jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))
jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin-app' } }))
jest.mock('firebase-admin/firestore', () => adminFirestoreMock)
jest.mock('@/firebase/firestore', () => clientFirestoreMock)
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: jest.fn(), warn: jest.fn() }),
}))

import { getPropertyStatistics, trackPropertyInteraction, trackPropertyView } from '@/db/property-statistics.db'

function makeAdminDb(initialStatsData: Record<string, unknown> | null = null) {
  const refsByKey = new Map<string, any>()
  function refFor(collectionName: string, id: string) {
    const key = `${collectionName}/${id}`
    if (refsByKey.has(key)) return refsByKey.get(key)
    let data = collectionName === 'property_statistics' ? initialStatsData : null
    const ref = {
      get: jest.fn(async () => ({ exists: data !== null, id, data: () => data })),
      set: jest.fn(async (payload: Record<string, unknown>) => {
        data = { ...payload }
      }),
      update: jest.fn(async (payload: Record<string, unknown>) => {
        data = { ...(data ?? {}), ...payload }
      }),
    }
    refsByKey.set(key, ref)
    return ref
  }
  const db = {
    collection: jest.fn((collectionName: string) => ({
      doc: jest.fn((id: string) => refFor(collectionName, id)),
    })),
  }
  return { db, refFor }
}

const ownedProperty = { createdBy: 'owner-1', createdAt: { toMillis: () => Date.now() - 5 * 86_400_000 } }

describe('property statistics database deduplication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cache.del.mockResolvedValue(undefined)
  })

  it('arrete une vue dupliquee avant toute lecture de l annonce', async () => {
    cache.setIfAbsent.mockResolvedValue(false)

    await expect(trackPropertyView('property-1', 'actor-1')).resolves.toBe('duplicate')

    expect(cache.setIfAbsent).toHaveBeenCalledWith(
      'property-stat:view:property-1:actor-1',
      true,
      21600,
    )
    expect(getPropertyById).not.toHaveBeenCalled()
  })

  it('libere la reservation si l annonce n existe pas', async () => {
    cache.setIfAbsent.mockResolvedValue(true)
    getPropertyById.mockResolvedValue(null)

    await expect(trackPropertyView('missing', 'actor-1')).resolves.toBe('not-found')
    expect(cache.del).toHaveBeenCalledWith('property-stat:view:missing:actor-1')
  })

  it('arrete une interaction dupliquee avant Firestore', async () => {
    cache.setIfAbsent.mockResolvedValue(false)

    await expect(trackPropertyInteraction('property-1', 'phone_contact', 'actor-1'))
      .resolves.toBe('duplicate')
    expect(cache.setIfAbsent).toHaveBeenCalledWith(
      'property-stat:interaction:property-1:actor-1:phone_contact',
      true,
      10,
    )
    expect(getPropertyById).not.toHaveBeenCalled()
  })
})

describe('trackPropertyView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cache.setIfAbsent.mockResolvedValue(true)
    cache.set.mockResolvedValue(undefined)
    cache.del.mockResolvedValue(undefined)
    getPropertyById.mockResolvedValue(ownedProperty)
  })

  it('cree le document de statistiques a la premiere vue', async () => {
    const { db, refFor } = makeAdminDb(null)
    adminFirestoreMock.getFirestore.mockReturnValue(db)

    const result = await trackPropertyView('property-1', 'actor-1', {
      userId: 'viewer-1',
      province: 'Estuaire',
      city: 'Libreville',
      duration: 42,
      scrollDepth: 60,
      imagesViewed: [0, 1],
    })

    expect(result).toBe('tracked')
    const statsRef = refFor('property_statistics', 'property-1')
    expect(statsRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 'property-1',
        propertyOwnerId: 'owner-1',
        totalViews: 1,
        uniqueViews: 1,
        viewsByProvince: { Estuaire: 1 },
        viewsByCity: { Libreville: 1 },
        uniqueViewers: ['viewer-1'],
        averageViewDuration: 42,
      }),
    )
    expect(cache.set).toHaveBeenCalledWith('property-stats-exists:property-1', true, 86400)
    // calculateMetrics recalcule et ecrit par-dessus le document fraichement cree
    expect(statsRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ viewsPerDay: expect.any(Number), contactRate: expect.any(Number) }),
    )
  })

  it('incremente un document de statistiques existant et deduplique le visiteur unique', async () => {
    const existing = {
      totalViews: 3,
      uniqueViews: 1,
      viewsByDay: {},
      viewsByHour: {},
      viewsByMonth: {},
      viewsByProvince: {},
      viewsByCity: {},
      uniqueViewers: ['viewer-1'],
      totalViewDuration: 10,
    }
    const { db, refFor } = makeAdminDb(existing)
    adminFirestoreMock.getFirestore.mockReturnValue(db)

    // Meme visiteur deja compte: ne doit pas re-incrementer uniqueViews.
    const result = await trackPropertyView('property-1', 'actor-2', { userId: 'viewer-1' })

    expect(result).toBe('tracked')
    const statsRef = refFor('property_statistics', 'property-1')
    const [firstUpdateCall] = statsRef.update.mock.calls
    expect(firstUpdateCall[0]).toMatchObject({ totalViews: { __op: 'increment', n: 1 } })
    expect(firstUpdateCall[0].uniqueViews).toBeUndefined()
    expect(firstUpdateCall[0].uniqueViewers).toBeUndefined()
    expect(cache.del).toHaveBeenCalledWith('property-stats:property-1')
  })

  it('libere la reservation et renvoie failed sur une panne Firestore', async () => {
    adminFirestoreMock.getFirestore.mockImplementation(() => {
      throw new Error('firestore down')
    })

    const result = await trackPropertyView('property-1', 'actor-1')

    expect(result).toBe('failed')
    expect(cache.del).toHaveBeenCalledWith('property-stat:view:property-1:actor-1')
  })
})

describe('trackPropertyInteraction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cache.setIfAbsent.mockResolvedValue(true)
    cache.get.mockResolvedValue(null)
    cache.set.mockResolvedValue(undefined)
    cache.del.mockResolvedValue(undefined)
    getPropertyById.mockResolvedValue(ownedProperty)
    clientFirestoreMock.getDoc.mockResolvedValue({ exists: () => true })
  })

  it('met a jour les compteurs de contact WhatsApp et recalcule les metriques', async () => {
    const { db, refFor } = makeAdminDb({ totalViews: 10, totalContacts: 0, uniqueViews: 2 })
    adminFirestoreMock.getFirestore.mockReturnValue(db)

    const result = await trackPropertyInteraction('property-1', 'whatsapp_contact', 'actor-1')

    expect(result).toBe('tracked')
    expect(clientFirestoreMock.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ __collection: 'property_statistics', id: 'property-1' }),
      expect.objectContaining({
        whatsappContacts: { __op: 'increment', n: 1 },
        totalContacts: { __op: 'increment', n: 1 },
        lastContactAt: 'CLIENT_SERVER_TS',
      }),
    )
    // calculateMetrics (Admin SDK) a bien recalcule et ecrit sur le document de stats.
    const statsRef = refFor('property_statistics', 'property-1')
    expect(statsRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ contactRate: expect.any(Number) }),
    )
  })

  it('cree les statistiques via Admin SDK quand le flag d existence est absent et le document manquant', async () => {
    const { db } = makeAdminDb(null)
    adminFirestoreMock.getFirestore.mockReturnValue(db)
    clientFirestoreMock.getDoc.mockResolvedValueOnce({ exists: () => false })

    const result = await trackPropertyInteraction('property-1', 'favorite_add', 'actor-1')

    expect(result).toBe('tracked')
    expect(cache.set).toHaveBeenCalledWith('property-stats-exists:property-1', true, 86400)
    expect(clientFirestoreMock.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ favoriteAdds: { __op: 'increment', n: 1 } }),
    )
  })

  it('libere la reservation et renvoie failed si l annonce est introuvable', async () => {
    getPropertyById.mockResolvedValueOnce(null)

    const result = await trackPropertyInteraction('missing', 'phone_contact', 'actor-1')

    expect(result).toBe('not-found')
    expect(cache.del).toHaveBeenCalledWith('property-stat:interaction:missing:actor-1:phone_contact')
  })
})

describe('getPropertyStatistics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cache.get.mockResolvedValue(null)
    cache.set.mockResolvedValue(undefined)
  })

  it('refuse l acces quand l appelant n est pas le proprietaire', async () => {
    getPropertyById.mockResolvedValue({ createdBy: 'someone-else' })

    await expect(getPropertyStatistics('property-1', 'owner-1')).resolves.toBeNull()
  })

  it('sert le cache quand disponible sans lire Firestore', async () => {
    getPropertyById.mockResolvedValue(ownedProperty)
    cache.get.mockResolvedValueOnce({ totalViews: 99 })
    const { db } = makeAdminDb(null)
    adminFirestoreMock.getFirestore.mockReturnValue(db)

    await expect(getPropertyStatistics('property-1', 'owner-1')).resolves.toMatchObject({ totalViews: 99 })
    expect(db.collection).not.toHaveBeenCalled()
  })

  it('lit Firestore et met en cache quand les statistiques existent deja', async () => {
    getPropertyById.mockResolvedValue(ownedProperty)
    const { db } = makeAdminDb({ totalViews: 5 })
    adminFirestoreMock.getFirestore.mockReturnValue(db)

    const result = await getPropertyStatistics('property-1', 'owner-1')

    expect(result).toMatchObject({ id: 'property-1', totalViews: 5 })
    expect(cache.set).toHaveBeenCalledWith('property-stats:property-1', result, 300)
  })

  it('cree les statistiques quand aucun document n existe', async () => {
    getPropertyById.mockResolvedValue(ownedProperty)
    const { db } = makeAdminDb(null)
    adminFirestoreMock.getFirestore.mockReturnValue(db)

    const result = await getPropertyStatistics('property-1', 'owner-1')

    expect(result).toMatchObject({ propertyId: 'property-1', propertyOwnerId: 'owner-1', totalViews: 0 })
  })
})
