/**
 * Auth Hooks
 * 
 * Exports all authentication-related hooks.
 */

export { useSignup, type UseSignupReturn, type UseSignupState } from './useSignup';
export { useSignin, mapSigninError, type SigninCredentials, type SigninError, type SigninResult, type UseSigninReturn } from './useSignin';
export { useAuthSession, type UseAuthSessionReturn, type AuthSessionState } from './useAuthSession';
export {
  useCompleteProfile,
  mapCompleteProfileError,
  type CompleteProfileUiError,
  type UseCompleteProfileReturn,
} from './useCompleteProfile';
export {
  usePasswordResetRequest,
  mapPasswordResetRequestError,
  type PasswordResetUiError,
  type UsePasswordResetRequestReturn,
} from './usePasswordResetRequest';
export {
  usePasswordReset,
  mapPasswordResetConfirmError,
  type UsePasswordResetReturn,
} from './usePasswordReset';
export {
  usePhoneOtpAuth,
  type UsePhoneOtpAuthReturn,
  type PhoneOtpStep,
} from './usePhoneOtpAuth';
export { useSignOut, type UseSignOutReturn } from './useSignOut';
