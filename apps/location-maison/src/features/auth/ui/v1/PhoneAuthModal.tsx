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
import { KeyRound, Phone } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { routes } from '@/constantes/routes';
import { usePhoneOtpAuth } from '@/features/auth/hooks/usePhoneOtpAuth';

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
            {step === 'phone' ? 'Continuer avec votre numéro' : 'Vérification du code'}
          </DialogTitle>
          <DialogDescription>
            {step === 'phone'
              ? 'Nous vous enverrons un code par SMS pour vous connecter, sans mot de passe.'
              : `Saisissez le code à 6 chiffres envoyé au ${phone}.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                placeholder="Ex: 066 12 34 56"
                className="pl-9"
                disabled={isSending}
              />
            </div>
            <p className="text-xs text-gray-500">Numéro gabonais (+241). Le 0 initial est optionnel.</p>
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
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={otpInput}
                onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="pl-9 tracking-[0.4em]"
                disabled={isVerifying}
              />
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
