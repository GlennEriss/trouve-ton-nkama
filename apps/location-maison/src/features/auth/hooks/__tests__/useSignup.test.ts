/**
 * useSignup Hook Tests
 * 
 * Unit tests for the useSignup hook.
 * Tests state management, error handling, and service integration.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSignup } from '../useSignup';
import { authService } from '../../services';
import { SignupData, SignupResult, SignupErrorCode } from '../../services/auth.service.interface';

// Mock the auth service
jest.mock('../../services', () => ({
  authService: {
    signup: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('useSignup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSignup());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.userId).toBe(null);
      expect(typeof result.current.signup).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('signup - Success cases', () => {
    it('should handle successful signup', async () => {
      const mockUserId = 'user-123';
      const mockSignupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      const mockResult: SignupResult = {
        success: true,
        userId: mockUserId,
      };

      (mockAuthService.signup as any).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSignup());

      let signupResult: SignupResult;
      let signupPromise: Promise<SignupResult>;
      
      // Start signup (don't await yet)
      act(() => {
        signupPromise = result.current.signup(mockSignupData);
      });

      // Should be loading after state update
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      }, { timeout: 2000 });
      expect(result.current.error).toBe(null);

      // Wait for signup to complete
      await act(async () => {
        signupResult = await signupPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have succeeded
      expect(signupResult!.success).toBe(true);
      expect(signupResult!.userId).toBe(mockUserId);
      expect(result.current.userId).toBe(mockUserId);
      expect(result.current.error).toBe(null);
      expect(mockAuthService.signup).toHaveBeenCalledWith(mockSignupData);
      expect(mockAuthService.signup).toHaveBeenCalledTimes(1);
    });

    it('should handle successful announcer signup', async () => {
      const mockUserId = 'announcer-456';
      const mockSignupData: SignupData = {
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

      const mockResult: SignupResult = {
        success: true,
        userId: mockUserId,
      };

      (mockAuthService.signup as any).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        await result.current.signup(mockSignupData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userId).toBe(mockUserId);
      expect(result.current.error).toBe(null);
      expect(mockAuthService.signup).toHaveBeenCalledWith(mockSignupData);
    });
  });

  describe('signup - Error cases', () => {
    it('should handle email already in use error', async () => {
      const mockSignupData: SignupData = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      const mockError: SignupResult = {
        success: false,
        error: {
          code: SignupErrorCode.EMAIL_ALREADY_IN_USE,
          message: 'Cette adresse email est déjà utilisée',
        },
      };

      (mockAuthService.signup as any).mockResolvedValue(mockError);

      const { result } = renderHook(() => useSignup());

      let signupResult: SignupResult;
      
      await act(async () => {
        const signupPromise = result.current.signup(mockSignupData);
        signupResult = await signupPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(signupResult!.success).toBe(false);
      expect(signupResult!.error?.code).toBe(SignupErrorCode.EMAIL_ALREADY_IN_USE);
      expect(result.current.error?.code).toBe(SignupErrorCode.EMAIL_ALREADY_IN_USE);
      expect(result.current.userId).toBe(null);
    });

    it('should handle phone already in use error', async () => {
      const mockSignupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      const mockError: SignupResult = {
        success: false,
        error: {
          code: SignupErrorCode.PHONE_ALREADY_IN_USE,
          message: 'Ce numéro de téléphone est déjà utilisé',
        },
      };

      (mockAuthService.signup as any).mockResolvedValue(mockError);

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        await result.current.signup(mockSignupData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.code).toBe(SignupErrorCode.PHONE_ALREADY_IN_USE);
      expect(result.current.userId).toBe(null);
    });

    it('should handle terms not accepted error', async () => {
      const mockSignupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: false, // Not accepted
      };

      const mockError: SignupResult = {
        success: false,
        error: {
          code: SignupErrorCode.TERMS_NOT_ACCEPTED,
          message: 'Vous devez accepter les conditions d\'utilisation',
        },
      };

      (mockAuthService.signup as any).mockResolvedValue(mockError);

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        await result.current.signup(mockSignupData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.code).toBe(SignupErrorCode.TERMS_NOT_ACCEPTED);
    });

    it('should handle result without error object (edge case)', async () => {
      const mockSignupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      const mockError: SignupResult = {
        success: false,
        // No error object
      };

      (mockAuthService.signup as any).mockResolvedValue(mockError);

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        await result.current.signup(mockSignupData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should create a default error
      expect(result.current.error).not.toBe(null);
      expect(result.current.error?.code).toBe('UNKNOWN_ERROR');
      expect(result.current.userId).toBe(null);
    });
  });

  describe('signup - Exception handling', () => {
    it('should handle service throwing an Error', async () => {
      const mockSignupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      const mockError = new Error('Network error');
      (mockAuthService.signup as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSignup());

      let signupResult: SignupResult;
      
      await act(async () => {
        const signupPromise = result.current.signup(mockSignupData);
        signupResult = await signupPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(signupResult!.success).toBe(false);
      expect(signupResult!.error?.code).toBe('UNKNOWN_ERROR');
      expect(signupResult!.error?.message).toBe('Network error');
      expect(result.current.error?.code).toBe('UNKNOWN_ERROR');
      expect(result.current.userId).toBe(null);
    });

    it('should handle service throwing a non-Error value', async () => {
      const mockSignupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      (mockAuthService.signup as any).mockRejectedValue('String error');

      const { result } = renderHook(() => useSignup());

      await act(async () => {
        await result.current.signup(mockSignupData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.code).toBe('UNKNOWN_ERROR');
      expect(result.current.error?.message).toBe('Une erreur inattendue s\'est produite');
      expect(result.current.userId).toBe(null);
    });
  });

  describe('reset', () => {
    it('should reset state to initial values', async () => {
      const mockUserId = 'user-123';
      const mockSignupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      const mockResult: SignupResult = {
        success: true,
        userId: mockUserId,
      };

      (mockAuthService.signup as any).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSignup());

      // First, perform a successful signup
      await act(async () => {
        await result.current.signup(mockSignupData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify state is set
      expect(result.current.userId).toBe(mockUserId);
      expect(result.current.error).toBe(null);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify state is reset
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.userId).toBe(null);
      });
    });

    it('should reset error state', async () => {
      const mockSignupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      const mockError: SignupResult = {
        success: false,
        error: {
          code: SignupErrorCode.EMAIL_ALREADY_IN_USE,
          message: 'Email déjà utilisé',
        },
      };

      (mockAuthService.signup as any).mockResolvedValue(mockError);

      const { result } = renderHook(() => useSignup());

      // Perform a failed signup
      await act(async () => {
        await result.current.signup(mockSignupData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify error is set
      expect(result.current.error).not.toBe(null);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify error is cleared
      await waitFor(() => {
        expect(result.current.error).toBe(null);
        expect(result.current.userId).toBe(null);
      });
    });
  });

  describe('Loading state management', () => {
    it('should set loading to true during signup', async () => {
      const mockSignupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      const mockResult: SignupResult = {
        success: true,
        userId: 'user-123',
      };

      // Create a promise that we can control
      let resolvePromise: (value: SignupResult) => void;
      const controlledPromise = new Promise<SignupResult>((resolve) => {
        resolvePromise = resolve;
      });

      (mockAuthService.signup as any).mockReturnValue(controlledPromise);

      const { result } = renderHook(() => useSignup());

      // Start signup (don't await the promise yet)
      let signupPromise: Promise<SignupResult>;
      
      await act(async () => {
        signupPromise = result.current.signup(mockSignupData);
        // Give React time to process the state update
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should be loading after calling signup
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      }, { timeout: 1000 });

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockResult);
        await signupPromise!;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear previous error when starting new signup', async () => {
      const mockSignupData: SignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1990-01-01',
        phoneNumber: '+24101234567',
        country: 'GA',
        acceptTerms: true,
      };

      // First signup fails
      const mockError: SignupResult = {
        success: false,
        error: {
          code: SignupErrorCode.EMAIL_ALREADY_IN_USE,
          message: 'Email déjà utilisé',
        },
      };

      (mockAuthService.signup as any).mockResolvedValueOnce(mockError);

      const { result } = renderHook(() => useSignup());

      // First signup
      await act(async () => {
        await result.current.signup(mockSignupData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify error is set
      expect(result.current.error).not.toBe(null);

      // Second signup succeeds
      const mockSuccess: SignupResult = {
        success: true,
        userId: 'user-123',
      };

      (mockAuthService.signup as any).mockResolvedValueOnce(mockSuccess);

      // Start second signup (don't await yet)
      let signupPromise: Promise<SignupResult>;
      act(() => {
        signupPromise = result.current.signup(mockSignupData);
      });

      // Error should be cleared and loading should be true when starting new signup
      await waitFor(() => {
        expect(result.current.error).toBe(null);
        expect(result.current.isLoading).toBe(true);
      }, { timeout: 2000 });

      await act(async () => {
        await signupPromise!;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
