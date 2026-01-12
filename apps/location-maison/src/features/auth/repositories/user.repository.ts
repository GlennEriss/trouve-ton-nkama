/**
 * UserRepository Implementation
 * 
 * Firestore repository for user operations.
 * All methods throw RepositoryError for consistent error handling (never return null/false).
 */

import { UserRepository, RepositoryError } from './user.repository.interface';
import { User } from '@/models/authentication';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  QueryDocumentSnapshot,
} from '@/firebase/firestore';
import { db } from '@/firebase/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';

export class UserRepositoryImpl implements UserRepository {
  private readonly collectionName = firebaseCollectionNames.users;

  /**
   * Transform Firestore document to User entity
   */
  private toUser(docSnapshot: QueryDocumentSnapshot): User {
    const data = docSnapshot.data();
    return {
      ...data,
      id: docSnapshot.id,
    } as User;
  }

  async create(user: User): Promise<User> {
    try {
      const collectionRef = collection(db, this.collectionName);
      
      // Prepare user data for Firestore
      const userData = {
        ...user,
        state: 'IN_PROGRESS' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Remove id from data (Firestore will generate it)
      const { id, ...dataWithoutId } = userData;

      const docRef = await addDoc(collectionRef, dataWithoutId);

      return {
        ...user,
        id: docRef.id,
      };
    } catch (error) {
      throw new RepositoryError(
        'Failed to create user',
        'USER_CREATE_ERROR',
        error
      );
    }
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const q = query(
        collectionRef,
        where('phoneNumbers', 'array-contains', phoneNumber)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      return this.toUser(userDoc);
    } catch (error) {
      throw new RepositoryError(
        'Failed to find user by phone number',
        'USER_FIND_BY_PHONE_ERROR',
        error
      );
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const q = query(collectionRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      return this.toUser(userDoc);
    } catch (error) {
      throw new RepositoryError(
        'Failed to find user by email',
        'USER_FIND_BY_EMAIL_ERROR',
        error
      );
    }
  }

  async findById(uid: string): Promise<User | null> {
    try {
      const collectionRef = collection(db, this.collectionName);
      const q = query(collectionRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      return this.toUser(userDoc);
    } catch (error) {
      throw new RepositoryError(
        'Failed to find user by ID',
        'USER_FIND_BY_ID_ERROR',
        error
      );
    }
  }

  async update(uid: string, data: Partial<User>): Promise<User> {
    try {
      // First, find the user document by UID
      const collectionRef = collection(db, this.collectionName);
      const q = query(collectionRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new RepositoryError(
          'User not found',
          'USER_NOT_FOUND',
          undefined
        );
      }

      const userDoc = querySnapshot.docs[0];
      const userRef = doc(db, this.collectionName, userDoc.id);

      // Exclude createdAt and id from updates
      const { createdAt, id, ...updates } = data;

      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Return updated user
      const updatedUser = this.toUser(userDoc);
      return {
        ...updatedUser,
        ...updates,
      } as User;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError(
        'Failed to update user',
        'USER_UPDATE_ERROR',
        error
      );
    }
  }

  async delete(uid: string): Promise<void> {
    try {
      // Find the user document by UID
      const collectionRef = collection(db, this.collectionName);
      const q = query(collectionRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new RepositoryError(
          'User not found',
          'USER_NOT_FOUND',
          undefined
        );
      }

      const userDoc = querySnapshot.docs[0];
      const userRef = doc(db, this.collectionName, userDoc.id);

      // Soft delete: set state to ARCHIVED
      await updateDoc(userRef, {
        state: 'ARCHIVED',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError(
        'Failed to delete user',
        'USER_DELETE_ERROR',
        error
      );
    }
  }
}

// Export singleton instance
export const userRepository: UserRepository = new UserRepositoryImpl();

