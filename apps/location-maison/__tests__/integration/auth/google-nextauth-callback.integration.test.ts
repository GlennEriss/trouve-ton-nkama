import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('next-auth/providers/google', () =>
  jest.fn((options: unknown) => ({ id: 'google', options }))
);
jest.mock('next-auth/providers/facebook', () =>
  jest.fn((options: unknown) => ({ id: 'facebook', options }))
);
jest.mock('next-auth/providers/credentials', () =>
  jest.fn((options: unknown) => ({ id: 'credentials', options }))
);

jest.mock('@/db/user.db', () => ({
  createUser: jest.fn(),
  updateUser: jest.fn(),
}));

jest.mock('@/features/auth/repositories/user.repository', () => ({
  userRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@/firebase/auth', () => ({
  auth: {},
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
}));

jest.mock('firebase/auth', () => ({
  FacebookAuthProvider: {
    credential: jest.fn(),
  },
  linkWithCredential: jest.fn(),
  signInWithCredential: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import authConfig from '@/next-auth/auth.config';
import { userRepository } from '@/features/auth/repositories/user.repository';
import { GoogleAuthProvider } from '@/firebase/auth';
import { signInWithCredential } from 'firebase/auth';

const callbacks = (authConfig as any).callbacks;

const mockFindByEmail = userRepository.findByEmail as jest.MockedFunction<typeof userRepository.findByEmail>;
const mockCreate = userRepository.create as jest.MockedFunction<typeof userRepository.create>;
const mockUpdate = userRepository.update as jest.MockedFunction<typeof userRepository.update>;
const mockGoogleCredential = GoogleAuthProvider.credential as jest.Mock;
const mockSignInWithCredential = signInWithCredential as jest.MockedFunction<typeof signInWithCredential>;

describe('NextAuth Google callback integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGoogleCredential.mockReturnValue({ provider: 'google' } as never);
    mockSignInWithCredential.mockResolvedValue({
      user: { uid: 'uid-google-1' },
    } as never);
    mockCreate.mockResolvedValue({ uid: 'uid-google-1' } as never);
    mockUpdate.mockResolvedValue({ uid: 'uid-google-1' } as never);
  });

  it('creates a User account on first Google sign-in and redirects to complete-profile', async () => {
    mockFindByEmail.mockResolvedValueOnce(null);

    const result = await callbacks.signIn({
      user: { email: 'new-google@example.com' },
      account: { provider: 'google', id_token: 'google-id-token' },
      profile: { picture: 'https://example.com/avatar.png' },
      credentials: undefined,
    });

    expect(result).toBe('/complete-profile');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new-google@example.com',
        login: 'new-google@example.com',
        roles: ['User'],
        providers: ['GOOGLE'],
      })
    );
  });

  it('returns wrong_provider when account is credentials-only', async () => {
    mockFindByEmail.mockResolvedValueOnce({
      uid: 'uid-cred-only',
      providers: ['CREDENTIALS'],
      metadata: {},
    } as any);

    const result = await callbacks.signIn({
      user: { email: 'cred-only@example.com' },
      account: { provider: 'google', id_token: 'google-id-token' },
      profile: {},
      credentials: undefined,
    });

    expect(result).toBe('/signin?error=wrong_provider');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates metadata for existing Google user and keeps sign-in successful', async () => {
    mockFindByEmail.mockResolvedValueOnce({
      uid: 'uid-google-existing',
      email: 'existing-google@example.com',
      providers: ['GOOGLE'],
      metadata: { needsProfileCompletion: false },
    } as any);

    const result = await callbacks.signIn({
      user: { email: 'existing-google@example.com' },
      account: { provider: 'google', id_token: 'updated-token' },
      profile: {},
      credentials: undefined,
    });

    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      'uid-google-existing',
      expect.objectContaining({
        providers: ['GOOGLE'],
        metadata: expect.objectContaining({
          idToken: 'updated-token',
          needsProfileCompletion: false,
        }),
      })
    );
  });
});
