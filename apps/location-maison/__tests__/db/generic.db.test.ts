const timestamp = { kind: 'server-timestamp' }

const firestore = {
  db: { name: 'test-db' },
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => timestamp),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}

jest.mock('@/firebase/firestore', () => firestore)

import {
  createModel,
  createModelWithCustomId,
  deleteModel,
  LocationIdGenerator,
  updateModel,
} from '@/db/generic.db'

describe('generic database helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    firestore.collection.mockImplementation((_db, name) => ({ name }))
    firestore.doc.mockImplementation((_db, collectionName, id) => ({ collectionName, id }))
  })

  it('crée un document en cours avec les dates serveur', async () => {
    firestore.addDoc.mockResolvedValue({ id: 'property-1' })

    await expect(createModel({ title: 'Studio' }, 'properties')).resolves.toBe('property-1')

    expect(firestore.addDoc).toHaveBeenCalledWith(
      { name: 'properties' },
      {
        title: 'Studio',
        state: 'IN_PROGRESS',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    )
  })

  it('retourne null si la création Firestore échoue', async () => {
    firestore.addDoc.mockRejectedValue(new Error('offline'))

    await expect(createModel({ title: 'Studio' }, 'properties')).resolves.toBeNull()
  })

  it('met à jour uniquement le document ciblé avec une date serveur', async () => {
    firestore.updateDoc.mockResolvedValue(undefined)

    await expect(updateModel('property-1', { price: 50000 }, 'properties')).resolves.toBe(true)

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      { collectionName: 'properties', id: 'property-1' },
      { price: 50000, updatedAt: timestamp },
    )
  })

  it('retourne false si la mise à jour échoue', async () => {
    firestore.updateDoc.mockRejectedValue(new Error('permission denied'))

    await expect(updateModel('property-1', { price: 50000 }, 'properties')).resolves.toBe(false)
  })

  it('supprime uniquement le document ciblé et expose l échec', async () => {
    firestore.deleteDoc
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('permission denied'))

    await expect(deleteModel('property-1', 'properties')).resolves.toBe(true)
    await expect(deleteModel('property-2', 'properties')).resolves.toBe(false)

    expect(firestore.deleteDoc).toHaveBeenNthCalledWith(
      1,
      { collectionName: 'properties', id: 'property-1' },
    )
  })

  it('crée un document avec un identifiant déterministe', async () => {
    firestore.setDoc.mockResolvedValue(undefined)

    await expect(createModelWithCustomId(
      { name: 'Libreville' },
      'cities',
      'libreville_9.45000_0.39000',
    )).resolves.toBe('libreville_9.45000_0.39000')

    expect(firestore.setDoc).toHaveBeenCalledWith(
      { collectionName: 'cities', id: 'libreville_9.45000_0.39000' },
      expect.objectContaining({
        name: 'Libreville',
        state: 'IN_PROGRESS',
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    )
  })

  it('retourne null si la création avec identifiant échoue', async () => {
    firestore.setDoc.mockRejectedValue(new Error('offline'))

    await expect(createModelWithCustomId({}, 'cities', 'city-1')).resolves.toBeNull()
  })

  it('normalise les identifiants géographiques avec cinq décimales', () => {
    expect(LocationIdGenerator.generateProvince('Estuaire Nord', 9.45, 0.39))
      .toBe('estuairenord_9.45000_0.39000')
    expect(LocationIdGenerator.generateCity('Libreville', 9.451234, 0.391234))
      .toBe('libreville_9.45123_0.39123')
    expect(LocationIdGenerator.generateStreet('Akébé Poteau', 9.4, -0.3))
      .toBe('akébépoteau_9.40000_-0.30000')
    expect(LocationIdGenerator.generate('Estuaire Nord', 9.45, 0.39))
      .toBe('estuairenord_9.45000_0.39000')
  })
})
