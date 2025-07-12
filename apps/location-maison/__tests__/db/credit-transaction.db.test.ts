import { describe, test, expect, jest } from '@jest/globals';
import {
  getCreditHistoryByUserId,
  createCreditTransaction,
  updateTransactionStatus,
  getCreditTransactionCount,
  getCreditTransactionById,
  getCreditTransactionStats,
  createSpendTransaction,
  deductCreditsWithTransaction
} from '@/db/credit-transaction.db';

// Mock des dépendances Firebase
jest.mock('@/firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getCountFromServer: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  runTransaction: jest.fn(),
  db: {} // Mock de l'instance db
}));

describe('Credit Transaction DB Integration Tests', () => {
  const testUserId = 'test-user-123';
  const anotherUserId = 'test-user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCreditTransaction', () => {
    test('devrait créer une transaction d\'achat avec succès', async () => {
      const transaction = {
        uid: testUserId,
        type: 'purchase' as const,
        credits: 100,
        amount: 1000,
        currency: 'XAF',
        packId: 'starter',
        description: 'Achat Pack Starter',
        status: 'pending' as const,
        transactionId: 'airtel-tx-123'
      };

      // Mock de addDoc pour retourner un ID
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'mock-transaction-id' });

      const transactionId = await createCreditTransaction(transaction);

      expect(transactionId).toBe('mock-transaction-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);

      // Vérifier que les données correctes ont été passées
      const addDocCall = mockAddDoc.mock.calls[0][1];
      expect(addDocCall).toMatchObject(transaction);
      expect(addDocCall).toHaveProperty('createdAt');
      expect(addDocCall).toHaveProperty('updatedAt');
    });

    test('devrait créer une transaction de dépense avec succès', async () => {
      const transaction = {
        uid: testUserId,
        type: 'spend' as const,
        credits: -10,
        service: 'property_promotion',
        propertyId: 'prop-123',
        description: 'Promotion propriété',
        status: 'success' as const
      };

      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'spend-transaction-id' });

      const transactionId = await createCreditTransaction(transaction);

      expect(transactionId).toBe('spend-transaction-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait gérer les erreurs', async () => {
      const transaction = {
        uid: testUserId,
        type: 'purchase' as const,
        credits: 100
      };

      // Mock de addDoc pour lancer une erreur
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(createCreditTransaction(transaction as any))
        .rejects.toThrow('Erreur lors de la création de la transaction');
    });
  });

  describe('getCreditTransactionById', () => {
    test('devrait récupérer une transaction par son ID', async () => {
      const mockTransactionData = {
        uid: testUserId,
        type: 'purchase',
        credits: 50,
        amount: 500,
        currency: 'XAF',
        status: 'success',
        description: 'Test transaction'
      };

      // Mock de getDoc
      const mockGetDoc = require('@/firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'test-transaction-id',
        data: () => mockTransactionData
      });

      const transaction = await getCreditTransactionById('test-transaction-id');

      expect(transaction).toEqual({
        id: 'test-transaction-id',
        ...mockTransactionData,
        transactionId: undefined
      });
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner null pour un ID inexistant', async () => {
      // Mock de getDoc pour une transaction qui n'existe pas
      const mockGetDoc = require('@/firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const transaction = await getCreditTransactionById('non-existent-id');

      expect(transaction).toBeNull();
    });

    test('devrait mapper les anciens champs vers le nouveau format', async () => {
      const oldFormatData = {
        uid: testUserId,
        credits: 75,
        packId: 'standard',
        airtelTransactionId: 'airtel-old-123' // Ancien format
      };

      // Mock de getDoc
      const mockGetDoc = require('@/firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'old-format-id',
        data: () => oldFormatData
      });

      const transaction = await getCreditTransactionById('old-format-id');

      expect(transaction?.type).toBe('purchase'); // Mappé automatiquement car packId existe
      expect(transaction?.transactionId).toBe('airtel-old-123'); // Mappé depuis airtelTransactionId
      expect(transaction?.description).toContain('Pack Standard'); // Généré automatiquement
    });
  });

  describe('updateTransactionStatus', () => {
    test('devrait mettre à jour le statut en succès', async () => {
      // Mock de doc pour retourner une référence
      const mockDoc = require('@/firebase/firestore').doc;
      mockDoc.mockReturnValue({ id: 'mocked-doc-ref' });

      // Mock de updateDoc
      const mockUpdateDoc = require('@/firebase/firestore').updateDoc;
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await updateTransactionStatus('transaction-id', 'success');

      expect(result).toBe(true);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { id: 'mocked-doc-ref' },
        expect.objectContaining({
          status: 'success',
          completedAt: expect.anything(),
          updatedAt: expect.anything()
        })
      );
    });

    test('devrait mettre à jour le statut en échec', async () => {
      // Mock de doc pour retourner une référence
      const mockDoc = require('@/firebase/firestore').doc;
      mockDoc.mockReturnValue({ id: 'mocked-doc-ref' });

      // Mock de updateDoc
      const mockUpdateDoc = require('@/firebase/firestore').updateDoc;
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await updateTransactionStatus('transaction-id', 'failed');

      expect(result).toBe(true);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { id: 'mocked-doc-ref' },
        expect.objectContaining({
          status: 'failed',
          updatedAt: expect.anything()
        })
      );
    });

    test('devrait retourner false en cas d\'erreur', async () => {
      // Mock de doc pour retourner une référence
      const mockDoc = require('@/firebase/firestore').doc;
      mockDoc.mockReturnValue({ id: 'mocked-doc-ref' });

      // Mock de updateDoc pour lancer une erreur
      const mockUpdateDoc = require('@/firebase/firestore').updateDoc;
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

      const result = await updateTransactionStatus('transaction-id', 'failed');

      expect(result).toBe(false);
    });
  });

  describe('getCreditHistoryByUserId', () => {
    test('devrait récupérer l\'historique complet d\'un utilisateur', async () => {
      const mockTransactions = [
        {
          id: 'tx1',
          data: () => ({
            uid: testUserId,
            type: 'purchase',
            credits: 100,
            amount: 1000,
            description: 'Achat de crédits'
          })
        },
        {
          id: 'tx2',
          data: () => ({
            uid: testUserId,
            type: 'spend',
            credits: -10,
            service: 'ai_assistant',
            description: 'Assistant IA'
          })
        }
      ];

      // Mock de getDocs
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockTransactions
      });

      // Mock de getCreditTransactionCount
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 2 })
      });

      const history = await getCreditHistoryByUserId(testUserId);

      expect(history.transactions).toHaveLength(2);
      expect(history.transactions.every((tx: any) => tx.uid === testUserId)).toBe(true);
      expect(history.total).toBe(2);
      expect(history.hasMore).toBe(false);
    });

    test('devrait filtrer par type de transaction', async () => {
      const mockPurchaseTransactions = [
        {
          id: 'tx1',
          data: () => ({
            uid: testUserId,
            type: 'purchase',
            credits: 100
          })
        }
      ];

      // Mock de getDocs
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockPurchaseTransactions
      });

      // Mock de getCreditTransactionCount
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 1 })
      });

      const history = await getCreditHistoryByUserId(testUserId, { type: 'purchase' });

      expect(history.transactions).toHaveLength(1);
      expect(history.transactions[0].type).toBe('purchase');
    });

    test('devrait gérer la pagination', async () => {
      const mockTransactions = Array.from({ length: 11 }, (_, i) => ({
        id: `tx${i}`,
        data: () => ({
          uid: testUserId,
          type: 'purchase',
          credits: 10 * (i + 1)
        })
      }));

      // Mock de getDocs
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockTransactions
      });

      // Mock de getCreditTransactionCount
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 11 })
      });

      const history = await getCreditHistoryByUserId(testUserId, { limit: 10 });

      expect(history.transactions).toHaveLength(10); // Limité à 10
      expect(history.hasMore).toBe(true); // Il y a plus de données
      expect(history.lastVisible).toBeDefined();
    });

    test('devrait retourner un historique vide pour un utilisateur inexistant', async () => {
      // Mock de getDocs pour aucun résultat
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        docs: []
      });

      // Mock de getCreditTransactionCount
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 0 })
      });

      const history = await getCreditHistoryByUserId('non-existent-user');

      expect(history.transactions).toHaveLength(0);
      expect(history.total).toBe(0);
      expect(history.hasMore).toBe(false);
    });

    test('devrait gérer les erreurs', async () => {
      // Mock de getDocs pour lancer une erreur
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockRejectedValue(new Error('Database error'));

      await expect(getCreditHistoryByUserId(testUserId))
        .rejects.toThrow('Erreur lors de la récupération de l\'historique');
    });
  });

  describe('getCreditTransactionCount', () => {
    test('devrait compter toutes les transactions d\'un utilisateur', async () => {
      // Mock de getCountFromServer
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 5 })
      });

      const count = await getCreditTransactionCount(testUserId);

      expect(count).toBe(5);
      expect(mockGetCountFromServer).toHaveBeenCalledTimes(1);
    });

    test('devrait compter les transactions par type', async () => {
      // Mock de getCountFromServer
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 3 })
      });

      const count = await getCreditTransactionCount(testUserId, 'purchase');

      expect(count).toBe(3);
    });

    test('devrait retourner 0 en cas d\'erreur', async () => {
      // Mock de getCountFromServer pour lancer une erreur
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockRejectedValue(new Error('Count error'));

      const count = await getCreditTransactionCount(testUserId);

      expect(count).toBe(0);
    });
  });

  describe('getCreditTransactionStats', () => {
    test('devrait calculer les statistiques correctes', async () => {
      const mockTransactions = [
        {
          data: () => ({
            uid: testUserId,
            type: 'purchase',
            credits: 100,
            amount: 1000,
            status: 'success'
          })
        },
        {
          data: () => ({
            uid: testUserId,
            type: 'purchase',
            credits: 50,
            amount: 500,
            status: 'success'
          })
        },
        {
          data: () => ({
            uid: testUserId,
            type: 'spend',
            credits: -10,
            status: 'success'
          })
        },
        {
          data: () => ({
            uid: testUserId,
            type: 'spend',
            credits: -5,
            status: 'success'
          })
        }
      ];

      // Mock de getDocs
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockTransactions
      });

      const stats = await getCreditTransactionStats(testUserId);

      expect(stats.totalPurchases).toBe(150); // 100 + 50 crédits achetés
      expect(stats.totalSpent).toBe(15);      // 10 + 5 crédits dépensés (valeur absolue)
      expect(stats.totalCreditsUsed).toBe(15); // 10 + 5 crédits utilisés
      expect(stats.totalAmountSpent).toBe(1500); // 1000 + 500 montant total
    });

    test('devrait gérer les cas sans transactions', async () => {
      // Mock de getDocs pour aucun résultat
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        docs: []
      });

      const stats = await getCreditTransactionStats(testUserId);

      expect(stats.totalPurchases).toBe(0);
      expect(stats.totalSpent).toBe(0);
      expect(stats.totalCreditsUsed).toBe(0);
      expect(stats.totalAmountSpent).toBe(0);
    });
  });

  describe('createSpendTransaction', () => {
    test('devrait créer une transaction de dépense', async () => {
      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'spend-tx-id' });

      const transactionId = await createSpendTransaction(
        testUserId,
        10,
        'property_promotion',
        'prop-123',
        'Promotion de la propriété prop-123'
      );

      expect(transactionId).toBe('spend-tx-id');

      // Vérifier les données passées
      const addDocCall = mockAddDoc.mock.calls[0][1];
      expect(addDocCall).toMatchObject({
        uid: testUserId,
        type: 'spend',
        credits: -10,
        service: 'property_promotion',
        propertyId: 'prop-123',
        description: 'Promotion de la propriété prop-123',
        status: 'success'
      });
    });

    test('devrait créer une transaction sans description personnalisée', async () => {
      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'spend-tx-id-2' });

      const transactionId = await createSpendTransaction(
        testUserId,
        5,
        'ai_assistant'
      );

      expect(transactionId).toBe('spend-tx-id-2');

      const addDocCall = mockAddDoc.mock.calls[0][1];
      expect(addDocCall.description).toBe('ai_assistant');
    });
  });

  describe('deductCreditsWithTransaction', () => {
    test('devrait gérer les erreurs de runTransaction', async () => {
      // Mock de runTransaction qui lance une erreur
      const mockRunTransaction = require('@/firebase/firestore').runTransaction;
      mockRunTransaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(deductCreditsWithTransaction(
        testUserId,
        10,
        'test_service'
      )).rejects.toThrow('Transaction failed');
    });

    test('devrait gérer le cas d\'utilisateur introuvable', async () => {
      // Mock de runTransaction qui simule un utilisateur introuvable
      const mockRunTransaction = require('@/firebase/firestore').runTransaction;
      mockRunTransaction.mockRejectedValue(new Error('Utilisateur introuvable'));

      await expect(deductCreditsWithTransaction(
        'non-existent-user',
        15,
        'ai_assistant'
      )).rejects.toThrow('Utilisateur introuvable');
    });
  });

  describe('Intégration complète - Flux de transaction', () => {
    test('devrait gérer un flux complet d\'achat et dépense', async () => {
      // 1. Créer une transaction d'achat
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValueOnce({ id: 'purchase-id' });

      const purchaseTransaction = {
        uid: testUserId,
        type: 'purchase' as const,
        credits: 100,
        amount: 1000,
        status: 'pending' as const
      };

      const purchaseId = await createCreditTransaction(purchaseTransaction);
      expect(purchaseId).toBe('purchase-id');

      // 2. Confirmer la transaction
      const mockUpdateDoc = require('@/firebase/firestore').updateDoc;
      mockUpdateDoc.mockResolvedValue(undefined);

      const updateResult = await updateTransactionStatus('purchase-id', 'success');
      expect(updateResult).toBe(true);

      // 3. Créer une transaction de dépense
      mockAddDoc.mockResolvedValueOnce({ id: 'spend-id' });

      const spendId = await createSpendTransaction(testUserId, 25, 'property_promotion', 'prop-456');
      expect(spendId).toBe('spend-id');

      // 4. Vérifier l'historique
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'purchase-id',
            data: () => ({ ...purchaseTransaction, status: 'success' })
          },
          {
            id: 'spend-id', 
            data: () => ({
              uid: testUserId,
              type: 'spend',
              credits: -25,
              service: 'property_promotion',
              status: 'success'
            })
          }
        ]
      });

      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 2 })
      });

      const history = await getCreditHistoryByUserId(testUserId);

      expect(history.transactions).toHaveLength(2);
      expect(history.transactions.some((tx: any) => tx.type === 'purchase')).toBe(true);
      expect(history.transactions.some((tx: any) => tx.type === 'spend')).toBe(true);
    });
  });

  describe('Tests de cas limites', () => {
    test('devrait gérer les montants de crédits négatifs pour les dépenses', async () => {
      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'spend-id' });

      const transaction = {
        uid: testUserId,
        type: 'spend' as const,
        credits: -50,
        service: 'property_promotion',
        status: 'success' as const
      };

      const transactionId = await createCreditTransaction(transaction);

      expect(transactionId).toBe('spend-id');

      const addDocCall = mockAddDoc.mock.calls[0][1];
      expect(addDocCall.credits).toBe(-50);
    });

    test('devrait gérer les transactions avec montants élevés', async () => {
      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'high-amount-tx-id' });

      const transaction = {
        uid: testUserId,
        type: 'purchase' as const,
        credits: 10000,
        amount: 100000,
        status: 'pending' as const
      };

      const transactionId = await createCreditTransaction(transaction);

      expect(transactionId).toBe('high-amount-tx-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait gérer les descriptions multilingues', async () => {
      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'multilingual-tx-id' });

      const transaction = {
        uid: testUserId,
        type: 'spend' as const,
        credits: -5,
        service: 'ai_assistant',
        description: 'Assistant IA - Génération automatique de contenu français 🇫🇷',
        status: 'success' as const
      };

      const transactionId = await createCreditTransaction(transaction);

      expect(transactionId).toBe('multilingual-tx-id');

      const addDocCall = mockAddDoc.mock.calls[0][1];
      expect(addDocCall.description).toContain('français');
      expect(addDocCall.description).toContain('🇫🇷');
    });
  });
}); 