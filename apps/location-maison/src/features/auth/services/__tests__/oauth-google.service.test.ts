import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('../../repositories/user.repository', () => ({
  userRepository: {
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

import { userRepository } from '../../repositories/user.repository';
import { GoogleAuthProvider } from '@/firebase/auth';
import {
  FacebookAuthProvider,
  linkWithCredential,
  signInWithCredential,
} from 'firebase/auth';
import {
  handleGoogleSignIn,
  validateCredentialsUserForOAuth,
} from '../oauth-google.service';

const mockCreateUser = userRepository.create as jest.MockedFunction<typeof userRepository.create>;
const mockUpdateUser = userRepository.update as jest.MockedFunction<typeof userRepository.update>;
const mockGoogleCredential = GoogleAuthProvider.credential as jest.Mock;
const mockFacebookCredential = FacebookAuthProvider.credential as jest.Mock;
const mockSignInWithCredential = signInWithCredential as jest.MockedFunction<typeof signInWithCredential>;
const mockLinkWithCredential = linkWithCredential as jest.MockedFunction<typeof linkWithCredential>;

describe('oauth-google.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGoogleCredential.mockReturnValue({ provider: 'google' } as never);
    mockFacebookCredential.mockReturnValue({ provider: 'facebook' } as never);
    mockSignInWithCredential.mockResolvedValue({
      user: { uid: 'uid-123' },
    } as never);
    mockLinkWithCredential.mockResolvedValue({} as never);
    mockCreateUser.mockResolvedValue({ uid: 'uid-123' } as never);
    mockUpdateUser.mockResolvedValue({ uid: 'uid-existing' } as never);
  });

  describe('validateCredentialsUserForOAuth', () => {
    it('returns wrong_provider redirect for credentials-only account on OAuth sign-in', () => {
      const result = validateCredentialsUserForOAuth(
        {
          uid: 'uid-1',
          providers: ['CREDENTIALS'],
        },
        undefined
      );

      expect(result).toBe('/signin?error=wrong_provider');
    });

    it('returns true when credentials are provided for credentials-only account', () => {
      const result = validateCredentialsUserForOAuth(
        {
          uid: 'uid-1',
          providers: ['CREDENTIALS'],
        },
        { login: 'john@example.com' }
      );

      expect(result).toBe(true);
    });

    it('returns null when account is not credentials-only', () => {
      const result = validateCredentialsUserForOAuth(
        {
          uid: 'uid-1',
          providers: ['GOOGLE', 'CREDENTIALS'],
        },
        undefined
      );

      expect(result).toBeNull();
    });
  });

  describe('handleGoogleSignIn', () => {
    it('creates a new Google user with User role and redirects to complete profile', async () => {
      const result = await handleGoogleSignIn(
        { email: 'new-google@example.com' },
        { id_token: 'google-token' },
        { picture: 'https://example.com/avatar.png' },
        null
      );

      expect(result).toBe('/complete-profile');
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new-google@example.com',
          login: 'new-google@example.com',
          roles: ['User'],
          providers: ['GOOGLE'],
          metadata: expect.objectContaining({
            idToken: 'google-token',
            needsProfileCompletion: true,
          }),
        })
      );
    });

    it('updates existing user and adds GOOGLE provider when missing', async () => {
      const result = await handleGoogleSignIn(
        { email: 'existing@example.com' },
        { id_token: 'new-google-token' },
        { picture: 'https://example.com/avatar.png' },
        {
          uid: 'uid-existing',
          email: 'existing@example.com',
          providers: ['FACEBOOK'],
          metadata: { accessToken: 'facebook-access-token' },
        }
      );

      expect(result).toBe(true);
      expect(mockLinkWithCredential).toHaveBeenCalledTimes(1);
      expect(mockUpdateUser).toHaveBeenCalledWith(
        'uid-existing',
        expect.objectContaining({
          providers: ['FACEBOOK', 'GOOGLE'],
          metadata: expect.objectContaining({
            idToken: 'new-google-token',
            accessToken: 'facebook-access-token',
          }),
        })
      );
    });

    it('returns false when Google credential cannot be created', async () => {
      mockGoogleCredential.mockReturnValueOnce(null as never);

      const result = await handleGoogleSignIn(
        { email: 'broken@example.com' },
        { id_token: null },
        {},
        null
      );

      expect(result).toBe(false);
      expect(mockCreateUser).not.toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('redirects to signin with provider-disabled error when Firebase Google provider is disabled', async () => {
      mockSignInWithCredential.mockRejectedValueOnce({
        code: 'auth/operation-not-allowed',
        message: 'Google provider disabled',
      });

      const result = await handleGoogleSignIn(
        { email: 'disabled@example.com' },
        { id_token: 'google-token' },
        {},
        null
      );

      expect(result).toBe('/signin?error=google_provider_disabled');
    });
  });
});
