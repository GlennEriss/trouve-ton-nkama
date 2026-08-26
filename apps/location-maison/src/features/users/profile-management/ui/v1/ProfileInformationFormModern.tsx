'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { routes } from '@/constantes/routes';
import { countries } from '@/constantes/country';
import { useProfileInformationUpdate } from '@/features/users/profile-management/hooks';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { generateColorFromName } from '@/lib/generateColorFromName';
import { firebaseTimestampToDate } from '@/lib/firebaseTimestampToDate';
import { getUserDisplayInitial, getUserDisplayName } from '@/lib/user-display-name';
import { AlertTriangle, AtSign, CalendarDays, ChevronDown, ChevronLeft, Link2, Mail, ShieldCheck, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { ButtonApp } from '@/components/shared/ui/ButtonApp';
import { InputFormApp } from '@/components/shared/form/InputFormApp';
import { PhoneNumberFormAppSimple } from '@/components/shared/form/PhoneNumberFormAppSimple';
import { SelectFormApp } from '@/components/shared/form/SelectFormApp';
import { Avatar, AvatarFallback, AvatarImage } from '@trouve-ton-nkama/ui/avatar';
import { Badge } from '@trouve-ton-nkama/ui/badge';
import {
  ProfileInformationSchema,
  type ProfileInformationSchemaType,
} from './profile-information.schema';

const logger = createLogger('users.profile-information-form-modern');
const INPUT_ICON_COLOR = '#1FA89B';
const DAY_MS = 24 * 60 * 60 * 1000;
const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X' },
] as const;

const countryOptions = countries.map((country) => ({
  label: country.name,
  value: country.code,
}));

