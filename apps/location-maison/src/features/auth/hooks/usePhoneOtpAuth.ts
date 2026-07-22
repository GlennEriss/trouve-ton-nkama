'use client';

/**
 * usePhoneOtpAuth — passwordless phone (OTP) login/signup flow.
 *
 * Wraps Firebase Phone Auth for a NON-logged-in visitor: send an SMS code,
 * confirm it, then bridge the resulting Firebase ID token into the NextAuth
 * `phone` provider (see auth.config.ts + phone-auth.service.ts). The reCAPTCHA
 * verifier is created lazily (on first send) so nothing touches Firebase on
 * mount — safe for SSR and for forms that render the trigger button but never
 * open the flow.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

import { createLogger } from '@/lib/logger';
import {
  normalizePhoneNumberForFirebase,
  validatePhoneNumberForSupportedCountries,
} from '@/lib/phoneValidation';

const logger = createLogger('auth.use-phone-otp-auth');
const RECAPTCHA_CONTAINER_ID = 'phone-otp-recaptcha';

export type PhoneOtpStep = 'phone' | 'otp';

export type UsePhoneOtpAuthReturn = {
  step: PhoneOtpStep;
  phone: string;
  isSending: boolean;
  isVerifying: boolean;
  error: string | null;
  sendOtp: (rawPhone: string) => Promise<boolean>;
  verifyOtp: (otpCode: string) => Promise<boolean>;
  reset: () => void;
};

export function usePhoneOtpAuth(options?: {
  onAuthenticated?: () => void;
}): UsePhoneOtpAuthReturn {
  const [step, setStep] = useState<PhoneOtpStep>('phone');
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const clearVerifier = useCallback(() => {
    if (verifierRef.current) {
      try {
        verifierRef.current.clear();
      } catch (err) {
        logger.warn('reCAPTCHA cleanup failed', { err });
      }
      verifierRef.current = null;
    }
  }, []);

  useEffect(() => clearVerifier, [clearVerifier]);

  const ensureVerifier = useCallback(async (): Promise<RecaptchaVerifier> => {
    if (verifierRef.current) {
      return verifierRef.current;
    }
    // Loaded lazily so the Firebase SDK isn't pulled in (nor `getAuth` run) until
    // the visitor actually starts the phone flow — keeps auth pages light and SSR/
    // test-safe.
    const { auth, RecaptchaVerifier } = await import('@/firebase/auth');
    if (!document.getElementById(RECAPTCHA_CONTAINER_ID)) {
      const container = document.createElement('div');
      container.id = RECAPTCHA_CONTAINER_ID;
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, { size: 'invisible' });
    await verifier.render();
    verifierRef.current = verifier;
    return verifier;
  }, []);

  const sendOtp = useCallback(
    async (rawPhone: string): Promise<boolean> => {
      setError(null);

      const validation = validatePhoneNumberForSupportedCountries(rawPhone);
      if (!validation.isValid) {
        setError(validation.message || 'Numéro de téléphone invalide.');
        return false;
      }

      const e164 = normalizePhoneNumberForFirebase(rawPhone);
      setIsSending(true);
      try {
        const { auth, signInWithPhoneNumber } = await import('@/firebase/auth');
        const verifier = await ensureVerifier();
        confirmationRef.current = await signInWithPhoneNumber(auth, e164, verifier);
        setPhone(e164);
        setStep('otp');
        return true;
      } catch (err) {
        logger.error('Phone OTP send failed', { err });
        // A failed challenge can leave the verifier unusable — recreate next try.
        clearVerifier();
        setError("Échec de l'envoi du code. Vérifiez le numéro et réessayez.");
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [clearVerifier, ensureVerifier],
  );

  const verifyOtp = useCallback(
    async (otpCode: string): Promise<boolean> => {
      setError(null);
      const code = otpCode.trim();
      if (!code) {
        setError('Veuillez saisir le code reçu par SMS.');
        return false;
      }
      if (!confirmationRef.current) {
        setError('Session expirée. Renvoyez un code.');
        setStep('phone');
        return false;
      }

      setIsVerifying(true);
      try {
        const credential = await confirmationRef.current.confirm(code);
        const idToken = await credential.user.getIdToken();

        const result = await signIn('phone', { idToken, redirect: false });
        if (!result || result.error) {
          logger.warn('NextAuth phone sign-in rejected', { error: result?.error });
          setError('Connexion refusée. Veuillez réessayer.');
          return false;
        }

        options?.onAuthenticated?.();
        return true;
      } catch (err) {
        logger.error('Phone OTP verification failed', { err });
        setError('Code invalide ou expiré. Réessayez.');
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [options],
  );

  const reset = useCallback(() => {
    setStep('phone');
    setPhone('');
    setError(null);
    setIsSending(false);
    setIsVerifying(false);
    confirmationRef.current = null;
    clearVerifier();
  }, [clearVerifier]);

  return { step, phone, isSending, isVerifying, error, sendOtp, verifyOtp, reset };
}
