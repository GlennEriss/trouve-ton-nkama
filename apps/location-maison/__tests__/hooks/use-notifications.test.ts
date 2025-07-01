import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { useNotifications, NotificationProvider } from '@/providers/NotificationProvider';

// Mock de Firestore
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockTimestamp = {
  fromDate: jest.fn(),
  now: jest.fn()
};

jest.mock('firebase/firestore', () => ({
  collection: mockCollection,
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  onSnapshot: mockOnSnapshot,
  doc: mockDoc,
  updateDoc: mockUpdateDoc,
  Timestamp: mockTimestamp
}));

// Mock de Firebase DB
jest.mock('@/firebase/firestore', () => ({
  db: 'mock-db'
}));

// Mock du hook use-current-user
const mockCurrentUser = {
  user: { uid: 'test-user-123' },
  isLoading: false,
  isFirebaseConnected: true,
  error: null
};

jest.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => mockCurrentUser
}));

// Wrapper pour le NotificationProvider
const createWrapper = () => {
  return ({ children }: { children: ReactNode }) => {
    const React = require('react');
    return React.createElement(NotificationProvider, {}, children);
  };
};

// Mock notifications pour les tests
const mockNotifications = [
  {
    id: 'notif-1',
    title: 'Bienvenue sur LogisGabon ��',
    message: 'Merci de vous être inscrit.',
    type: 'SECURITY',
    isRead: false,
    createdFor: 'test-user-123',
    createdAt: { seconds: 1234567890 }
  },
  {
    id: 'notif-2',
    title: 'Propriété ajoutée aux favoris',
    message: 'Jean Dupont a ajouté votre annonce "Villa moderne" à ses favoris',
    type: 'BOOKMARKING',
    isRead: false,
    createdFor: 'test-user-123',
    idProperty: 'property-123',
    actionUrl: '/property/property-123',
    createdAt: { seconds: 1234567880 }
  },
  {
    id: 'notif-3',
    title: 'Paiement confirmé ✅',
    message: 'Votre achat de 100 crédits a été confirmé.',
    type: 'SECURITY',
    isRead: true,
    createdFor: 'test-user-123',
    createdAt: { seconds: 1234567870 }
  }
];

