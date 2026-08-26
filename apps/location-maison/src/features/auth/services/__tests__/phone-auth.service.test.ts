import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import type { User } from '@/models/authentication';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';

const SERVER_TIMESTAMP = 'SERVER_TIMESTAMP';
const mockSet = jest.fn() as jest.MockedFunction<(data: unknown) => Promise<void>>;
const mockGet = jest.fn() as jest.MockedFunction<() => Promise<{ exists: boolean; data: () => unknown }>>;
const mockUpdate = jest.fn() as jest.MockedFunction<(data: unknown) => Promise<void>>;
const mockDoc = jest.fn(() => ({ set: mockSet, get: mockGet, update: mockUpdate }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ collection: mockCollection })),
  FieldValue: { serverTimestamp: () => SERVER_TIMESTAMP },
}));
jest.mock('@/firebase/admin', () => ({
  adminApp: {},
  adminAuth: { verifyIdToken: jest.fn() },
}));
jest.mock('../resolve-session-user', () => ({
  resolveSessionUser: jest.fn(),
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
  let claimListingsByVerifiedPhone: any;

  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth = require('@/firebase/admin').adminAuth;
    resolveSessionUser = require('../resolve-session-user').resolveSessionUser;
    claimListingsByVerifiedPhone =
      require('@/features/announcer/listing-claim/services/listing-claim.service').claimListingsByVerifiedPhone;
    claimListingsByVerifiedPhone.mockResolvedValue({ claimedCount: 0, skippedThreshold: false });
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
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

  it('creates a minimal announcer account via the Admin SDK on first sign-in', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-new', phone_number: PHONE });
    resolveSessionUser.mockResolvedValue(null);

    const result = await authenticateWithPhoneIdToken('t');

    expect(mockCollection).toHaveBeenCalledWith(firebaseCollectionNames.users);
    expect(mockDoc).toHaveBeenCalledWith('uid-new');
    expect(mockSet).toHaveBeenCalledTimes(1);
    const created = mockSet.mock.calls[0][0] as User;
    expect(created.uid).toBe('uid-new');
    expect(created.phoneNumbers).toEqual([PHONE]);
    expect(created.roles).toEqual(['User', 'Announcer']);
    expect(created.providers).toEqual(['PHONE']);
    expect(created.phoneNumberVerified).toBe(true);
    expect(created.metadata.needsProfileCompletion).toBe(true);
    expect(created.createdAt).toBe(SERVER_TIMESTAMP);
    expect(created.updatedAt).toBe(SERVER_TIMESTAMP);
    expect(result.uid).toBe('uid-new');
  });

  it('links the PHONE provider to an existing account (option A), writing via the Admin SDK', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-phone', phone_number: PHONE });
    const existing = makeUser({ uid: 'uid-email', providers: ['CREDENTIALS'], phoneNumberVerified: false });
    resolveSessionUser.mockResolvedValue(existing);
    mockGet.mockResolvedValue({ exists: true, data: () => existing });

    const result = await authenticateWithPhoneIdToken('t');

    expect(mockDoc).toHaveBeenCalledWith('uid-email');
    expect(mockUpdate).toHaveBeenCalledWith({
      providers: ['CREDENTIALS', 'PHONE'],
      phoneNumberVerified: true,
      updatedAt: SERVER_TIMESTAMP,
    });
    expect(result.providers).toContain('PHONE');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('does not re-update an already-linked, verified account', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-1', phone_number: PHONE });
    const existing = makeUser({ providers: ['PHONE'], phoneNumberVerified: true });
    resolveSessionUser.mockResolvedValue(existing);

    const result = await authenticateWithPhoneIdToken('t');

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
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

  it('persists a pendingClaimNotice when listings were auto-claimed, so the dashboard can welcome the announcer', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-1', phone_number: PHONE });
    const existing = makeUser({ providers: ['PHONE'], phoneNumberVerified: true, metadata: { foo: 'bar' } });
    resolveSessionUser.mockResolvedValue(existing);
    claimListingsByVerifiedPhone.mockResolvedValue({ claimedCount: 3, skippedThreshold: false });
    mockGet.mockResolvedValue({ exists: true, data: () => existing });

    const result = await authenticateWithPhoneIdToken('t');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          foo: 'bar',
          pendingClaimNotice: expect.objectContaining({ count: 3 }),
        }),
      }),
    );
    expect(result.metadata.pendingClaimNotice).toEqual(expect.objectContaining({ count: 3 }));
  });

  it('does not touch metadata when nothing was claimed', async () => {
    adminAuth.verifyIdToken.mockResolvedValue({ uid: 'uid-1', phone_number: PHONE });
    const existing = makeUser({ providers: ['PHONE'], phoneNumberVerified: true });
    resolveSessionUser.mockResolvedValue(existing);
    claimListingsByVerifiedPhone.mockResolvedValue({ claimedCount: 0, skippedThreshold: false });

    const result = await authenticateWithPhoneIdToken('t');

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });
});
