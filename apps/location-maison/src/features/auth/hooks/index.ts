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
