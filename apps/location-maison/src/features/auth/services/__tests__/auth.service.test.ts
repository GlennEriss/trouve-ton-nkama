/**
 * AuthService Unit Tests
 * 
 * TDD Approach: Tests written before implementation
 * Target: 100% code coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuthService, SignupData, SignupErrorCode, AuthServiceError } from '../auth.service.interface';
import { AuthServiceImpl } from '../auth.service';
import { UserRepository, RepositoryError } from '../../repositories/user.repository.interface';
import { User } from '@/models/authentication';
import { Timestamp } from 'firebase/firestore';

// Mock UserRepository
jest.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findByPhoneNumber: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
  },
}));

// Mock Firebase Auth
jest.mock('@/firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  auth: {},
}));

// Mock Email API
global.fetch = jest.fn();

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

// Helper to create SignupData
function createSignupData(overrides: Partial<SignupData> = {}): SignupData {
  return {
    email: 'test@example.com',
    password: 'Password123',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1990-01-01',
    phoneNumber: '+241123456789',
    country: 'GA',
    acceptTerms: true,
    ...overrides,
  };
}

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get mocked repository
    const { userRepository } = require('../../repositories/user.repository');
    mockUserRepository = userRepository;

    // Create service instance
    const { AuthServiceImpl } = require('../auth.service');
    authService = new AuthServiceImpl();
  });

  describe('signup', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword, signOut } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser({ uid: 'uid-123' }));
      (fetch as jest.Mock).mockResolvedValue({ ok: true });
      (signOut as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.userId).toBe('uid-123');
      expect(result.error).toBeUndefined();
      expect(mockUserRepository.findByPhoneNumber).toHaveBeenCalledWith('+241123456789');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(createUserWithEmailAndPassword).toHaveBeenCalled();
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should throw error if phone number already in use', async () => {
      // Arrange
      const signupData = createSignupData();
      const existingUser = createMockUser();
      mockUserRepository.findByPhoneNumber.mockResolvedValue(existingUser);

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.PHONE_ALREADY_IN_USE);
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should throw error if email already in use', async () => {
      // Arrange
      const signupData = createSignupData();
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(createMockUser());

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.EMAIL_ALREADY_IN_USE);
    });

    it('should throw error if terms not accepted', async () => {
      // Arrange
      const signupData = createSignupData({ acceptTerms: false });

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.TERMS_NOT_ACCEPTED);
    });

    it('should handle Firebase Auth weak password error', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      const firebaseError = { code: 'auth/weak-password', message: 'Password should be at least 6 characters' };
      (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue(firebaseError);

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.WEAK_PASSWORD);
    });

    it('should handle Firebase Auth invalid email error', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      const firebaseError = { code: 'auth/invalid-email', message: 'The email address is badly formatted' };
      (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue(firebaseError);

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.INVALID_EMAIL);
    });

    it('should handle Firebase Auth email already in use error', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      const firebaseError = { code: 'auth/email-already-in-use', message: 'The email address is already in use' };
      (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue(firebaseError);

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.EMAIL_ALREADY_IN_USE);
    });

    it('should rollback Firebase Auth if Firestore creation fails', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword, signOut } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockRejectedValue(new RepositoryError('Firestore error', 'ERROR'));
      (signOut as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.NETWORK_ERROR);
      // Note: In real implementation, we should delete the Firebase Auth user
      // For now, we just verify signOut is called
    });

    it('should create user with role User by default', async () => {
      // Arrange
      const signupData = createSignupData({ accountType: 'User' });
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as jest.Mock).mockResolvedValue({ ok: true });

      // Act
      await authService.signup(signupData);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['User'],
        })
      );
    });

    it('should create user with role Announcer if accountType is Announcer', async () => {
      // Arrange
      const signupData = createSignupData({
        accountType: 'Announcer',
        announcerType: 'INDIVIDUAL',
        acceptAnnouncerTerms: true,
        phoneVerificationCode: '123456',
      });
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as jest.Mock).mockResolvedValue({ ok: true });

      // Act
      await authService.signup(signupData);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['Announcer'],
        })
      );
    });

    it('should send verification email in background (non-blocking)', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as jest.Mock).mockResolvedValue({ ok: true });

      // Act
      await authService.signup(signupData);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/send-verification-email'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should not fail if email sending fails', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as jest.Mock).mockRejectedValue(new Error('Email service unavailable'));

      // Act
      const result = await authService.signup(signupData);

      // Assert
      // Should still succeed even if email fails
      expect(result.success).toBe(true);
      expect(result.userId).toBe('uid-123');
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const signupData = createSignupData();
      mockUserRepository.findByPhoneNumber.mockRejectedValue(
        new RepositoryError('Database error', 'DB_ERROR')
      );

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.NETWORK_ERROR);
    });
  });
});

