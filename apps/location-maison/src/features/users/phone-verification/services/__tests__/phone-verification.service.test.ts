import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { userRepository } from '@/features/auth/repositories/user.repository';
import type { User } from '@/models/authentication';
import {
  PhoneVerificationErrorCode,
} from '../phone-verification.service.interface';
import { PhoneVerificationServiceImpl } from '../phone-verification.service';

const mockSignInWithPhoneNumber = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSignInWithCustomToken = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSignOut = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('@/features/auth/repositories/user.repository', () => ({
  userRepository: {
    findById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@/firebase/auth', () => ({
  auth: {},
  signInWithPhoneNumber: (...args: unknown[]) => mockSignInWithPhoneNumber(...args),
  signInWithCustomToken: (...args: unknown[]) => mockSignInWithCustomToken(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id',
    uid: 'uid-1',
    login: 'user@test.com',
    firstname: 'Jean',
    lastname: 'Mbadinga',
    email: 'user@test.com',
    phoneNumbers: ['+241066123456'],
    phoneNumberVerified: false,
    roles: ['User'],
    providers: ['CREDENTIALS'],
    metadata: {},
    favoris: [],
    credits: 0,
    state: 'IN_PROGRESS',
    ...overrides,
  };
}

describe('PhoneVerificationService', () => {
  const mockedFindById = userRepository.findById as jest.MockedFunction<typeof userRepository.findById>;
  const mockedUpdate = userRepository.update as jest.MockedFunction<typeof userRepository.update>;

  let service: PhoneVerificationServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PhoneVerificationServiceImpl();
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  it('returns already-known verification status', async () => {
    mockedFindById.mockResolvedValue(
      createMockUser({
        phoneNumbers: ['+241066123456'],
        phoneNumberVerified: true,
      })
    );

    const result = await service.getPhoneVerificationStatus('uid-1');

    expect(result.success).toBe(true);
    expect(result.phoneNumber).toBe('+241066123456');
    expect(result.phoneNumberVerified).toBe(true);
  });

  it('rejects invalid phone when sending otp', async () => {
    const result = await service.sendPhoneOtp({
      phoneNumber: 'invalid',
      recaptchaVerifier: {},
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(PhoneVerificationErrorCode.INVALID_PHONE);
  });

  it('sends otp successfully', async () => {
    mockSignInWithPhoneNumber.mockResolvedValue({ id: 'confirmation' });

    const result = await service.sendPhoneOtp({
      phoneNumber: '+241066123456',
      recaptchaVerifier: { token: 'recaptcha' },
    });

    expect(result.success).toBe(true);
    expect(result.confirmationResult).toBeDefined();
    expect(mockSignInWithPhoneNumber).toHaveBeenCalled();
  });

  it('confirms otp and persists verified status', async () => {
    const confirmationResult = {
      confirm: jest.fn<() => Promise<unknown>>().mockResolvedValue({ user: { uid: 'temporary' } }),
    } as any;

    mockedFindById.mockResolvedValue(createMockUser({ uid: 'uid-1' }));
    mockedUpdate.mockResolvedValue(
      createMockUser({
        uid: 'uid-1',
        phoneNumbers: ['+241077654321'],
        phoneNumberVerified: true,
      })
    );

    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'custom-token' }),
    } as Response);

    mockSignOut.mockResolvedValue(undefined);
    mockSignInWithCustomToken.mockResolvedValue(undefined);

    const result = await service.confirmPhoneOtp({
      uid: 'uid-1',
      otpCode: '123456',
      phoneNumber: '+241077654321',
      confirmationResult,
    });

    expect(result.success).toBe(true);
    expect(result.user?.phoneNumberVerified).toBe(true);
    expect(result.isPhoneChanged).toBe(true);
    expect(confirmationResult.confirm).toHaveBeenCalledWith('123456');
    expect(mockedUpdate).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({
        phoneNumbers: ['+241077654321'],
        phoneNumberVerified: true,
      })
    );
  });

  it('maps invalid verification code error', async () => {
    const confirmationResult = {
      confirm: jest.fn<() => Promise<unknown>>().mockRejectedValue({ code: 'auth/invalid-verification-code' }),
    } as any;

    const result = await service.confirmPhoneOtp({
      uid: 'uid-1',
      otpCode: '000000',
      phoneNumber: '+241066123456',
      confirmationResult,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(PhoneVerificationErrorCode.OTP_INVALID);
  });
});
