/**
 * UserRepository Interface
 * 
 * Defines the contract for user data access operations.
 * All methods throw errors instead of returning null/false for consistent error handling.
 */

import { User } from '@/models/authentication';

export interface UserRepository {
  /**
   * Create a new user in Firestore
   * @param user - User data to create
   * @returns Created user with generated ID
   * @throws RepositoryError if creation fails
   */
  create(user: User): Promise<User>;

  /**
   * Find a user by their phone number
   * @param phoneNumber - Phone number to search for
   * @returns User if found, null if not found
   * @throws RepositoryError if query fails
   */
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;

  /**
   * Find a user by their email
   * @param email - Email to search for
   * @returns User if found, null if not found
   * @throws RepositoryError if query fails
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find a user by their Firebase UID
   * @param uid - Firebase UID
   * @returns User if found, null if not found
   * @throws RepositoryError if query fails
   */
  findById(uid: string): Promise<User | null>;

  /**
   * Update an existing user
   * @param uid - Firebase UID of the user to update
   * @param data - Partial user data to update
   * @returns Updated user
   * @throws RepositoryError if user not found or update fails
   */
  update(uid: string, data: Partial<User>): Promise<User>;

  /**
   * Delete a user (soft delete by setting state to ARCHIVED)
   * @param uid - Firebase UID of the user to delete
   * @throws RepositoryError if user not found or deletion fails
   */
  delete(uid: string): Promise<void>;
}

/**
 * Custom error class for repository operations
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'RepositoryError';
    Object.setPrototypeOf(this, RepositoryError.prototype);
  }
}

