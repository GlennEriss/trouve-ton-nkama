const firestore = {
  db: { name: 'test-db' },
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  where: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  startAfter: jest.fn(),
  limit: jest.fn(),
  Timestamp: { now: jest.fn(() => ({ seconds: 1_700_000_000 })) },
}

jest.mock('@/firebase/firestore', () => firestore)
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))
jest.mock('@/constantes/firebase-collection-name', () => ({
  __esModule: true,
  default: { search_requests: 'search_requests' },
}))

import {
  getBoostedSearchRequests,
  getSearchRequestById,
  getSearchRequests,
} from '@/db/search-request.db'

/** Chaque appel a query() renvoie un jeton distinct, pour suivre le chainage. */
function makeSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs,
    forEach: (cb: (d: unknown) => void) =>
      docs.forEach((d) => cb({ id: d.id, data: () => d.data })),
  }
}

const doc1 = { id: 'sr-1', data: { city: 'Libreville', budgetMinXaf: 100 } }
const doc2 = { id: 'sr-2', data: { city: 'Port-Gentil', budgetMinXaf: 200 } }

describe('search-request.db', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    firestore.collection.mockReturnValue('collection-ref')
    firestore.where.mockImplementation((...args: unknown[]) => ({ where: args }))
    firestore.orderBy.mockImplementation((...args: unknown[]) => ({ orderBy: args }))
    firestore.limit.mockImplementation((n: number) => ({ limit: n }))
    firestore.startAfter.mockImplementation((c: unknown) => ({ startAfter: c }))
    firestore.query.mockImplementation((...args: unknown[]) => ({ query: args }))
  })

  describe('getSearchRequests', () => {
    it('ne remonte que les demandes en cours et approuvees, les plus recentes d abord', async () => {
      firestore.getDocs.mockResolvedValue(makeSnapshot([doc1]))

      const result = await getSearchRequests({ limitPerPage: 24, lastDoc: null })

      expect(firestore.where).toHaveBeenCalledWith('state', '==', 'IN_PROGRESS')
      expect(firestore.where).toHaveBeenCalledWith('moderationStatus', '==', 'APPROVED')
      expect(firestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc')
      expect(result.searchRequests).toEqual([{ city: 'Libreville', budgetMinXaf: 100, id: 'sr-1' }])
    })

    it('applique les filtres type, transaction et ville quand ils sont fournis', async () => {
      firestore.getDocs.mockResolvedValue(makeSnapshot([doc1]))

      await getSearchRequests({
        limitPerPage: 24,
        lastDoc: null,
        typeProperty: 'Home' as never,
        transactionType: 'FOR_RENT',
        city: 'Libreville',
      })

      expect(firestore.where).toHaveBeenCalledWith('typeProperty', '==', 'Home')
      expect(firestore.where).toHaveBeenCalledWith('transactionType', '==', 'FOR_RENT')
      expect(firestore.where).toHaveBeenCalledWith('city', '==', 'Libreville')
    })

    it('omet les filtres absents plutot que de filtrer sur une valeur vide', async () => {
      firestore.getDocs.mockResolvedValue(makeSnapshot([doc1]))

      await getSearchRequests({ limitPerPage: 24, lastDoc: null, city: '' })

      expect(firestore.where).not.toHaveBeenCalledWith('city', '==', '')
      expect(firestore.where).not.toHaveBeenCalledWith('typeProperty', '==', undefined)
    })

    it('annule la pagination quand la page est incomplete', async () => {
      firestore.getDocs.mockResolvedValue(makeSnapshot([doc1]))

      const result = await getSearchRequests({ limitPerPage: 24, lastDoc: null })

      expect(result.lastDoc).toBeNull()
      // page incomplete => inutile de sonder la page suivante
      expect(firestore.getDocs).toHaveBeenCalledTimes(1)
    })

    it('expose le curseur suivant quand une page pleine est suivie d autres resultats', async () => {
      firestore.getDocs
        .mockResolvedValueOnce(makeSnapshot([doc1, doc2]))
        .mockResolvedValueOnce(makeSnapshot([{ id: 'sr-3', data: {} }]))

      const result = await getSearchRequests({ limitPerPage: 2, lastDoc: null })

      expect(result.lastDoc).toBe('sr-2')
    })

    it('arrete la pagination quand la page pleine est la derniere', async () => {
      firestore.getDocs
        .mockResolvedValueOnce(makeSnapshot([doc1, doc2]))
        .mockResolvedValueOnce(makeSnapshot([]))

      const result = await getSearchRequests({ limitPerPage: 2, lastDoc: null })

      expect(result.lastDoc).toBeNull()
    })

    it('resout un curseur passe sous forme d identifiant', async () => {
      firestore.doc.mockReturnValue('doc-ref')
      firestore.getDoc.mockResolvedValue({ exists: () => true, id: 'sr-1' })
      firestore.getDocs.mockResolvedValue(makeSnapshot([doc2]))

      await getSearchRequests({ limitPerPage: 24, lastDoc: 'sr-1' })

      expect(firestore.doc).toHaveBeenCalledWith(firestore.db, 'search_requests', 'sr-1')
      expect(firestore.startAfter).toHaveBeenCalled()
    })

    it('ignore un curseur dont le document n existe plus', async () => {
      firestore.doc.mockReturnValue('doc-ref')
      firestore.getDoc.mockResolvedValue({ exists: () => false })
      firestore.getDocs.mockResolvedValue(makeSnapshot([doc2]))

      await getSearchRequests({ limitPerPage: 24, lastDoc: 'disparu' })

      expect(firestore.startAfter).not.toHaveBeenCalled()
    })
  })

  describe('getBoostedSearchRequests', () => {
    it('ne remonte que les boosts encore actifs, du plus recent au plus ancien', async () => {
      firestore.getDocs.mockResolvedValue(makeSnapshot([doc1]))

      const result = await getBoostedSearchRequests()

      expect(firestore.where).toHaveBeenCalledWith('boostEndAt', '>', { seconds: 1_700_000_000 })
      expect(firestore.orderBy).toHaveBeenCalledWith('boostEndAt', 'desc')
      expect(firestore.limit).toHaveBeenCalledWith(10)
      expect(result).toEqual([{ city: 'Libreville', budgetMinXaf: 100, id: 'sr-1' }])
    })

    it('accepte une limite personnalisee', async () => {
      firestore.getDocs.mockResolvedValue(makeSnapshot([]))

      await getBoostedSearchRequests(3)

      expect(firestore.limit).toHaveBeenCalledWith(3)
    })

    // La section "recherches urgentes" est decorative : une panne Firestore ne
    // doit pas faire tomber toute la page publique.
    it('renvoie une liste vide plutot que de propager une panne Firestore', async () => {
      firestore.getDocs.mockRejectedValue(new Error('firestore down'))

      await expect(getBoostedSearchRequests()).resolves.toEqual([])
    })
  })

  describe('getSearchRequestById', () => {
    it('renvoie la demande avec son identifiant', async () => {
      firestore.doc.mockReturnValue('doc-ref')
      firestore.getDoc.mockResolvedValue({
        exists: () => true,
        id: 'sr-1',
        data: () => ({ city: 'Libreville' }),
      })

      await expect(getSearchRequestById('sr-1')).resolves.toEqual({ city: 'Libreville', id: 'sr-1' })
    })

    it('renvoie null quand la demande n existe pas', async () => {
      firestore.doc.mockReturnValue('doc-ref')
      firestore.getDoc.mockResolvedValue({ exists: () => false })

      await expect(getSearchRequestById('inconnu')).resolves.toBeNull()
    })

    it('propage une panne Firestore en erreur explicite', async () => {
      firestore.doc.mockReturnValue('doc-ref')
      firestore.getDoc.mockRejectedValue(new Error('firestore down'))

      await expect(getSearchRequestById('sr-1')).rejects.toThrow('Failed to fetch search request with ID sr-1')
    })
  })
})
