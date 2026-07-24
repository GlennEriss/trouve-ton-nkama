import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { resolveSessionUser, toSessionUserIdentity } from '../resolve-session-user';
import type { User } from '@/models/authentication';

jest.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findById: jest.fn(),
    findByPhoneNumber: jest.fn(),
    findByEmail: jest.fn(),
  },
}));

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'uid-1',
    login: 'test@example.com',
    email: 'test@example.com',
    firstname: 'Ada',
    lastname: 'Lovelace',
    phoneNumbers: ['+24166123456'],
    roles: ['User'],
    providers: ['CREDENTIALS'],
    metadata: {},
    favoris: [],
    credits: 3,
    ...overrides,
  } as User;
}

describe('resolveSessionUser', () => {
  // Loosely typed to mirror the existing auth tests' mock repository usage.
  let repo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = require('../../repositories/user.repository').userRepository;
  });

  it('resolves by email (OAuth / Credentials path — non-regression)', async () => {
    const user = makeUser();
    repo.findByEmail.mockResolvedValue(user);

    const result = await resolveSessionUser({ email: 'test@example.com' });

    expect(result).toBe(user);
    expect(repo.findByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('resolves by uid (Credentials / Phone) without hitting email lookup', async () => {
    const user = makeUser();
    repo.findById.mockResolvedValue(user);

    const result = await resolveSessionUser({ uid: 'uid-1', email: 'test@example.com' });

    expect(result).toBe(user);
    expect(repo.findById).toHaveBeenCalledWith('uid-1');
    expect(repo.findByPhoneNumber).not.toHaveBeenCalled();
    expect(repo.findByEmail).not.toHaveBeenCalled();
  });

  it('resolves an email-less phone account by phone number', async () => {
    // Email-less account (the case phone-OTP signups produce).
    const user = makeUser({ email: undefined });
    repo.findById.mockResolvedValue(null);
    repo.findByPhoneNumber.mockResolvedValue(user);

    const result = await resolveSessionUser({ uid: 'unknown', phone: '+24166123456' });

    expect(result).toBe(user);
    expect(repo.findByPhoneNumber).toHaveBeenCalledWith('+24166123456');
  });

  it('honors priority uid → phone → email', async () => {
    const byUid = makeUser({ uid: 'the-uid' });
    repo.findById.mockResolvedValue(byUid);
    repo.findByPhoneNumber.mockResolvedValue(makeUser({ uid: 'phone-uid' }));
    repo.findByEmail.mockResolvedValue(makeUser({ uid: 'email-uid' }));

    const result = await resolveSessionUser({
      uid: 'the-uid',
      phone: '+24166123456',
      email: 'test@example.com',
    });

    expect(result).toBe(byUid);
  });

  it('returns null when nothing matches (new OAuth user → create path preserved)', async () => {
    repo.findById.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(null);

    const result = await resolveSessionUser({ uid: 'google-sub', email: 'new@example.com' });

    expect(result).toBeNull();
  });

  it('propagates repository errors (fail-closed)', async () => {
    repo.findById.mockRejectedValue(new Error('firestore down'));

    await expect(resolveSessionUser({ uid: 'uid-1' })).rejects.toThrow('firestore down');
  });
});

describe('toSessionUserIdentity', () => {
  it('extracts email from an OAuth-shaped user (id + email, no phone)', () => {
    const identity = toSessionUserIdentity({ id: 'google-sub', email: 'g@example.com', name: 'G' });
    expect(identity).toEqual({ uid: 'google-sub', phone: null, email: 'g@example.com' });
  });

  it('prefers our uid and the first phone for a Credentials-shaped user', () => {
    const identity = toSessionUserIdentity({
      uid: 'uid-1',
      phoneNumbers: ['+24166123456', '+24177000000'],
      email: 'c@example.com',
    });
    expect(identity).toEqual({ uid: 'uid-1', phone: '+24166123456', email: 'c@example.com' });
  });

  it('handles an email-less phone-shaped user', () => {
    const identity = toSessionUserIdentity({ uid: 'uid-2', phoneNumbers: ['+24166123456'] });
    expect(identity).toEqual({ uid: 'uid-2', phone: '+24166123456', email: null });
  });

  it('is null-safe for empty input', () => {
    expect(toSessionUserIdentity(null)).toEqual({ uid: null, phone: null, email: null });
  });
});
