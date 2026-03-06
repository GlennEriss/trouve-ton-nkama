/**
 * AuthService Implementation
 * 
 * Service layer for authentication operations.
 * Handles business logic for user registration.
 */

import { AuthService, SignupData, SignupResult, SignupError, SignupErrorCode, AuthServiceError } from './auth.service.interface';
import { userRepository } from '../repositories/user.repository';
import { createUserWithEmailAndPassword, signOut, auth } from '@/firebase/auth';
import { Role, User } from '@/models/authentication';
import { Country } from '@/models/compte';
import { Timestamp } from 'firebase/firestore';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth.service');

export class AuthServiceImpl implements AuthService {
  /**
   * Register a new user
   */
  async signup(data: SignupData): Promise<SignupResult> {
    try {
      // 1. Validate terms acceptance
      if (!data.acceptTerms) {
        return {
          success: false,
          error: {
            code: SignupErrorCode.TERMS_NOT_ACCEPTED,
            message: 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité',
          },
        };
      }

      // 2. Validate announcer terms if creating announcer account
      if (data.accountType === 'Announcer' && !data.acceptAnnouncerTerms) {
        return {
          success: false,
          error: {
            code: SignupErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED,
            message: 'Vous devez accepter les conditions d\'annonceur',
          },
        };
      }

      // 3. Check phone number uniqueness
      try {
        const existingUserByPhone = await userRepository.findByPhoneNumber(data.phoneNumber);
        if (existingUserByPhone) {
          return {
            success: false,
            error: {
              code: SignupErrorCode.PHONE_ALREADY_IN_USE,
              message: 'Ce numéro de téléphone est déjà utilisé',
            },
          };
        }
      } catch (error) {
        logger.warn('Phone uniqueness check failed', {
          phoneNumber: data.phoneNumber,
          error,
        });
        // Repository error - treat as network error
        return {
          success: false,
          error: {
            code: SignupErrorCode.NETWORK_ERROR,
            message: 'Erreur lors du contrôle du numéro de téléphone',
          },
        };
      }

      // 4. Check email uniqueness
      try {
        const existingUserByEmail = await userRepository.findByEmail(data.email);
        if (existingUserByEmail) {
          return {
            success: false,
            error: {
              code: SignupErrorCode.EMAIL_ALREADY_IN_USE,
              message: 'Cette adresse email est déjà utilisée',
            },
          };
        }
      } catch (error) {
        logger.warn('Email uniqueness check failed', {
          email: data.email,
          error,
        });
        // Repository error - treat as network error
        return {
          success: false,
          error: {
            code: SignupErrorCode.NETWORK_ERROR,
            message: 'Erreur lors de la vérification de l\'email',
          },
        };
      }

      // 5. Create Firebase Auth account
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.password
        );
      } catch (error: any) {
        logger.warn('Firebase Auth account creation failed', {
          email: data.email,
          code: error?.code,
          error,
        });
        // Map Firebase Auth errors to SignupError
        return {
          success: false,
          error: this.mapFirebaseError(error),
        };
      }

      const uid = userCredential.user.uid;

      // 6. Transform signup data to User entity
      const user = this.transformToUser(data, uid);

      // 7. Create user in Firestore
      try {
        await userRepository.create(user);
      } catch (error) {
        logger.error('Failed to create user in repository after auth creation', {
          uid,
          email: data.email,
          error,
        });
        // Rollback: Delete Firebase Auth account
        try {
          await signOut(auth);
          // Note: In production, we should use Firebase Admin SDK to delete the user
          // For now, we just sign out (the user will need to be cleaned up manually)
        } catch (rollbackError) {
          logger.error('Failed to rollback Firebase Auth account', {
            uid,
            rollbackError,
          });
        }

        return {
          success: false,
          error: {
            code: SignupErrorCode.NETWORK_ERROR,
            message: 'Erreur lors de la création du compte. Veuillez réessayer.',
          },
        };
      }

