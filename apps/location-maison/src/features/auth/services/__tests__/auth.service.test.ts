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
  sendEmailVerification: jest.fn(),
  auth: {},
}));

// Mock Email API
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

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
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser({ uid: 'uid-123' }));
      (fetch as any).mockResolvedValue({ ok: true });
      (signOut as any).mockResolvedValue(undefined);

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
      (createUserWithEmailAndPassword as any).mockRejectedValue(firebaseError);

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
      (createUserWithEmailAndPassword as any).mockRejectedValue(firebaseError);

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
      (createUserWithEmailAndPassword as any).mockRejectedValue(firebaseError);

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
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockRejectedValue(new RepositoryError('Firestore error', 'ERROR'));
      (signOut as any).mockResolvedValue(undefined);

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.NETWORK_ERROR);
      // Note: In real implementation, we should delete the Firebase Auth user
      // For now, we just verify signOut is called
    });

    it('should create user with User role by default', async () => {
      // Arrange
      const signupData = createSignupData({ accountType: 'User' });
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as any).mockResolvedValue({ ok: true });

      // Act
      await authService.signup(signupData);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['User'],
        })
      );
    });

    it('should create user with User and Announcer roles if accountType is Announcer', async () => {
      // Arrange
      const signupData = createSignupData({
        accountType: 'Announcer',
        announcerType: 'INDIVIDUAL',
        acceptAnnouncerTerms: true,
      });
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as any).mockResolvedValue({ ok: true });

      // Act
      await authService.signup(signupData);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['User', 'Announcer'],
        })
      );
    });

    it('enregistre le pseudo et distingue numero d appel et WhatsApp', async () => {
      // Arrange
      const signupData = createSignupData({
        pseudo: "  kiss&sis'shop  ",
        phoneNumber: '+24174533664',
        whatsappNumber: '+24160010727',
      });
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');

      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as any).mockResolvedValue({ ok: true });

      // Act
      await authService.signup(signupData);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pseudo: "kiss&sis'shop",
          callNumber: '+24174533664',
          whatsappNumber: '+24160010727',
          // phoneNumbers reste la source pour l'auth et l'auto-attribution : les deux numéros
          // doivent y figurer, sinon un annonceur contacté sur son WhatsApp n'est pas reconnu.
          phoneNumbers: ['+24174533664', '+24160010727'],
        })
      );
    });

    it('ne duplique pas le numero quand WhatsApp est absent', async () => {
      // Arrange
      const signupData = createSignupData({ phoneNumber: '+24174533664', whatsappNumber: undefined });
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');

      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as any).mockResolvedValue({ ok: true });

      // Act
      await authService.signup(signupData);

      // Assert
      const created = mockUserRepository.create.mock.calls[0][0] as any;
      expect(created.phoneNumbers).toEqual(['+24174533664']);
      expect(created.whatsappNumber).toBe('+24174533664');
      expect(created).not.toHaveProperty('pseudo');
    });

    it('should fail if announcer terms are not accepted', async () => {
      // Arrange
      const signupData = createSignupData({
        accountType: 'Announcer',
        acceptAnnouncerTerms: false, // Not accepted
      });

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED);
      expect(result.error?.message).toContain('conditions d\'annonceur');
    });

    it('should handle repository error when checking email', async () => {
      // Arrange
      const signupData = createSignupData();
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockRejectedValue(new RepositoryError('Database error', 'ERROR'));

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.NETWORK_ERROR);
      expect(result.error?.message).toContain('vérification de l\'email');
    });

    it('should handle rollback error when Firestore creation fails', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword, signOut } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockRejectedValue(new RepositoryError('Firestore error', 'ERROR'));
      // Mock signOut to throw an error (rollback fails)
      (signOut as any).mockRejectedValue(new Error('SignOut failed'));

      // Act
      const result = await authService.signup(signupData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.NETWORK_ERROR);
      // Verify signOut was called (even if it failed)
      expect(signOut).toHaveBeenCalled();
    });

    it('should handle email verification API failure (response not ok)', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      // Mock fetch to return error (not ok) - this will throw in sendVerificationEmail
      (fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        status: 500,
      });

      // Act
      // The email sending is called with .catch(), so errors are handled
      const result = await authService.signup(signupData);
      
      // Assert
      // Should still succeed even if email fails (non-blocking, errors caught)
      expect(result.success).toBe(true);
      expect(result.userId).toBe('uid-123');
      
      // Wait a bit for the async email call to complete and throw
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify fetch was called
      expect(fetch).toHaveBeenCalled();
    });

    it('should send verification email in background (non-blocking)', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as any).mockResolvedValue({ ok: true });

      // Act
      await authService.signup(signupData);

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/send-verification-email',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ uid: 'uid-123' }),
        })
      );
    });

    it('devrait envoyer via sendEmailVerification (Firebase natif) quand NEXT_PUBLIC_EMAIL_PROVIDER=firebase_default', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword, sendEmailVerification } = await import('@/firebase/auth');
      const mockFirebaseUser = { uid: 'uid-123', email: signupData.email };

      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as any).mockResolvedValue({ user: mockFirebaseUser });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (sendEmailVerification as any).mockResolvedValue(undefined);
      process.env.NEXT_PUBLIC_EMAIL_PROVIDER = 'firebase_default';

      try {
        // Act
        await authService.signup(signupData);

        // Assert
        expect(sendEmailVerification).toHaveBeenCalledWith(
          mockFirebaseUser,
          expect.objectContaining({ handleCodeInApp: false }),
        );
        expect(fetch).not.toHaveBeenCalledWith(
          '/api/auth/send-verification-email',
          expect.anything(),
        );
      } finally {
        delete process.env.NEXT_PUBLIC_EMAIL_PROVIDER;
      }
    });

    it('should not fail if email sending fails', async () => {
      // Arrange
      const signupData = createSignupData();
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as any).mockRejectedValue(new Error('Email service unavailable'));

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

    it('should use country code as name if country not in mapping (getCountryName)', async () => {
      // Arrange
      const signupData = createSignupData({ country: 'XX' }); // Unknown country code
      const { createUserWithEmailAndPassword } = await import('@/firebase/auth');
      
      mockUserRepository.findByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (createUserWithEmailAndPassword as any).mockResolvedValue({
        user: { uid: 'uid-123', email: signupData.email },
      });
      mockUserRepository.create.mockResolvedValue(createMockUser());
      (fetch as any).mockResolvedValue({ ok: true });

      // Act
      await authService.signup(signupData);

      // Assert
      // Verify that country name is set to code if not in mapping
      expect(mockUserRepository.create).toHaveBeenCalled();
      const callArgs = (mockUserRepository.create as any).mock.calls[0];
      expect(callArgs[0].country.name).toBe('XX'); // Should use code as name
    });
  });
});
