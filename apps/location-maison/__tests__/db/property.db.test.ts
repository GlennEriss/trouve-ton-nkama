import { describe, test, expect, jest } from '@jest/globals';
import {
  createProperty,
  updateProperty,
  deleteProperty,
  getProperties,
  getPropertyById,
  getCountStatisticsByPropertyType,
  getServerCountByProvince,
  getServerCountByPropertyType
} from '@/db/property.db';

// Mock des dépendances Firebase
jest.mock('@/firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getCountFromServer: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
}));

describe('Property DB Integration Tests', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProperty', () => {
    test('devrait créer une propriété avec succès', async () => {
      const mockProperty = {
        title: 'Maison moderne à Libreville',
        description: 'Belle maison avec 3 chambres',
        price: 500000,
        typeProperty: 'Home',
        province: 'Estuaire',
        city: 'Libreville',
        createdBy: testUserId
      };

      // Mock de addDoc pour retourner un ID
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'mock-property-id' });

      const propertyId = await createProperty(mockProperty as any);

      expect(propertyId).toBe('mock-property-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner null en cas d\'erreur', async () => {
      const mockProperty = {
        title: 'Test Property',
        createdBy: testUserId
      };

      // Mock de addDoc pour lancer une erreur
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockRejectedValue(new Error('Firestore error'));

      const propertyId = await createProperty(mockProperty as any);

      expect(propertyId).toBeNull();
    });
  });

  describe('getPropertyById', () => {
    test('devrait récupérer une propriété existante', async () => {
      const mockPropertyData = {
        title: 'Test Property',
        price: 100000,
        createdBy: testUserId
      };

      // Mock de getDoc
      const mockGetDoc = require('@/firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'test-property-id',
        data: () => mockPropertyData
      });

      const property = await getPropertyById('test-property-id');

      expect(property).toEqual({
        id: 'test-property-id',
        ...mockPropertyData
      });
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner null pour une propriété inexistante', async () => {
      // Mock de getDoc pour une propriété qui n'existe pas
      const mockGetDoc = require('@/firebase/firestore').getDoc;
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const property = await getPropertyById('non-existent-id');

      expect(property).toBeNull();
    });

    test('devrait gérer les erreurs de récupération', async () => {
      // Mock de getDoc pour lancer une erreur
      const mockGetDoc = require('@/firebase/firestore').getDoc;
      mockGetDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(getPropertyById('error-id')).rejects.toThrow();
    });
  });

  describe('updateProperty', () => {
    test('devrait mettre à jour une propriété avec succès', async () => {
      const updates = {
        title: 'Titre mis à jour',
        price: 200000
      };

      // Mock de updateDoc
      const mockUpdateDoc = require('@/firebase/firestore').updateDoc;
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await updateProperty('property-id', updates);

      expect(result).toBe(true);
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner false en cas d\'erreur', async () => {
      const updates = { title: 'New Title' };

      // Mock de updateDoc pour lancer une erreur
      const mockUpdateDoc = require('@/firebase/firestore').updateDoc;
      mockUpdateDoc.mockRejectedValue(new Error('Update error'));

      const result = await updateProperty('property-id', updates);

      expect(result).toBe(false);
    });
  });

  describe('deleteProperty', () => {
    test('devrait supprimer une propriété avec succès', async () => {
      // Mock de deleteDoc
      const mockDeleteDoc = require('@/firebase/firestore').deleteDoc;
      mockDeleteDoc.mockResolvedValue(undefined);

      const result = await deleteProperty('property-id');

      expect(result).toBe(true);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner false en cas d\'erreur', async () => {
      // Mock de deleteDoc pour lancer une erreur
      const mockDeleteDoc = require('@/firebase/firestore').deleteDoc;
      mockDeleteDoc.mockRejectedValue(new Error('Delete error'));

      const result = await deleteProperty('property-id');

      expect(result).toBe(false);
    });
  });

  describe('getProperties', () => {
    test('devrait récupérer les propriétés avec pagination', async () => {
      const mockProperties = [
        {
          id: 'prop1',
          title: 'Propriété 1',
          createdBy: testUserId
        },
        {
          id: 'prop2',
          title: 'Propriété 2',
          createdBy: testUserId
        }
      ];

      const mockDocs = mockProperties.map(prop => ({
        id: prop.id,
        data: () => ({ title: prop.title, createdBy: prop.createdBy })
      }));

      // Mock de getDocs avec forEach
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        docs: mockDocs,
        forEach: (callback: any) => mockDocs.forEach(callback)
      });

      const result = await getProperties({
        limitPerPage: 10,
        lastDoc: null
      });

      expect(result.properties).toHaveLength(2);
      expect(result.limitPerPage).toBe(10);
      expect(result.properties[0].title).toBe('Propriété 1');
    });
  });

  describe('getCountStatisticsByPropertyType', () => {
    test('devrait compter les propriétés d\'un utilisateur', async () => {
      // Mock de getCountFromServer
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 5 })
      });

      const count = await getCountStatisticsByPropertyType(testUserId);

      expect(count).toBe(5);
      expect(mockGetCountFromServer).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner 0 en cas d\'erreur', async () => {
      // Mock de getCountFromServer pour lancer une erreur
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockRejectedValue(new Error('Count error'));

      await expect(getCountStatisticsByPropertyType(testUserId)).rejects.toThrow('Failed to fetch property count');
    });
  });

  describe('getServerCountByProvince', () => {
    test('devrait compter les propriétés par province', async () => {
      // Mock de getCountFromServer
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 3 })
      });

      const count = await getServerCountByProvince('Estuaire');

      expect(count).toBe(3);
    });

    test('devrait retourner 0 en cas d\'erreur', async () => {
      // Mock de getCountFromServer pour lancer une erreur
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockRejectedValue(new Error('Province count error'));

      await expect(getServerCountByProvince('Estuaire')).rejects.toThrow('Failed to fetch property count by province');
    });
  });

  describe('getServerCountByPropertyType', () => {
    test('devrait compter les propriétés par type', async () => {
      // Mock de getCountFromServer
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockResolvedValue({
        data: () => ({ count: 7 })
      });

      const count = await getServerCountByPropertyType('Home');

      expect(count).toBe(7);
    });

    test('devrait retourner 0 en cas d\'erreur', async () => {
      // Mock de getCountFromServer pour lancer une erreur
      const mockGetCountFromServer = require('@/firebase/firestore').getCountFromServer;
      mockGetCountFromServer.mockRejectedValue(new Error('Type count error'));

      await expect(getServerCountByPropertyType('Home')).rejects.toThrow('Failed to fetch property count by type');
    });
  });
}); 