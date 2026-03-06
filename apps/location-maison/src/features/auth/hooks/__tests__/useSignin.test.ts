import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { mapSigninError, useSignin } from '../useSignin';
import { getSession, signIn } from 'next-auth/react';

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  getSession: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;

describe('useSignin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      user: {
        roles: ['User'],
      },
    } as any);
  });

  it('returns default state on init', () => {
    const { result } = renderHook(() => useSignin());

    expect(result.current.isCredentialsLoading).toBe(false);
    expect(result.current.isGoogleLoading).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastError).toBeNull();
  });

  it('handles successful credentials signin', async () => {
    mockSignIn.mockResolvedValueOnce({
      ok: true,
      error: null,
      status: 200,
      url: null,
      code: null,
    } as any);

    const { result } = renderHook(() => useSignin());
    let signinResult: any;

    await act(async () => {
      signinResult = await result.current.signinWithCredentials({
        email: 'john@example.com',
        password: 'Password123',
      });
    });

    expect(signinResult.success).toBe(true);
    expect(signinResult.redirectTo).toBe('/search');
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      login: 'john@example.com',
      password: 'Password123',
      redirect: false,
    });
  });

  it('redirects announcer credentials signin to properties', async () => {
    mockSignIn.mockResolvedValueOnce({
      ok: true,
      error: null,
      status: 200,
      url: null,
      code: null,
    } as any);
    mockGetSession.mockResolvedValueOnce({
      user: {
        roles: ['User', 'Announcer'],
      },
    } as any);

    const { result } = renderHook(() => useSignin());
    let signinResult: any;

    await act(async () => {
      signinResult = await result.current.signinWithCredentials({
        email: 'announcer@example.com',
        password: 'Password123',
      });
    });

    expect(signinResult.success).toBe(true);
    expect(signinResult.redirectTo).toBe('/property');
  });

  it('maps credentials signin errors', async () => {
    mockSignIn.mockResolvedValueOnce({
      ok: false,
      error: 'auth/wrong-password',
      status: 401,
      url: null,
      code: null,
    } as any);

    const { result } = renderHook(() => useSignin());
    let signinResult: any;

    await act(async () => {
      signinResult = await result.current.signinWithCredentials({
        email: 'john@example.com',
        password: 'wrong',
      });
    });

    expect(signinResult.success).toBe(false);
    expect(signinResult.error.code).toBe('WRONG_PASSWORD');
    expect(result.current.lastError?.code).toBe('WRONG_PASSWORD');
  });

  it('triggers google signin with callback URL', async () => {
    mockSignIn.mockResolvedValueOnce(undefined as any);
    const { result } = renderHook(() => useSignin());

    await act(async () => {
      await result.current.signinWithGoogle();
    });

    expect(mockSignIn).toHaveBeenCalledWith('google', {
      callbackUrl: '/property',
    });
    expect(result.current.isGoogleLoading).toBe(false);
  });
});

describe('mapSigninError', () => {
  it('returns dedicated mapping for wrong_provider', () => {
    const error = mapSigninError('wrong_provider');
    expect(error.code).toBe('WRONG_PROVIDER');
  });

  it('returns default mapping for unknown errors', () => {
    const error = mapSigninError('unknown_code');
    expect(error.code).toBe('unknown_code');
    expect(error.title).toBe('Erreur de connexion');
  });
});
