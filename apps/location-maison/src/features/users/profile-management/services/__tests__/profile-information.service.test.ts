import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RepositoryError } from '@/features/auth/repositories/user.repository.interface';
import { userRepository } from '@/features/auth/repositories/user.repository';
import type { User } from '@/models/authentication';
import { ProfileInformationServiceImpl } from '../profile-information.service';
import { ProfileInformationErrorCode } from '../profile-information.service.interface';

jest.mock('@/features/auth/repositories/user.repository', () => ({
  userRepository: {
    findById: jest.fn(),
    findByPhoneNumber: jest.fn(),
    update: jest.fn(),
  },
}));

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id-1',
    uid: 'uid-1',
    login: 'user@test.com',
    firstname: 'Jean',
    lastname: 'Mbadinga',
    birthDate: '1990-05-20',
    email: 'user@test.com',
    country: { code: 'GA', name: 'Gabon' },
    phoneNumbers: ['+241066123456'],
    phoneNumberVerified: true,
    roles: ['User'],
    providers: ['CREDENTIALS'],
    metadata: {},
    favoris: [],
    credits: 0,
    state: 'IN_PROGRESS',
    ...overrides,
  };
}

describe('ProfileInformationService', () => {
  const mockedFindById = userRepository.findById as jest.MockedFunction<typeof userRepository.findById>;
  const mockedFindByPhoneNumber =
    userRepository.findByPhoneNumber as jest.MockedFunction<typeof userRepository.findByPhoneNumber>;
  const mockedUpdate = userRepository.update as jest.MockedFunction<typeof userRepository.update>;

  let service: ProfileInformationServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileInformationServiceImpl();
  });

  it('updates profile information successfully', async () => {
    const currentUser = createMockUser();
    const updatedUser = createMockUser({
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: '1989-01-10',
      phoneNumbers: ['+241077654321'],
      country: { code: 'SN', name: 'Sénégal' },
      phoneNumberVerified: false,
    });

    mockedFindById.mockResolvedValue(currentUser);
    mockedFindByPhoneNumber.mockResolvedValue(null);
    mockedUpdate.mockResolvedValue(updatedUser);

    const result = await service.updateProfileInformation({
      uid: 'uid-1',
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: '1989-01-10',
      phoneNumber: '+241077654321',
      countryCode: 'SN',
    });

    expect(result.success).toBe(true);
    expect(result.user).toEqual(updatedUser);
    expect(mockedFindById).toHaveBeenCalledWith('uid-1');
    expect(mockedFindByPhoneNumber).toHaveBeenCalledWith('+241077654321');
    expect(mockedUpdate).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({
        firstname: 'Paul',
        lastname: 'Ngoma',
        birthDate: '1989-01-10',
        phoneNumbers: ['+241077654321'],
        searchableName: 'Paul Ngoma',
        phoneNumberVerified: false,
      })
    );
  });

  it('met à jour le pseudo (ajout puis suppression)', async () => {
    const currentUser = createMockUser({ pseudo: undefined });
    const updatedUser = createMockUser({ pseudo: 'DressByK' });

    mockedFindById.mockResolvedValue(currentUser);
    mockedFindByPhoneNumber.mockResolvedValue(null);
    mockedUpdate.mockResolvedValue(updatedUser);

    const result = await service.updateProfileInformation({
      uid: 'uid-1',
      firstname: currentUser.firstname,
      lastname: currentUser.lastname,
      pseudo: '  DressByK  ',
      birthDate: currentUser.birthDate!,
      phoneNumber: currentUser.phoneNumbers[0],
      countryCode: currentUser.country!.code,
    });

    expect(result.success).toBe(true);
    expect(mockedUpdate).toHaveBeenCalledWith(
      'uid-1',
      expect.objectContaining({ pseudo: 'DressByK' }),
    );

    // Vider le pseudo doit aussi passer (repli sur firstname/lastname côté affichage).
    mockedFindById.mockResolvedValue(updatedUser);
    mockedUpdate.mockResolvedValue(createMockUser({ pseudo: '' }));

    await service.updateProfileInformation({
      uid: 'uid-1',
      firstname: updatedUser.firstname,
      lastname: updatedUser.lastname,
      pseudo: '',
      birthDate: updatedUser.birthDate!,
      phoneNumber: updatedUser.phoneNumbers[0],
      countryCode: updatedUser.country!.code,
    });

    expect(mockedUpdate).toHaveBeenLastCalledWith(
      'uid-1',
      expect.objectContaining({ pseudo: '' }),
    );
  });

  it('rejects missing uid', async () => {
    const result = await service.updateProfileInformation({
      uid: ' ',
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: '1989-01-10',
      phoneNumber: '+241077654321',
      countryCode: 'GA',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ProfileInformationErrorCode.USER_ID_REQUIRED);
    expect(mockedFindById).not.toHaveBeenCalled();
  });

  it('rejects underage birthdate', async () => {
    const thisYear = new Date().getFullYear();
    const result = await service.updateProfileInformation({
      uid: 'uid-1',
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: `${thisYear - 16}-01-10`,
      phoneNumber: '+241077654321',
      countryCode: 'GA',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ProfileInformationErrorCode.UNDERAGE);
  });

  it('rejects invalid phone number', async () => {
    const result = await service.updateProfileInformation({
      uid: 'uid-1',
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: '1989-01-10',
      phoneNumber: 'invalid-phone',
      countryCode: 'GA',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ProfileInformationErrorCode.INVALID_PHONE);
  });

  it('rejects unknown country code', async () => {
    const result = await service.updateProfileInformation({
      uid: 'uid-1',
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: '1989-01-10',
      phoneNumber: '+241077654321',
      countryCode: 'XX',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ProfileInformationErrorCode.INVALID_COUNTRY);
  });

  it('returns user not found when uid is unknown', async () => {
    mockedFindById.mockResolvedValue(null);

    const result = await service.updateProfileInformation({
      uid: 'missing-uid',
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: '1989-01-10',
      phoneNumber: '+241077654321',
      countryCode: 'GA',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ProfileInformationErrorCode.USER_NOT_FOUND);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('rejects phone already used by another account', async () => {
    mockedFindById.mockResolvedValue(createMockUser({ uid: 'uid-1' }));
    mockedFindByPhoneNumber.mockResolvedValue(createMockUser({ uid: 'uid-2' }));

    const result = await service.updateProfileInformation({
      uid: 'uid-1',
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: '1989-01-10',
      phoneNumber: '+241077654321',
      countryCode: 'GA',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ProfileInformationErrorCode.PHONE_ALREADY_IN_USE);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('rejects changing a verified phone before lock expiration', async () => {
    const lockUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    mockedFindById.mockResolvedValue(
      createMockUser({
        uid: 'uid-1',
        phoneNumberVerified: true,
        metadata: {
          phoneVerification: {
            lockUntil,
          },
        },
      })
    );
    mockedFindByPhoneNumber.mockResolvedValue(null);

    const result = await service.updateProfileInformation({
      uid: 'uid-1',
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: '1989-01-10',
      phoneNumber: '+241077654321',
      countryCode: 'GA',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ProfileInformationErrorCode.PHONE_CHANGE_LOCKED);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('maps repository update error to UPDATE_FAILED', async () => {
    mockedFindById.mockResolvedValue(createMockUser({ uid: 'uid-1' }));
    mockedFindByPhoneNumber.mockResolvedValue(null);
    mockedUpdate.mockRejectedValue(
      new RepositoryError('Failed to update user', 'USER_UPDATE_ERROR')
    );

    const result = await service.updateProfileInformation({
      uid: 'uid-1',
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: '1989-01-10',
      phoneNumber: '+241077654321',
      countryCode: 'GA',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ProfileInformationErrorCode.UPDATE_FAILED);
  });

  it('maps repository USER_NOT_FOUND to USER_NOT_FOUND', async () => {
    mockedFindById.mockResolvedValue(createMockUser({ uid: 'uid-1' }));
    mockedFindByPhoneNumber.mockResolvedValue(null);
    mockedUpdate.mockRejectedValue(
      new RepositoryError('User not found', 'USER_NOT_FOUND')
    );

    const result = await service.updateProfileInformation({
      uid: 'uid-1',
      firstname: 'Paul',
      lastname: 'Ngoma',
      birthDate: '1989-01-10',
      phoneNumber: '+241077654321',
      countryCode: 'GA',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(ProfileInformationErrorCode.USER_NOT_FOUND);
  });
});
