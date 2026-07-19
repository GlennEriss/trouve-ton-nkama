const firestore = {
  db: { name: 'test-db' },
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
  getCountFromServer: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
}

jest.mock('@/firebase/firestore', () => firestore)

import {
  createCreditTransaction,
  createSpendTransaction,
  deductCreditsWithTransaction,
  getCreditHistoryByUserId,
  getCreditTransactionById,
  getCreditTransactionCount,
  getCreditTransactionStats,
  updateTransactionStatus,
} from '@/db/credit-transaction.db'

function snapshotDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    ref: { id },
    data: () => data,
  }
}

describe('credit transaction database', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    firestore.collection.mockImplementation((_db, name) => ({ name }))
    firestore.where.mockImplementation((...args) => ({ kind: 'where', args }))
    firestore.orderBy.mockImplementation((...args) => ({ kind: 'orderBy', args }))
    firestore.limit.mockImplementation((value) => ({ kind: 'limit', value }))
    firestore.startAfter.mockImplementation((value) => ({ kind: 'startAfter', value }))
    firestore.query.mockImplementation((...constraints) => ({ constraints }))
    firestore.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP')
    firestore.doc.mockImplementation((...args) => {
      if (args.length === 1) return { id: 'generated-transaction-id', parent: args[0] }
      return { id: String(args.at(-1)), path: args.slice(1).join('/') }
    })
    firestore.addDoc.mockResolvedValue({ id: 'new-transaction-id' })
    firestore.updateDoc.mockResolvedValue(undefined)
    firestore.getCountFromServer.mockResolvedValue({ data: () => ({ count: 0 }) })
  })

  it('pagine et normalise les anciennes transactions de credits', async () => {
    const docs = [
      snapshotDoc('tx-1', {
        packId: 'starter',
        credits: 20,
        airtelTransactionId: 'airtel-1',
      }),
      snapshotDoc('tx-2', {
        service: 'Promotion',
        propertyId: 'property-1',
        credits: -3,
      }),
      snapshotDoc('tx-extra', { credits: -1 }),
    ]
    firestore.getDocs.mockResolvedValue({ docs })
    firestore.getCountFromServer.mockResolvedValue({ data: () => ({ count: 12 }) })
    const cursor = snapshotDoc('cursor', {})

    const result = await getCreditHistoryByUserId('user-1', {
      type: 'all',
      limit: 2,
      startAfter: cursor as any,
    })

    expect(result).toEqual({
      transactions: [
        expect.objectContaining({
          id: 'tx-1',
          type: 'purchase',
          transactionId: 'airtel-1',
          description: 'Achat Pack Starter',
        }),
        expect.objectContaining({
          id: 'tx-2',
          type: 'spend',
          description: 'Promotion - Annonce property-1',
        }),
      ],
      hasMore: true,
      lastVisible: docs[1],
      total: 12,
    })
    expect(firestore.limit).toHaveBeenCalledWith(3)
    expect(firestore.startAfter).toHaveBeenCalledWith(cursor)
  })

  it('ajoute le filtre de type a l historique', async () => {
    firestore.getDocs.mockResolvedValue({ docs: [] })

    await getCreditHistoryByUserId('user-1', { type: 'purchase', limit: 10 })

    expect(firestore.where).toHaveBeenCalledWith('type', '==', 'purchase')
    expect(firestore.getCountFromServer).toHaveBeenCalled()
  })

  it('masque les erreurs Firestore de lecture avec un message metier', async () => {
    firestore.getDocs.mockRejectedValue(new Error('permission-denied'))

    await expect(getCreditHistoryByUserId('user-1')).rejects.toThrow(
      "Erreur lors de la récupération de l'historique",
    )
  })

  it('cree une transaction horodatee', async () => {
    const id = await createCreditTransaction({
      uid: 'user-1',
      type: 'purchase',
      credits: 20,
      status: 'pending',
    })

    expect(id).toBe('new-transaction-id')
    expect(firestore.addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'credit_transactions' }),
      expect.objectContaining({
        uid: 'user-1',
        createdAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
      }),
    )
  })

  it('ajoute completedAt uniquement au statut success', async () => {
    await expect(updateTransactionStatus('tx-1', 'success')).resolves.toBe(true)
    expect(firestore.updateDoc).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'tx-1' }),
      expect.objectContaining({
        status: 'success',
        completedAt: 'SERVER_TIMESTAMP',
      }),
    )

    await updateTransactionStatus('tx-1', 'failed')
    expect(firestore.updateDoc).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.not.objectContaining({ completedAt: expect.anything() }),
    )
  })

  it('retourne false si la mise a jour du statut echoue', async () => {
    firestore.updateDoc.mockRejectedValue(new Error('offline'))
    await expect(updateTransactionStatus('tx-1', 'cancelled')).resolves.toBe(false)
  })

  it('compte les transactions avec ou sans filtre et replie a zero', async () => {
    firestore.getCountFromServer.mockResolvedValueOnce({ data: () => ({ count: 7 }) })
    await expect(getCreditTransactionCount('user-1', 'spend')).resolves.toBe(7)
    expect(firestore.where).toHaveBeenCalledWith('type', '==', 'spend')

    firestore.getCountFromServer.mockRejectedValueOnce(new Error('index missing'))
    await expect(getCreditTransactionCount('user-1')).resolves.toBe(0)
  })

  it('lit et normalise une transaction par identifiant', async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'tx-legacy',
      data: () => ({ packId: 'premium', credits: 100, airtelTransactionId: 'airtel-9' }),
    })

    await expect(getCreditTransactionById('tx-legacy')).resolves.toEqual(expect.objectContaining({
      id: 'tx-legacy',
      type: 'purchase',
      transactionId: 'airtel-9',
      description: 'Achat Pack Premium',
    }))
  })

  it('retourne null pour une transaction absente ou illisible', async () => {
    firestore.getDoc.mockResolvedValueOnce({ exists: () => false })
    await expect(getCreditTransactionById('missing')).resolves.toBeNull()

    firestore.getDoc.mockRejectedValueOnce(new Error('offline'))
    await expect(getCreditTransactionById('broken')).resolves.toBeNull()
  })

  it('calcule uniquement les statistiques des transactions reussies', async () => {
    firestore.getDocs.mockResolvedValue({
      docs: [
        snapshotDoc('purchase', { status: 'success', type: 'purchase', credits: 50, amount: 5000 }),
        snapshotDoc('legacy-purchase', { status: 'success', packId: 'starter', credits: 20, amount: 2000 }),
        snapshotDoc('spend', { status: 'success', type: 'spend', credits: -7 }),
        snapshotDoc('pending', { status: 'pending', type: 'purchase', credits: 999, amount: 99999 }),
      ],
    })

    await expect(getCreditTransactionStats('user-1')).resolves.toEqual({
      totalPurchases: 70,
      totalSpent: 7,
      totalCreditsUsed: 7,
      totalAmountSpent: 7000,
    })
  })

  it('retourne des statistiques vides en cas d erreur', async () => {
    firestore.getDocs.mockRejectedValue(new Error('offline'))
    await expect(getCreditTransactionStats('user-1')).resolves.toEqual({
      totalPurchases: 0,
      totalSpent: 0,
      totalCreditsUsed: 0,
      totalAmountSpent: 0,
    })
  })

  it('cree une depense avec credits negatifs et description d annonce', async () => {
    await expect(createSpendTransaction('user-1', -3, 'Promotion', 'property-1'))
      .resolves.toBe('new-transaction-id')

    expect(firestore.addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      uid: 'user-1',
      type: 'spend',
      credits: -3,
      description: 'Promotion - Annonce property-1',
      propertyId: 'property-1',
    }))
  })

  it('deduit et journalise les credits dans une transaction atomique', async () => {
    const userDoc = snapshotDoc('user-doc', { credits: 10 })
    firestore.getDocs.mockResolvedValue({ empty: false, docs: [userDoc] })
    const transaction = { update: jest.fn(), set: jest.fn() }
    firestore.runTransaction.mockImplementation(async (_db, callback) => callback(transaction))

    await expect(deductCreditsWithTransaction(
      'user-1',
      3,
      'Promotion',
      'property-1',
      'Mise en avant',
    )).resolves.toEqual({ transactionId: 'generated-transaction-id', success: true })

    expect(transaction.update).toHaveBeenCalledWith(userDoc.ref, {
      credits: 7,
      updatedAt: 'SERVER_TIMESTAMP',
    })
    expect(transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'generated-transaction-id' }),
      expect.objectContaining({
        credits: -3,
        propertyId: 'property-1',
        description: 'Mise en avant',
      }),
    )
  })

  it.each([
    [{ empty: true, docs: [] }, 'Utilisateur introuvable'],
    [{ empty: false, docs: [snapshotDoc('user-doc', { credits: 1 })] }, 'Solde de crédits insuffisant'],
  ])('refuse un debit invalide sans ecriture partielle', async (userSnapshot, message) => {
    firestore.getDocs.mockResolvedValue(userSnapshot)
    const transaction = { update: jest.fn(), set: jest.fn() }
    firestore.runTransaction.mockImplementation(async (_db, callback) => callback(transaction))

    await expect(deductCreditsWithTransaction('user-1', 3, 'Promotion')).rejects.toThrow(message)
    expect(transaction.update).not.toHaveBeenCalled()
    expect(transaction.set).not.toHaveBeenCalled()
  })
})
