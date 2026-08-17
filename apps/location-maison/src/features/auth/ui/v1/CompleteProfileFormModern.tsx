'use client';

import React, { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Building2, Home, Mail, Phone, Shield, Sparkles, Store, User } from 'lucide-react';
import Logo from '@trouve-ton-nkama/ui/logo';
import { Form } from '@/components/ui/form';
import { Button } from '@trouve-ton-nkama/ui/button';
import { ButtonApp } from '@/components/shared/ui/ButtonApp';
import { InputFormApp } from '@/components/shared/form/InputFormApp';
import { PhoneNumberFormAppSimple } from '@/components/shared/form/PhoneNumberFormAppSimple';
import { DateSelect } from '@/components/shared/form/DateSelect';
import { CheckboxFormApp } from '@/components/shared/form/CheckboxFormApp';
import { useToast } from '@/hooks/use-toast';
import { routes } from '@/constantes/routes';
import { createLogger } from '@/lib/logger';
import { getPostAuthRedirectPath } from '@/lib/auth/role-routing';
import type { User as AuthUser } from '@/models/authentication';
import { useCompleteProfile, mapCompleteProfileError } from '@/features/auth/hooks';
import { CompleteProfileSchema, type CompleteProfileSchemaType } from './complete-profile.schema';

const logger = createLogger('auth.complete-profile-form-modern');
const LEFT_PANEL_BG_IMAGE = '/auth-image.png';

const featureVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

function hasCompleteProfile(user: AuthUser | null): boolean {
  return Boolean(
    user?.firstname &&
    user?.lastname &&
    user?.phoneNumbers?.[0] &&
    user?.birthDate
  );
}

function parseBirthdateFromUser(rawBirthDate: string | undefined) {
  if (!rawBirthDate || !rawBirthDate.includes('-')) {
    return { day: '', month: '', year: '' };
  }

  const [year, month, day] = rawBirthDate.split('-');
  if (!year || !month || !day) {
    return { day: '', month: '', year: '' };
  }

  return {
    day,
    month,
    year,
  };
}

