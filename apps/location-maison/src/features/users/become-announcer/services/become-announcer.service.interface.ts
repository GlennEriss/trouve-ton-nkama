import type { Role } from '@/models/authentication';

export enum BecomeAnnouncerErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN_ROLE_STATE = 'FORBIDDEN_ROLE_STATE',
  ANNOUNCER_TERMS_REQUIRED = 'ANNOUNCER_TERMS_REQUIRED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PERSISTENCE_ERROR = 'PERSISTENCE_ERROR',
  SESSION_SYNC_ERROR = 'SESSION_SYNC_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export type BecomeAnnouncerSuccessCode =
  | 'BECOME_ANNOUNCER_SUCCESS'
  | 'ALREADY_ANNOUNCER';

export type BecomeAnnouncerData = {
  acceptAnnouncerTerms: boolean;
  source?: string;
};

export type BecomeAnnouncerError = {
  code: BecomeAnnouncerErrorCode | string;
  message: string;
};

export type BecomeAnnouncerResult = {
  success: boolean;
  code?: BecomeAnnouncerSuccessCode;
  roles?: Role[];
  metadata?: Record<string, unknown>;
  error?: BecomeAnnouncerError;
};

export interface BecomeAnnouncerService {
  becomeAnnouncer(data: BecomeAnnouncerData): Promise<BecomeAnnouncerResult>;
}
