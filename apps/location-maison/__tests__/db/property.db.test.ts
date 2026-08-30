const mockCreateModel = jest.fn()
const mockUpdateModel = jest.fn()
const mockDeleteModel = jest.fn()
const mockInvalidateSeo = jest.fn()

const firestore = {
  db: { name: 'test-db' },
  collection: jest.fn(),
  getDocs: jest.fn(),
  getCountFromServer: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  where: jest.fn(),
  query: jest.fn(),
  startAfter: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
}

jest.mock('@/db/generic.db', () => ({
  createModel: (...args: unknown[]) => mockCreateModel(...args),
  updateModel: (...args: unknown[]) => mockUpdateModel(...args),
  deleteModel: (...args: unknown[]) => mockDeleteModel(...args),
}))

jest.mock('@/lib/invalidate-property-seo-cache', () => ({
  invalidatePropertySeoCache: () => mockInvalidateSeo(),
}))

jest.mock('@/firebase/firestore', () => firestore)

import {
  createProperty,
  deleteProperty,
  getCountStatisticsByPropertyType,
  getProperties,
  getPropertyById,
  getServerCountByCategoryId,
  getServerCountByPropertyType,
  getServerCountByProvince,
  updateProperty,
} from '@/db/property.db'

const property = {
  typeProperty: 'Studio',
  title: 'Studio lumineux',
  description: 'Studio lumineux à Akébé.',
  moderationStatus: 'APPROVED',
  rejectionReason: 'ancien refus',
  moderationReviewedAt: 'yesterday',
  moderationReviewedBy: 'admin-1',
} as any

function docSnapshot(id: string, data: Record<string, unknown>) {
  return { id, data: () => data }
}

function querySnapshot(docs: Array<ReturnType<typeof docSnapshot>>) {
  return {
    docs,
    forEach: (callback: (doc: ReturnType<typeof docSnapshot>) => void) => docs.forEach(callback),
  }
}

