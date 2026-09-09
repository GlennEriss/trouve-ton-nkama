import { getFirestore } from 'firebase-admin/firestore'

jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }))
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

jest.mock('firebase-admin/firestore', () => {
  class FakeTimestamp {
    constructor(private readonly ms: number) {}
    static now() {
      return new FakeTimestamp(Date.now())
    }
    toMillis() {
      return this.ms
    }
    toDate() {
      return new Date(this.ms)
    }
  }
  return {
    getFirestore: jest.fn(),
    Timestamp: FakeTimestamp,
    FieldValue: { increment: (value: number) => ({ __increment: value }) },
  }
})

import {
  getQuotaStatus,
  getSearchMode,
  recordAlgoliaQueries,
  invalidateQuotaStatusCache,
} from '@/lib/search/algolia-quota-store'
import { billingPeriodKey } from '@/lib/search/algolia-billing-period'

function makeDb(initial?: Record<string, unknown>) {
  const state: { doc: Record<string, unknown> | undefined } = { doc: initial }
  const ref = {
    get: jest.fn(async () => ({ exists: state.doc !== undefined, data: () => state.doc })),
  }
  const tx = {
    get: jest.fn(async () => ({
      exists: state.doc !== undefined,
      data: () => state.doc,
    })),
    set: jest.fn((_ref: unknown, value: Record<string, unknown>) => {
      state.doc = value
    }),
    update: jest.fn((_ref: unknown, patch: Record<string, unknown>) => {
      const next = { ...(state.doc ?? {}) }
      for (const [k, v] of Object.entries(patch)) {
        if (v && typeof v === 'object' && '__increment' in v) {
          next[k] = (Number(next[k]) || 0) + (v as { __increment: number }).__increment
        } else {
          next[k] = v
        }
      }
      state.doc = next
    }),
  }
  const db = {
    collection: jest.fn(() => ({ doc: jest.fn(() => ref) })),
    runTransaction: jest.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
  }
  return { db, state, tx }
}

describe('algolia-quota-store (mode observation, Phase A)', () => {
  const OLD_ENV = { ...process.env }

  beforeEach(async () => {
    jest.clearAllMocks()
    process.env = { ...OLD_ENV }
    delete process.env.SEARCH_QUOTA_ENFORCE
    delete process.env.MEILISEARCH_HOST
    delete process.env.MEILISEARCH_SEARCH_API_KEY
    await invalidateQuotaStatusCache()
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('recordAlgoliaQueries crée le document sur la période courante au premier appel', async () => {
    const { db, state } = makeDb(undefined)
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    await recordAlgoliaQueries(3)

    expect(state.doc).toMatchObject({ periodKey: billingPeriodKey(), count: 3, mode: 'ALGOLIA' })
  })

  it('recordAlgoliaQueries incrémente quand la période est à jour', async () => {
    const { db, state } = makeDb({ periodKey: billingPeriodKey(), count: 10, mode: 'ALGOLIA' })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    await recordAlgoliaQueries(5)

    expect(state.doc).toMatchObject({ count: 15 })
  })

  it('recordAlgoliaQueries remet à zéro quand la période stockée est périmée', async () => {
    const { db, state } = makeDb({ periodKey: '2000-01', count: 9999, mode: 'MEILISEARCH_ONLY' })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    await recordAlgoliaQueries(2)

    expect(state.doc).toMatchObject({ periodKey: billingPeriodKey(), count: 2, mode: 'ALGOLIA' })
  })

  it('getQuotaStatus expose overSoftLimit sans jamais enforced en Phase A', async () => {
    const { db } = makeDb({ periodKey: billingPeriodKey(), count: 9500, limit: 10000, softLimit: 9000, alertAt: 8000, mode: 'ALGOLIA' })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    const status = await getQuotaStatus()
    expect(status.overSoftLimit).toBe(true)
    expect(status.overLimit).toBe(false)
    expect(status.enforced).toBe(false)
    expect(status.usageRatio).toBeCloseTo(0.95)
  })

  it('getSearchMode reste sur ALGOLIA tant que l\'enforcement n\'est pas activé', async () => {
    const { db } = makeDb({ periodKey: billingPeriodKey(), count: 999999, softLimit: 9000, mode: 'ALGOLIA' })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    expect(await getSearchMode()).toBe('ALGOLIA')
  })

  it('getSearchMode bascule quand enforcement actif ET softLimit franchi', async () => {
    process.env.SEARCH_QUOTA_ENFORCE = 'true'
    process.env.MEILISEARCH_HOST = 'http://meili:7700'
    process.env.MEILISEARCH_SEARCH_API_KEY = 'key'

    const { db, state } = makeDb({ periodKey: billingPeriodKey(), count: 9500, softLimit: 9000, limit: 10000, alertAt: 8000, mode: 'ALGOLIA' })
    ;(getFirestore as jest.Mock).mockReturnValue(db)

    expect(await getSearchMode()).toBe('MEILISEARCH_ONLY')
    expect(state.doc).toMatchObject({ mode: 'MEILISEARCH_ONLY' })
  })

  it('getQuotaStatus fail-open si Firestore lève', async () => {
    ;(getFirestore as jest.Mock).mockImplementation(() => {
      throw new Error('firestore down')
    })
    const status = await getQuotaStatus()
    expect(status.mode).toBe('ALGOLIA')
    expect(status.count).toBe(0)
  })
})
