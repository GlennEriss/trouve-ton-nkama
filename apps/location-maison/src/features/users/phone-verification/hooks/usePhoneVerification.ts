'use client';

import { auth } from '@/firebase/auth';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { getEnabledCountries, SUPPORTED_COUNTRIES, type SupportedCountry } from '@/lib/phoneValidation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { phoneVerificationService } from '../services';

type VerificationStep = 'phone' | 'otp' | 'success' | 'already-verified';

const OTP_EXPIRATION_SECONDS = 10 * 60;
const logger = createLogger('users.phone-verification.hook');

function parsePhoneByCountry(
  fullPhoneNumber: string,
  countries: Array<{ code: SupportedCountry; name: string }>
): { country: SupportedCountry; localPhone: string } {
  for (const country of countries) {
    const countryCode = SUPPORTED_COUNTRIES[country.code].countryCode;
    if (fullPhoneNumber.startsWith(countryCode)) {
      return {
        country: country.code,
        localPhone: fullPhoneNumber.slice(countryCode.length).replace(/[^\d]/g, ''),
      };
    }
  }

  const fallbackCountry = countries[0]?.code ?? 'GA';
  const fallbackPrefix = SUPPORTED_COUNTRIES[fallbackCountry].countryCode;
  return {
    country: fallbackCountry,
    localPhone: fullPhoneNumber.replace(fallbackPrefix, '').replace(/[^\d]/g, ''),
  };
}

