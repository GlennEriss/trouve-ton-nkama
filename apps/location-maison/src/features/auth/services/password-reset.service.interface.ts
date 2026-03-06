export interface PasswordResetError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PasswordResetRequestResult {
  success: boolean;
  retryAfter?: number;
  error?: PasswordResetError;
}

export interface PasswordResetConfirmResult {
  success: boolean;
  error?: PasswordResetError;
}

export interface PasswordResetService {
  requestPasswordReset(email: string): Promise<PasswordResetRequestResult>;
  confirmPasswordReset(oobCode: string, newPassword: string): Promise<PasswordResetConfirmResult>;
}

export class PasswordResetServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'PasswordResetServiceError';
    Object.setPrototypeOf(this, PasswordResetServiceError.prototype);
  }
}

export enum PasswordResetRequestErrorCode {
  INVALID_EMAIL = 'INVALID_EMAIL',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_DISABLED = 'USER_DISABLED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum PasswordResetConfirmErrorCode {
  MISSING_OOB_CODE = 'MISSING_OOB_CODE',
  EXPIRED_OOB_CODE = 'EXPIRED_OOB_CODE',
  INVALID_OOB_CODE = 'INVALID_OOB_CODE',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  PASSWORD_RESET_FAILED = 'PASSWORD_RESET_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
