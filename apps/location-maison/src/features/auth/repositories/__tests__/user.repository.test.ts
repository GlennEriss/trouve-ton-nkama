/**
 * UserRepository Unit Tests
 * 
 * TDD Approach: Tests written before implementation
 * Target: 100% code coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserRepository, RepositoryError } from '../user.repository.interface';
import { UserRepositoryImpl } from '../user.repository';
import { User } from '@/models/authentication';
import { Timestamp } from 'firebase/firestore';

// Note: Firestore is already mocked in jest.setup.ts
// We just need to import the mocked functions

// Helper to type mocks correctly
function mockFunction<T extends (...args: any[]) => any>(fn: T): jest.MockedFunction<T> {
  return fn as jest.MockedFunction<T>;
}

// Helper to create mock User
function createMockUser(overrides: Partial<User> = {}): User {
  const now = Timestamp.now();
  return {
    id: 'user-123',
    uid: 'uid-123',
    login: 'test@example.com',
    firstname: 'John',
    lastname: 'Doe',
    email: 'test@example.com',
    phoneNumbers: ['+241123456789'],
    phoneNumberVerified: false,
    roles: ['User'],
    emailVerified: false,
    providers: ['CREDENTIALS'],
    favoris: [],
    credits: 3,
    state: 'IN_PROGRESS',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as User;
}

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockUser: User;

  beforeEach(() => {
    repository = new UserRepositoryImpl();
    mockUser = createMockUser();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { addDoc, collection } = firestore;
      const mockDocRef = { id: 'user-123' };
      (addDoc as any).mockResolvedValue(mockDocRef);
      (collection as any).mockReturnValue({});

      // Act
      const result = await repository.create(mockUser);

      // Assert
      expect(collection).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          uid: mockUser.uid,
          email: mockUser.email,
        })
      );
      expect(result.id).toBe('user-123');
      expect(result.uid).toBe(mockUser.uid);
    });

    it('should throw RepositoryError if Firestore addDoc fails', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { addDoc, collection } = firestore;
      const firestoreError = new Error('Firestore permission denied');
      (collection as any).mockReturnValue({});
      (addDoc as any).mockRejectedValue(firestoreError);

      // Act & Assert
      await expect(repository.create(mockUser)).rejects.toThrow(RepositoryError);
      await expect(repository.create(mockUser)).rejects.toThrow('Failed to create user');
    });

    it('should include all user fields when creating', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { addDoc, collection } = firestore;
      const mockDocRef = { id: 'user-123' };
      mockFunction(collection).mockReturnValue({} as any);
      mockFunction(addDoc).mockResolvedValue(mockDocRef as any);

      const fullUser: User = createMockUser({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        phoneNumbers: ['+241123456789'],
        roles: ['User' as 'Admin' | 'Announcer'],
        credits: 3,
      });

      // Act
      await repository.create(fullUser);

      // Assert
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@example.com',
          phoneNumbers: ['+241123456789'],
          roles: ['User'],
          credits: 3,
        })
      );
    });
  });

  describe('findByPhoneNumber', () => {
    it('should return user if found by phone number', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const mockDoc = {
        id: 'user-123',
        data: () => ({ ...mockUser, uid: 'uid-123' }),
      };
      const mockSnapshot = {
        empty: false,
        docs: [mockDoc],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);

      // Act
      const result = await repository.findByPhoneNumber('+241123456789');

      // Assert
      expect(collection).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('phoneNumbers', 'array-contains', '+241123456789');
      expect(result).not.toBeNull();
      expect(result?.uid).toBe('uid-123');
    });

    it('should return null if no user found', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const mockSnapshot = {
        empty: true,
        docs: [],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);

      // Act
      const result = await repository.findByPhoneNumber('+241999999999');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw RepositoryError if query fails', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const firestoreError = new Error('Firestore query failed');
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockRejectedValue(firestoreError);

      // Act & Assert
      await expect(repository.findByPhoneNumber('+241123456789')).rejects.toThrow(RepositoryError);
      await expect(repository.findByPhoneNumber('+241123456789')).rejects.toThrow('Failed to find user by phone number');
    });
  });

  describe('findByEmail', () => {
    it('should return user if found by email', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const mockDoc = {
        id: 'user-123',
        data: () => ({ ...mockUser, email: 'john@example.com', uid: 'uid-123' }),
      };
      const mockSnapshot = {
        empty: false,
        docs: [mockDoc],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);

      // Act
      const result = await repository.findByEmail('john@example.com');

      // Assert
      expect(collection).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('email', '==', 'john@example.com');
      expect(result).not.toBeNull();
      expect(result?.email).toBe('john@example.com');
    });

    it('should return null if no user found', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const mockSnapshot = {
        empty: true,
        docs: [],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);

      // Act
      const result = await repository.findByEmail('notfound@example.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw RepositoryError if query fails', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const firestoreError = new Error('Firestore query failed');
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockRejectedValue(firestoreError);

      // Act & Assert
      await expect(repository.findByEmail('john@example.com')).rejects.toThrow(RepositoryError);
      await expect(repository.findByEmail('john@example.com')).rejects.toThrow('Failed to find user by email');
    });
  });

  describe('findById', () => {
    it('should return user if found by UID', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const mockDoc = {
        id: 'user-123',
        data: () => ({ ...mockUser, uid: 'uid-123' }),
      };
      const mockSnapshot = {
        empty: false,
        docs: [mockDoc],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);

      // Act
      const result = await repository.findById('uid-123');

      // Assert
      expect(collection).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('uid', '==', 'uid-123');
      expect(result).not.toBeNull();
      expect(result?.uid).toBe('uid-123');
    });

    it('should return null if no user found', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const mockSnapshot = {
        empty: true,
        docs: [],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);

      // Act
      const result = await repository.findById('non-existent-uid');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw RepositoryError if query fails', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const firestoreError = new Error('Firestore query failed');
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockRejectedValue(firestoreError);

      // Act & Assert
      await expect(repository.findById('uid-123')).rejects.toThrow(RepositoryError);
      await expect(repository.findById('uid-123')).rejects.toThrow('Failed to find user by ID');
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, updateDoc, doc, collection, where, query } = firestore;
      const mockDoc = {
        id: 'user-123',
        data: () => ({ ...mockUser, uid: 'uid-123' }),
      };
      const mockSnapshot = {
        empty: false,
        docs: [mockDoc],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);
      (doc as any).mockReturnValue({});
      (updateDoc as any).mockResolvedValue(undefined);

      // Act
      const result = await repository.update('uid-123', { firstname: 'Jane' });

      // Assert
      expect(collection).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('uid', '==', 'uid-123');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          firstname: 'Jane',
          updatedAt: expect.anything(),
        })
      );
      expect(result.firstname).toBe('Jane');
      expect(result.uid).toBe('uid-123');
    });

    it('should throw RepositoryError if user not found', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const mockSnapshot = {
        empty: true,
        docs: [],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);

      // Act & Assert
      await expect(repository.update('non-existent-uid', { firstname: 'Jane' })).rejects.toThrow(RepositoryError);
      await expect(repository.update('non-existent-uid', { firstname: 'Jane' })).rejects.toThrow('User not found');
    });

    it('should throw RepositoryError if update fails', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, updateDoc, doc, collection, where, query } = firestore;
      const mockDoc = {
        id: 'user-123',
        data: () => ({ ...mockUser, uid: 'uid-123' }),
      };
      const mockSnapshot = {
        empty: false,
        docs: [mockDoc],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);
      (doc as any).mockReturnValue({});
      const firestoreError = new Error('Firestore update failed');
      (updateDoc as any).mockRejectedValue(firestoreError);

      // Act & Assert
      await expect(repository.update('uid-123', { firstname: 'Jane' })).rejects.toThrow(RepositoryError);
      await expect(repository.update('uid-123', { firstname: 'Jane' })).rejects.toThrow('Failed to update user');
    });

    it('should exclude createdAt from updates', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, updateDoc, doc, collection, where, query } = firestore;
      const mockDoc = {
        id: 'user-123',
        data: () => ({ ...mockUser, uid: 'uid-123' }),
      };
      const mockSnapshot = {
        empty: false,
        docs: [mockDoc],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);
      (doc as any).mockReturnValue({});
      (updateDoc as any).mockResolvedValue(undefined);

      // Act
      await repository.update('uid-123', { firstname: 'Jane', createdAt: Timestamp.now() });

      // Assert
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({ createdAt: expect.anything() })
      );
    });
  });

  describe('delete', () => {
    it('should soft delete user by setting state to ARCHIVED', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, updateDoc, doc, collection, where, query } = firestore;
      const mockDoc = {
        id: 'user-123',
        data: () => ({ ...mockUser, uid: 'uid-123' }),
      };
      const mockSnapshot = {
        empty: false,
        docs: [mockDoc],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);
      (doc as any).mockReturnValue({});
      (updateDoc as any).mockResolvedValue(undefined);

      // Act
      await repository.delete('uid-123');

      // Assert
      expect(collection).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('uid', '==', 'uid-123');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          state: 'ARCHIVED',
        })
      );
    });

    it('should throw RepositoryError if user not found', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, query, collection, where } = firestore;
      const mockSnapshot = {
        empty: true,
        docs: [],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);

      // Act & Assert
      await expect(repository.delete('non-existent-uid')).rejects.toThrow(RepositoryError);
      await expect(repository.delete('non-existent-uid')).rejects.toThrow('User not found');
    });

    it('should throw RepositoryError if delete fails', async () => {
      // Arrange
      const firestore = await import('@/firebase/firestore');
      const { getDocs, updateDoc, doc, collection, where, query } = firestore;
      const mockDoc = {
        id: 'user-123',
        data: () => ({ ...mockUser, uid: 'uid-123' }),
      };
      const mockSnapshot = {
        empty: false,
        docs: [mockDoc],
      };
      (collection as any).mockReturnValue({});
      (where as any).mockReturnValue({});
      (query as any).mockReturnValue({});
      (getDocs as any).mockResolvedValue(mockSnapshot);
      (doc as any).mockReturnValue({});
      const firestoreError = new Error('Firestore update failed');
      (updateDoc as any).mockRejectedValue(firestoreError);

      // Act & Assert
      await expect(repository.delete('uid-123')).rejects.toThrow(RepositoryError);
      await expect(repository.delete('uid-123')).rejects.toThrow('Failed to delete user');
    });
  });
});