describe('useNotifications Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configuration par défaut des mocks Firestore
    mockCollection.mockReturnValue('mock-collection');
    mockQuery.mockReturnValue('mock-query');
    mockWhere.mockReturnValue('mock-where');
    mockOrderBy.mockReturnValue('mock-order');
    mockLimit.mockReturnValue('mock-limit');
    mockTimestamp.fromDate.mockReturnValue({ seconds: 1234560000 });
  });

  describe('Récupération des notifications', () => {
    test('devrait récupérer les notifications en temps réel', async () => {
      // Mock du snapshot avec notifications
      const mockSnapshot = {
        docs: mockNotifications.map(notif => ({
          id: notif.id,
          data: () => ({ ...notif, id: undefined })
        }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        // Simuler l'appel immédiat du callback
        setTimeout(() => callback(mockSnapshot), 0);
        return jest.fn(); // unsubscribe function
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });

      expect(result.current.notifications[0].id).toBe('notif-1');
      expect(result.current.notifications[1].id).toBe('notif-2');
      expect(result.current.notifications[2].id).toBe('notif-3');
    });

    test('devrait calculer le nombre de notifications non lues', async () => {
      const mockSnapshot = {
        docs: mockNotifications.map(notif => ({
          id: notif.id,
          data: () => ({ ...notif, id: undefined })
        }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        setTimeout(() => callback(mockSnapshot), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(2);
      });

      // Les 2 premières notifications sont non lues
      const unreadNotifications = result.current.notifications.filter(n => !n.isRead);
      expect(unreadNotifications).toHaveLength(2);
    });

    test('ne devrait pas récupérer les notifications si utilisateur non connecté', () => {
      mockCurrentUser.user = null as any;

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      expect(result.current.notifications).toHaveLength(0);
      expect(result.current.unreadCount).toBe(0);
      expect(mockOnSnapshot).not.toHaveBeenCalled();

      // Restaurer l'état
      mockCurrentUser.user = { uid: 'test-user-123' };
    });

    test('devrait configurer les requêtes Firestore correctement', async () => {
      mockOnSnapshot.mockImplementation(() => jest.fn());

      renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith('mock-db', 'notifications');
      });

      expect(mockWhere).toHaveBeenCalledWith('createdFor', '==', 'test-user-123');
      expect(mockWhere).toHaveBeenCalledWith('isRead', '==', false);
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(50);
    });
  });

  describe('Marquage comme lu', () => {
    test('devrait marquer une notification comme lue', async () => {
      const mockSnapshot = {
        docs: mockNotifications.map(notif => ({
          id: notif.id,
          data: () => ({ ...notif, id: undefined })
        }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        setTimeout(() => callback(mockSnapshot), 0);
        return jest.fn();
      });

      mockDoc.mockReturnValue('mock-doc-ref');
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });

      // Marquer la première notification comme lue
      await act(async () => {
        await result.current.markAsRead('notif-1');
      });

      expect(mockDoc).toHaveBeenCalledWith('mock-db', 'notifications', 'notif-1');
      expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', { isRead: true });

      // La notification devrait être marquée comme lue localement
      const updatedNotification = result.current.notifications.find(n => n.id === 'notif-1');
      expect(updatedNotification?.isRead).toBe(true);
    });

    test('devrait marquer toutes les notifications comme lues', async () => {
      const mockSnapshot = {
        docs: mockNotifications.map(notif => ({
          id: notif.id,
          data: () => ({ ...notif, id: undefined })
        }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        setTimeout(() => callback(mockSnapshot), 0);
        return jest.fn();
      });

      mockDoc.mockReturnValue('mock-doc-ref');
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(2);
      });

      // Marquer toutes les notifications comme lues
      await act(async () => {
        await result.current.markAllAsRead();
      });

      // Devrait appeler updateDoc pour chaque notification non lue
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);

      // Toutes les notifications devraient être marquées comme lues localement
      const allRead = result.current.notifications.every(n => n.isRead);
      expect(allRead).toBe(true);
      expect(result.current.unreadCount).toBe(0);
    });

    test('devrait gérer les erreurs de marquage comme lu', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockSnapshot = {
        docs: mockNotifications.slice(0, 1).map(notif => ({
          id: notif.id,
          data: () => ({ ...notif, id: undefined })
        }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        setTimeout(() => callback(mockSnapshot), 0);
        return jest.fn();
      });

      mockDoc.mockReturnValue('mock-doc-ref');
      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.markAsRead('notif-1');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Erreur lors de la mise à jour de la notification :',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Types de notifications', () => {
    test('devrait gérer les notifications SECURITY', async () => {
      const securityNotifications = [
        {
          id: 'security-1',
          title: 'Bienvenue sur LogisGabon 👋',
          message: 'Merci de vous être inscrit.',
          type: 'SECURITY',
          isRead: false,
          createdFor: 'test-user-123',
          createdAt: { seconds: 1234567890 }
        },
        {
          id: 'security-2',
          title: 'Complétez votre profil ✍️',
          message: 'Ajoutez vos informations personnelles.',
          type: 'SECURITY',
          isRead: false,
          createdFor: 'test-user-123',
          actionUrl: '/profil/informations',
          createdAt: { seconds: 1234567880 }
        }
      ];

      const mockSnapshot = {
        docs: securityNotifications.map(notif => ({
          id: notif.id,
          data: () => ({ ...notif, id: undefined })
        }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        setTimeout(() => callback(mockSnapshot), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      result.current.notifications.forEach(notif => {
        expect(notif.type).toBe('SECURITY');
      });

      // Une notification avec actionUrl
      const profileNotif = result.current.notifications.find(n => n.id === 'security-2');
      expect(profileNotif?.actionUrl).toBe('/profil/informations');
    });

    test('devrait gérer les notifications BOOKMARKING', async () => {
      const bookmarkingNotifications = [
        {
          id: 'bookmark-1',
          title: 'Propriété ajoutée aux favoris',
          message: 'Marie Martin a ajouté votre annonce à ses favoris',
          type: 'BOOKMARKING',
          isRead: false,
          createdFor: 'test-user-123',
          idProperty: 'property-456',
          actionUrl: '/property/property-456',
          createdAt: { seconds: 1234567890 }
        },
        {
          id: 'bookmark-2',
          title: 'Villa moderne Estuaire',
          message: 'Vous avez ajouté cette annonce à vos favoris',
          type: 'BOOKMARKING',
          isRead: true,
          createdFor: 'test-user-123',
          idProperty: 'property-789',
          actionUrl: '/favoris',
          createdAt: { seconds: 1234567880 }
        }
      ];

      const mockSnapshot = {
        docs: bookmarkingNotifications.map(notif => ({
          id: notif.id,
          data: () => ({ ...notif, id: undefined })
        }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        setTimeout(() => callback(mockSnapshot), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      result.current.notifications.forEach(notif => {
        expect(notif.type).toBe('BOOKMARKING');
        expect(notif.idProperty).toBeDefined();
        expect(notif.actionUrl).toBeDefined();
      });
    });
  });

  describe('Gestion des dates et tri', () => {
    test('devrait trier les notifications par date décroissante', async () => {
      const notificationsUnsorted = [
        {
          id: 'old-notif',
          title: 'Ancienne notification',
          message: 'Message ancien',
          type: 'SECURITY',
          isRead: true,
          createdFor: 'test-user-123',
          createdAt: { seconds: 1234567800 } // Plus ancienne
        },
        {
          id: 'new-notif',
          title: 'Nouvelle notification',
          message: 'Message récent',
          type: 'SECURITY',
          isRead: false,
          createdFor: 'test-user-123',
          createdAt: { seconds: 1234567900 } // Plus récente
        }
      ];

      const mockSnapshot = {
        docs: notificationsUnsorted.map(notif => ({
          id: notif.id,
          data: () => ({ ...notif, id: undefined })
        }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        setTimeout(() => callback(mockSnapshot), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      // Vérifier que mockOrderBy a été appelé avec le bon paramètre
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    test('devrait limiter le nombre de notifications', async () => {
      renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(mockLimit).toHaveBeenCalledWith(50);
      });
    });
  });

  describe('Optimisation et performance', () => {
    test('devrait fusionner les notifications non lues et récentes', async () => {
      // Simuler le comportement du provider qui fait deux requêtes
      let callCount = 0;
      mockOnSnapshot.mockImplementation((query, callback) => {
        callCount++;
        
        if (callCount === 1) {
          // Première requête: notifications non lues
          const unreadSnapshot = {
            docs: mockNotifications.filter(n => !n.isRead).map(notif => ({
              id: notif.id,
              data: () => ({ ...notif, id: undefined })
            }))
          };
          setTimeout(() => callback(unreadSnapshot), 0);
        } else {
          // Deuxième requête: notifications récentes (sans doublons)
          const recentSnapshot = {
            docs: mockNotifications.map(notif => ({
              id: notif.id,
              data: () => ({ ...notif, id: undefined })
            }))
          };
          setTimeout(() => callback(recentSnapshot), 10);
        }
        
        return jest.fn();
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(3);
      });

      // Vérifier qu'il n'y a pas de doublons
      const ids = result.current.notifications.map(n => n.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('devrait nettoyer les listeners au démontage', () => {
      const mockUnsubscribe = jest.fn();
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Cas limites et erreurs', () => {
    test('devrait gérer les notifications sans ID', async () => {
      const notificationsWithoutId = [
        {
          title: 'Notification sans ID',
          message: 'Message test',
          type: 'SECURITY',
          isRead: false,
          createdFor: 'test-user-123',
          createdAt: { seconds: 1234567890 }
        }
      ];

      const mockSnapshot = {
        docs: notificationsWithoutId.map((notif, index) => ({
          id: `generated-id-${index}`,
          data: () => notif
        }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        setTimeout(() => callback(mockSnapshot), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      expect(result.current.notifications[0].id).toBe('generated-id-0');
    });

    test('devrait gérer les erreurs Firestore', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockOnSnapshot.mockImplementation((query, callback, errorCallback) => {
        if (errorCallback) {
          setTimeout(() => errorCallback(new Error('Firestore connection error')), 0);
        }
        return jest.fn();
      });

      renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      // Le hook devrait continuer à fonctionner même en cas d'erreur
      // et ne pas planter l'application

      consoleSpy.mockRestore();
    });

    test('devrait gérer les notifications malformées', async () => {
      const malformedNotifications = [
        {
          // Notification sans titre
          message: 'Message sans titre',
          type: 'SECURITY',
          isRead: false,
          createdFor: 'test-user-123'
        },
        {
          id: 'valid-notif',
          title: 'Notification valide',
          message: 'Message valide',
          type: 'SECURITY',
          isRead: false,
          createdFor: 'test-user-123',
          createdAt: { seconds: 1234567890 }
        }
      ];

      const mockSnapshot = {
        docs: malformedNotifications.map((notif, index) => ({
          id: notif.id || `malformed-${index}`,
          data: () => notif
        }))
      };

      mockOnSnapshot.mockImplementation((query, callback) => {
        setTimeout(() => callback(mockSnapshot), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      // Le hook devrait gérer gracieusement les notifications malformées
      expect(result.current.notifications[1].title).toBe('Notification valide');
    });
  });

  describe('Hook en dehors du provider', () => {
    test('devrait lever une erreur si utilisé en dehors du NotificationProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useNotifications());
      }).toThrow('useNotifications must be used within a NotificationProvider');

      consoleSpy.mockRestore();
    });
  });
});
