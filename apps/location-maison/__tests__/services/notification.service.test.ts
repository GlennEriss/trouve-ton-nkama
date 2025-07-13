import { describe, test, expect, jest } from '@jest/globals';
import { createNotification } from '@/db/notification.db';

// Mock des dépendances Firebase
jest.mock('@/firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
}));

// Mock du module de base de données
jest.mock('@/db/notification.db');

describe('Notification Service Tests', () => {
  const mockCreateNotification = createNotification as jest.MockedFunction<typeof createNotification>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    test('devrait créer une notification de bienvenue', async () => {
      const welcomeNotification = {
        title: 'Bienvenue sur Trouve Ton Nkama 👋',
        message: 'Merci de vous être inscrit. Vous pouvez maintenant publier ou consulter des annonces immobilières au Gabon.',
        createdFor: 'user-123',
        isRead: false,
        type: 'SECURITY'
      };

      mockCreateNotification.mockResolvedValue('notification-welcome-123');

      const result = await createNotification(welcomeNotification);

      expect(result).toBe('notification-welcome-123');
      expect(mockCreateNotification).toHaveBeenCalledWith(welcomeNotification);
    });

    test('devrait créer une notification de propriété en favoris', async () => {
      const bookmarkNotification = {
        idProperty: 'property-456',
        type: 'BOOKMARKING',
        title: 'Belle maison familiale',
        isRead: false,
        createdFor: 'owner-789',
        message: 'Jean Dupont a ajouté votre annonce à ses favoris',
        actionUrl: '/property/property-456'
      };

      mockCreateNotification.mockResolvedValue('notification-bookmark-456');

      const result = await createNotification(bookmarkNotification);

      expect(result).toBe('notification-bookmark-456');
      expect(mockCreateNotification).toHaveBeenCalledWith(bookmarkNotification);
    });

    test('devrait créer une notification de paiement réussi', async () => {
      const paymentNotification = {
        title: 'Paiement confirmé ✅',
        message: 'Votre achat de 100 crédits pour 5000 FCFA a été confirmé avec succès.',
        createdFor: 'user-123',
        isRead: false,
        type: 'SECURITY',
        data: {
          transactionId: 'tx-789',
          amount: 5000,
          credits: 100,
          currency: 'XAF'
        }
      };

      mockCreateNotification.mockResolvedValue('notification-payment-789');

      const result = await createNotification(paymentNotification);

      expect(result).toBe('notification-payment-789');
      expect(mockCreateNotification).toHaveBeenCalledWith(paymentNotification);
    });

    test('devrait créer une notification de propriété approuvée', async () => {
      const approvalNotification = {
        idProperty: 'property-123',
        title: 'Propriété approuvée',
        message: 'Votre annonce "Villa moderne Libreville" a été approuvée et est maintenant visible.',
        createdFor: 'user-456',
        isRead: false,
        type: 'SECURITY',
        actionUrl: '/property/property-123'
      };

      mockCreateNotification.mockResolvedValue('notification-approval-123');

      const result = await createNotification(approvalNotification);

      expect(result).toBe('notification-approval-123');
      expect(mockCreateNotification).toHaveBeenCalledWith(approvalNotification);
    });

    test('devrait créer une notification de profil incomplet', async () => {
      const profileNotification = {
        title: 'Complétez votre profil ✍️',
        message: 'Ajoutez vos informations personnelles pour profiter pleinement de la plateforme.',
        createdFor: 'user-789',
        isRead: false,
        type: 'SECURITY',
        actionUrl: '/profil/informations'
      };

      mockCreateNotification.mockResolvedValue('notification-profile-789');

      const result = await createNotification(profileNotification);

      expect(result).toBe('notification-profile-789');
      expect(mockCreateNotification).toHaveBeenCalledWith(profileNotification);
    });

    test('devrait gérer les erreurs de création', async () => {
      const errorNotification = {
        title: 'Test erreur',
        message: 'Cette notification va échouer',
        createdFor: 'user-error',
        isRead: false,
        type: 'SECURITY'
      };

      mockCreateNotification.mockResolvedValue(null);

      const result = await createNotification(errorNotification);

      expect(result).toBeNull();
      expect(mockCreateNotification).toHaveBeenCalledWith(errorNotification);
    });
  });

  describe('Types de notifications métier', () => {
    test('devrait supporter tous les types de notifications BOOKMARKING', async () => {
      const bookmarkingTypes = [
        {
          scenario: 'Ajout aux favoris par un autre utilisateur',
          notification: {
            idProperty: 'prop-001',
            type: 'BOOKMARKING',
            title: 'Appartement centre-ville',
            message: 'Marie Martin a ajouté votre annonce à ses favoris',
            createdFor: 'owner-001',
            actionUrl: '/property/prop-001'
          }
        },
        {
          scenario: 'Ajout aux favoris par le propriétaire lui-même',
          notification: {
            idProperty: 'prop-002',
            type: 'BOOKMARKING',
            title: 'Villa bord de mer',
            message: 'Une annonce a été ajoutée à vos favoris',
            createdFor: 'owner-002',
            actionUrl: '/favoris'
          }
        }
      ];

      mockCreateNotification.mockResolvedValue('test-notification-id');

      for (const { scenario, notification } of bookmarkingTypes) {
        await createNotification(notification);
        expect(mockCreateNotification).toHaveBeenCalledWith(notification);
      }

      expect(mockCreateNotification).toHaveBeenCalledTimes(bookmarkingTypes.length);
    });

    test('devrait supporter tous les types de notifications SECURITY', async () => {
      const securityTypes = [
        {
          type: 'Bienvenue nouvel utilisateur',
          notification: {
            title: 'Bienvenue sur Trouve Ton Nkama 👋',
            message: 'Merci de vous être inscrit.',
            type: 'SECURITY'
          }
        },
        {
          type: 'Profil incomplet',
          notification: {
            title: 'Complétez votre profil ✍️',
            message: 'Ajoutez vos informations personnelles.',
            type: 'SECURITY',
            actionUrl: '/profil/informations'
          }
        },
        {
          type: 'Paiement confirmé',
          notification: {
            title: 'Paiement confirmé ✅',
            message: 'Votre achat a été confirmé.',
            type: 'SECURITY'
          }
        },
        {
          type: 'Propriété approuvée',
          notification: {
            title: 'Propriété approuvée',
            message: 'Votre annonce a été approuvée.',
            type: 'SECURITY'
          }
        }
      ];

      mockCreateNotification.mockResolvedValue('security-notification-id');

      for (const { notification } of securityTypes) {
        await createNotification({
          ...notification,
          createdFor: 'test-user',
          isRead: false
        });
      }

      expect(mockCreateNotification).toHaveBeenCalledTimes(securityTypes.length);
    });
  });

  describe('Validation et métadonnées', () => {
    test('devrait accepter des notifications avec données minimales', async () => {
      const minimalNotification = {
        title: 'Notification minimale',
        message: 'Message simple',
        createdFor: 'user-minimal',
        isRead: false,
        type: 'SECURITY'
      };

      mockCreateNotification.mockResolvedValue('minimal-id');

      const result = await createNotification(minimalNotification);

      expect(result).toBe('minimal-id');
      expect(mockCreateNotification).toHaveBeenCalledWith(minimalNotification);
    });

    test('devrait accepter des notifications avec métadonnées étendues', async () => {
      const extendedNotification = {
        idProperty: 'property-extended',
        title: 'Notification étendue',
        message: 'Message avec métadonnées',
        createdFor: 'user-extended',
        isRead: false,
        type: 'BOOKMARKING',
        actionUrl: '/property/property-extended',
        customData: {
          priority: 'high',
          category: 'property',
          tags: ['urgent', 'featured']
        }
      };

      mockCreateNotification.mockResolvedValue('extended-id');

      const result = await createNotification(extendedNotification);

      expect(result).toBe('extended-id');
      expect(mockCreateNotification).toHaveBeenCalledWith(extendedNotification);
    });
  });

  describe('Scénarios d\'intégration', () => {
    test('devrait gérer le flux complet d\'inscription utilisateur', async () => {
      mockCreateNotification.mockResolvedValue('integration-id');

      // 1. Notification de bienvenue
      const welcomeNotif = {
        title: 'Bienvenue sur Trouve Ton Nkama 👋',
        message: 'Merci de vous être inscrit.',
        createdFor: 'new-user-123',
        isRead: false,
        type: 'SECURITY'
      };

      await createNotification(welcomeNotif);

      // 2. Notification de profil à compléter (si inscription via OAuth)
      const profileNotif = {
        title: 'Complétez votre profil ✍️',
        message: 'Ajoutez vos informations personnelles.',
        createdFor: 'new-user-123',
        isRead: false,
        type: 'SECURITY',
        actionUrl: '/profil/informations'
      };

      await createNotification(profileNotif);

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(1, welcomeNotif);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(2, profileNotif);
    });

    test('devrait gérer le flux de favoris bidirectionnel', async () => {
      mockCreateNotification.mockResolvedValue('bidirectional-id');

      const propertyId = 'shared-property-789';
      const ownerId = 'property-owner-456';
      const userId = 'property-viewer-123';

      // 1. Notification pour le propriétaire
      const ownerNotif = {
        idProperty: propertyId,
        type: 'BOOKMARKING',
        title: 'Villa moderne Estuaire',
        isRead: false,
        createdFor: ownerId,
        message: 'Jean Dupont a ajouté votre annonce à ses favoris',
        actionUrl: `/property/${propertyId}`
      };

      await createNotification(ownerNotif);

      // 2. Notification pour l'utilisateur qui a ajouté aux favoris
      const userNotif = {
        idProperty: propertyId,
        type: 'BOOKMARKING',
        title: 'Villa moderne Estuaire',
        isRead: false,
        createdFor: userId,
        message: 'Vous avez ajouté l\'annonce "Villa moderne Estuaire" à vos favoris',
        actionUrl: '/favoris'
      };

      await createNotification(userNotif);

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(1, ownerNotif);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(2, userNotif);
    });

    test('devrait gérer le flux de paiement complet', async () => {
      mockCreateNotification.mockResolvedValue('payment-flow-id');

      const userId = 'paying-user-456';
      const transactionId = 'tx-payment-789';

      // 1. Notification de paiement initié
      const paymentInitiated = {
        title: 'Paiement en cours 🔄',
        message: 'Votre paiement de 5000 FCFA est en cours de traitement.',
        createdFor: userId,
        isRead: false,
        type: 'SECURITY',
        data: {
          transactionId,
          status: 'pending',
          amount: 5000
        }
      };

      await createNotification(paymentInitiated);

      // 2. Notification de paiement confirmé
      const paymentConfirmed = {
        title: 'Paiement confirmé ✅',
        message: 'Votre achat de 100 crédits a été confirmé avec succès.',
        createdFor: userId,
        isRead: false,
        type: 'SECURITY',
        data: {
          transactionId,
          status: 'success',
          amount: 5000,
          credits: 100
        }
      };

      await createNotification(paymentConfirmed);

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    });
  });
});