function parseDateLike(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'object' && value !== null) {
    const seconds = (value as { seconds?: unknown }).seconds;
    const nanoseconds = (value as { nanoseconds?: unknown }).nanoseconds;
    if (typeof seconds === 'number') {
      const ms = seconds * 1000 + (typeof nanoseconds === 'number' ? nanoseconds / 1_000_000 : 0);
      const parsed = new Date(ms);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
}

function getPhoneChangeLockInfo(user: unknown): {
  isLocked: boolean;
  lockUntil: Date | null;
  daysRemaining: number;
} {
  const lockUntilRaw = (user as { metadata?: { phoneVerification?: { lockUntil?: unknown } } })?.metadata
    ?.phoneVerification?.lockUntil;
  const lockUntil = parseDateLike(lockUntilRaw);
  const isVerified = Boolean((user as { phoneNumberVerified?: boolean })?.phoneNumberVerified);

  if (!isVerified || !lockUntil) {
    return { isLocked: false, lockUntil: null, daysRemaining: 0 };
  }

  const now = Date.now();
  const remainingMs = lockUntil.getTime() - now;
  if (remainingMs <= 0) {
    return { isLocked: false, lockUntil, daysRemaining: 0 };
  }

  return {
    isLocked: true,
    lockUntil,
    daysRemaining: Math.ceil(remainingMs / DAY_MS),
  };
}

function toSocialProfileDefaults(user: unknown): ProfileInformationSchemaType['socialProfiles'] {
  const metadata = (user as { metadata?: unknown })?.metadata;
  const rawContainer =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>).socialProfiles
      : null;
  const rawProfiles =
    rawContainer && typeof rawContainer === 'object' && !Array.isArray(rawContainer)
      ? (rawContainer as Record<string, unknown>)
      : {};

  return {
    facebook: {
      url:
        rawProfiles.facebook &&
        typeof rawProfiles.facebook === 'object' &&
        !Array.isArray(rawProfiles.facebook) &&
        typeof (rawProfiles.facebook as Record<string, unknown>).url === 'string'
          ? ((rawProfiles.facebook as Record<string, unknown>).url as string)
          : '',
      handle:
        rawProfiles.facebook &&
        typeof rawProfiles.facebook === 'object' &&
        !Array.isArray(rawProfiles.facebook) &&
        typeof (rawProfiles.facebook as Record<string, unknown>).handle === 'string'
          ? ((rawProfiles.facebook as Record<string, unknown>).handle as string)
          : '',
    },
    instagram: {
      url:
        rawProfiles.instagram &&
        typeof rawProfiles.instagram === 'object' &&
        !Array.isArray(rawProfiles.instagram) &&
        typeof (rawProfiles.instagram as Record<string, unknown>).url === 'string'
          ? ((rawProfiles.instagram as Record<string, unknown>).url as string)
          : '',
      handle:
        rawProfiles.instagram &&
        typeof rawProfiles.instagram === 'object' &&
        !Array.isArray(rawProfiles.instagram) &&
        typeof (rawProfiles.instagram as Record<string, unknown>).handle === 'string'
          ? ((rawProfiles.instagram as Record<string, unknown>).handle as string)
          : '',
    },
    tiktok: {
      url:
        rawProfiles.tiktok &&
        typeof rawProfiles.tiktok === 'object' &&
        !Array.isArray(rawProfiles.tiktok) &&
        typeof (rawProfiles.tiktok as Record<string, unknown>).url === 'string'
          ? ((rawProfiles.tiktok as Record<string, unknown>).url as string)
          : '',
      handle:
        rawProfiles.tiktok &&
        typeof rawProfiles.tiktok === 'object' &&
        !Array.isArray(rawProfiles.tiktok) &&
        typeof (rawProfiles.tiktok as Record<string, unknown>).handle === 'string'
          ? ((rawProfiles.tiktok as Record<string, unknown>).handle as string)
          : '',
    },
    linkedin: {
      url:
        rawProfiles.linkedin &&
        typeof rawProfiles.linkedin === 'object' &&
        !Array.isArray(rawProfiles.linkedin) &&
        typeof (rawProfiles.linkedin as Record<string, unknown>).url === 'string'
          ? ((rawProfiles.linkedin as Record<string, unknown>).url as string)
          : '',
      handle:
        rawProfiles.linkedin &&
        typeof rawProfiles.linkedin === 'object' &&
        !Array.isArray(rawProfiles.linkedin) &&
        typeof (rawProfiles.linkedin as Record<string, unknown>).handle === 'string'
          ? ((rawProfiles.linkedin as Record<string, unknown>).handle as string)
          : '',
    },
    x: {
      url:
        rawProfiles.x &&
        typeof rawProfiles.x === 'object' &&
        !Array.isArray(rawProfiles.x) &&
        typeof (rawProfiles.x as Record<string, unknown>).url === 'string'
          ? ((rawProfiles.x as Record<string, unknown>).url as string)
          : '',
      handle:
        rawProfiles.x &&
        typeof rawProfiles.x === 'object' &&
        !Array.isArray(rawProfiles.x) &&
        typeof (rawProfiles.x as Record<string, unknown>).handle === 'string'
          ? ((rawProfiles.x as Record<string, unknown>).handle as string)
          : '',
    },
  };
}

