import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Timestamp } from 'firebase/firestore';
import { User } from '@/models/authentication';
import { UserRepositoryImpl } from '../user.repository';
import { RepositoryError } from '../user.repository.interface';

// Mock explicite (pas d'automock) : @/firebase/firestore exécute getFirestore(app) au chargement
// du module réel, ce qui échoue hors d'un contexte Firebase initialisé. `db` volontairement
// absent du mock (undefined) — les tests vérifient juste que doc()/collection() sont appelés
// avec le bon nom de collection et les bons arguments, peu importe la valeur de `db`.
jest.mock('@/firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  // Retourne un sentinel non-null : update()/delete() vérifient updatedAt via
  // expect.anything(), qui échoue sur undefined (jest.fn() sans valeur par défaut).
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP_SENTINEL'),
}));

type FirestoreSnapshot = {
  id: string;
  exists: () => boolean;
  data: () => Record<string, unknown>;
};

function createMockUser(overrides: Partial<User> = {}): User {
  const now = Timestamp.now();
  return {
    id: 'uid-123',
    uid: 'uid-123',
    login: 'test@example.com',
    firstname: 'John',
    lastname: 'Doe',
    email: 'test@example.com',
    phoneNumbers: ['+241123456789'],
    roles: ['User'],
    emailVerified: false,
    providers: ['CREDENTIALS'],
    metadata: {},
    favoris: [],
    credits: 3,
    state: 'IN_PROGRESS',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as User;
}

function createSnapshot(user: User, exists = true, id = user.uid): FirestoreSnapshot {
  return {
    id,
    exists: () => exists,
    data: () => ({ ...user }),
  };
}

describe('UserRepositoryImpl', () => {
  let repository: UserRepositoryImpl;

  beforeEach(() => {
    repository = new UserRepositoryImpl();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a user using uid as Firestore document id', async () => {
      const firestore = await import('@/firebase/firestore');
      const userRef = { id: 'uid-123' };
      (firestore.doc as any).mockReturnValue(userRef);
      (firestore.setDoc as any).mockResolvedValue(undefined);

      const result = await repository.create(createMockUser());

      const [dbArg, collectionName, docId] = (firestore.doc as any).mock.calls[0];
      expect(collectionName).toBe('users');
      expect(docId).toBe('uid-123');
      expect(dbArg).toBeUndefined();
      expect(firestore.setDoc).toHaveBeenCalledWith(
        userRef,
        expect.objectContaining({
          uid: 'uid-123',
          email: 'test@example.com',
          state: 'IN_PROGRESS',
        })
      );
      expect(result.id).toBe('uid-123');
    });

    it('throws RepositoryError when setDoc fails', async () => {
      const firestore = await import('@/firebase/firestore');
      (firestore.doc as any).mockReturnValue({ id: 'uid-123' });
      (firestore.setDoc as any).mockRejectedValue(new Error('permission-denied'));

      await expect(repository.create(createMockUser())).rejects.toThrow(RepositoryError);
      await expect(repository.create(createMockUser())).rejects.toThrow('Failed to create user');
    });

    it('throws RepositoryError when uid is missing', async () => {
      await expect(repository.create(createMockUser({ uid: '' }))).rejects.toThrow(RepositoryError);
      await expect(repository.create(createMockUser({ uid: '' }))).rejects.toThrow('Failed to create user');
    });
  });

  describe('findByPhoneNumber', () => {
    it('returns user when found', async () => {
      const firestore = await import('@/firebase/firestore');
      const user = createMockUser();
      (firestore.collection as any).mockReturnValue({});
      (firestore.where as any).mockReturnValue({});
      (firestore.query as any).mockReturnValue({});
      (firestore.getDocs as any).mockResolvedValue({
        empty: false,
        docs: [{ id: user.uid, data: () => ({ ...user }) }],
      });

      const result = await repository.findByPhoneNumber(user.phoneNumbers[0]);

      expect(result?.uid).toBe(user.uid);
      expect(firestore.where).toHaveBeenCalledWith('phoneNumbers', 'array-contains', user.phoneNumbers[0]);
    });

    it('returns null when no user found', async () => {
      const firestore = await import('@/firebase/firestore');
      (firestore.collection as any).mockReturnValue({});
      (firestore.where as any).mockReturnValue({});
      (firestore.query as any).mockReturnValue({});
      (firestore.getDocs as any).mockResolvedValue({ empty: true, docs: [] });

      const result = await repository.findByPhoneNumber('+241999999999');
      expect(result).toBeNull();
    });

    it('throws RepositoryError when query fails', async () => {
      const firestore = await import('@/firebase/firestore');
      (firestore.collection as any).mockReturnValue({});
      (firestore.where as any).mockReturnValue({});
      (firestore.query as any).mockReturnValue({});
      (firestore.getDocs as any).mockRejectedValue(new Error('query error'));

      await expect(repository.findByPhoneNumber('+241123456789')).rejects.toThrow(RepositoryError);
      await expect(repository.findByPhoneNumber('+241123456789')).rejects.toThrow('Failed to find user by phone number');
    });
  });

  describe('findByEmail', () => {
    it('returns active user when found', async () => {
      const firestore = await import('@/firebase/firestore');
      const user = createMockUser({ email: 'john@example.com' });
      const archived = createMockUser({ uid: 'uid-archived', email: 'john@example.com', state: 'ARCHIVED' });
      (firestore.collection as any).mockReturnValue({});
      (firestore.where as any).mockReturnValue({});
      (firestore.query as any).mockReturnValue({});
      (firestore.getDocs as any).mockResolvedValue({
        empty: false,
        docs: [
          { id: archived.uid, data: () => ({ ...archived }) },
          { id: user.uid, data: () => ({ ...user }) },
        ],
      });

      const result = await repository.findByEmail('john@example.com');

      expect(result?.uid).toBe(user.uid);
      expect(result?.state).toBe('IN_PROGRESS');
    });

    it('returns null when only archived users are found', async () => {
      const firestore = await import('@/firebase/firestore');
      const archived = createMockUser({ state: 'ARCHIVED', email: 'archived@example.com' });
      (firestore.collection as any).mockReturnValue({});
      (firestore.where as any).mockReturnValue({});
      (firestore.query as any).mockReturnValue({});
      (firestore.getDocs as any).mockResolvedValue({
        empty: false,
        docs: [{ id: archived.uid, data: () => ({ ...archived }) }],
      });

      const result = await repository.findByEmail('archived@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns user from direct document lookup', async () => {
      const firestore = await import('@/firebase/firestore');
      const user = createMockUser();
      (firestore.doc as any).mockReturnValue({ id: user.uid });
      (firestore.getDoc as any).mockResolvedValue(createSnapshot(user, true, user.uid));

      const result = await repository.findById(user.uid);
      expect(result?.uid).toBe(user.uid);
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });

    it('falls back to query by uid when direct lookup misses', async () => {
      const firestore = await import('@/firebase/firestore');
      const user = createMockUser({ uid: 'uid-fallback' });
      (firestore.doc as any).mockReturnValue({ id: user.uid });
      (firestore.getDoc as any).mockResolvedValue(createSnapshot(user, false, user.uid));
      (firestore.collection as any).mockReturnValue({});
      (firestore.where as any).mockReturnValue({});
      (firestore.query as any).mockReturnValue({});
      (firestore.getDocs as any).mockResolvedValue({
        empty: false,
        docs: [{ id: 'legacy-doc-id', data: () => ({ ...user }) }],
      });

      const result = await repository.findById(user.uid);

      expect(result?.uid).toBe(user.uid);
      expect(firestore.where).toHaveBeenCalledWith('uid', '==', user.uid);
    });

    it('returns null when user does not exist', async () => {
      const firestore = await import('@/firebase/firestore');
      const user = createMockUser();
      (firestore.doc as any).mockReturnValue({ id: user.uid });
      (firestore.getDoc as any).mockResolvedValue(createSnapshot(user, false, user.uid));
      (firestore.collection as any).mockReturnValue({});
      (firestore.where as any).mockReturnValue({});
      (firestore.query as any).mockReturnValue({});
      (firestore.getDocs as any).mockResolvedValue({ empty: true, docs: [] });

      const result = await repository.findById(user.uid);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates user through direct document path', async () => {
      const firestore = await import('@/firebase/firestore');
      const user = createMockUser();
      const userRef = { id: user.uid };
      (firestore.doc as any).mockReturnValue(userRef);
      (firestore.getDoc as any).mockResolvedValue(createSnapshot(user, true, user.uid));
      (firestore.updateDoc as any).mockResolvedValue(undefined);

      const result = await repository.update(user.uid, { firstname: 'Jane' });

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        userRef,
        expect.objectContaining({
          firstname: 'Jane',
          updatedAt: expect.anything(),
        })
      );
      expect(result.firstname).toBe('Jane');
    });

    it('throws RepositoryError when user is not found', async () => {
      const firestore = await import('@/firebase/firestore');
      const uid = 'uid-not-found';
      (firestore.doc as any).mockReturnValue({ id: uid });
      (firestore.getDoc as any).mockResolvedValue({
        id: uid,
        exists: () => false,
        data: () => ({}),
      });
      (firestore.collection as any).mockReturnValue({});
      (firestore.where as any).mockReturnValue({});
      (firestore.query as any).mockReturnValue({});
      (firestore.getDocs as any).mockResolvedValue({ empty: true, docs: [] });

      await expect(repository.update(uid, { firstname: 'Jane' })).rejects.toThrow(RepositoryError);
      await expect(repository.update(uid, { firstname: 'Jane' })).rejects.toThrow('User not found');
    });

    it('does not persist createdAt or id in update payload', async () => {
      const firestore = await import('@/firebase/firestore');
      const user = createMockUser();
      const userRef = { id: user.uid };
      (firestore.doc as any).mockReturnValue(userRef);
      (firestore.getDoc as any).mockResolvedValue(createSnapshot(user, true, user.uid));
      (firestore.updateDoc as any).mockResolvedValue(undefined);

      await repository.update(user.uid, {
        firstname: 'Jane',
        id: 'should-be-ignored' as any,
        createdAt: Timestamp.now() as any,
      });

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        userRef,
        expect.not.objectContaining({
          createdAt: expect.anything(),
          id: expect.anything(),
        })
      );
    });
  });

  describe('delete', () => {
    it('soft deletes user by setting ARCHIVED state', async () => {
      const firestore = await import('@/firebase/firestore');
      const user = createMockUser();
      const userRef = { id: user.uid };
      (firestore.doc as any).mockReturnValue(userRef);
      (firestore.getDoc as any).mockResolvedValue(createSnapshot(user, true, user.uid));
      (firestore.updateDoc as any).mockResolvedValue(undefined);

      await repository.delete(user.uid);

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        userRef,
        expect.objectContaining({
          state: 'ARCHIVED',
          updatedAt: expect.anything(),
        })
      );
    });

    it('throws RepositoryError when user is not found', async () => {
      const firestore = await import('@/firebase/firestore');
      const uid = 'uid-not-found';
      (firestore.doc as any).mockReturnValue({ id: uid });
      (firestore.getDoc as any).mockResolvedValue({
        id: uid,
        exists: () => false,
        data: () => ({}),
      });
      (firestore.collection as any).mockReturnValue({});
      (firestore.where as any).mockReturnValue({});
      (firestore.query as any).mockReturnValue({});
      (firestore.getDocs as any).mockResolvedValue({ empty: true, docs: [] });

      await expect(repository.delete(uid)).rejects.toThrow(RepositoryError);
      await expect(repository.delete(uid)).rejects.toThrow('User not found');
    });
  });
});
