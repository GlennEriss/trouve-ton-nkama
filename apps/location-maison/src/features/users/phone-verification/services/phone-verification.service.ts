import { userRepository } from '@/features/auth/repositories/user.repository';
import { RepositoryError } from '@/features/auth/repositories/user.repository.interface';
import {
  auth,
  linkWithPhoneNumber,
  signInWithCustomToken,
  signInWithPhoneNumber,
  signOut,
} from '@/firebase/auth';
import { createLogger } from '@/lib/logger';
import { validatePhoneNumberForSupportedCountries } from '@/lib/phoneValidation';
import { PHONE_NUMBER_CHANGE_LOCK_MS } from '@/lib/phoneVerificationPolicy';
import {
  PhoneVerificationErrorCode,
  type ConfirmPhoneOtpData,
  type ConfirmPhoneOtpResult,
  type GetPhoneVerificationStatusResult,
  type PhoneVerificationError,
  type PhoneVerificationService,
  type SendPhoneOtpData,
  type SendPhoneOtpResult,
} from './phone-verification.service.interface';

const logger = createLogger('users.phone-verification.service');

function buildError(
  code: PhoneVerificationErrorCode,
  message: string
): PhoneVerificationError {
  return { code, message };
}

function mapOtpError(error: unknown): PhoneVerificationError {
  const code = (error as { code?: string })?.code;

  if (code === 'auth/operation-not-allowed') {
    return buildError(
      PhoneVerificationErrorCode.PHONE_PROVIDER_DISABLED,
      "Le provider téléphone n'est pas activé dans Firebase."
    );
  }
  if (code === 'auth/invalid-phone-number') {
    return buildError(
      PhoneVerificationErrorCode.INVALID_PHONE,
      'Le numéro de téléphone est invalide.'
    );
  }
  if (code === 'auth/invalid-app-credential') {
    return buildError(
      PhoneVerificationErrorCode.RECAPTCHA_REQUIRED,
      "Validation reCAPTCHA invalide. En Web Phone Auth Firebase, localhost n'est pas un domaine d'hébergement supporté pour SMS réels: utilisez un domaine HTTPS (preprod/prod/tunnel) ou des numéros fictifs de test."
    );
  }
  if (code === 'auth/captcha-check-failed') {
    return buildError(
      PhoneVerificationErrorCode.RECAPTCHA_REQUIRED,
      "Échec de vérification reCAPTCHA. Résolvez le challenge puis réessayez."
    );
  }
  if (code === 'auth/unauthorized-domain' || code === 'auth/app-not-authorized') {
    return buildError(
      PhoneVerificationErrorCode.RECAPTCHA_REQUIRED,
      "Domaine non autorisé pour Firebase Auth. Ajoutez ce domaine dans Authentication > Settings > Authorized domains."
    );
  }
  if (code === 'auth/quota-exceeded' || code === 'auth/too-many-requests') {
    return buildError(
      PhoneVerificationErrorCode.OTP_SEND_FAILED,
      "Quota SMS atteint ou trop de tentatives. Réessayez plus tard."
    );
  }
  if (code === 'auth/invalid-verification-code') {
    return buildError(
      PhoneVerificationErrorCode.OTP_INVALID,
      'Le code OTP saisi est invalide.'
    );
  }
  if (code === 'auth/code-expired') {
    return buildError(
      PhoneVerificationErrorCode.OTP_EXPIRED,
      'Le code OTP a expiré. Veuillez demander un nouveau code.'
    );
  }

  return buildError(
    PhoneVerificationErrorCode.OTP_SEND_FAILED,
    "Impossible d'envoyer le code OTP pour le moment."
  );
}

