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
  getDoc,
  setDoc,
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
      // Use UID as document ID for consistency with Firestore rules
      // Rules check: request.auth.uid == request.resource.data.uid
      // Using UID as doc ID makes it easier to find users and aligns with security rules
      if (!user.uid) {
        throw new RepositoryError(
          'User UID is required',
          'USER_UID_REQUIRED',
          undefined
        );
      }

      const userRef = doc(db, this.collectionName, user.uid);
      
      // Prepare user data for Firestore
      const userData = {
        ...user,
        state: 'IN_PROGRESS' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Remove id from data (we use uid as document ID)
      const { id, ...dataWithoutId } = userData;

      // Use setDoc with UID as document ID
      await setDoc(userRef, dataWithoutId);

      return {
        ...user,
        id: user.uid, // Return UID as id for consistency
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

      // Filter out archived users (soft deleted)
      // Firestore doesn't support != in queries, so we filter after fetching
      const activeUsers = querySnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.state !== 'ARCHIVED';
      });

      if (activeUsers.length === 0) {
        return null;
      }

      const userDoc = activeUsers[0];
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
      // Since we use UID as document ID, we can directly get the document
      const userRef = doc(db, this.collectionName, uid);
      const docSnapshot = await getDoc(userRef);
      
      if (!docSnapshot.exists()) {
        // Fallback to query if document doesn't exist (for backward compatibility)
        const collectionRef = collection(db, this.collectionName);
        const q = query(collectionRef, where('uid', '==', uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          return null;
        }

        const userDocFromQuery = querySnapshot.docs[0];
        return this.toUser(userDocFromQuery);
      }

      return this.toUser(docSnapshot as QueryDocumentSnapshot);
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
      // Use UID as document ID
      const userRef = doc(db, this.collectionName, uid);
      
      // Check if document exists
      const docSnapshot = await getDoc(userRef);
      if (!docSnapshot.exists()) {
        // Fallback: try to find by uid field (for backward compatibility)
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
        const userRefFromQuery = doc(db, this.collectionName, userDoc.id);
        
        // Exclude createdAt and id from updates
        const { createdAt, id, ...updates } = data;

        await updateDoc(userRefFromQuery, {
          ...updates,
          updatedAt: serverTimestamp(),
        });

        // Return updated user
        const updatedUser = this.toUser(userDoc);
        return {
          ...updatedUser,
          ...updates,
        } as User;
      }

      // Exclude createdAt and id from updates
      const { createdAt, id, ...updates } = data;

      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Return updated user
      const updatedUser = this.toUser(docSnapshot as QueryDocumentSnapshot);
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
      // Use UID as document ID
      const userRef = doc(db, this.collectionName, uid);
      
      // Check if document exists
      const docSnapshot = await getDoc(userRef);
      if (!docSnapshot.exists()) {
        // Fallback: try to find by uid field (for backward compatibility)
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
        const userRefFromQuery = doc(db, this.collectionName, userDoc.id);
        
        // Soft delete: set state to ARCHIVED
        await updateDoc(userRefFromQuery, {
          state: 'ARCHIVED',
          updatedAt: serverTimestamp(),
        });
        return;
      }

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

