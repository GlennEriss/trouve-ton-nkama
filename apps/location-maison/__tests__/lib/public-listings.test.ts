import { getFirestore } from 'firebase-admin/firestore'

import { getPublicPropertyById } from '@/lib/seo/public-listings'

jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }))
jest.mock('@/lib/logger', () => ({ createLogger: () => ({ error: jest.fn(), warn: jest.fn() }) }))
jest.mock('firebase-admin/firestore', () => ({ getFirestore: jest.fn() }))

// Simule une vraie instance Timestamp (firebase-admin/firestore) : seconds/nanoseconds exposés
// via des getters + les méthodes toDate/toMillis de la classe réelle. `toDate` compte : c'est
// ce qui permet de distinguer une instance de classe (à convertir) d'un objet déjà plat.
class FakeTimestamp {
  constructor(private readonly _seconds: number, private readonly _nanoseconds: number) {}
  get seconds() {
    return this._seconds
  }
  get nanoseconds() {
    return this._nanoseconds
  }
  toMillis() {
    return this._seconds * 1000 + this._nanoseconds / 1_000_000
  }
  toDate() {
    return new Date(this.toMillis())
  }
}

function makeDb(data: Record<string, unknown> | null) {
  return {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(async () => ({
          exists: data !== null,
          id: 'listing-1',
          data: () => data,
        })),
      })),
    })),
  }
}

describe('getPublicPropertyById', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("convertit les champs Timestamp (instances de classe) en objets simples sérialisables — sinon Next.js refuse de les passer à un composant client (\"Only plain objects...\")", async () => {
    ;(getFirestore as jest.Mock).mockReturnValue(
      makeDb({
        title: 'Villa test',
        description: 'Description',
        state: 'IN_PROGRESS',
        moderationStatus: 'APPROVED',
        createdAt: new FakeTimestamp(1_756_540_800, 0),
        updatedAt: new FakeTimestamp(1_756_540_800, 500_000_000),
      }),
    )

    const property = await getPublicPropertyById('listing-1')

    expect(property).not.toBeNull()
    // Un objet simple n'a pas de méthode toMillis propre — c'est justement ce qui distinguait
    // l'instance de classe fautive.
    expect(typeof (property!.createdAt as any)?.toMillis).toBe('undefined')
    expect(property!.createdAt).toEqual({ seconds: 1_756_540_800, nanoseconds: 0 })
    expect(property!.updatedAt).toEqual({ seconds: 1_756_540_800, nanoseconds: 500_000_000 })
    // Sérialisable par JSON.stringify/structuredClone sans perte, contrairement à l'instance de
    // classe d'origine.
    expect(JSON.parse(JSON.stringify(property!.createdAt))).toEqual({ seconds: 1_756_540_800, nanoseconds: 0 })
  })

  it('convertit aussi les dates de currentPromotion et promotionHistory', async () => {
    ;(getFirestore as jest.Mock).mockReturnValue(
      makeDb({
        title: 'Villa test',
        state: 'IN_PROGRESS',
        moderationStatus: 'APPROVED',
        currentPromotion: {
          type: 'boost',
          isActive: true,
          creditsUsed: 1,
          startDate: new FakeTimestamp(1_756_540_800, 0),
          endDate: new FakeTimestamp(1_756_627_200, 0),
        },
        promotionHistory: [
          {
            type: 'boost',
            isActive: false,
            creditsUsed: 1,
            startDate: new FakeTimestamp(1_756_000_000, 0),
            endDate: new FakeTimestamp(1_756_086_400, 0),
          },
        ],
      }),
    )

    const property = await getPublicPropertyById('listing-1')

    expect(property!.currentPromotion?.startDate).toEqual({ seconds: 1_756_540_800, nanoseconds: 0 })
    expect(property!.promotionHistory?.[0]?.startDate).toEqual({ seconds: 1_756_000_000, nanoseconds: 0 })
  })

  it('convertit récursivement les timestamps techniques non connus à l’avance', async () => {
    ;(getFirestore as jest.Mock).mockReturnValue(
      makeDb({
        title: 'Annonce importée',
        state: 'IN_PROGRESS',
        moderationStatus: 'APPROVED',
        contactBackfilledAt: new FakeTimestamp(1_756_700_000, 879_000_000),
        sourceMeta: {
          imageShapeBackfilledAt: new FakeTimestamp(1_756_800_000, 194_000_000),
        },
      }),
    )

    const property = await getPublicPropertyById('listing-1') as any

    expect(property.contactBackfilledAt).toEqual({ seconds: 1_756_700_000, nanoseconds: 879_000_000 })
    expect(property.sourceMeta.imageShapeBackfilledAt).toEqual({
      seconds: 1_756_800_000,
      nanoseconds: 194_000_000,
    })
    expect(() => JSON.stringify(property)).not.toThrow()
  })

  it('retourne null pour une annonce non approuvée ou non publiée (filtre inchangé)', async () => {
    ;(getFirestore as jest.Mock).mockReturnValue(
      makeDb({ title: 'x', state: 'ARCHIVED', moderationStatus: 'APPROVED' }),
    )
    await expect(getPublicPropertyById('listing-1')).resolves.toBeNull()
  })

  it('retourne null quand le document est absent', async () => {
    ;(getFirestore as jest.Mock).mockReturnValue(makeDb(null))
    await expect(getPublicPropertyById('missing')).resolves.toBeNull()
  })
})
