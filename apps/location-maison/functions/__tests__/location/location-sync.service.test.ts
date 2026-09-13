import { syncPropertyLocation } from '../../src/location/location-sync.service'
import type { NormalizedLocation } from '../../src/location/location-sync.policy'

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIME' },
}))

const LOCATION: NormalizedLocation = {
  province: 'Estuaire',
  city: 'Libreville',
  street: 'Glass',
  country: 'Gabon',
  countryCode: 'GA',
  provinceLon: 9.45,
  provinceLat: 0.39,
  cityLon: 9.45,
  cityLat: 0.39,
  streetLon: 9.46,
  streetLat: 0.4,
}

/** Firestore Admin SDK factice : `docsByCollection` pré-remplit les résultats de requête,
 * `created` trace les `create()` réellement appelés (documents "nouveaux"). */
function makeFakeDb(options: {
  docsByCollection?: Record<string, Array<{ id: string; data: Record<string, unknown> }>>
  createErrorFor?: Set<string>
} = {}) {
  const docsByCollection = options.docsByCollection ?? {}
  const created: Array<{ collection: string; id: string; data: Record<string, unknown> }> = []
  const createCalls: Record<string, number> = {}

  const db = {
    collection: (name: string) => {
      const existingDocs = docsByCollection[name] ?? []
      let filters: Array<[string, unknown, unknown]> = []
      const query = {
        where: (field: string, op: unknown, value: unknown) => {
          filters = [...filters, [field, op, value]]
          return query
        },
        limit: () => query,
        get: async () => {
          const matches = existingDocs.filter((doc) =>
            filters.every(([field, , value]) => (doc.data as Record<string, unknown>)[field] === value),
          )
          return {
            empty: matches.length === 0,
            docs: matches.map((doc) => ({ id: doc.id })),
          }
        },
        doc: (id: string) => ({
          create: async (data: Record<string, unknown>) => {
            createCalls[`${name}/${id}`] = (createCalls[`${name}/${id}`] ?? 0) + 1
            if (options.createErrorFor?.has(`${name}/${id}`)) {
              const error: { code: number } = { code: 6 }
              throw error
            }
            created.push({ collection: name, id, data })
          },
        }),
      }
      return query
    },
  } as unknown as FirebaseFirestore.Firestore

  return { db, created, createCalls }
}

describe('syncPropertyLocation', () => {
  it('crée province, ville et rue dans cet ordre avec les bons identifiants parents', async () => {
    const { db, created } = makeFakeDb()
    const result = await syncPropertyLocation(db, LOCATION)

    expect(created.map((c) => c.collection)).toEqual(['provinces', 'cities', 'streets'])
    expect(result.provinceId).toBe('estuaire_9.45000_0.39000')
    expect(result.cityId).toBe('libreville_9.45000_0.39000')
    expect(result.streetId).toBe('glass_9.46000_0.40000')
    expect(created[1].data.provinceId).toBe(result.provinceId)
    expect(created[2].data.cityId).toBe(result.cityId)
    expect(created[2].data.provinceId).toBe(result.provinceId)
  })

  it('réutilise les trois documents lorsqu\'ils existent déjà', async () => {
    const { db, created } = makeFakeDb({
      docsByCollection: {
        provinces: [{ id: 'estuaire_9.45000_0.39000', data: { name: 'Estuaire' } }],
        cities: [{ id: 'libreville_9.45000_0.39000', data: { name: 'Libreville', provinceName: 'Estuaire' } }],
        streets: [
          { id: 'glass_9.46000_0.40000', data: { name: 'Glass', cityName: 'Libreville', provinceName: 'Estuaire' } },
        ],
      },
    })

    const result = await syncPropertyLocation(db, LOCATION)

    expect(created).toHaveLength(0)
    expect(result).toEqual({
      provinceId: 'estuaire_9.45000_0.39000',
      cityId: 'libreville_9.45000_0.39000',
      streetId: 'glass_9.46000_0.40000',
    })
  })

  it('réutilise une province existante et crée les descendants manquants', async () => {
    const { db, created } = makeFakeDb({
      docsByCollection: {
        provinces: [{ id: 'estuaire_9.45000_0.39000', data: { name: 'Estuaire' } }],
      },
    })

    const result = await syncPropertyLocation(db, LOCATION)

    expect(created.map((c) => c.collection)).toEqual(['cities', 'streets'])
    expect(result.provinceId).toBe('estuaire_9.45000_0.39000')
  })

  it('un rejeu identique ne crée aucun doublon (idempotence via create() + ALREADY_EXISTS)', async () => {
    const { db, createCalls } = makeFakeDb({
      createErrorFor: new Set([
        'provinces/estuaire_9.45000_0.39000',
        'cities/libreville_9.45000_0.39000',
        'streets/glass_9.46000_0.40000',
      ]),
    })

    // Les trois create() "échouent" avec ALREADY_EXISTS (simulateur d'un événement concurrent
    // qui a déjà écrit) — le service doit quand même résoudre les bons identifiants.
    const result = await syncPropertyLocation(db, LOCATION)

    expect(result).toEqual({
      provinceId: 'estuaire_9.45000_0.39000',
      cityId: 'libreville_9.45000_0.39000',
      streetId: 'glass_9.46000_0.40000',
    })
    expect(createCalls['provinces/estuaire_9.45000_0.39000']).toBe(1)
  })

  it('ne crée pas de rue lorsque street est vide', async () => {
    const { db, created } = makeFakeDb()
    const result = await syncPropertyLocation(db, { ...LOCATION, street: '' })

    expect(created.map((c) => c.collection)).toEqual(['provinces', 'cities'])
    expect(result.streetId).toBeNull()
  })

  it('une erreur ville empêche la création d\'une rue', async () => {
    const { db, created } = makeFakeDb()
    const originalCollection = (db as { collection: (name: string) => unknown }).collection
    ;(db as { collection: (name: string) => unknown }).collection = (name: string) => {
      const base = originalCollection(name) as { doc: (id: string) => { create: (d: unknown) => Promise<void> } }
      if (name === 'cities') {
        return {
          ...base,
          doc: (id: string) => ({
            create: async () => {
              throw new Error('city write failed')
            },
          }),
        }
      }
      return base
    }

    await expect(syncPropertyLocation(db, LOCATION)).rejects.toThrow('city write failed')
    expect(created.map((c) => c.collection)).toEqual(['provinces'])
  })

  it('conserve les coordonnées de référence dans les documents nouvellement créés', async () => {
    const { db, created } = makeFakeDb()
    await syncPropertyLocation(db, LOCATION)

    const province = created.find((c) => c.collection === 'provinces')
    expect(province?.data).toMatchObject({ longitude: LOCATION.provinceLon, latitude: LOCATION.provinceLat })
  })
})