export class PhoneVerificationServiceImpl implements PhoneVerificationService {
  async getPhoneVerificationStatus(uid: string): Promise<GetPhoneVerificationStatusResult> {
    const trimmedUid = uid.trim();
    if (!trimmedUid) {
      return {
        success: false,
        error: buildError(
          PhoneVerificationErrorCode.USER_ID_REQUIRED,
          "L'identifiant utilisateur est requis."
        ),
      };
    }

    try {
      const user = await userRepository.findById(trimmedUid);
      if (!user) {
        return {
          success: false,
          error: buildError(
            PhoneVerificationErrorCode.USER_NOT_FOUND,
            'Utilisateur introuvable.'
          ),
        };
      }

      return {
        success: true,
        phoneNumber: user.phoneNumbers?.[0] ?? '',
        phoneNumberVerified: Boolean(user.phoneNumberVerified),
        user,
      };
    } catch (error) {
      logger.error('Failed to fetch phone verification status', {
        uid: trimmedUid,
        error,
      });
      return {
        success: false,
        error: buildError(
          PhoneVerificationErrorCode.UNKNOWN_ERROR,
          "Impossible de récupérer le statut de vérification."
        ),
      };
    }
  }

  async sendPhoneOtp(data: SendPhoneOtpData): Promise<SendPhoneOtpResult> {
    const phoneNumber = data.phoneNumber.trim();
    if (!phoneNumber) {
      return {
        success: false,
        error: buildError(
          PhoneVerificationErrorCode.PHONE_REQUIRED,
          'Le numéro de téléphone est requis.'
        ),
      };
    }

    const validation = validatePhoneNumberForSupportedCountries(phoneNumber);
    if (!validation.isValid) {
      return {
        success: false,
        error: buildError(
          PhoneVerificationErrorCode.INVALID_PHONE,
          validation.message || 'Le numéro de téléphone est invalide.'
        ),
      };
    }

    if (!data.recaptchaVerifier) {
      return {
        success: false,
        error: buildError(
          PhoneVerificationErrorCode.RECAPTCHA_REQUIRED,
          'La validation de sécurité reCAPTCHA est requise.'
        ),
      };
    }

    try {
      // Compte deja connecte: on lie le provider phone a ce compte.
      // Fallback: si aucun user Firebase actif, on garde signInWithPhoneNumber.
      const activeFirebaseUser = auth.currentUser;
      const confirmationResult = activeFirebaseUser
        ? await linkWithPhoneNumber(activeFirebaseUser, phoneNumber, data.recaptchaVerifier as any)
        : await signInWithPhoneNumber(auth, phoneNumber, data.recaptchaVerifier as any);

      logger.info('Phone OTP sent', {
        phoneNumber,
        strategy: activeFirebaseUser ? 'link' : 'signin-fallback',
      });

      return {
        success: true,
        confirmationResult,
      };
    } catch (error) {
      const mappedError = mapOtpError(error);
      logger.error('Phone OTP send failed', {
        phoneNumber,
        error,
        mappedCode: mappedError.code,
      });
      return {
        success: false,
        error: mappedError,
      };
    }
  }

