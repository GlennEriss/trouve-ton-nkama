/**
 * AuthService Interface
 * 
 * Defines the contract for authentication operations.
 */

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Nom d'affichage optionnel (nom de boutique). Vide = on affiche prénom + nom. */
  pseudo?: string;
  birthDate: string;
  /** Numéro d'appel : clé d'unicité du compte et premier élément de phoneNumbers. */
  phoneNumber: string;
  /** Numéro WhatsApp quand il diffère du numéro d'appel. */
  whatsappNumber?: string;
  country: string;
  acceptTerms: boolean;
  accountType?: 'User' | 'Announcer';
  announcerType?: 'INDIVIDUAL' | 'AGENCY' | 'BROKER' | 'AGENT';
  acceptAnnouncerTerms?: boolean;
}

export interface SignupResult {
  success: boolean;
  userId?: string;
  error?: SignupError;
}

export interface SignupError {
  code: string;
  message: string;
}

export interface AuthService {
  /**
   * Register a new user
   * @param data - Signup data
   * @returns Signup result with userId or error
   */
  signup(data: SignupData): Promise<SignupResult>;
}

/**
 * Custom error class for authentication operations
 */
export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'AuthServiceError';
    Object.setPrototypeOf(this, AuthServiceError.prototype);
  }
}

/**
 * Error codes for signup
 */
export enum SignupErrorCode {
  EMAIL_ALREADY_IN_USE = 'EMAIL_ALREADY_IN_USE',
  PHONE_ALREADY_IN_USE = 'PHONE_ALREADY_IN_USE',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  TERMS_NOT_ACCEPTED = 'TERMS_NOT_ACCEPTED',
  ANNOUNCER_TERMS_NOT_ACCEPTED = 'ANNOUNCER_TERMS_NOT_ACCEPTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
