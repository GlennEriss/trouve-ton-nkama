import { validatePhoneNumberForSupportedCountries } from '@/lib/phoneValidation';
import { createLogger } from '@/lib/logger';
import type { Role, User } from '@/models/authentication';
import { RepositoryError } from '../repositories/user.repository.interface';
import { userRepository } from '../repositories/user.repository';
import type {
  CompleteProfileBirthdate,
  CompleteProfileData,
  CompleteProfileResult,
  CompleteProfileService,
} from './complete-profile.service.interface';
import {
  CompleteProfileErrorCode,
} from './complete-profile.service.interface';

const logger = createLogger('auth.complete-profile-service');

function parseBirthdate(birthdate: CompleteProfileBirthdate): {
  ok: true;
  value: string;
} | {
  ok: false;
  error: CompleteProfileErrorCode.INVALID_BIRTHDATE | CompleteProfileErrorCode.UNDERAGE;
} {
  const day = Number.parseInt(birthdate.day, 10);
  const month = Number.parseInt(birthdate.month, 10);
  const year = Number.parseInt(birthdate.year, 10);

  if (
    Number.isNaN(day) ||
    Number.isNaN(month) ||
    Number.isNaN(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 1900
  ) {
    return { ok: false, error: CompleteProfileErrorCode.INVALID_BIRTHDATE };
  }

  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return { ok: false, error: CompleteProfileErrorCode.INVALID_BIRTHDATE };
  }

  const today = new Date();
  const age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  const dayDiff = today.getDate() - day;
  const realAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  if (realAge < 18) {
    return { ok: false, error: CompleteProfileErrorCode.UNDERAGE };
  }

  return {
    ok: true,
    value: `${birthdate.year}-${birthdate.month}-${birthdate.day}`,
  };
}

function mapErrorMessage(code: CompleteProfileErrorCode): string {
  switch (code) {
    case CompleteProfileErrorCode.USER_ID_REQUIRED:
      return "L'identifiant utilisateur est requis";
    case CompleteProfileErrorCode.INVALID_PHONE:
      return 'Le numéro de téléphone est invalide';
    case CompleteProfileErrorCode.INVALID_BIRTHDATE:
      return 'La date de naissance est invalide';
    case CompleteProfileErrorCode.UNDERAGE:
      return 'Vous devez avoir au moins 18 ans';
    case CompleteProfileErrorCode.TERMS_NOT_ACCEPTED:
      return "Vous devez accepter les conditions d'utilisation et la politique de confidentialité";
    case CompleteProfileErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED:
      return "Vous devez accepter les conditions d'annonceur";
    case CompleteProfileErrorCode.USER_NOT_FOUND:
      return 'Utilisateur introuvable';
    case CompleteProfileErrorCode.UPDATE_FAILED:
      return 'Impossible de mettre à jour le profil';
    default:
      return 'Une erreur inattendue est survenue';
  }
}

export class CompleteProfileServiceImpl implements CompleteProfileService {
  async completeProfile(data: CompleteProfileData): Promise<CompleteProfileResult> {
    const uid = data.uid?.trim();
    if (!uid) {
      return {
        success: false,
        error: {
          code: CompleteProfileErrorCode.USER_ID_REQUIRED,
          message: mapErrorMessage(CompleteProfileErrorCode.USER_ID_REQUIRED),
        },
      };
    }

    const phoneValidation = validatePhoneNumberForSupportedCountries(data.phoneNumber);
    if (!phoneValidation.isValid) {
      return {
        success: false,
        error: {
          code: CompleteProfileErrorCode.INVALID_PHONE,
          message: mapErrorMessage(CompleteProfileErrorCode.INVALID_PHONE),
        },
      };
    }

    const birthdate = parseBirthdate(data.birthdate);
    if (!birthdate.ok) {
      return {
        success: false,
        error: {
          code: birthdate.error,
          message: mapErrorMessage(birthdate.error),
        },
      };
    }

    if (!data.acceptTerms) {
      return {
        success: false,
        error: {
          code: CompleteProfileErrorCode.TERMS_NOT_ACCEPTED,
          message: mapErrorMessage(CompleteProfileErrorCode.TERMS_NOT_ACCEPTED),
        },
      };
    }

    if (data.accountType === 'Announcer' && !data.acceptAnnouncerTerms) {
      return {
        success: false,
        error: {
          code: CompleteProfileErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED,
          message: mapErrorMessage(CompleteProfileErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED),
        },
      };
    }

    const firstname = data.firstname.trim();
    const lastname = data.lastname.trim();
    const searchableName = `${firstname} ${lastname}`.trim();
    const roles: Role[] = data.accountType === 'Announcer'
      ? ['User', 'Announcer']
      : ['User'];

    try {
      const updatedUser = await userRepository.update(uid, {
        firstname,
        lastname,
        searchableName,
        phoneNumbers: [data.phoneNumber],
        phoneNumberVerified: false,
        birthDate: birthdate.value,
        roles,
        metadata: {
          ...(data.metadata ?? {}),
          needsProfileCompletion: false,
        },
      } as Partial<User>);

      logger.info('Complete profile succeeded', {
        uid,
        accountType: data.accountType,
        roles,
      });

      return {
        success: true,
        user: updatedUser,
      };
    } catch (error: unknown) {
      if (error instanceof RepositoryError) {
        const code = error.code === 'USER_NOT_FOUND'
          ? CompleteProfileErrorCode.USER_NOT_FOUND
          : CompleteProfileErrorCode.UPDATE_FAILED;

        logger.error('Complete profile failed with repository error', {
          uid,
          code: error.code,
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

      logger.error('Complete profile failed with unknown error', {
        uid,
        error,
      });

      return {
        success: false,
        error: {
          code: CompleteProfileErrorCode.UNKNOWN_ERROR,
          message: mapErrorMessage(CompleteProfileErrorCode.UNKNOWN_ERROR),
        },
      };
    }
  }
}

export const completeProfileService: CompleteProfileService = new CompleteProfileServiceImpl();
