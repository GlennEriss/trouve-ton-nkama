import { describe, test, expect, jest } from '@jest/globals';
import {
  createUser,
  getUserByUID,
  findUserDetailsByUserID,
  findUserByEmail,
  updateUser
} from '@/db/user.db';

// Mock des dépendances Firebase
jest.mock('@/firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
}));

describe('User DB Integration Tests', () => {
  const testUserUID = 'test-user-uid-123';
  const testEmail = 'test@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    test('devrait créer un utilisateur avec succès', async () => {
      const mockUser = {
        uid: testUserUID,
        email: testEmail,
        firstname: 'Test',
        lastname: 'User',
        phoneNumbers: ['+24101122334'],
        image: 'https://example.com/photo.jpg'
      };

      // Mock de addDoc pour retourner un ID
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'mock-user-doc-id' });

      const userId = await createUser(mockUser);

      expect(userId).toBe('mock-user-doc-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner null en cas d\'erreur', async () => {
      const mockUser = {
        uid: testUserUID,
        email: testEmail
      };

      // Mock de addDoc pour lancer une erreur
      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockRejectedValue(new Error('Firestore error'));

      const userId = await createUser(mockUser);

      expect(userId).toBeNull();
    });
  });

  describe('getUserByUID', () => {
    test('devrait récupérer un utilisateur par son UID', async () => {
      const mockUserData = {
        uid: testUserUID,
        email: testEmail,
        firstname: 'Test',
        lastname: 'User',
        phoneNumbers: ['+24101122334'],
        image: 'https://example.com/photo.jpg'
      };

      // Mock de getDocs
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'user-doc-id',
          data: () => mockUserData
        }]
      });

      const user = await getUserByUID(testUserUID);

      expect(user).toEqual({
        id: 'user-doc-id',
        ...mockUserData
      });
      expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner null pour un UID inexistant', async () => {
      // Mock de getDocs pour aucun résultat
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: []
      });

      const user = await getUserByUID('non-existent-uid');

      expect(user).toBeNull();
    });

    test('devrait retourner null en cas d\'erreur', async () => {
      // Mock de getDocs pour lancer une erreur
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockRejectedValue(new Error('Firestore error'));

      const user = await getUserByUID(testUserUID);

      expect(user).toBeNull();
    });
  });

  describe('findUserDetailsByUserID', () => {
    test('devrait récupérer les détails d\'un utilisateur par UID', async () => {
      const mockUserData = {
        uid: testUserUID,
        email: testEmail,
        firstname: 'Test',
        lastname: 'User',
        phoneNumbers: ['+241123456789']
      };

      // Mock de getDocs
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          data: () => mockUserData
        }]
      });

      const userDetails = await findUserDetailsByUserID(testUserUID);

      expect(userDetails).toEqual(mockUserData);
      expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner null pour un utilisateur inexistant', async () => {
      // Mock de getDocs pour aucun résultat
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: []
      });

      const userDetails = await findUserDetailsByUserID('non-existent-uid');

      expect(userDetails).toBeNull();
    });

    test('devrait retourner null en cas d\'erreur', async () => {
      // Mock de getDocs pour lancer une erreur
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockRejectedValue(new Error('Database error'));

      const userDetails = await findUserDetailsByUserID(testUserUID);

      expect(userDetails).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    test('devrait récupérer un utilisateur par son email', async () => {
      const mockUserData = {
        uid: testUserUID,
        email: testEmail,
        firstname: 'Test',
        lastname: 'User',
        phoneNumbers: ['+24101122334']
      };

      // Mock de getDocs
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'user-doc-id',
          data: () => mockUserData
        }]
      });

      const user = await findUserByEmail(testEmail);

      expect(user).toEqual({
        id: 'user-doc-id',
        ...mockUserData
      });
      expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner null pour un email inexistant', async () => {
      // Mock de getDocs pour aucun résultat
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: []
      });

      const user = await findUserByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });

    test('devrait propager les erreurs', async () => {
      // Mock de getDocs pour lancer une erreur
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockRejectedValue(new Error('Database connection error'));

      await expect(findUserByEmail(testEmail)).rejects.toThrow('Database connection error');
    });
  });

  describe('updateUser', () => {
    test('devrait mettre à jour un utilisateur avec succès', async () => {
      const updates = {
        firstname: 'Nom Mis À Jour',
        phoneNumbers: ['+241987654321']
      };

      // Mock de getDocs pour trouver l'utilisateur
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'user-doc-id'
        }]
      });

      // Mock de updateDoc
      const mockUpdateDoc = require('@/firebase/firestore').updateDoc;
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await updateUser(testUserUID, updates);

      expect(result).toBe(true);
      expect(mockGetDocs).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    test('devrait retourner false pour un utilisateur inexistant', async () => {
      const updates = {
        firstname: 'Nouveau Nom'
      };

      // Mock de getDocs pour aucun résultat
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: []
      });

      const result = await updateUser('non-existent-uid', updates);

      expect(result).toBe(false);
    });

    test('devrait exclure createdAt des mises à jour', async () => {
      const updates = {
        firstname: 'Nouveau Nom',
        createdAt: new Date(), // Ceci devrait être exclu
        email: 'new@example.com'
      };

      // Mock de getDocs pour trouver l'utilisateur
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'user-doc-id'
        }]
      });

      // Mock de updateDoc
      const mockUpdateDoc = require('@/firebase/firestore').updateDoc;
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await updateUser(testUserUID, updates as any);

      expect(result).toBe(true);
      
      // Vérifier que createdAt n'est pas inclus dans l'appel
      const updateCall = mockUpdateDoc.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('createdAt');
      expect(updateCall).toHaveProperty('firstname', 'Nouveau Nom');
      expect(updateCall).toHaveProperty('email', 'new@example.com');
      expect(updateCall).toHaveProperty('updatedAt');
    });

    test('devrait retourner false en cas d\'erreur de mise à jour', async () => {
      const updates = {
        firstname: 'Nom avec erreur'
      };

      // Mock de getDocs pour trouver l'utilisateur
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'user-doc-id'
        }]
      });

      // Mock de updateDoc pour lancer une erreur
      const mockUpdateDoc = require('@/firebase/firestore').updateDoc;
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

      const result = await updateUser(testUserUID, updates);

      expect(result).toBe(false);
    });
  });

  describe('Flux complet d\'utilisateur', () => {
    test('devrait gérer le cycle complet de création et mise à jour', async () => {
      // 1. Créer un utilisateur
      const newUser = {
        uid: testUserUID,
        email: testEmail,
        firstname: 'Utilisateur',
        lastname: 'Test',
        phoneNumbers: ['+24101122334'],
        image: 'https://example.com/photo.jpg'
      };

      const mockAddDoc = require('@/firebase/firestore').addDoc;
      mockAddDoc.mockResolvedValue({ id: 'created-user-id' });

      const userId = await createUser(newUser);
      expect(userId).toBe('created-user-id');

      // 2. Récupérer l'utilisateur par UID
      const mockGetDocs = require('@/firebase/firestore').getDocs;
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'created-user-id',
          data: () => newUser
        }]
      });

      const retrievedUser = await getUserByUID(testUserUID);
      expect(retrievedUser?.email).toBe(testEmail);
      expect(retrievedUser?.firstname).toBe('Utilisateur');

      // 3. Mettre à jour l'utilisateur
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'created-user-id'
        }]
      });

      const mockUpdateDoc = require('@/firebase/firestore').updateDoc;
      mockUpdateDoc.mockResolvedValue(undefined);

      const updates = {
        firstname: 'Utilisateur Mis À Jour',
        phoneNumbers: ['+241123456789']
      };

      const updateResult = await updateUser(testUserUID, updates);
      expect(updateResult).toBe(true);

      // 4. Récupérer l'utilisateur par email
      const updatedUserData = {
        ...newUser,
        ...updates
      };

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{
          id: 'created-user-id',
          data: () => updatedUserData
        }]
      });

      const userByEmail = await findUserByEmail(testEmail);
      expect(userByEmail?.firstname).toBe('Utilisateur Mis À Jour');
    });
  });
}); 
