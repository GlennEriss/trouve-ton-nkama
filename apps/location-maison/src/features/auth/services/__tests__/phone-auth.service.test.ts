import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import type { User } from '@/models/authentication';

jest.mock('@/firebase/admin', () => ({
  adminAuth: { verifyIdToken: jest.fn() },
}));
jest.mock('../resolve-session-user', () => ({
  resolveSessionUser: jest.fn(),
}));
jest.mock('../../repositories/user.repository', () => ({
  userRepository: { create: jest.fn(), update: jest.fn() },
}));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }),
}));
jest.mock('@/features/announcer/listing-claim/services/listing-claim.service', () => ({
  claimListingsByVerifiedPhone: jest.fn(),
}));

import { authenticateWithPhoneIdToken, PhoneAuthError } from '../phone-auth.service';

const PHONE = '+24166123456';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'uid-1',
    login: PHONE,
    firstname: 'Ada',
    lastname: 'Lovelace',
    phoneNumbers: [PHONE],
    roles: ['User'],
    providers: ['CREDENTIALS'],
    metadata: {},
    favoris: [],
    credits: 3,
    ...overrides,
  } as User;
}

describe('authenticateWithPhoneIdToken', () => {
  let adminAuth: any;
  let resolveSessionUser: any;
  let userRepository: any;
  let claimListingsByVerifiedPhone: any;

  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth = require('@/firebase/admin').adminAuth;
    resolveSessionUser = require('../resolve-session-user').resolveSessionUser;
    userRepository = require('../../repositories/user.repository').userRepository;
    claimListingsByVerifiedPhone =
      require('@/features/announcer/listing-claim/services/listing-claim.service').claimListingsByVerifiedPhone;
    claimListingsByVerifiedPhone.mockResolvedValue({ claimedCount: 0, skippedThreshold: false });
  });

  it('throws INVALID_TOKEN when the ID token cannot be verified', async () => {
    adminAuth.verifyIdToken.mockRejectedValue(new Error('bad token'));

    await expect(authenticateWithPhoneIdToken('bad')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
    expect(authenticateWithPhoneIdToken('bad')).rejects.toBeInstanceOf(PhoneAuthError);
  });

  it('throws MISSING_PHONE when the token carries no phone number', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-x', phone_number: undefined });

    await expect(authenticateWithPhoneIdToken('t')).rejects.toMatchObject({
      code: 'MISSING_PHONE',
    });
  });

  it('creates a minimal announcer account on first sign-in', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-new', phone_number: PHONE });
    resolveSessionUser.mockResolvedValue(null);
    userRepository.create.mockImplementation(async (u: User) => u);

    const result = await authenticateWithPhoneIdToken('t');

    expect(resolveSessionUser).toHaveBeenCalledWith({ uid: 'uid-new', phone: PHONE });
    expect(userRepository.create).toHaveBeenCalledTimes(1);
    const created = userRepository.create.mock.calls[0][0] as User;
    expect(created.uid).toBe('uid-new');
    expect(created.phoneNumbers).toEqual([PHONE]);
    expect(created.roles).toEqual(['User', 'Announcer']);
    expect(created.providers).toEqual(['PHONE']);
    expect(created.phoneNumberVerified).toBe(true);
    expect(created.metadata.needsProfileCompletion).toBe(true);
    expect(result.uid).toBe('uid-new');
  });

  it('links the PHONE provider to an existing account (option A)', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-phone', phone_number: PHONE });
    const existing = makeUser({ uid: 'uid-email', providers: ['CREDENTIALS'], phoneNumberVerified: false });
    resolveSessionUser.mockResolvedValue(existing);
    userRepository.update.mockImplementation(async (_uid: string, data: Partial<User>) => ({ ...existing, ...data }));

    const result = await authenticateWithPhoneIdToken('t');

    expect(userRepository.update).toHaveBeenCalledWith('uid-email', {
      providers: ['CREDENTIALS', 'PHONE'],
      phoneNumberVerified: true,
    });
    expect(result.providers).toContain('PHONE');
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('does not re-update an already-linked, verified account', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-1', phone_number: PHONE });
    const existing = makeUser({ providers: ['PHONE'], phoneNumberVerified: true });
    resolveSessionUser.mockResolvedValue(existing);

    const result = await authenticateWithPhoneIdToken('t');

    expect(userRepository.update).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });

  it('reconciles listings by verified phone (auto-attribution) after a successful sign-in', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-1', phone_number: PHONE });
    const existing = makeUser({ providers: ['PHONE'], phoneNumberVerified: true });
    resolveSessionUser.mockResolvedValue(existing);

    await authenticateWithPhoneIdToken('t');

    expect(claimListingsByVerifiedPhone).toHaveBeenCalledWith('uid-1', PHONE);
  });

  it('still returns the user when auto-attribution fails (best-effort, never blocks sign-in)', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-1', phone_number: PHONE });
    const existing = makeUser({ providers: ['PHONE'], phoneNumberVerified: true });
    resolveSessionUser.mockResolvedValue(existing);
    claimListingsByVerifiedPhone.mockRejectedValue(new Error('firestore down'));

    await expect(authenticateWithPhoneIdToken('t')).resolves.toBe(existing);
  });
});