export function ProfileInformationFormModern() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [socialProfilesOpen, setSocialProfilesOpen] = useState(false);
  const { updateProfileInformation, isLoading, lastError, clearError } = useProfileInformationUpdate();
  const phoneChangeLockInfo = useMemo(() => getPhoneChangeLockInfo(user), [user]);

  const form = useForm<ProfileInformationSchemaType>({
    resolver: zodResolver(ProfileInformationSchema),
    mode: 'onChange',
    defaultValues: {
      firstname: '',
      lastname: '',
      pseudo: '',
      email: '',
      birthDate: '',
      phoneNumber: '',
      countryCode: 'GA',
      socialProfiles: {
        facebook: { url: '', handle: '' },
        instagram: { url: '', handle: '' },
        tiktok: { url: '', handle: '' },
        linkedin: { url: '', handle: '' },
        x: { url: '', handle: '' },
      },
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    form.reset({
      firstname: user.firstname ?? '',
      lastname: user.lastname ?? '',
      pseudo: user.pseudo ?? '',
      email: user.email ?? '',
      birthDate: user.birthDate ?? '',
      phoneNumber: user.phoneNumbers?.[0] ?? '',
      countryCode: user.country?.code ?? 'GA',
      socialProfiles: toSocialProfileDefaults(user),
    });
  }, [form, user]);

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

  const onSubmit = async (values: ProfileInformationSchemaType) => {
    if (!user?.uid) {
      toast({
        title: 'Session invalide',
        description: "Impossible d'identifier votre compte.",
        duration: 7000,
        variant: 'destructive',
      });
      return;
    }

    const previousPhone = (user.phoneNumbers?.[0] ?? '').trim();
    const nextPhone = values.phoneNumber.trim();
    const phoneChangedFromVerified = Boolean(
      user.phoneNumberVerified && nextPhone && previousPhone !== nextPhone
    );

    if (phoneChangeLockInfo.isLocked && phoneChangedFromVerified) {
      const lockDateLabel = phoneChangeLockInfo.lockUntil?.toLocaleDateString('fr-FR') ?? 'date inconnue';
      toast({
        title: 'Changement de numéro verrouillé',
        description: `Numéro vérifié verrouillé jusqu'au ${lockDateLabel}.`,
        duration: 8000,
        variant: 'warning',
      });
      return;
    }

    const result = await updateProfileInformation({
      uid: user.uid,
      firstname: values.firstname,
      lastname: values.lastname,
      pseudo: values.pseudo,
      birthDate: values.birthDate,
      phoneNumber: values.phoneNumber,
      countryCode: values.countryCode,
      socialProfiles: values.socialProfiles,
    });

    if (!result.success) {
      return;
    }

    logger.info('Profile information saved from UI', {
      uid: user.uid,
    });

    toast({
      title: 'Informations mises à jour',
      description: phoneChangedFromVerified
        ? 'Numéro modifié: le statut "numéro vérifié" a été retiré. Vérifiez à nouveau votre numéro.'
        : 'Votre profil a été mis à jour avec succès.',
      duration: 5000,
      variant: phoneChangedFromVerified ? 'warning' : 'success',
    });
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-secondary" />
      </div>
    );
  }

  const createdAt = firebaseTimestampToDate(user?.createdAt?.seconds, user?.createdAt?.nanoseconds);
  const updatedAt = firebaseTimestampToDate(user?.updatedAt?.seconds, user?.updatedAt?.nanoseconds);
  const avatarBackground = generateColorFromName(user?.firstname);
  const displayName = getUserDisplayName(user);
  const displayInitial = getUserDisplayInitial(user);
  const isPhoneChangeLocked = phoneChangeLockInfo.isLocked;
  const phoneLockUntilLabel = phoneChangeLockInfo.lockUntil?.toLocaleDateString('fr-FR') ?? '';
  const currentPhoneNumber = (user.phoneNumbers?.[0] ?? '').trim();
  const watchedPhoneNumber = (form.watch('phoneNumber') ?? '').trim();
  const isAnnouncer = Array.isArray(user?.roles) && user.roles.includes('Announcer');
  const willLoseVerifiedStatus = Boolean(
    user.phoneNumberVerified &&
    watchedPhoneNumber &&
    watchedPhoneNumber !== currentPhoneNumber &&
    !isPhoneChangeLocked
  );

  return (
    <div className="pb-20 md:pb-8 px-4 lg:px-0">
      <div className="bg-white dark:bg-gray-900 sticky top-0 flex gap-4 items-center border-b dark:border-gray-700 py-3 px-1 z-40 md:hidden">
        <Link
          href={routes.protected.profil}
          aria-label="Retour au profil"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-gray-800"
        >
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-bold dark:text-white">Modifier mes informations</h1>
      </div>

      <div className="hidden md:block mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Modifier mes informations</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Modifiez votre numéro de téléphone et votre pays. Les autres informations sont en lecture seule.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-3xl border border-emerald-100 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.image ?? ''} alt={user?.firstname ?? 'avatar'} />
              <AvatarFallback
                style={{ backgroundColor: avatarBackground }}
                className="text-xl font-bold text-white"
              >
                {displayInitial || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {displayName}
              </p>
              {user.pseudo?.trim() && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.firstname} {user.lastname}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Statut téléphone
              </span>
              <Badge variant={user.phoneNumberVerified ? 'default' : 'secondary'}>
                {user.phoneNumberVerified ? 'Vérifié' : 'Non vérifié'}
              </Badge>
            </div>
            {isPhoneChangeLocked && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Changement de numéro possible après le {phoneLockUntilLabel}.
              </p>
            )}
            {createdAt && (
              <div className="flex items-center justify-between">
                <span>Membre depuis</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {createdAt.toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
            {updatedAt && (
              <div className="flex items-center justify-between">
                <span>Dernière mise à jour</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {updatedAt.toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </aside>

        <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputFormApp
                  control={form.control}
                  name="firstname"
                  label="Prénom"
                  IconLucide={UserCircle}
                  IconColor={INPUT_ICON_COLOR}
                  placeholder="Votre prénom"
                  autoComplete="given-name"
                  disabled
                />
                <InputFormApp
                  control={form.control}
                  name="lastname"
                  label="Nom"
                  IconLucide={UserCircle}
                  IconColor={INPUT_ICON_COLOR}
                  placeholder="Votre nom"
                  autoComplete="family-name"
                  disabled
                />
              </div>

              <InputFormApp
                control={form.control}
                name="pseudo"
                label="Nom de l'entreprise (optionnel)"
                IconLucide={AtSign}
                IconColor={INPUT_ICON_COLOR}
                placeholder="Laissez vide pour afficher votre prénom et nom"
                autoComplete="nickname"
              />

              <InputFormApp
                control={form.control}
                name="email"
                label="Adresse email"
                type="email"
                IconLucide={Mail}
                IconColor={INPUT_ICON_COLOR}
                disabled
                placeholder="email@exemple.com"
              />
              <p className="text-xs text-emerald-700 dark:text-emerald-300 -mt-3">
                L&apos;email est géré par votre méthode de connexion et ne se modifie pas ici.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputFormApp
                  control={form.control}
                  name="birthDate"
                  label="Date de naissance"
                  type="date"
                  IconLucide={CalendarDays}
                  IconColor={INPUT_ICON_COLOR}
                  disabled
                />
                <SelectFormApp
                  control={form.control}
                  name="countryCode"
                  label="Pays"
                  options={countryOptions}
                  placeholder="Sélectionner un pays"
                />
              </div>

              <PhoneNumberFormAppSimple
                control={form.control}
                name="phoneNumber"
                label="Numéro de téléphone"
                placeholder="66 12 34 56"
                disabled={isPhoneChangeLocked}
              />

              {isPhoneChangeLocked && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  <p className="inline-flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Numéro verrouillé temporairement
                  </p>
                  <p className="mt-1">
                    Ce numéro est vérifié. Il pourra être modifié dans {phoneChangeLockInfo.daysRemaining} jour
                    {phoneChangeLockInfo.daysRemaining > 1 ? 's' : ''} (à partir du {phoneLockUntilLabel}).
                  </p>
                </div>
              )}

              {willLoseVerifiedStatus && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  <p className="inline-flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Attention
                  </p>
                  <p className="mt-1">
                    En changeant votre numéro, vous perdrez le statut "numéro vérifié" et devrez
                    refaire la vérification OTP.
                  </p>
                </div>
              )}

              {isAnnouncer && (
                <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
                  <button
                    type="button"
                    aria-expanded={socialProfilesOpen}
                    aria-controls="social-profile-fields"
                    onClick={() => setSocialProfilesOpen((current) => !current)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                  >
                    <span>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <Link2 className="h-4 w-4 text-secondary" />
                        Réseaux sociaux (facultatif)
                      </span>
                      <span className="mt-1 block text-xs text-gray-600 dark:text-gray-400">
                        Ajoutez les liens utilisés pour publier vos annonces.
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-gray-500 transition-transform dark:text-gray-400 ${socialProfilesOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {socialProfilesOpen && (
                    <div id="social-profile-fields" className="mt-4 space-y-4">
                      {SOCIAL_NETWORKS.map((network) => (
                        <div key={network.key} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <InputFormApp
                            control={form.control}
                            name={`socialProfiles.${network.key}.url`}
                            label={`${network.label} - lien`}
                            placeholder={`https://${network.key}.com/...`}
                            autoComplete="url"
                          />
                          <InputFormApp
                            control={form.control}
                            name={`socialProfiles.${network.key}.handle`}
                            label={`${network.label} - @`}
                            placeholder="@username"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <ButtonApp
                  type="submit"
                  disabled={isLoading}
                  isLoading={isLoading}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary-800 hover:to-primary-600"
                  title={
                    isLoading
                      ? 'Enregistrement en cours...'
                      : 'Enregistrer les modifications'
                  }
                />
              </div>
            </form>
          </Form>
        </section>
      </div>
    </div>
  );
}