describe('property database', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    firestore.collection.mockImplementation((_db, name) => ({ name }))
    firestore.doc.mockImplementation((_db, collectionName, id) => ({ collectionName, id }))
    firestore.where.mockImplementation((...args) => ({ kind: 'where', args }))
    firestore.orderBy.mockImplementation((...args) => ({ kind: 'orderBy', args }))
    firestore.limit.mockImplementation((value) => ({ kind: 'limit', value }))
    firestore.startAfter.mockImplementation((value) => ({ kind: 'startAfter', value }))
    firestore.query.mockImplementation((...args) => ({ kind: 'query', args }))
    mockInvalidateSeo.mockResolvedValue(undefined)
  })

  it('force toute nouvelle annonce en attente et retire les champs de revue', async () => {
    mockCreateModel.mockResolvedValue('property-1')

    await expect(createProperty(property)).resolves.toBe('property-1')

    expect(mockCreateModel).toHaveBeenCalledWith(
      expect.objectContaining({
        moderationStatus: 'PENDING',
        title: 'Studio lumineux',
      }),
      'properties',
    )
    const payload = mockCreateModel.mock.calls[0][0]
    expect(payload).not.toHaveProperty('rejectionReason')
    expect(payload).not.toHaveProperty('moderationReviewedAt')
    expect(payload).not.toHaveProperty('moderationReviewedBy')
    expect(mockInvalidateSeo).toHaveBeenCalledTimes(1)
  })

  it('n invalide pas le cache si la création échoue', async () => {
    mockCreateModel.mockResolvedValue(null)

    await expect(createProperty(property)).resolves.toBeNull()

    expect(mockInvalidateSeo).not.toHaveBeenCalled()
  })

  it('modifie via la route serveur (Admin SDK), pas le SDK client', async () => {
    // updateModel (SDK client, updateDoc) exige une vraie session Firebase Auth navigateur que
    // ni Google ni la connexion email/mot de passe ne fournissent (même raison que
    // deleteProperty ci-dessous) — constaté en e2e réel : la sauvegarde d'un crayon
    // EditableField semblait réussir côté UI (state React local) alors que `updateDoc`
    // échouait silencieusement en tâche de fond (permission-denied) sans jamais persister en
    // base (voir property-edit.spec.ts + BUGS-PROPERTY-E2E-2026-08.md).
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
    global.fetch = mockFetch as unknown as typeof fetch

    await expect(updateProperty('property-1', { price: 50000 })).resolves.toBe(true)
    await expect(updateProperty('property-2', { price: 60000 })).resolves.toBe(false)

    expect(mockFetch).toHaveBeenCalledWith('/api/property/property-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 50000 }),
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/property/property-2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 60000 }),
    })
    expect(mockUpdateModel).not.toHaveBeenCalled()
  })

  it('supprime via la route serveur (Admin SDK), pas le SDK client', async () => {
    // deleteModel (SDK client) exige une vraie session Firebase Auth navigateur que ni
    // Google ni la connexion email/mot de passe ne fournissent (voir property-delete.spec.ts
    // + BUGS-PROPERTY-E2E-2026-08.md) — la suppression passe donc par une route serveur.
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
    global.fetch = mockFetch as unknown as typeof fetch

    await expect(deleteProperty('property-1')).resolves.toBe(true)
    await expect(deleteProperty('property-2')).resolves.toBe(false)

    expect(mockFetch).toHaveBeenCalledWith('/api/property/property-1', { method: 'DELETE' })
    expect(mockFetch).toHaveBeenCalledWith('/api/property/property-2', { method: 'DELETE' })
    expect(mockDeleteModel).not.toHaveBeenCalled()
  })

  it('liste uniquement les annonces publiées et applique les filtres', async () => {
    firestore.getDocs.mockResolvedValue(querySnapshot([
      docSnapshot('property-1', { createdBy: 'owner-1', nbrChickens: 2 }),
    ]))

    const result = await getProperties({
      limitPerPage: 10,
      lastDoc: null,
      createdBy: 'owner-1',
      type: 'Studio',
    })

    expect(firestore.where).toHaveBeenCalledWith('state', '==', 'IN_PROGRESS')
    expect(firestore.where).toHaveBeenCalledWith('moderationStatus', '==', 'APPROVED')
    expect(firestore.where).toHaveBeenCalledWith('createdBy', '==', 'owner-1')
    expect(firestore.where).toHaveBeenCalledWith('typeProperty', '==', 'Studio')
    expect(result.properties).toEqual([
      expect.objectContaining({ id: 'property-1', nbrKitchens: 2 }),
    ])
    expect(result.lastDoc).toBeNull()
  })

  it('retourne un curseur seulement s il existe encore une page', async () => {
    const firstPage = [
      docSnapshot('property-1', { title: 'Première' }),
      docSnapshot('property-2', { title: 'Deuxième' }),
    ]
    firestore.getDocs
      .mockResolvedValueOnce(querySnapshot(firstPage))
      .mockResolvedValueOnce(querySnapshot([docSnapshot('property-3', { title: 'Troisième' })]))

    const result = await getProperties({ limitPerPage: 2, lastDoc: null })

    expect(result.lastDoc).toBe('property-2')
    expect(firestore.startAfter).toHaveBeenCalledWith(firstPage[1])
  })

  it('resout un identifiant de curseur avant de paginer', async () => {
    const cursor = { id: 'property-cursor', exists: () => true }
    firestore.getDoc.mockResolvedValue(cursor)
    firestore.getDocs.mockResolvedValue(querySnapshot([]))

    await getProperties({ limitPerPage: 10, lastDoc: 'property-cursor' })

    expect(firestore.doc).toHaveBeenCalledWith(firestore.db, 'properties', 'property-cursor')
    expect(firestore.startAfter).toHaveBeenCalledWith(cursor)
  })

  it('ignore un curseur dont le document n existe plus', async () => {
    // Une annonce supprimée entre deux pages : le curseur doit être abandonné plutôt que
    // passé tel quel à startAfter, qui recevrait un snapshot inexistant.
    firestore.getDoc.mockResolvedValue({ id: 'property-supprimee', exists: () => false })
    firestore.getDocs.mockResolvedValue(querySnapshot([]))

    await getProperties({ limitPerPage: 10, lastDoc: 'property-supprimee' })

    expect(firestore.startAfter).not.toHaveBeenCalled()
  })

  it('ne renvoie pas de curseur quand la page suivante est vide', async () => {
    const firstPage = [docSnapshot('property-1', { title: 'Unique' })]
    firestore.getDocs
      .mockResolvedValueOnce(querySnapshot(firstPage))
      .mockResolvedValueOnce(querySnapshot([]))

    const result = await getProperties({ limitPerPage: 1, lastDoc: null })

    expect(result.lastDoc).toBeNull()
  })

  it('laisse intact un document sans ancien champ cuisine', async () => {
    // nbrKitchens déjà renseigné : la migration nbrChickens -> nbrKitchens ne doit pas écraser
    // la valeur existante.
    firestore.getDoc.mockResolvedValue({
      id: 'property-1',
      exists: () => true,
      data: () => ({ title: 'Villa', nbrKitchens: 3, nbrChickens: 9 }),
    })

    await expect(getPropertyById('property-1')).resolves.toEqual(
      expect.objectContaining({ nbrKitchens: 3 }),
    )
  })

  it('retourne une annonce par identifiant et migre l ancien champ cuisine', async () => {
    firestore.getDoc.mockResolvedValue({
      id: 'property-1',
      exists: () => true,
      data: () => ({ title: 'Maison', nbrChickens: 1 }),
    })

    await expect(getPropertyById('property-1')).resolves.toEqual(
      expect.objectContaining({ id: 'property-1', nbrKitchens: 1 }),
    )
  })

  it('retourne null lorsque l annonce n existe pas', async () => {
    firestore.getDoc.mockResolvedValue({ exists: () => false })

    await expect(getPropertyById('missing')).resolves.toBeNull()
  })

  it('compte les annonces d un propriétaire avec un type facultatif', async () => {
    firestore.getCountFromServer.mockResolvedValue({ data: () => ({ count: 4 }) })

    await expect(getCountStatisticsByPropertyType('owner-1', 'Studio')).resolves.toBe(4)

    expect(firestore.where).toHaveBeenCalledWith('createdBy', '==', 'owner-1')
    expect(firestore.where).toHaveBeenCalledWith('typeProperty', '==', 'Studio')
  })

  it('compte seulement les annonces approuvées par province et par type', async () => {
    firestore.getCountFromServer
      .mockResolvedValueOnce({ data: () => ({ count: 7 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 3 }) })

    await expect(getServerCountByProvince('Estuaire')).resolves.toBe(7)
    await expect(getServerCountByPropertyType('Studio')).resolves.toBe(3)

    expect(firestore.where).toHaveBeenCalledWith('province', '==', 'Estuaire')
    expect(firestore.where).toHaveBeenCalledWith('typeProperty', '==', 'Studio')
    expect(firestore.where).toHaveBeenCalledTimes(4)
    expect(firestore.where).toHaveBeenCalledWith('moderationStatus', '==', 'APPROVED')
  })

  it('compte seulement les annonces approuvées par feuille de categorie', async () => {
    firestore.getCountFromServer.mockResolvedValueOnce({ data: () => ({ count: 8 }) })

    await expect(getServerCountByCategoryId('vetements')).resolves.toBe(8)

    expect(firestore.where).toHaveBeenCalledWith('categoryId', '==', 'vetements')
    expect(firestore.where).toHaveBeenCalledWith('moderationStatus', '==', 'APPROVED')
  })

  it('remonte une erreur métier stable quand Firestore échoue', async () => {
    firestore.getCountFromServer.mockRejectedValue(new Error('offline'))
    firestore.getDoc.mockRejectedValue(new Error('offline'))

    await expect(getCountStatisticsByPropertyType('owner-1')).rejects.toThrow('Failed to fetch property count')
    await expect(getServerCountByProvince('Estuaire')).rejects.toThrow('Failed to fetch property count by province')
    await expect(getServerCountByPropertyType('Studio')).rejects.toThrow('Failed to fetch property count by type')
    await expect(getServerCountByCategoryId('vetements')).rejects.toThrow('Failed to fetch property count by category')
    await expect(getPropertyById('property-1')).rejects.toThrow('Failed to fetch property with ID property-1')
  })
})
