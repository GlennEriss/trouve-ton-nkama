'use client';

import React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Home, KeyRound, Shield, Sparkles, Timer } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/logo/Logo';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { InputFormApp } from '@/components/shared/form/InputFormApp';
import { ButtonApp } from '@/components/shared/ui/ButtonApp';
import { routes } from '@/constantes/routes';
import { supportContact } from '@/constantes';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { usePasswordReset } from '@/features/auth/hooks';

const logger = createLogger('auth.password-reset-ui');
const LEFT_PANEL_BG_IMAGE = '/auth-image.png';

const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
      .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
      .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
      .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

const featureVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

const features = [
  {
    icon: Shield,
    title: 'Sécurité renforcée',
    desc: 'Votre mot de passe est modifié via un lien unique.',
  },
  {
    icon: Timer,
    title: 'Lien temporaire',
    desc: 'Le lien de réinitialisation expire automatiquement.',
  },
  {
    icon: Sparkles,
    title: 'Flux simplifié',
    desc: 'Même expérience sur mobile, tablette et desktop.',
  },
];

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;
  return strength;
}

function getStrengthColor(strength: number): string {
  if (strength <= 2) return 'bg-red-500';
  if (strength <= 3) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getStrengthText(strength: number): string {
  if (strength <= 2) return 'Faible';
  if (strength <= 3) return 'Moyen';
  return 'Fort';
}

const PasswordReset: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { confirmReset, clearError, isLoading, isSuccess, lastError, shouldRedirectToFailure } = usePasswordReset();

  const oobCode = searchParams.get('oobCode');

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = form.watch('password') ?? '';
  const strength = getPasswordStrength(passwordValue);

  React.useEffect(() => {
    if (oobCode) {
      return;
    }
    logger.warn('Password reset page opened without oobCode');
    router.replace(routes.public.passwordResetFailure);
  }, [oobCode, router]);

  React.useEffect(() => {
    if (!lastError) {
      return;
    }

    if (shouldRedirectToFailure) {
      logger.warn('Redirecting to password reset failure page', {
        code: lastError.code,
      });
      router.replace(routes.public.passwordResetFailure);
      return;
    }

    toast({
      duration: lastError.duration,
      title: lastError.title,
      description: lastError.message,
      variant: 'destructive',
    });
    clearError();
  }, [clearError, lastError, router, shouldRedirectToFailure, toast]);

  const onSubmit = async (values: PasswordResetFormValues) => {
    if (!oobCode) {
      logger.warn('Password reset submission blocked because oobCode is missing');
      router.replace(routes.public.passwordResetFailure);
      return;
    }

    const success = await confirmReset(oobCode, values.password);
    if (!success) {
      return;
    }

    toast({
      duration: 5000,
      title: 'Mot de passe modifié',
      description: 'Votre nouveau mot de passe a été enregistré avec succès.',
      variant: 'success',
    });
    logger.info('Password reset completed');
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#146B67] via-[#1a8a83] to-[#1FA89B]" />

        <div
          className="absolute inset-0 bg-cover bg-no-repeat opacity-20 mix-blend-overlay blur-[1px] pointer-events-none"
          style={{
            backgroundImage: `url(${LEFT_PANEL_BG_IMAGE})`,
            backgroundPosition: 'center bottom',
          }}
          aria-hidden
        />

        <motion.div
          className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-40 left-10 w-48 h-48 bg-teal-300/20 rounded-full blur-2xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, delay: 2 }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          <div>
            <Link href={routes.public.homePage} className="flex items-center gap-3 mb-12 group">
              <motion.div whileHover={{ rotate: 10 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Logo width="56px" height="56px" />
              </motion.div>
              <span className="text-2xl font-bold tracking-tight">Trouve Ton Nkama</span>
            </Link>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl xl:text-5xl font-bold leading-tight mb-6"
            >
              Choisissez
              <br />
              <span className="text-teal-200">un nouveau mot de passe</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-white/80 max-w-md"
            >
              Protégez votre compte avec un mot de passe robuste et unique.
            </motion.p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                custom={index}
                initial="initial"
                animate="animate"
                variants={featureVariants}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10"
              >
                <div className="p-3 rounded-xl bg-white/20">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-white/70">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-sm text-white/50">© 2026 Trouve Ton Nkama. Tous droits réservés.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Logo width="48px" height="48px" />
            <span className="text-xl font-bold text-[#146B67]">Trouve Ton Nkama</span>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-black/30 p-8 lg:p-10 border border-gray-100 dark:border-gray-800">
            {isSuccess ? (
              <div className="text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Mot de passe modifié
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Votre nouveau mot de passe est actif. Vous pouvez maintenant vous connecter.
                </p>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-6 text-sm text-emerald-800">
                  Pour votre sécurité, reconnectez-vous sur vos appareils ouverts.
                </div>

                <div className="space-y-3">
                  <ButtonApp
                    title="Aller à la connexion"
                    className="bg-gradient-to-r from-[#146B67] to-[#1FA89B]"
                    onClick={() => router.push(routes.public.signin)}
                  />
                  <Link
                    href={routes.public.homePage}
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#146B67]"
                  >
                    <Home className="w-4 h-4" />
                    Retour à l&apos;accueil
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href={routes.public.signin}
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#146B67] mb-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Nouveau mot de passe
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Choisissez un mot de passe sécurisé pour finaliser la réinitialisation.
                </p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <InputFormApp
                      control={form.control}
                      name="password"
                      label="Nouveau mot de passe"
                      type="password"
                      placeholder="Entrez votre nouveau mot de passe"
                      IconLucide={KeyRound}
                      IconColor="gray"
                    />

                    {passwordValue && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${getStrengthColor(strength)}`}
                              style={{ width: `${(strength / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {getStrengthText(strength)}
                          </span>
                        </div>
                      </div>
                    )}

                    <InputFormApp
                      control={form.control}
                      name="confirmPassword"
                      label="Confirmer le mot de passe"
                      type="password"
                      placeholder="Confirmez le mot de passe"
                      IconLucide={KeyRound}
                      IconColor="gray"
                    />

                    <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-blue-800 text-sm">
                      Le mot de passe doit contenir au minimum 8 caractères, 1 majuscule, 1 minuscule et 1 chiffre.
                    </div>

                    <ButtonApp
                      type="submit"
                      title={isLoading ? 'Mise à jour en cours...' : 'Modifier mon mot de passe'}
                      isLoading={isLoading}
                      disabled={isLoading || !oobCode}
                      className="bg-gradient-to-r from-[#146B67] to-[#1FA89B] h-12"
                    />
                  </form>
                </Form>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Besoin d&apos;aide?{' '}
                    <a href={`mailto:${supportContact.email}`} className="text-[#146B67] hover:underline font-medium">
                      {supportContact.email}
                    </a>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push(routes.public.passwordResetRequest)}
                    className="mt-3 text-[#146B67] hover:text-[#0f5853]"
                  >
                    Demander un nouveau lien
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
