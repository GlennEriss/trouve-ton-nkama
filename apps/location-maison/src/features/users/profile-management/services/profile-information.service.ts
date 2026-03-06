import { countries } from '@/constantes/country';
import { userRepository } from '@/features/auth/repositories/user.repository';
import { RepositoryError } from '@/features/auth/repositories/user.repository.interface';
import { createLogger } from '@/lib/logger';
import { validatePhoneNumberForSupportedCountries } from '@/lib/phoneValidation';
import {
  ProfileInformationErrorCode,
  type ProfileInformationService,
  type UpdateProfileInformationData,
  type UpdateProfileInformationResult,
} from './profile-information.service.interface';

const logger = createLogger('users.profile-information-service');

function parseBirthDate(value: string): {
  ok: true;
  error?: never;
} | {
  ok: false;
  error: ProfileInformationErrorCode.INVALID_BIRTHDATE | ProfileInformationErrorCode.UNDERAGE;
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, error: ProfileInformationErrorCode.INVALID_BIRTHDATE };
  }

  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return { ok: false, error: ProfileInformationErrorCode.INVALID_BIRTHDATE };
  }

  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return { ok: false, error: ProfileInformationErrorCode.INVALID_BIRTHDATE };
  }

  const today = new Date();
  const age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  const dayDiff = today.getDate() - day;
  const realAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

  if (realAge < 18) {
    return { ok: false, error: ProfileInformationErrorCode.UNDERAGE };
  }

  return { ok: true };
}

function mapErrorMessage(code: ProfileInformationErrorCode): string {
  switch (code) {
    case ProfileInformationErrorCode.USER_ID_REQUIRED:
      return "L'identifiant utilisateur est requis.";
    case ProfileInformationErrorCode.FIRSTNAME_REQUIRED:
      return 'Le prénom est requis.';
    case ProfileInformationErrorCode.LASTNAME_REQUIRED:
      return 'Le nom est requis.';
    case ProfileInformationErrorCode.INVALID_BIRTHDATE:
      return 'La date de naissance est invalide.';
    case ProfileInformationErrorCode.UNDERAGE:
      return 'Vous devez avoir au moins 18 ans.';
    case ProfileInformationErrorCode.INVALID_PHONE:
      return 'Le numéro de téléphone est invalide.';
    case ProfileInformationErrorCode.INVALID_COUNTRY:
      return 'Le pays sélectionné est invalide.';
    case ProfileInformationErrorCode.PHONE_ALREADY_IN_USE:
      return 'Ce numéro de téléphone est déjà utilisé.';
    case ProfileInformationErrorCode.USER_NOT_FOUND:
      return 'Utilisateur introuvable.';
    case ProfileInformationErrorCode.UPDATE_FAILED:
      return "La mise à jour du profil a échoué.";
    default:
      return 'Une erreur inattendue est survenue.';
  }
}

export class ProfileInformationServiceImpl implements ProfileInformationService {
  async updateProfileInformation(
    data: UpdateProfileInformationData
  ): Promise<UpdateProfileInformationResult> {
    const uid = data.uid?.trim();
    if (!uid) {
      return {
        success: false,
        error: {
          code: ProfileInformationErrorCode.USER_ID_REQUIRED,
          message: mapErrorMessage(ProfileInformationErrorCode.USER_ID_REQUIRED),
        },
      };
    }

    const firstname = data.firstname.trim();
    if (!firstname) {
      return {
        success: false,
        error: {
          code: ProfileInformationErrorCode.FIRSTNAME_REQUIRED,
          message: mapErrorMessage(ProfileInformationErrorCode.FIRSTNAME_REQUIRED),
        },
      };
    }

    const lastname = data.lastname.trim();
    if (!lastname) {
      return {
        success: false,
        error: {
          code: ProfileInformationErrorCode.LASTNAME_REQUIRED,
          message: mapErrorMessage(ProfileInformationErrorCode.LASTNAME_REQUIRED),
        },
      };
    }

    const birthDate = data.birthDate.trim();
    const birthDateCheck = parseBirthDate(birthDate);
    if (!birthDateCheck.ok) {
      return {
        success: false,
        error: {
          code: birthDateCheck.error,
          message: mapErrorMessage(birthDateCheck.error),
        },
      };
    }

    const phoneNumber = data.phoneNumber.trim();
    const phoneValidation = validatePhoneNumberForSupportedCountries(phoneNumber);
    if (!phoneValidation.isValid) {
      return {
        success: false,
        error: {
          code: ProfileInformationErrorCode.INVALID_PHONE,
          message: mapErrorMessage(ProfileInformationErrorCode.INVALID_PHONE),
        },
      };
    }

    const countryCode = data.countryCode.trim();
    const country = countries.find((item) => item.code === countryCode);
    if (!country) {
      return {
        success: false,
        error: {
          code: ProfileInformationErrorCode.INVALID_COUNTRY,
          message: mapErrorMessage(ProfileInformationErrorCode.INVALID_COUNTRY),
        },
      };
    }

    try {
      const currentUser = await userRepository.findById(uid);
      if (!currentUser) {
        return {
          success: false,
          error: {
            code: ProfileInformationErrorCode.USER_NOT_FOUND,
            message: mapErrorMessage(ProfileInformationErrorCode.USER_NOT_FOUND),
          },
        };
      }

      const existingByPhone = await userRepository.findByPhoneNumber(phoneNumber);
      if (existingByPhone && existingByPhone.uid !== uid) {
        return {
          success: false,
          error: {
            code: ProfileInformationErrorCode.PHONE_ALREADY_IN_USE,
            message: mapErrorMessage(ProfileInformationErrorCode.PHONE_ALREADY_IN_USE),
          },
        };
      }

      const previousPhone = currentUser.phoneNumbers?.[0] ?? '';
      const phoneChanged = previousPhone !== phoneNumber;

      const updatedUser = await userRepository.update(uid, {
        firstname,
        lastname,
        birthDate,
        phoneNumbers: [phoneNumber],
        country: {
          code: country.code,
          name: country.name,
        },
        searchableName: `${firstname} ${lastname}`.trim(),
        phoneNumberVerified: phoneChanged ? false : currentUser.phoneNumberVerified,
      });

      logger.info('Profile information updated', {
        uid,
        phoneChanged,
        countryCode: data.countryCode,
      });

      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      if (error instanceof RepositoryError) {
        const code = error.code === 'USER_NOT_FOUND'
          ? ProfileInformationErrorCode.USER_NOT_FOUND
          : ProfileInformationErrorCode.UPDATE_FAILED;

        logger.error('Profile information update failed (repository)', {
          uid,
          repositoryCode: error.code,
          error,
        });

        return {
          success: false,
          error: {
            code,
            message: mapErrorMessage(code),
          },
        };
      }

      logger.error('Profile information update failed (unknown)', {
        uid,
        error,
      });

      return {
        success: false,
        error: {
          code: ProfileInformationErrorCode.UNKNOWN_ERROR,
          message: mapErrorMessage(ProfileInformationErrorCode.UNKNOWN_ERROR),
        },
      };
    }
  }
}

export const profileInformationService: ProfileInformationService = new ProfileInformationServiceImpl();
