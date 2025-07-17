import { describe, test, expect, jest } from '@jest/globals';
import { createNotification } from '@/db/notification.db';

// Mock des dépendances Firebase
jest.mock('@/firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
}));

describe('Notification DB Integration Tests', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    test('devrait créer une notification avec succès', async () => {
      const mockNotification = {
        userId: testUserId,
        title: 'Nouvelle notification',
        message: 'Votre propriété a été approuvée',
        type: 'property_approved',
        isRead: false,
        data: {
          propertyId: 'prop-123',
          action: 'approve'
        }
      };

      // Mock de addDoc pour retourner un ID
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'mock-notification-id' });

      const notificationId = await createNotification(mockNotification);

      expect(notificationId).toBe('mock-notification-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      
      // Vérifier que les données correctes ont été passées
      const addDocCall = mockAddDoc.mock.calls[0][1];
      expect(addDocCall).toMatchObject({
        ...mockNotification,
        state: 'IN_PROGRESS'
      });
      expect(addDocCall).toHaveProperty('createdAt');
      expect(addDocCall).toHaveProperty('updatedAt');
    });

    test('devrait créer une notification de paiement', async () => {
      const mockPaymentNotification = {
        userId: testUserId,
        title: 'Paiement confirmé',
        message: 'Votre achat de 100 crédits a été confirmé',
        type: 'payment_success',
        isRead: false,
        data: {
          transactionId: 'tx-456',
          amount: 1000,
          credits: 100,
          currency: 'XAF'
        }
      };

      // Mock de addDoc pour retourner un ID
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'payment-notification-id' });

      const notificationId = await createNotification(mockPaymentNotification);

      expect(notificationId).toBe('payment-notification-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait créer une notification avec données minimales', async () => {
      const minimalNotification = {
        userId: testUserId,
        title: 'Notification simple',
        message: 'Message simple'
      };

      // Mock de addDoc pour retourner un ID
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'minimal-notification-id' });

      const notificationId = await createNotification(minimalNotification);

      expect(notificationId).toBe('minimal-notification-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner null en cas d\'erreur', async () => {
      const mockNotification = {
        userId: testUserId,
        title: 'Notification avec erreur',
        message: 'Cette notification va échouer'
      };

      // Mock de addDoc pour lancer une erreur
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockRejectedValue(new Error('Firestore error'));

      const notificationId = await createNotification(mockNotification);

      expect(notificationId).toBeNull();
    });

    test('devrait ajouter automatiquement les métadonnées', async () => {
      const mockNotification = {
        userId: testUserId,
        title: 'Test métadonnées',
        message: 'Test des métadonnées automatiques'
      };

      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'metadata-test-id' });

      await createNotification(mockNotification);

      // Vérifier que les métadonnées ont été ajoutées
      const addDocCall = mockAddDoc.mock.calls[0][1];
      expect(addDocCall).toHaveProperty('state', 'IN_PROGRESS');
      expect(addDocCall).toHaveProperty('createdAt');
      expect(addDocCall).toHaveProperty('updatedAt');
      expect(addDocCall.createdAt).toEqual({ seconds: 1234567890, nanoseconds: 0 });
      expect(addDocCall.updatedAt).toEqual({ seconds: 1234567890, nanoseconds: 0 });
    });

    test('devrait gérer différents types de notifications', async () => {
      const notificationTypes = [
        {
          type: 'property_approved',
          title: 'Propriété approuvée',
          message: 'Votre propriété a été approuvée'
        },
        {
          type: 'property_rejected',
          title: 'Propriété rejetée',
          message: 'Votre propriété a été rejetée'
        },
        {
          type: 'credit_purchased',
          title: 'Crédits achetés',
          message: 'Vos crédits ont été ajoutés'
        },
        {
          type: 'promotion_activated',
          title: 'Promotion activée',
          message: 'Votre propriété est maintenant promue'
        }
      ];

      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockImplementation(() => 
        Promise.resolve({ id: `notification-${Math.random()}` })
      );

      for (const notificationData of notificationTypes) {
        const notification = {
          userId: testUserId,
          ...notificationData,
          isRead: false
        };

        const notificationId = await createNotification(notification);
        expect(notificationId).toBeDefined();
        expect(typeof notificationId).toBe('string');
      }

      expect(mockAddDoc).toHaveBeenCalledTimes(notificationTypes.length);
    });

    test('devrait préserver les données personnalisées', async () => {
      const customNotification = {
        userId: testUserId,
        title: 'Notification personnalisée',
        message: 'Avec données personnalisées',
        customField1: 'valeur1',
        customField2: 123,
        customObject: {
          nested: 'data',
          array: [1, 2, 3]
        }
      };

      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'custom-notification-id' });

      const notificationId = await createNotification(customNotification);

      expect(notificationId).toBe('custom-notification-id');
      
      // Vérifier que les données personnalisées sont préservées
      const addDocCall = mockAddDoc.mock.calls[0][1];
      expect(addDocCall).toHaveProperty('customField1', 'valeur1');
      expect(addDocCall).toHaveProperty('customField2', 123);
      expect(addDocCall).toHaveProperty('customObject');
      expect(addDocCall.customObject).toEqual({
        nested: 'data',
        array: [1, 2, 3]
      });
    });
  });

  describe('Tests d\'intégration par scénarios', () => {
    test('devrait créer des notifications pour un flux de propriété', async () => {
      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      let notificationCounter = 0;
      mockAddDoc.mockImplementation(() => 
        Promise.resolve({ id: `notification-${++notificationCounter}` })
      );

      // 1. Notification de soumission
      const submissionNotification = {
        userId: testUserId,
        title: 'Propriété soumise',
        message: 'Votre propriété a été soumise pour révision',
        type: 'property_submitted',
        data: { propertyId: 'prop-123' }
      };

      const submissionId = await createNotification(submissionNotification);
      expect(submissionId).toBe('notification-1');

      // 2. Notification d'approbation
      const approvalNotification = {
        userId: testUserId,
        title: 'Propriété approuvée',
        message: 'Votre propriété a été approuvée et est maintenant visible',
        type: 'property_approved',
        data: { propertyId: 'prop-123' }
      };

      const approvalId = await createNotification(approvalNotification);
      expect(approvalId).toBe('notification-2');

      expect(mockAddDoc).toHaveBeenCalledTimes(2);
    });

    test('devrait créer des notifications pour un flux de paiement', async () => {
      // Mock de addDoc
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      let notificationCounter = 0;
      mockAddDoc.mockImplementation(() => 
        Promise.resolve({ id: `payment-notification-${++notificationCounter}` })
      );

      // 1. Notification de paiement initié
      const paymentInitiated = {
        userId: testUserId,
        title: 'Paiement en cours',
        message: 'Votre paiement est en cours de traitement',
        type: 'payment_pending',
        data: { transactionId: 'tx-789', amount: 500 }
      };

      const initiatedId = await createNotification(paymentInitiated);
      expect(initiatedId).toBe('payment-notification-1');

      // 2. Notification de paiement confirmé
      const paymentConfirmed = {
        userId: testUserId,
        title: 'Paiement confirmé',
        message: 'Votre paiement a été confirmé avec succès',
        type: 'payment_success',
        data: { transactionId: 'tx-789', amount: 500, credits: 50 }
      };

      const confirmedId = await createNotification(paymentConfirmed);
      expect(confirmedId).toBe('payment-notification-2');

      expect(mockAddDoc).toHaveBeenCalledTimes(2);
    });
  });
}); 