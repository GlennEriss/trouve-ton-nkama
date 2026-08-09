'use client';

import React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ButtonApp } from '@/components/shared/ui/ButtonApp';
import { InputFormApp } from '@/components/shared/form/InputFormApp';
import Logo from '@/components/logo/Logo';
import { routes } from '@/constantes/routes';
import { supportContact } from '@/constantes';
import { useToast } from '@/hooks/use-toast';
import { usePasswordResetRequest } from '@/features/auth/hooks';
import { Mail, Shield, Timer, ArrowLeft, CheckCircle2, Home, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const LEFT_PANEL_BG_IMAGE = '/auth-image.png';

const passwordResetSchema = z.object({
  email: z.string().email('Veuillez entrer une adresse email valide'),
});

type PasswordResetRequestFormValues = z.infer<typeof passwordResetSchema>;

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
    title: 'Lien sécurisé',
    desc: 'Chaque lien est limité dans le temps.',
  },
  {
    icon: Timer,
    title: 'Réinitialisation rapide',
    desc: 'Recevez le lien en quelques instants.',
  },
  {
    icon: Sparkles,
    title: 'Flux simplifié',
    desc: 'Un parcours clair sur mobile et desktop.',
  },
];

const PasswordResetRequest: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const {
    requestReset,
    resetState,
    isLoading,
    isSuccess,
    submittedEmail,
    isRateLimited,
    countdown,
    lastError,
  } = usePasswordResetRequest();

  const form = useForm<PasswordResetRequestFormValues>({
    resolver: zodResolver(passwordResetSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
    },
  });

  React.useEffect(() => {
    if (!lastError) {
      return;
    }
    toast({
      duration: lastError.duration,
      title: lastError.title,
      description: lastError.message,
      variant: 'destructive',
    });
  }, [lastError, toast]);

  const onSubmit = async (values: PasswordResetRequestFormValues) => {
    const success = await requestReset(values.email);
    if (!success) {
      return;
    }

    toast({
      duration: 5000,
      title: 'Email envoyé',
      description: `Un lien de réinitialisation a été envoyé à ${values.email}.`,
      variant: 'success',
    });
  };

  const countdownText = `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-[100dvh] md:min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-600 to-secondary" />

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
              Récupérez
              <br />
              <span className="text-teal-200">l&apos;accès à votre compte</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-white/80 max-w-md"
            >
              Nous vous envoyons un lien de réinitialisation sécurisé pour changer votre mot de passe.
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

      <div className="flex-1 flex items-start lg:items-center justify-center p-4 sm:p-6 lg:p-12 pt-8 sm:pt-10 lg:pt-12">
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <Logo width="40px" height="40px" />
            <span className="text-lg font-bold text-primary">Trouve Ton Nkama</span>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-gray-200/50 dark:shadow-black/30 p-6 sm:p-8 lg:p-10 border border-gray-100 dark:border-gray-800">
            {isSuccess ? (
              <div className="text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Email envoyé
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {submittedEmail
                    ? `Un lien de réinitialisation a été envoyé à ${submittedEmail}.`
                    : 'Un lien de réinitialisation a été envoyé.'}
                </p>
                <div className="space-y-3">
                  <ButtonApp
                    title="Retour à la connexion"
                    className="bg-gradient-to-r from-primary to-secondary"
                    onClick={() => router.push(routes.public.signin)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetState();
                      form.reset();
                    }}
                    className="w-full rounded-full h-12"
                  >
                    Renvoyer un email
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href={routes.public.signin}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-500 hover:text-primary mb-5 sm:mb-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </Link>

                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Mot de passe oublié
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
                  Entrez votre adresse email pour recevoir un lien de réinitialisation.
                </p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <InputFormApp
                      control={form.control}
                      name="email"
                      label="Adresse email"
                      type="email"
                      placeholder="votre@email.com"
                      IconLucide={Mail}
                      IconColor="gray"
                    />

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-amber-800 text-sm">
                      Assurez-vous d&apos;utiliser l&apos;email lié à votre compte Trouve Ton Nkama.
                    </div>

                    {isRateLimited && countdown > 0 && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-red-700 font-medium text-sm">Trop de tentatives détectées</p>
                        <p className="text-red-600 text-sm mt-1">
                          Veuillez patienter encore {countdownText} avant de réessayer.
                        </p>
                      </div>
                    )}

                    <ButtonApp
                      type="submit"
                      title={
                        isRateLimited && countdown > 0
                          ? `Attendre ${countdownText}`
                          : 'Envoyer le lien de réinitialisation'
                      }
                      isLoading={isLoading}
                      disabled={isLoading || isRateLimited}
                      className="bg-gradient-to-r from-primary to-secondary h-12"
                    />
                  </form>
                </Form>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Besoin d&apos;aide?{' '}
                    <a href={`mailto:${supportContact.email}`} className="text-primary hover:underline font-medium">
                      {supportContact.email}
                    </a>
                  </p>
                  <Link
                    href={routes.public.homePage}
                    className="mt-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary"
                  >
                    <Home className="w-4 h-4" />
                    Retour à l&apos;accueil
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetRequest;
