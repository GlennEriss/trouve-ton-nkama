'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { routes } from '@/constantes/routes';
import { useSignin, mapSigninError } from '@/features/auth/hooks';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { FormLoginSchema, FormLoginSchemaType } from '@/models/schema';
import { motion } from 'framer-motion';
import { Home, KeyRound, Mail, Phone, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/logo/Logo';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { PhoneAuthModal } from './PhoneAuthModal';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { InputFormApp } from '@/components/shared/form/InputFormApp';
import { Button } from '@/components/ui/button';
import { ButtonApp } from '@/components/shared/ui/ButtonApp';
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking';

const logger = createLogger('auth.signin-form-modern');
const LEFT_PANEL_BG_IMAGE = '/auth-image.png';

const featureVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export const SigninFormModern: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { trackEvent } = useTrackEvent();
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const {
    signinWithCredentials,
    signinWithGoogle,
    isCredentialsLoading,
    isGoogleLoading,
    isLoading,
    lastError,
    clearError,
  } = useSignin();

  const form = useForm<FormLoginSchemaType>({
    resolver: zodResolver(FormLoginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormLoginSchemaType) => {
    trackEvent(trackingEvents.CTA_AUTH_SIGNIN_CLICK, {
      method: 'credentials',
      entry_point: 'signin_form',
    });

    const parsed = FormLoginSchema.safeParse(values);
    if (!parsed.success) {
      const mappedError = mapSigninError();
      toast({
        title: mappedError.title,
        description: mappedError.message,
        duration: mappedError.duration,
        variant: 'destructive',
      });
      return;
    }

    const result = await signinWithCredentials(parsed.data);
    if (!result.success) {
      const signinError = result.error ?? mapSigninError();
      toast({
        title: signinError.title,
        description: signinError.message,
        duration: signinError.duration,
        variant: 'destructive',
      });
      return;
    }

    toast({
      duration: 4000,
      title: 'Connexion réussie',
      description: 'Vous êtes connecté avec succès.',
      variant: 'success',
    });
    trackEvent(trackingEvents.BUSINESS_AUTH_SIGNIN_SUCCESS, {
      method: 'credentials',
    });
    router.push(result.redirectTo ?? routes.public.search_property);
  };

  const handleGoogleSigninClick = async () => {
    trackEvent(trackingEvents.CTA_AUTH_GOOGLE_CLICK, {
      entry_point: 'signin_form',
    });
    await signinWithGoogle();
  };

  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) {
      return;
    }

    const mappedError = mapSigninError(error);
    logger.warn('Signin page opened with auth error query param', {
      error,
      mappedCode: mappedError.code,
    });

    toast({
      title: mappedError.title,
      description: mappedError.message,
      duration: mappedError.duration,
      variant: 'destructive',
    });

    router.replace(routes.public.signin);
  }, [router, searchParams, toast]);

  useEffect(() => {
    if (!lastError) {
      return;
    }
    toast({
      title: lastError.title,
      description: lastError.message,
      duration: lastError.duration,
      variant: 'destructive',
    });
    clearError();
  }, [clearError, lastError, toast]);

  const features = [
    { icon: Home, title: 'Reprenez vos recherches', desc: 'Retrouvez vos annonces sauvegardées' },
    { icon: Shield, title: 'Accès sécurisé', desc: 'Protection renforcée de votre compte' },
    { icon: Sparkles, title: 'Expérience personnalisée', desc: 'Recommandations adaptées à vos besoins' },
  ];

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
              <motion.div
                whileHover={{ rotate: 10 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
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
              Ravi de vous revoir
              <br />
              <span className="text-teal-200">sur la plateforme</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-white/80 max-w-md"
            >
              Connectez-vous pour gérer vos annonces, vos favoris et vos paramètres de compte.
            </motion.p>
          </div>

          <div className="space-y-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                initial="initial"
                animate="animate"
                variants={featureVariants}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300"
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

          <p className="text-sm text-white/50">
            © 2026 Trouve Ton Nkama. Tous droits réservés.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Logo width="48px" height="48px" />
            <span className="text-xl font-bold text-[#146B67]">Trouve Ton Nkama</span>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Connexion</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Accédez à votre espace personnel
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <InputFormApp
                control={form.control}
                name="email"
                label="Adresse email"
                type="email"
                IconLucide={Mail}
                IconColor="#9ca3af"
                placeholder="exemple@email.com"
              />
              <InputFormApp
                control={form.control}
                name="password"
                label="Mot de passe"
                type="password"
                IconLucide={KeyRound}
                IconColor="#9ca3af"
                placeholder="Entrez votre mot de passe"
              />

              <div className="flex justify-end">
                <Link
                  href={routes.public.passwordResetRequest}
                  className="text-sm text-[#1FA89B] hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <ButtonApp
                type="submit"
                disabled={isLoading}
                isLoading={isCredentialsLoading}
                className="h-12 bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#125b57] hover:to-[#1a9589] shadow-lg shadow-teal-500/25"
                title={isCredentialsLoading ? 'Connexion en cours...' : 'Se connecter'}
              />
            </form>
          </Form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                ou continuer avec
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSigninClick}
            disabled={isLoading}
            className="w-full h-12 rounded-full border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
          >
            {isGoogleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white" />
            ) : (
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span className="font-medium">Continuer avec Google</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              trackEvent(trackingEvents.CTA_AUTH_SIGNIN_CLICK, {
                method: 'phone',
                entry_point: 'signin_form',
              });
              setIsPhoneModalOpen(true);
            }}
            disabled={isLoading}
            className="w-full h-12 mt-3 rounded-full border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <Phone className="w-5 h-5 mr-3 text-[#1FA89B]" />
            <span className="font-medium">Continuer avec Numéro de téléphone</span>
          </Button>

          <PhoneAuthModal open={isPhoneModalOpen} onOpenChange={setIsPhoneModalOpen} />

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Vous n&apos;avez pas de compte ?{' '}
            <Link
              href={routes.public.signup}
              className="text-[#1FA89B] hover:underline font-semibold"
            >
              S&apos;enregistrer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