  async confirmPhoneOtp(data: ConfirmPhoneOtpData): Promise<ConfirmPhoneOtpResult> {
    const uid = data.uid.trim();
    if (!uid) {
      return {
        success: false,
        error: buildError(
          PhoneVerificationErrorCode.USER_ID_REQUIRED,
          "L'identifiant utilisateur est requis."
        ),
      };
    }

    const phoneNumber = data.phoneNumber.trim();
    if (!phoneNumber) {
      return {
        success: false,
        error: buildError(
          PhoneVerificationErrorCode.PHONE_REQUIRED,
          'Le numéro de téléphone est requis.'
        ),
      };
    }

    const otpCode = data.otpCode.trim();
    if (!otpCode) {
      return {
        success: false,
        error: buildError(
          PhoneVerificationErrorCode.OTP_REQUIRED,
          'Le code OTP est requis.'
        ),
      };
    }

    try {
      await data.confirmationResult.confirm(otpCode);
    } catch (error) {
      const mappedOtpError = mapOtpError(error);
      logger.error('Phone OTP confirmation failed', {
        uid,
        phoneNumber,
        error,
        mappedCode: mappedOtpError.code,
      });
      return {
        success: false,
        error: mappedOtpError.code === PhoneVerificationErrorCode.OTP_SEND_FAILED
          ? buildError(
            PhoneVerificationErrorCode.OTP_INVALID,
            'Le code OTP est invalide ou expiré.'
          )
          : mappedOtpError,
      };
    }

    const currentFirebaseUid = auth.currentUser?.uid ?? null;
    const requiresSessionRecovery = currentFirebaseUid !== uid;

    if (requiresSessionRecovery) {
      try {
        await signOut(auth);
      } catch (error) {
        logger.warn('Temporary Firebase phone session signOut failed', {
          uid,
          error,
        });
      }

      try {
        const tokenResponse = await fetch('/api/generate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid }),
        });

        if (!tokenResponse.ok) {
          logger.error('Custom token generation failed', {
            uid,
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
          });
          return {
            success: false,
            error: buildError(
              PhoneVerificationErrorCode.SESSION_SYNC_FAILED,
              'La reconnexion technique a échoué. Veuillez réessayer.'
            ),
          };
        }

        const tokenBody = (await tokenResponse.json()) as { token?: string };
        if (!tokenBody.token) {
          return {
            success: false,
            error: buildError(
              PhoneVerificationErrorCode.SESSION_SYNC_FAILED,
              'Token de session manquant.'
            ),
          };
        }

        await signInWithCustomToken(auth, tokenBody.token);
      } catch (error) {
        logger.error('Session sync after phone OTP failed', {
          uid,
          error,
        });
        return {
          success: false,
          error: buildError(
            PhoneVerificationErrorCode.SESSION_SYNC_FAILED,
            'Impossible de synchroniser la session utilisateur.'
          ),
        };
      }
    } else {
      logger.info('Phone OTP confirmed with linked Firebase user', {
        uid,
      });
    }

    try {
      const currentUser = await userRepository.findById(uid);
      if (!currentUser) {
        return {
          success: false,
          error: buildError(
            PhoneVerificationErrorCode.USER_NOT_FOUND,
            'Utilisateur introuvable.'
          ),
        };
      }

      const previousPhone = currentUser.phoneNumbers?.[0] ?? '';
      const isPhoneChanged = previousPhone !== phoneNumber;
      const now = new Date();
      const lockUntil = new Date(now.getTime() + PHONE_NUMBER_CHANGE_LOCK_MS);
      const currentMetadata =
        currentUser.metadata && typeof currentUser.metadata === 'object'
          ? (currentUser.metadata as Record<string, unknown>)
          : {};
      const currentPhoneVerificationMetadata =
        currentMetadata.phoneVerification &&
        typeof currentMetadata.phoneVerification === 'object'
          ? (currentMetadata.phoneVerification as Record<string, unknown>)
          : {};
      const nextMetadata = {
        ...currentMetadata,
        phoneVerification: {
          ...currentPhoneVerificationMetadata,
          verifiedAt: now.toISOString(),
          lockUntil: lockUntil.toISOString(),
          lastVerifiedPhoneNumber: phoneNumber,
        },
      };

      const updatedUser = await userRepository.update(uid, {
        phoneNumbers: [phoneNumber],
        phoneNumberVerified: true,
        metadata: nextMetadata,
      });

      logger.info('Phone verification persisted', {
        uid,
        phoneNumber,
        isPhoneChanged,
        lockUntil: lockUntil.toISOString(),
      });

      return {
        success: true,
        user: updatedUser,
        isPhoneChanged,
      };
    } catch (error) {
      const repositoryCode = (error as RepositoryError)?.code;
      logger.error('Phone verification persistence failed', {
        uid,
        phoneNumber,
        repositoryCode,
        error,
      });
      return {
        success: false,
        error: buildError(
          PhoneVerificationErrorCode.PERSISTENCE_FAILED,
          "La mise à jour du statut de vérification a échoué."
        ),
      };
    }
  }
}

export const phoneVerificationService: PhoneVerificationService =
  new PhoneVerificationServiceImpl();
