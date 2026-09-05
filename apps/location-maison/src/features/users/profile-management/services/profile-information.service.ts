import { countries } from '@/constantes/country';
import { userRepository } from '@/features/auth/repositories/user.repository';
import { RepositoryError } from '@/features/auth/repositories/user.repository.interface';
import { createLogger } from '@/lib/logger';
import { validatePhoneNumberForSupportedCountries } from '@/lib/phoneValidation';
import { PHONE_NUMBER_CHANGE_LOCK_DAYS } from '@/lib/phoneVerificationPolicy';
import { dispatchAccountActivityFromClient } from '@/features/users/account-activity-notifications/services/account-activity.client.service';
import {
  ProfileInformationErrorCode,
  type ProfileInformationService,
  type SocialNetworkKey,
  type SocialProfilesInput,
  type UpdateProfileInformationData,
  type UpdateProfileInformationResult,
} from './profile-information.service.interface';

const logger = createLogger('users.profile-information-service');
const SOCIAL_NETWORK_KEYS: SocialNetworkKey[] = ['facebook', 'instagram', 'tiktok', 'linkedin', 'x'];

function parseDateLike(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'object' && value !== null) {
    const seconds = (value as { seconds?: unknown }).seconds;
    const nanoseconds = (value as { nanoseconds?: unknown }).nanoseconds;
    if (typeof seconds === 'number') {
      const ms = seconds * 1000 + (typeof nanoseconds === 'number' ? nanoseconds / 1_000_000 : 0);
      const parsed = new Date(ms);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
}

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
    case ProfileInformationErrorCode.PHONE_CHANGE_LOCKED:
      return `Ce numéro vérifié ne peut pas être modifié pour le moment (délai de ${PHONE_NUMBER_CHANGE_LOCK_DAYS} jours).`;
    case ProfileInformationErrorCode.USER_NOT_FOUND:
      return 'Utilisateur introuvable.';
    case ProfileInformationErrorCode.UPDATE_FAILED:
      return "La mise à jour du profil a échoué.";
    default:
      return 'Une erreur inattendue est survenue.';
  }
}

type NormalizedSocialProfile = {
  url: string | null;
  handle: string | null;
};

type NormalizedSocialProfiles = Record<SocialNetworkKey, NormalizedSocialProfile | null>;

function normalizeSocialUrl(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeSocialHandle(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, '');
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  return /^@[A-Za-z0-9._-]{2,50}$/.test(normalized) ? normalized : null;
}

// Le formulaire ne demande plus que le "@" (voir ProfileInformationFormModern.tsx —
// beaucoup d'annonceurs remplissaient le handle sans le lien, laissant leur profil
// inexploitable côté admin). TikTok inclut le "@" dans le chemin de l'URL, pas les autres.
const SOCIAL_NETWORK_BASE_URL: Record<SocialNetworkKey, string> = {
  facebook: 'https://facebook.com/',
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@',
  linkedin: 'https://linkedin.com/in/',
  x: 'https://x.com/',
};

function buildSocialProfileUrl(network: SocialNetworkKey, handle: string): string {
  const username = handle.replace(/^@+/, '');
  return `${SOCIAL_NETWORK_BASE_URL[network]}${username}`;
}

function extractSocialProfiles(metadata: Record<string, unknown>): NormalizedSocialProfiles {
  const rawContainer = metadata.socialProfiles;
  const rawProfiles =
    rawContainer && typeof rawContainer === 'object' && !Array.isArray(rawContainer)
      ? (rawContainer as Record<string, unknown>)
      : {};

  return SOCIAL_NETWORK_KEYS.reduce((acc, key) => {
    const rawEntry =
      rawProfiles[key] &&
      typeof rawProfiles[key] === 'object' &&
      !Array.isArray(rawProfiles[key])
        ? (rawProfiles[key] as Record<string, unknown>)
        : null;

    if (!rawEntry) {
      acc[key] = null;
      return acc;
    }

    const url = normalizeSocialUrl(rawEntry.url);
    const handle = normalizeSocialHandle(rawEntry.handle);
    acc[key] = url || handle ? { url, handle } : null;
    return acc;
  }, {} as NormalizedSocialProfiles);
}

function normalizeSocialProfilesInput(
  input: SocialProfilesInput | undefined,
  fallback: NormalizedSocialProfiles,
): NormalizedSocialProfiles {
  const next = { ...fallback };
  if (!input || typeof input !== 'object') {
    return next;
  }

  for (const key of SOCIAL_NETWORK_KEYS) {
    const candidate = input[key];
    if (candidate === undefined) {
      continue;
    }
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      next[key] = null;
      continue;
    }

    const handle = normalizeSocialHandle(candidate.handle);
    // `url` explicite gardé en priorité (compat : anciennes entrées, ou un lien personnalisé
    // saisi par une intégration externe) ; sinon dérivé du handle pour que l'utilisateur n'ait
    // plus qu'un seul champ à remplir.
    const url = normalizeSocialUrl(candidate.url) ?? (handle ? buildSocialProfileUrl(key, handle) : null);
    next[key] = url || handle ? { url, handle } : null;
  }

  return next;
}