      // 8. Send verification email (non-blocking, in background)
      // Use UID instead of email for more reliable user identification
      this.sendVerificationEmail(uid).catch((error) => {
        // Log but don't fail the signup
        logger.warn('Failed to send verification email', {
          uid,
          error,
        });
      });

      return {
        success: true,
        userId: uid,
      };
    } catch (error) {
      // Unexpected error
      logger.error('Unexpected signup error', {
        email: data.email,
        error,
      });
      return {
        success: false,
        error: {
          code: SignupErrorCode.UNKNOWN_ERROR,
          message: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
        },
      };
    }
  }

  /**
   * Transform SignupData to User entity
   */
  private transformToUser(data: SignupData, uid: string): User {
    const country: Country = {
      code: data.country as any,
      name: this.getCountryName(data.country),
    };

    const now = Timestamp.now();

    // Business rule:
    // - User account => ['User']
    // - Announcer account => ['User', 'Announcer']
    const roles: Role[] = data.accountType === 'Announcer'
      ? ['User', 'Announcer']
      : ['User'];

    return {
      uid,
      login: data.email,
      firstname: data.firstName,
      lastname: data.lastName,
      birthDate: data.birthDate,
      email: data.email,
      country,
      phoneNumbers: [data.phoneNumber],
      roles,
      emailVerified: false,
      providers: ['CREDENTIALS'],
      metadata: {}, // Required by User type
      favoris: [],
      credits: 3, // Welcome credits (will be migrated to CreditWallet later)
      state: 'IN_PROGRESS',
      createdAt: now,
      updatedAt: now,
    } as User;
  }

  /**
   * Map Firebase Auth errors to SignupError
   */
  private mapFirebaseError(error: any): SignupError {
    const code = error?.code || '';

    if (code === 'auth/weak-password') {
      return {
        code: SignupErrorCode.WEAK_PASSWORD,
        message: 'Le mot de passe est trop faible. Il doit contenir au moins 8 caractères, une majuscule et un chiffre.',
      };
    }

    if (code === 'auth/invalid-email') {
      return {
        code: SignupErrorCode.INVALID_EMAIL,
        message: 'L\'adresse email n\'est pas valide',
      };
    }

    if (code === 'auth/email-already-in-use') {
      return {
        code: SignupErrorCode.EMAIL_ALREADY_IN_USE,
        message: 'Cette adresse email est déjà utilisée',
      };
    }

    // Default network error
    return {
      code: SignupErrorCode.NETWORK_ERROR,
      message: 'Erreur de connexion. Veuillez réessayer.',
    };
  }

  /**
   * Send verification email (non-blocking)
   * 
   * Utilise la route API Next.js same-origin pour éviter les problèmes CORS
   * (notamment sur mobile / LAN en dev) et centraliser la logique d'envoi.
   * 
   * @param uidOrEmail - User UID (preferred) or email address
   */
  private async sendVerificationEmail(uidOrEmail: string): Promise<void> {
    try {
      // Determine if it's a UID (typically longer and doesn't contain @) or email
      const isUid = !uidOrEmail.includes('@');

      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          isUid 
            ? { uid: uidOrEmail }
            : { email: uidOrEmail }
        ),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.warn('Verification email endpoint responded with non-OK status', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(
          `Failed to send verification email: ${response.statusText}. ${errorData.error || ''}`
        );
      }
    } catch (error) {
      logger.warn('Verification email send operation failed', {
        uidOrEmail,
        error,
      });
      // Re-throw to be caught by caller
      throw error;
    }
  }

  /**
   * Get country name from code
   */
  private getCountryName(code: string): string {
    const countries: Record<string, string> = {
      GA: 'Gabon',
      FR: 'France',
      // Add more as needed
    };
    return countries[code] || code;
  }
}

// Export singleton instance
export const authService: AuthService = new AuthServiceImpl();
