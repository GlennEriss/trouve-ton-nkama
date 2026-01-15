/**
 * useSignup Hook
 * 
 * React hook for user registration.
 * Manages state (loading, error, success) and orchestrates the signup flow.
 */

import { useState, useCallback } from 'react';
import { authService } from '../services';
import { SignupData, SignupResult, SignupError } from '../services/auth.service.interface';

export interface UseSignupState {
  isLoading: boolean;
  error: SignupError | null;
  userId: string | null;
}

export interface UseSignupReturn {
  signup: (data: SignupData) => Promise<SignupResult>;
  isLoading: boolean;
  error: SignupError | null;
  userId: string | null;
  reset: () => void;
}

/**
 * Hook for user registration
 * 
 * @returns Object with signup function and state
 */
export function useSignup(): UseSignupReturn {
  const [state, setState] = useState<UseSignupState>({
    isLoading: false,
    error: null,
    userId: null,
  });

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      userId: null,
    });
  }, []);

  /**
   * Register a new user
   */
  const signup = useCallback(async (data: SignupData): Promise<SignupResult> => {
    // Reset previous error
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const result = await authService.signup(data);

      if (result.success && result.userId) {
        // Success: update state with userId
        setState({
          isLoading: false,
          error: null,
          userId: result.userId,
        });
      } else {
        // Error: update state with error
        setState({
          isLoading: false,
          error: result.error || {
            code: 'UNKNOWN_ERROR',
            message: 'Une erreur inattendue s\'est produite',
          },
          userId: null,
        });
      }

      return result;
    } catch (error) {
      // Unexpected error: wrap in SignupError format
      const signupError: SignupError = {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite',
      };

      setState({
        isLoading: false,
        error: signupError,
        userId: null,
      });

      return {
        success: false,
        error: signupError,
      };
    }
  }, []);

  return {
    signup,
    isLoading: state.isLoading,
    error: state.error,
    userId: state.userId,
    reset,
  };
}
