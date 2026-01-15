/**
 * Signup Integration Tests
 * 
 * Integration tests for the complete signup flow.
 * Tests Service + Repository + Firebase Emulator.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Timestamp } from 'firebase/firestore';

// ⚠️ CRITICAL: Mocks must be defined BEFORE importing the service
// Mock the repository FIRST (before importing the service)
jest.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findByPhoneNumber: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  UserRepositoryImpl: jest.fn(),
}));

// Mock Firebase Auth
jest.mock('@/firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  auth: {},
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => Timestamp.now()),
  Timestamp: {
    now: jest.fn(() => {
      // Return a mock Timestamp object
      const mockTimestamp = {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
        toDate: jest.fn(() => new Date()),
        toMillis: jest.fn(() => Date.now()),
      };
      return mockTimestamp as any;
    }),
    fromDate: jest.fn((date: Date) => {
      const mockTimestamp = {
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
        toDate: jest.fn(() => date),
        toMillis: jest.fn(() => date.getTime()),
      };
      return mockTimestamp as any;
    }),
  },
}));

// Mock Email API
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Now import after mocks are set up
import { AuthServiceImpl } from '../../services/auth.service';
import { SignupData, SignupErrorCode } from '../../services/auth.service.interface';
import { RepositoryError } from '../../repositories/user.repository.interface';
import { User } from '@/models/authentication';
import { createUserWithEmailAndPassword, signOut, auth } from '@/firebase/auth';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { userRepository } from '../../repositories/user.repository';

const mockCreateUserWithEmailAndPassword = createUserWithEmailAndPassword as jest.MockedFunction<typeof createUserWithEmailAndPassword>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Get the mocked repository - access the mocked methods directly
const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;

describe('Signup Integration Tests', () => {
  let authService: AuthServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();

    // IMPORTANT: Reset mocks BEFORE creating service instance
    // Default mocks for repository (no existing users)
    // The mock functions are created by jest.mock, so we can safely cast them
    // CRITICAL: Must reset and configure mocks BEFORE service is created
    const findByPhoneMock = mockUserRepository.findByPhoneNumber as jest.MockedFunction<typeof mockUserRepository.findByPhoneNumber>;
    const findByEmailMock = mockUserRepository.findByEmail as jest.MockedFunction<typeof mockUserRepository.findByEmail>;
    const createMock = mockUserRepository.create as jest.MockedFunction<typeof mockUserRepository.create>;
    
    // Reset mocks first
    findByPhoneMock.mockReset();
    findByEmailMock.mockReset();
    createMock.mockReset();
    
    // Then configure them to return null (no existing users)
    findByPhoneMock.mockResolvedValue(null);
    findByEmailMock.mockResolvedValue(null);
    
    // Default mocks for Firebase Auth
    (mockSignOut as jest.Mock).mockResolvedValue(undefined);
    
    // Mock successful email API call (default)
    (mockFetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    // Create service instance AFTER mocks are set up
    authService = new AuthServiceImpl();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete signup flow', () => {
    it('should successfully create a user account', async () => {
      const signupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      // Mock Firebase Auth - MUST be configured before calling signup
      const mockUserCredential = {
        user: {
          uid: 'user-123',
          email: 'test@example.com',
        },
      };
      // Reset and configure the mock
      (mockCreateUserWithEmailAndPassword as jest.Mock).mockReset();
      (mockCreateUserWithEmailAndPassword as jest.Mock).mockResolvedValue(mockUserCredential as any);
      (mockSignOut as jest.Mock).mockResolvedValue(undefined);

      // Mock repository - create user
      const mockUser = {
        id: 'user-123',
        uid: 'user-123',
        login: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe',
        email: 'test@example.com',
        phoneNumbers: ['+24101234567'],
        roles: [],
        credits: 3,
      };
      (mockUserRepository.create as jest.MockedFunction<typeof mockUserRepository.create>).mockResolvedValue(mockUser as any);
      (mockFetch as jest.Mock).mockResolvedValue({ ok: true } as Response);

      const result = await authService.signup(signupData);

      // Debug: log error if signup fails
      if (!result.success) {
        console.error('Signup failed:', JSON.stringify(result.error, null, 2));
        console.error('Mock calls:', {
          findByPhoneNumber: (mockUserRepository.findByPhoneNumber as jest.Mock).mock.calls.length,
          findByEmail: (mockUserRepository.findByEmail as jest.Mock).mock.calls.length,
          create: (mockUserRepository.create as jest.Mock).mock.calls.length,
          createUserWithEmailAndPassword: (mockCreateUserWithEmailAndPassword as jest.Mock).mock.calls.length,
        });
        // Check if mocks threw errors
        const findByPhoneResults = (mockUserRepository.findByPhoneNumber as jest.Mock).mock.results;
        const findByEmailResults = (mockUserRepository.findByEmail as jest.Mock).mock.results;
        const createUserResults = (mockCreateUserWithEmailAndPassword as jest.Mock).mock.results;
        console.error('Mock results:', {
          findByPhoneNumber: findByPhoneResults.map(r => r.type),
          findByEmail: findByEmailResults.map(r => r.type),
          createUserWithEmailAndPassword: createUserResults.map(r => r.type),
        });
      }

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'test@example.com',
        'Password123!'
      );
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/send-verification-email',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
    });

    it('should fail if email is already in use', async () => {
      const signupData: SignupData = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      // Mock Firebase Auth - email already in use
      mockCreateUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/email-already-in-use',
        message: 'Email already in use',
      });

      const result = await authService.signup(signupData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.EMAIL_ALREADY_IN_USE);
    });

    it('should fail if phone number is already in use', async () => {
      const signupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      // Mock repository - phone number exists
      const existingUser = {
        id: 'existing-user',
        phoneNumbers: ['+24101234567'],
      };
      (mockUserRepository.findByPhoneNumber as jest.MockedFunction<typeof mockUserRepository.findByPhoneNumber>).mockResolvedValue(existingUser as any);

      const result = await authService.signup(signupData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.PHONE_ALREADY_IN_USE);
    });

    it('should fail if terms are not accepted', async () => {
      const signupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: false, // Not accepted
      };

      const result = await authService.signup(signupData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.TERMS_NOT_ACCEPTED);
    });

    it('should create user with default role (User)', async () => {
      const signupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
        accountType: 'User', // Default
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'user-123', email: 'test@example.com' },
      } as any);
      mockSignOut.mockResolvedValue();
      const mockCreatedUser = {
        id: 'user-123',
        uid: 'user-123',
        roles: [],
      };
      mockUserRepository.create.mockResolvedValue(mockCreatedUser as any);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const result = await authService.signup(signupData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      // Verify user was created with empty roles array (User = no specific role)
      expect(mockUserRepository.create).toHaveBeenCalled();
      const callArgs = (mockUserRepository.create as jest.MockedFunction<typeof mockUserRepository.create>).mock.calls[0];
      expect(callArgs[0]).toMatchObject({
        roles: [],
      });
    });

    it('should create announcer with Announcer role', async () => {
      const signupData: SignupData = {
        email: 'announcer@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        birthDate: '1985-05-15',
        phoneNumber: '+24107654321',
        country: 'GA',
        acceptTerms: true,
        accountType: 'Announcer',
        announcerType: 'INDIVIDUAL',
        acceptAnnouncerTerms: true,
        phoneVerificationCode: '123456',
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'announcer-456', email: 'announcer@example.com' },
      } as any);
      mockSignOut.mockResolvedValue();
      const mockCreatedUser = {
        id: 'announcer-456',
        uid: 'announcer-456',
        roles: ['Announcer'],
      };
      mockUserRepository.create.mockResolvedValue(mockCreatedUser as any);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const result = await authService.signup(signupData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('announcer-456');
      const callArgs = (mockUserRepository.create as jest.MockedFunction<typeof mockUserRepository.create>).mock.calls[0];
      expect(callArgs[0]).toMatchObject({
        roles: ['Announcer'],
      });
    });

    it('should assign 3 welcome credits to new user', async () => {
      const signupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'user-123', email: 'test@example.com' },
      } as any);
      mockSignOut.mockResolvedValue();
      const mockCreatedUser = {
        id: 'user-123',
        uid: 'user-123',
        credits: 3,
      };
      mockUserRepository.create.mockResolvedValue(mockCreatedUser as any);
      mockFetch.mockResolvedValue({ ok: true } as Response);

      const result = await authService.signup(signupData);

      expect(result.success).toBe(true);
      const callArgs = (mockUserRepository.create as jest.MockedFunction<typeof mockUserRepository.create>).mock.calls[0];
      expect(callArgs[0]).toMatchObject({
        credits: 3, // Welcome credits
      });
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const signupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      mockUserRepository.findByPhoneNumber.mockRejectedValue(
        new RepositoryError('Database error', 'DB_ERROR')
      );

      const result = await authService.signup(signupData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.NETWORK_ERROR);
    });

    it('should rollback Firebase Auth if Firestore creation fails', async () => {
      const signupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'user-123', email: 'test@example.com' },
      } as any);
      // Mock repository to throw RepositoryError on create (this triggers rollback)
      // The error must be a RepositoryError to be caught in the try-catch block
      const repositoryError = new RepositoryError('Firestore error', 'ERROR');
      (mockUserRepository.create as jest.MockedFunction<typeof mockUserRepository.create>).mockRejectedValue(repositoryError);
      (mockSignOut as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.signup(signupData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(SignupErrorCode.NETWORK_ERROR);
      // Should sign out to rollback Firebase Auth account
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
