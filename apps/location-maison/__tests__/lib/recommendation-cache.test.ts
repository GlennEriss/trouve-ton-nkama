/** @jest-environment node */

let claimEventId: typeof import('@/lib/server/recommendation-cache').claimEventId
let storeServedCandidates: typeof import('@/lib/server/recommendation-cache').storeServedCandidates
let wasListingServed: typeof import('@/lib/server/recommendation-cache').wasListingServed

describe('recommendation-cache', () => {
  const originalEnv = process.env

  beforeAll(async () => {
    process.env = { ...originalEnv, CACHE_BACKEND: 'memory' }
    ;({ claimEventId, storeServedCandidates, wasListingServed } = await import(
      '@/lib/server/recommendation-cache'
    ))
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('storeServedCandidates / wasListingServed', () => {
    it("confirme qu'une annonce faisait partie de la requête servie", async () => {
      await storeServedCandidates('req-1', ['listing-a', 'listing-b'])

      expect(await wasListingServed('req-1', 'listing-a')).toBe(true)
      expect(await wasListingServed('req-1', 'listing-b')).toBe(true)
    })

    it("rejette une annonce qui n'a jamais été servie dans cette requête", async () => {
      await storeServedCandidates('req-2', ['listing-a'])

      expect(await wasListingServed('req-2', 'listing-z')).toBe(false)
    })

    it('rejette toute annonce pour une requête inconnue (jamais enregistrée)', async () => {
      expect(await wasListingServed('req-never-registered', 'listing-a')).toBe(false)
    })
  })

  describe('claimEventId', () => {
    it('accepte un eventId vu pour la première fois', async () => {
      expect(await claimEventId('evt-unique-1')).toBe(true)
    })

    it('rejette un rejeu du même eventId (idempotence)', async () => {
      await claimEventId('evt-dup-1')
      expect(await claimEventId('evt-dup-1')).toBe(false)
    })

    it('traite deux eventId distincts indépendamment', async () => {
      expect(await claimEventId('evt-indep-1')).toBe(true)
      expect(await claimEventId('evt-indep-2')).toBe(true)
    })
  })
})