function areSocialProfilesEqual(a: NormalizedSocialProfiles, b: NormalizedSocialProfiles) {
  return SOCIAL_NETWORK_KEYS.every((key) => {
    const left = a[key];
    const right = b[key];
    if (!left && !right) {
      return true;
    }
    if (!left || !right) {
      return false;
    }
    return left.url === right.url && left.handle === right.handle;
  });
}

function buildMetadataWithSocialProfiles(
  metadata: Record<string, unknown>,
  socialProfiles: NormalizedSocialProfiles,
) {
  const hasAny = SOCIAL_NETWORK_KEYS.some((key) => Boolean(socialProfiles[key]));
  if (!hasAny) {
    const { socialProfiles: _socialProfiles, ...rest } = metadata;
    return rest;
  }

  const nextSocialProfiles = SOCIAL_NETWORK_KEYS.reduce<Record<string, { url?: string; handle?: string }>>(
    (acc, key) => {
      const profile = socialProfiles[key];
      if (!profile) {
        return acc;
      }
      acc[key] = {
        ...(profile.url ? { url: profile.url } : {}),
        ...(profile.handle ? { handle: profile.handle } : {}),
      };
      return acc;
    },
    {},
  );

  return {
    ...metadata,
    socialProfiles: nextSocialProfiles,
  };
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

    const pseudo = (data.pseudo ?? '').trim();

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
      const changedFields: string[] = [];

      if (currentUser.firstname !== firstname) {
        changedFields.push('prénom');
      }
      if (currentUser.lastname !== lastname) {
        changedFields.push('nom');
      }
      if ((currentUser.pseudo ?? '') !== pseudo) {
        changedFields.push('pseudo');
      }
      if ((currentUser.birthDate ?? '') !== birthDate) {
        changedFields.push('date de naissance');
      }
      if ((currentUser.country?.code ?? '') !== country.code) {
        changedFields.push('pays');
      }
      if (phoneChanged) {
        changedFields.push('numéro de téléphone');
      }
      const currentMetadata =
        currentUser.metadata && typeof currentUser.metadata === 'object'
          ? (currentUser.metadata as Record<string, unknown>)
          : {};
      const isAnnouncer = Array.isArray(currentUser.roles)
        ? currentUser.roles.some((role) => typeof role === 'string' && role.toLowerCase() === 'announcer')
        : false;
      const currentSocialProfiles = extractSocialProfiles(currentMetadata);
      const nextSocialProfiles = isAnnouncer
        ? normalizeSocialProfilesInput(data.socialProfiles, currentSocialProfiles)
        : currentSocialProfiles;
      const currentPhoneVerificationMetadata =
        currentMetadata.phoneVerification &&
        typeof currentMetadata.phoneVerification === 'object'
          ? (currentMetadata.phoneVerification as Record<string, unknown>)
          : {};
      const lockUntil = parseDateLike(currentPhoneVerificationMetadata.lockUntil);
      const now = new Date();

      if (phoneChanged && currentUser.phoneNumberVerified && lockUntil && lockUntil.getTime() > now.getTime()) {
        return {
          success: false,
          error: {
            code: ProfileInformationErrorCode.PHONE_CHANGE_LOCKED,
            message: `Numéro vérifié verrouillé jusqu'au ${lockUntil.toLocaleDateString(
              'fr-FR'
            )}. Vous pourrez le modifier après cette date.`,
          },
        };
      }

      const nextMetadata = phoneChanged
        ? {
          ...currentMetadata,
          phoneVerification: {
            ...currentPhoneVerificationMetadata,
            lockUntil: null,
            phoneChangedAt: now.toISOString(),
          },
        }
        : currentMetadata;
      const finalMetadata = isAnnouncer
        ? buildMetadataWithSocialProfiles(nextMetadata, nextSocialProfiles)
        : nextMetadata;

      if (isAnnouncer && !areSocialProfilesEqual(currentSocialProfiles, nextSocialProfiles)) {
        changedFields.push('réseaux sociaux');
      }

      const updatedUser = await userRepository.update(uid, {
        firstname,
        lastname,
        pseudo,
        birthDate,
        phoneNumbers: [phoneNumber],
        country: {
          code: country.code,
          name: country.name,
        },
        searchableName: `${firstname} ${lastname}`.trim(),
        phoneNumberVerified: phoneChanged ? false : currentUser.phoneNumberVerified,
        metadata: finalMetadata,
      });

      logger.info('Profile information updated', {
        uid,
        phoneChanged,
        changedFields,
        countryCode: data.countryCode,
      });

      const sourceContext = {
        source: 'profile.informations',
        actionUrl: '/profil/informations',
      } as const;

      if (phoneChanged) {
        dispatchAccountActivityFromClient({
          eventType: 'ACCOUNT_PHONE_CHANGED',
          eventId: `phone-change:${uid}:${Date.now()}`,
          context: sourceContext,
        }).catch((error) => {
          logger.warn('Account activity dispatch failed after phone change', {
            uid,
            error,
          });
        });
      }

      if (changedFields.length > 0) {
        dispatchAccountActivityFromClient({
          eventType: 'ACCOUNT_PROFILE_UPDATED',
          eventId: `profile-update:${uid}:${Date.now()}`,
          context: {
            ...sourceContext,
            changedFields,
          },
        }).catch((error) => {
          logger.warn('Account activity dispatch failed after profile update', {
            uid,
            changedFields,
            error,
          });
        });
      }

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
