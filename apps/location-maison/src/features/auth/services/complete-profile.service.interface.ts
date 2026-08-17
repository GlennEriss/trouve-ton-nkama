import type { User } from '@/models/authentication';

export type CompleteProfileAccountType = 'User' | 'Announcer';

export interface CompleteProfileBirthdate {
  day: string;
  month: string;
  year: string;
}

export interface CompleteProfileData {
  uid: string;
  firstname: string;
  lastname: string;
  /** Nom d'affichage optionnel (nom de boutique). Vide = on affiche prénom + nom. */
  pseudo?: string;
  /** Numéro d'appel. */
  phoneNumber: string;
  /** Numéro WhatsApp quand il diffère du numéro d'appel. */
  whatsappNumber?: string;
  birthdate: CompleteProfileBirthdate;
  accountType: CompleteProfileAccountType;
  acceptTerms: boolean;
  acceptAnnouncerTerms?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CompleteProfileError {
  code: string;
  message: string;
}

export interface CompleteProfileResult {
  success: boolean;
  user?: User;
  error?: CompleteProfileError;
}

export interface CompleteProfileService {
  completeProfile(data: CompleteProfileData): Promise<CompleteProfileResult>;
}

export class CompleteProfileServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'CompleteProfileServiceError';
    Object.setPrototypeOf(this, CompleteProfileServiceError.prototype);
  }
}

export enum CompleteProfileErrorCode {
  USER_ID_REQUIRED = 'USER_ID_REQUIRED',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_WHATSAPP = 'INVALID_WHATSAPP',
  INVALID_BIRTHDATE = 'INVALID_BIRTHDATE',
  UNDERAGE = 'UNDERAGE',
  TERMS_NOT_ACCEPTED = 'TERMS_NOT_ACCEPTED',
  ANNOUNCER_TERMS_NOT_ACCEPTED = 'ANNOUNCER_TERMS_NOT_ACCEPTED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UPDATE_FAILED = 'UPDATE_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
