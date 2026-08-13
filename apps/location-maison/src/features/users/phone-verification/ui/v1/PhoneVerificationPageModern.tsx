'use client';

import { routes } from '@/constantes/routes';
import { SUPPORTED_COUNTRIES, type SupportedCountry } from '@/lib/phoneValidation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, ChevronLeft, Clock, Phone, RefreshCw } from 'lucide-react';
import { Button } from '@trouve-ton-nkama/ui/button';
import { Input } from '@trouve-ton-nkama/ui/input';
import { Label } from '@trouve-ton-nkama/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trouve-ton-nkama/ui/select';
import { usePhoneVerification } from '../../hooks';

const COUNTRY_FLAGS: Record<SupportedCountry, string> = {
  GA: '🇬🇦',
  SN: '🇸🇳',
};

function formatTimer(timeLeft: number): string {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function PhoneVerificationPageModern() {
  const {
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
    resendOtp,
    shouldUseVisibleRecaptcha,
    isDevOtpFallback,
    devOtpCode,
    devOtpDebugUrl,
  } = usePhoneVerification();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-2 md:pb-8 md:pt-6">
      <div className="mb-6">
        <Link
          href={routes.protected.profil}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
        >
          <ChevronLeft size={18} />
          Retour au profil
        </Link>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Vérifier mon numéro de téléphone
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sécurisez votre compte en validant votre numéro via code OTP.
        </p>

        <div
          id="verify-phone-recaptcha"
          className={shouldUseVisibleRecaptcha ? 'mt-4' : 'h-0 overflow-hidden'}
        />

        {isCheckingVerification && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-secondary" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Vérification du statut en cours...
            </p>
          </div>
        )}

        {!isCheckingVerification && step === 'phone' && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <p className="font-medium">Numéro actuel</p>
              <p className="mt-1">{currentPhoneNumber || 'Aucun numéro enregistré'}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <Label>Pays</Label>
                <Select
                  value={selectedCountry}
                  onValueChange={(value) => setSelectedCountry(value as SupportedCountry)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledCountries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className="inline-flex items-center gap-2">
                          <span>{COUNTRY_FLAGS[country.code]}</span>
                          <span>{country.name}</span>
                          <span className="text-gray-500">
                            {SUPPORTED_COUNTRIES[country.code].countryCode}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Numéro local</Label>
                <Input
                  type="tel"
                  value={localPhoneNumber}
                  onChange={(event) =>
                    setLocalPhoneNumber(event.target.value.replace(/[^\d]/g, ''))
                  }
                  placeholder="66 12 34 56"
                  className="h-12 rounded-xl"
                  disabled={isLoading}
                />
              </div>
            </div>

            {fullPhoneNumber && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Numéro complet: <span className="font-mono">{fullPhoneNumber}</span>
              </p>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {errorMessage}
              </div>
            )}

            <Button
              onClick={sendOtp}
              disabled={!canSendOtp}
              className="h-12 w-full bg-gradient-to-r from-primary to-secondary hover:from-primary-800 hover:to-primary-600"
            >
              {isLoading ? 'Envoi du code...' : 'Envoyer le code OTP'}
            </Button>
          </div>
        )}

        {!isCheckingVerification && step === 'otp' && (
          <div className="mt-6 space-y-5">
            {isDevOtpFallback && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                <p className="font-semibold">Mode localhost: OTP simulé</p>
                <p className="mt-1">
                  Firebase bloque les SMS réels sur localhost. Utilisez ce code:
                  <span className="ml-2 rounded-md bg-amber-100 px-2 py-1 font-mono text-base dark:bg-amber-900/40">
                    {devOtpCode}
                  </span>
                </p>
                {devOtpDebugUrl && (
                  <p className="mt-2 break-all text-xs">
                    URL debug: <span className="font-mono">{devOtpDebugUrl}</span>
                  </p>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Code envoyé au {fullPhoneNumber}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                <Clock className="h-4 w-4" />
                Expire dans {formatTimer(timeLeft)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Code OTP</Label>
              <Input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/[^\d]/g, ''))}
                placeholder="Saisissez le code SMS"
                maxLength={6}
                className="h-12 rounded-xl text-center text-lg tracking-wider"
                disabled={isLoading}
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <Button
                onClick={verifyOtp}
                disabled={!canVerifyOtp}
                className="h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary-800 hover:to-primary-600"
              >
                {isLoading ? 'Vérification...' : 'Vérifier le code'}
              </Button>
              <Button
                onClick={backToPhoneStep}
                variant="outline"
                className="h-12"
                disabled={isLoading}
              >
                Retour
              </Button>
            </div>

            <button
              type="button"
              onClick={resendOtp}
              className="text-sm font-medium text-secondary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              Renvoyer un code OTP
            </button>
          </div>
        )}

        {!isCheckingVerification && step === 'success' && (
          <div className="mt-8 space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">
              Numéro vérifié avec succès
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Votre numéro <strong>{fullPhoneNumber}</strong> est maintenant vérifié.
            </p>
            <Link href={routes.protected.profil}>
              <Button className="h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary-800 hover:to-primary-600">
                Retour au profil
              </Button>
            </Link>
          </div>
        )}

        {!isCheckingVerification && step === 'already-verified' && (
          <div className="mt-8 space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">
              Numéro déjà vérifié
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Votre numéro actuel <strong>{currentPhoneNumber}</strong> est déjà vérifié.
            </p>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              <p className="inline-flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Changement de numéro
              </p>
              <p className="mt-1">
                Si vous changez votre numéro dans votre profil, vous perdrez le statut vérifié et
                devrez refaire cette vérification OTP.
              </p>
            </div>
            <Link href={routes.protected.profil}>
              <Button className="h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary-800 hover:to-primary-600">
                Retour au profil
              </Button>
            </Link>
          </div>
        )}

        {!user && (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Session indisponible. Reconnectez-vous pour vérifier votre numéro.
          </div>
        )}
      </div>

      <p className="mt-4 inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Phone className="h-3.5 w-3.5" />
        Le SMS OTP est fourni par Firebase Phone Auth.
      </p>
    </div>
  );
}
