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
  birthDate: string;
  phoneNumber: string;
  country: string;
  acceptTerms: boolean;
  accountType?: 'User' | 'Announcer';
  announcerType?: 'INDIVIDUAL' | 'AGENCY' | 'BROKER' | 'AGENT';
  acceptAnnouncerTerms?: boolean;
  phoneVerificationCode?: string;
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
  PHONE_VERIFICATION_REQUIRED = 'PHONE_VERIFICATION_REQUIRED',
  PHONE_VERIFICATION_FAILED = 'PHONE_VERIFICATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