export function usePhoneVerification() {
  const { user, setUser } = useCurrentUser();
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();

  const enabledCountries = useMemo(() => getEnabledCountries(), []);
  const [step, setStep] = useState<VerificationStep>('phone');
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry>(
    enabledCountries[0]?.code ?? 'GA'
  );
  const [localPhoneNumber, setLocalPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRATION_SECONDS);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isDevOtpFallback, setIsDevOtpFallback] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [devOtpDebugUrl, setDevOtpDebugUrl] = useState<string | null>(null);
  const recaptchaVerifierRef = useRef<any>(null);
  const shouldUseVisibleRecaptcha = process.env.NODE_ENV === 'development';
  const canUseLocalOtpFallback =
    process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const currentPhoneNumber = user?.phoneNumbers?.[0] ?? '';
  const fullPhoneNumber = useMemo(() => {
    const cleaned = localPhoneNumber.replace(/[^\d]/g, '');
    if (!cleaned) {
      return '';
    }
    const countryCode = SUPPORTED_COUNTRIES[selectedCountry].countryCode;
    return `${countryCode}${cleaned}`;
  }, [selectedCountry, localPhoneNumber]);

  const resetError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const cleanupRecaptcha = useCallback(() => {
    if (!recaptchaVerifierRef.current) {
      return;
    }
    try {
      recaptchaVerifierRef.current.clear();
    } catch (error) {
      logger.warn('Recaptcha cleanup failed', { error });
    } finally {
      recaptchaVerifierRef.current = null;
    }
  }, []);

  useEffect(() => cleanupRecaptcha, [cleanupRecaptcha]);

  useEffect(() => {
    if (!currentPhoneNumber) {
      return;
    }

    const parsed = parsePhoneByCountry(currentPhoneNumber, enabledCountries);
    setSelectedCountry(parsed.country);
    setLocalPhoneNumber(parsed.localPhone);
  }, [currentPhoneNumber, enabledCountries]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (step === 'otp' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((previousValue) => previousValue - 1);
      }, 1000);
    }

    if (step === 'otp' && timeLeft <= 0) {
      setStep('phone');
      setOtpCode('');
      setErrorMessage('Le code OTP a expiré. Veuillez demander un nouveau code.');
      toast({
        title: 'Code expiré',
        description: 'Le code OTP a expiré. Veuillez demander un nouveau code.',
        variant: 'warning',
        duration: 7000,
      });
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [step, timeLeft, toast]);

  useEffect(() => {
    const initializeVerificationStatus = async () => {
      if (!user?.uid) {
        setIsCheckingVerification(false);
        return;
      }

      setIsCheckingVerification(true);
      const statusResult = await phoneVerificationService.getPhoneVerificationStatus(user.uid);

      if (!statusResult.success) {
        setErrorMessage(statusResult.error?.message ?? "Impossible de vérifier le statut.");
        setStep('phone');
        setIsCheckingVerification(false);
        return;
      }

      if (statusResult.phoneNumberVerified && statusResult.phoneNumber) {
        setStep('already-verified');
      } else {
        setStep('phone');
      }

      setIsCheckingVerification(false);
    };

    initializeVerificationStatus();
  }, [user?.uid]);

  const initRecaptchaVerifier = useCallback(async () => {
    cleanupRecaptcha();
    const { RecaptchaVerifier } = await import('firebase/auth');
    recaptchaVerifierRef.current = new (RecaptchaVerifier as any)(auth, 'verify-phone-recaptcha', {
      size: shouldUseVisibleRecaptcha ? 'normal' : 'invisible',
      callback: () => {
        logger.debug('reCAPTCHA solved for phone verification');
      },
      'expired-callback': () => {
        logger.warn('reCAPTCHA expired for phone verification');
      },
    });
    await recaptchaVerifierRef.current.render();
    return recaptchaVerifierRef.current;
  }, [cleanupRecaptcha, shouldUseVisibleRecaptcha]);

  const clearDevOtpUrl = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const url = new URL(window.location.href);
    if (!url.searchParams.has('devOtp')) {
      return;
    }
    url.searchParams.delete('devOtp');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const activateLocalOtpFallback = useCallback(() => {
    const generatedCode = `${Math.floor(100000 + Math.random() * 900000)}`;

    const localConfirmationResult = {
      verificationId: `local-dev-${Date.now()}`,
      confirm: async (inputCode: string) => {
        if (inputCode === generatedCode) {
          return { user: auth.currentUser ?? { uid: user?.uid ?? 'local-dev-user' } };
        }
        const invalidCodeError = new Error('Invalid verification code') as Error & { code?: string };
        invalidCodeError.code = 'auth/invalid-verification-code';
        throw invalidCodeError;
      },
    };

    let debugUrl: string | null = null;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('devOtp', generatedCode);
      debugUrl = url.toString();
      window.history.replaceState({}, '', debugUrl);
    }

    setConfirmationResult(localConfirmationResult);
    setStep('otp');
    setOtpCode('');
    setTimeLeft(OTP_EXPIRATION_SECONDS);
    setIsDevOtpFallback(true);
    setDevOtpCode(generatedCode);
    setDevOtpDebugUrl(debugUrl);
  }, [user?.uid]);

  const sendOtp = useCallback(async () => {
    resetError();
    setIsLoading(true);

    try {
      const recaptchaVerifier = await initRecaptchaVerifier();
      if (shouldUseVisibleRecaptcha) {
        await recaptchaVerifier.verify();
      }
      const otpResult = await phoneVerificationService.sendPhoneOtp({
        phoneNumber: fullPhoneNumber,
        recaptchaVerifier,
      });

      if (!otpResult.success || !otpResult.confirmationResult) {
        if (canUseLocalOtpFallback && otpResult.error?.code === 'RECAPTCHA_REQUIRED') {
          activateLocalOtpFallback();
          setErrorMessage(null);
          toast({
            title: 'Mode local OTP simulé',
            description: 'Firebase bloque les SMS réels sur localhost. Utilisez le code OTP affiché.',
            variant: 'warning',
            duration: 9000,
          });
          return;
        }
        const message = otpResult.error?.message ?? "Impossible d'envoyer le code OTP.";
        setErrorMessage(message);
        toast({
          title: 'Echec envoi OTP',
          description: message,
          variant: 'destructive',
          duration: 7000,
        });
        return;
      }

      setConfirmationResult(otpResult.confirmationResult);
      setIsDevOtpFallback(false);
      setDevOtpCode(null);
      setDevOtpDebugUrl(null);
      clearDevOtpUrl();
      setTimeLeft(OTP_EXPIRATION_SECONDS);
      setStep('otp');
      setOtpCode('');

      toast({
        title: 'Code envoyé',
        description: `Un code OTP a été envoyé au ${fullPhoneNumber}.`,
        variant: 'success',
        duration: 5000,
      });
    } catch (error) {
      logger.error('Unexpected error while sending OTP', {
        phoneNumber: fullPhoneNumber,
        error,
      });
      const message = "Impossible d'envoyer le code OTP pour le moment.";
      setErrorMessage(message);
      toast({
        title: 'Erreur OTP',
        description: message,
        variant: 'destructive',
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    activateLocalOtpFallback,
    canUseLocalOtpFallback,
    clearDevOtpUrl,
    fullPhoneNumber,
    initRecaptchaVerifier,
    resetError,
    shouldUseVisibleRecaptcha,
    toast,
  ]);

  const verifyOtp = useCallback(async () => {
    if (!confirmationResult || !user?.uid) {
      return;
    }

    resetError();
    setIsLoading(true);

    const verificationResult = await phoneVerificationService.confirmPhoneOtp({
      uid: user.uid,
      otpCode,
      phoneNumber: fullPhoneNumber,
      confirmationResult,
    });

    if (!verificationResult.success || !verificationResult.user) {
      const message = verificationResult.error?.message ?? 'Le code OTP est invalide.';
      setErrorMessage(message);
      toast({
        title: 'Vérification échouée',
        description: message,
        variant: 'destructive',
        duration: 7000,
      });
      setIsLoading(false);
      return;
    }

    if (setUser) {
      setUser(verificationResult.user);
    }

    try {
      await updateSession({
        ...session,
        user: verificationResult.user,
      });
    } catch (error) {
      logger.warn('Failed to refresh NextAuth session after phone verification', {
        uid: user.uid,
        error,
      });
    }

    setStep('success');
    setIsDevOtpFallback(false);
    setDevOtpCode(null);
    setDevOtpDebugUrl(null);
    clearDevOtpUrl();
    toast({
      title: verificationResult.isPhoneChanged
        ? 'Numéro modifié et vérifié'
        : 'Numéro vérifié',
      description: verificationResult.isPhoneChanged
        ? 'Votre nouveau numéro est maintenant vérifié.'
        : 'Votre numéro de téléphone est maintenant vérifié.',
      variant: 'success',
      duration: 5000,
    });

    setIsLoading(false);
  }, [
    confirmationResult,
    fullPhoneNumber,
    otpCode,
    session,
    setUser,
    toast,
    updateSession,
    user?.uid,
    resetError,
    clearDevOtpUrl,
  ]);

  const backToPhoneStep = useCallback(() => {
    setStep('phone');
    setOtpCode('');
    setTimeLeft(OTP_EXPIRATION_SECONDS);
    setIsDevOtpFallback(false);
    setDevOtpCode(null);
    setDevOtpDebugUrl(null);
    clearDevOtpUrl();
    resetError();
  }, [clearDevOtpUrl, resetError]);

  const canSendOtp = Boolean(fullPhoneNumber) && !isLoading;
  const canVerifyOtp = Boolean(otpCode) && otpCode.length >= 6 && !isLoading;

  return {
    user,
    step,
    selectedCountry,
    setSelectedCountry,
    localPhoneNumber,
    setLocalPhoneNumber,
    fullPhoneNumber,
    currentPhoneNumber,
    enabledCountries,
    otpCode,
    setOtpCode,
    timeLeft,
    isLoading,
    isCheckingVerification,
    errorMessage,
    canSendOtp,
    canVerifyOtp,
    sendOtp,
    verifyOtp,
    backToPhoneStep,
    resendOtp: sendOtp,
    shouldUseVisibleRecaptcha,
    isDevOtpFallback,
    devOtpCode,
    devOtpDebugUrl,
  };
}
