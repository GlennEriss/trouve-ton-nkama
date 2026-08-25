'use client';

/**
 * PhoneAuthModal — "Continuer avec Numéro de téléphone" flow (OTP passwordless).
 *
 * Two steps (numéro → code SMS) driven by usePhoneOtpAuth. On success the
 * NextAuth session is set and we navigate to the app; the middleware then
 * redirects to /complete-profile when the (new phone) account is incomplete.
 */

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@trouve-ton-nkama/ui/dialog';
import { Button } from '@trouve-ton-nkama/ui/button';
import { routes } from '@/constantes/routes';
import { usePhoneOtpAuth } from '@/features/auth/hooks/usePhoneOtpAuth';
import { PhoneNumberParts } from '@/components/shared/form/PhoneNumberFormAppSimple';

type PhoneAuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where to land after a successful sign-in (middleware may then redirect). */
  redirectTo?: string;
};

export const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({
  open,
  onOpenChange,
  redirectTo = routes.public.search_property,
}) => {
  const router = useRouter();
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const onAuthenticated = useCallback(() => {
    onOpenChange(false);
    router.push(redirectTo);
    router.refresh();
  }, [onOpenChange, redirectTo, router]);

  const { step, phone, isSending, isVerifying, error, sendOtp, verifyOtp, reset } =
    usePhoneOtpAuth({ onAuthenticated });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        reset();
        setPhoneInput('');
        setOtpInput('');
      }
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const handleSend = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await sendOtp(phoneInput);
    },
    [phoneInput, sendOtp],
  );

  const handleVerify = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      await verifyOtp(otpInput);
    },
    [otpInput, verifyOtp],
  );

  const handleChangeNumber = useCallback(() => {
    reset();
    setOtpInput('');
  }, [reset]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'phone' ? 'Numéro de téléphone' : 'Vérification du code'}
          </DialogTitle>
        </DialogHeader>

        {step === 'phone' ? (
          <form onSubmit={handleSend} className="space-y-4">
            <PhoneNumberParts
              value={phoneInput}
              onChange={setPhoneInput}
              disabled={isSending}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button
              type="submit"
              disabled={isSending || phoneInput.trim().length < 6}
              className="w-full h-12 rounded-full bg-gradient-to-r from-primary to-secondary text-white"
            >
              {isSending ? 'Envoi du code…' : 'Recevoir le code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1">
              <span className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                Code envoyé au {phone}
              </span>
              <div className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center transition-colors focus-within:border-secondary focus-within:bg-primary-50 dark:focus-within:bg-gray-800 min-h-[48px] py-2 px-4">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={otpInput}
                  onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  disabled={isVerifying}
                  className="min-h-11 w-full border-none shadow-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 bg-transparent tracking-[0.4em]"
                  aria-label="Code reçu par SMS"
                />
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button
              type="submit"
              disabled={isVerifying || otpInput.length < 6}
              className="w-full h-12 rounded-full bg-gradient-to-r from-primary to-secondary text-white"
            >
              {isVerifying ? 'Vérification…' : 'Vérifier et continuer'}
            </Button>
            <button
              type="button"
              onClick={handleChangeNumber}
              disabled={isVerifying}
              className="w-full text-center text-sm text-secondary hover:underline"
            >
              Modifier le numéro
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
