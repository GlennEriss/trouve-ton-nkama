import type { ConfirmationResult } from '@/firebase/auth';
import type { User } from '@/models/authentication';

export enum PhoneVerificationErrorCode {
  USER_ID_REQUIRED = 'USER_ID_REQUIRED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PHONE_REQUIRED = 'PHONE_REQUIRED',
  INVALID_PHONE = 'INVALID_PHONE',
  RECAPTCHA_REQUIRED = 'RECAPTCHA_REQUIRED',
  OTP_REQUIRED = 'OTP_REQUIRED',
  OTP_SEND_FAILED = 'OTP_SEND_FAILED',
  OTP_INVALID = 'OTP_INVALID',
  OTP_EXPIRED = 'OTP_EXPIRED',
  PHONE_PROVIDER_DISABLED = 'PHONE_PROVIDER_DISABLED',
  SESSION_SYNC_FAILED = 'SESSION_SYNC_FAILED',
  PERSISTENCE_FAILED = 'PERSISTENCE_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export type PhoneVerificationError = {
  code: PhoneVerificationErrorCode;
  message: string;
};

export type GetPhoneVerificationStatusResult = {
  success: boolean;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  user?: User;
  error?: PhoneVerificationError;
};

export type SendPhoneOtpData = {
  phoneNumber: string;
  recaptchaVerifier: unknown;
};

export type SendPhoneOtpResult = {
  success: boolean;
  confirmationResult?: ConfirmationResult;
  error?: PhoneVerificationError;
};

export type ConfirmPhoneOtpData = {
  uid: string;
  otpCode: string;
  phoneNumber: string;
  confirmationResult: ConfirmationResult;
};

export type ConfirmPhoneOtpResult = {
  success: boolean;
  user?: User;
  isPhoneChanged?: boolean;
  error?: PhoneVerificationError;
};

export interface PhoneVerificationService {
  getPhoneVerificationStatus(uid: string): Promise<GetPhoneVerificationStatusResult>;
  sendPhoneOtp(data: SendPhoneOtpData): Promise<SendPhoneOtpResult>;
  confirmPhoneOtp(data: ConfirmPhoneOtpData): Promise<ConfirmPhoneOtpResult>;
}
