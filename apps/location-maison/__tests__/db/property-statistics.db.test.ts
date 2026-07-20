const getPropertyById = jest.fn()
const cache = {
  get: jest.fn(),
  set: jest.fn(),
  setIfAbsent: jest.fn(),
  del: jest.fn(),
}

jest.mock('@/db/property.db', () => ({
  getPropertyById: (...args: unknown[]) => getPropertyById(...args),
}))

jest.mock('@/lib/cache', () => ({ getCacheStore: () => cache }))
jest.mock('@/firebase/admin', () => ({ adminApp: {} }))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  FieldValue: {
    increment: jest.fn(),
    serverTimestamp: jest.fn(),
  },
}))
jest.mock('@/firebase/firestore', () => ({ Timestamp: {} }))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: jest.fn(), warn: jest.fn() }),
}))

import { trackPropertyInteraction, trackPropertyView } from '@/db/property-statistics.db'

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