export const CompleteProfileFormModern: React.FC = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, status, update } = useSession();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const hydratedUserRef = useRef<string | null>(null);
  const {
    completeProfile,
    isLoading,
    lastError,
    clearError,
  } = useCompleteProfile();

  const form = useForm<CompleteProfileSchemaType>({
    resolver: zodResolver(CompleteProfileSchema),
    mode: 'onChange',
    defaultValues: {
      accountType: 'User',
      termsOfPrivacyPolicy: false,
      acceptAnnouncerTerms: false,
      firstname: '',
      lastname: '',
      pseudo: '',
      phone: '',
      whatsappPhone: '',
      birthdate: {
        day: '',
        month: '',
        year: '',
      },
    },
  });

  const selectedAccountType = form.watch('accountType') ?? 'User';
  const isFormLoading = isLoading || form.formState.isSubmitting;
  // Phone (OTP) accounts: number already verified → prefilled & locked, and the
  // header speaks about the verified number instead of a Google connection.
  const isPhoneAccount = currentUser?.providers?.includes('PHONE') ?? false;
  const verifiedPhone = currentUser?.phoneNumbers?.[0] ?? '';

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (!session?.user) {
      router.replace(routes.public.signin);
      return;
    }

    const sessionUser = session.user as AuthUser;
    setCurrentUser(sessionUser);

    if (
      hasCompleteProfile(sessionUser) &&
      sessionUser?.metadata?.needsProfileCompletion !== true
    ) {
      router.replace(getPostAuthRedirectPath(sessionUser));
      return;
    }

    if (hydratedUserRef.current === sessionUser.uid) {
      return;
    }

    hydratedUserRef.current = sessionUser.uid;
    const birthdate = parseBirthdateFromUser(sessionUser.birthDate);
    const isAnnouncer = sessionUser.roles?.includes('Announcer') ?? false;

    form.reset({
      accountType: isAnnouncer ? 'Announcer' : 'User',
      termsOfPrivacyPolicy: false,
      acceptAnnouncerTerms: isAnnouncer,
      firstname: sessionUser.firstname ?? '',
      lastname: sessionUser.lastname ?? '',
      pseudo: sessionUser.pseudo ?? '',
      phone: sessionUser.callNumber ?? sessionUser.phoneNumbers?.[0] ?? '',
      whatsappPhone: sessionUser.whatsappNumber ?? '',
      birthdate,
    });
  }, [form, router, session, status]);

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

  const onSubmit = async (values: CompleteProfileSchemaType) => {
    if (!currentUser?.uid) {
      const fallback = mapCompleteProfileError('USER_ID_REQUIRED');
      toast({
        title: fallback.title,
        description: fallback.message,
        duration: fallback.duration,
        variant: 'destructive',
      });
      return;
    }

    logger.info('Complete profile submission requested', {
      uid: currentUser.uid,
      accountType: values.accountType,
    });

    const result = await completeProfile({
      uid: currentUser.uid,
      firstname: values.firstname,
      lastname: values.lastname,
      pseudo: values.pseudo,
      phoneNumber: values.phone,
      whatsappNumber: values.whatsappPhone,
      birthdate: values.birthdate,
      accountType: values.accountType,
      acceptTerms: values.termsOfPrivacyPolicy,
      acceptAnnouncerTerms: values.acceptAnnouncerTerms,
      metadata: currentUser.metadata ?? {},
    });

    if (!result.success) {
      return;
    }

    const updatedUser = result.user ?? currentUser;

    try {
      await update({
        ...session,
        user: updatedUser,
      });
    } catch (error) {
      logger.warn('Session update failed after profile completion', {
        uid: currentUser.uid,
        error,
      });
    }

    toast({
      title: 'Profil finalisé',
      description: 'Votre compte est prêt, vous pouvez maintenant continuer.',
      duration: 5000,
      variant: 'success',
    });

    router.push(getPostAuthRedirectPath(updatedUser));
  };

  const features = [
    { icon: Home, title: 'Accès complet', desc: 'Finalisez votre compte pour accéder à toutes les fonctionnalités' },
    { icon: Shield, title: 'Profil sécurisé', desc: 'Vos informations sont stockées de façon sécurisée' },
    { icon: Sparkles, title: 'Expérience personnalisée', desc: 'Recevez des résultats adaptés à votre profil' },
  ];

  if (status === 'loading' || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
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
              Finalisez votre profil
              <br />
              <span className="text-teal-200">et démarrez</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-white/80 max-w-md"
            >
              {isPhoneAccount
                ? 'Votre numéro est vérifié. Complétez uniquement les informations manquantes.'
                : 'Votre compte Google est reconnu. Complétez uniquement les informations manquantes.'}
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
            <span className="text-xl font-bold text-primary">Trouve Ton Nkama</span>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compléter le profil</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {isPhoneAccount
                ? 'Numéro vérifié, finalisez votre compte.'
                : 'Connexion Google validée, finalisez votre compte.'}
            </p>
          </div>

          {isPhoneAccount ? (
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-900/20 dark:border-emerald-800 mb-6">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold mb-1">
                <Phone className="w-4 h-4" />
                Numéro vérifié
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{verifiedPhone}</p>
            </div>
          ) : currentUser.email ? (
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-900/20 dark:border-emerald-800 mb-6">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold mb-1">
                <Mail className="w-4 h-4" />
                Compte Google connecté
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{currentUser.email}</p>
            </div>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type de compte</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      form.setValue('accountType', 'User', {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    className={`rounded-2xl border p-3 text-left transition ${
                      selectedAccountType === 'User'
                        ? 'border-secondary bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <User className="w-4 h-4" />
                      Utilisateur
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Rechercher et enregistrer des annonces</p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      form.setValue('accountType', 'Announcer', {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    className={`rounded-2xl border p-3 text-left transition ${
                      selectedAccountType === 'Announcer'
                        ? 'border-secondary bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Building2 className="w-4 h-4" />
                      Annonceur
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Publier et gérer vos annonces</p>
                  </button>
                </div>
              </div>

              <InputFormApp
                control={form.control}
                name="firstname"
                label="Prénom"
                type="text"
                IconLucide={User}
                IconColor="#9ca3af"
                placeholder="Entrez votre prénom"
              />

              <InputFormApp
                control={form.control}
                name="lastname"
                label="Nom"
                type="text"
                IconLucide={User}
                IconColor="#9ca3af"
                placeholder="Entrez votre nom"
              />

              <div className="space-y-1">
                <InputFormApp
                  control={form.control}
                  name="pseudo"
                  label="Pseudo (optionnel)"
                  type="text"
                  IconLucide={Store}
                  IconColor="#9ca3af"
                  placeholder="Ex : le nom de votre boutique"
                />
                <p className="text-xs text-gray-500">
                  C&apos;est ce nom qui apparaîtra sur vos annonces. Vide, on affiche votre prénom et votre nom.
                </p>
              </div>

              {/* Les deux numéros sont séparés visuellement : un annonceur gabonais a très souvent
                  une ligne d'appel et un WhatsApp différents, et les confondre envoie les clients
                  sur le mauvais canal. */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Vos numéros de contact
                </p>

                <div className="space-y-1">
                  <PhoneNumberFormAppSimple
                    control={form.control}
                    name="phone"
                    label="Numéro d'appel"
                    placeholder="06 12 34 56 78"
                    disabled={isFormLoading || isPhoneAccount}
                  />
                  <p className="text-xs text-gray-500">
                    {isPhoneAccount
                      ? 'Numéro déjà vérifié par SMS, non modifiable.'
                      : 'Le numéro sur lequel les clients vous appellent.'}
                  </p>
                </div>

                <div className="space-y-1">
                  <PhoneNumberFormAppSimple
                    control={form.control}
                    name="whatsappPhone"
                    label="Numéro WhatsApp"
                    placeholder="06 12 34 56 78"
                    disabled={isFormLoading}
                  />
                  <p className="text-xs text-gray-500">
                    Laissez vide si c&apos;est le même que votre numéro d&apos;appel.
                  </p>
                </div>
              </div>

              <DateSelect
                control={form.control}
                name="birthdate"
                label="Date de naissance"
                disabled={isFormLoading}
              />

              {selectedAccountType === 'Announcer' && (
                <div className="space-y-2">
                  <CheckboxFormApp
                    control={form.control}
                    name="acceptAnnouncerTerms"
                    label={
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        J&apos;accepte les{" "}
                        <a
                          href={routes.public.announcer_terms}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-secondary hover:underline font-medium"
                        >
                          conditions annonceur
                        </a>
                        .
                      </span>
                    }
                  />
                  {form.formState.errors.acceptAnnouncerTerms?.message && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.acceptAnnouncerTerms.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <CheckboxFormApp
                  control={form.control}
                  name="termsOfPrivacyPolicy"
                  label={
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      J&apos;accepte la{' '}
                      <a
                        href={routes.public.confidentiality}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-secondary hover:underline font-medium"
                      >
                        politique de confidentialité
                      </a>
                      {' '}et les{' '}
                      <a
                        href={routes.public.terms_of_use}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-secondary hover:underline font-medium"
                      >
                        conditions d&apos;utilisation
                      </a>
                    </span>
                  }
                />
                {form.formState.errors.termsOfPrivacyPolicy?.message && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.termsOfPrivacyPolicy.message}
                  </p>
                )}
              </div>

              <ButtonApp
                type="submit"
                disabled={isFormLoading}
                isLoading={isFormLoading}
                className="h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary-800 hover:to-primary-600 shadow-lg shadow-teal-500/25"
                title={isFormLoading ? 'Finalisation...' : 'Finaliser mon compte'}
              />
            </form>
          </Form>

          <Button
            type="button"
            variant="outline"
            onClick={() => signOut({ callbackUrl: routes.public.signin })}
            disabled={isFormLoading}
            className="w-full mt-4 h-11 rounded-full"
          >
            Se déconnecter
          </Button>
        </div>
      </div>
    </div>
  );
};
