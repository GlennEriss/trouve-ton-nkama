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
import { CalendarDays, ChevronLeft, Mail, ShieldCheck, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { ButtonApp } from '@/components/shared/ui/ButtonApp';
import { InputFormApp } from '@/components/shared/form/InputFormApp';
import { PhoneNumberFormAppSimple } from '@/components/shared/form/PhoneNumberFormAppSimple';
import { SelectFormApp } from '@/components/shared/form/SelectFormApp';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ProfileInformationSchema,
  type ProfileInformationSchemaType,
} from './profile-information.schema';

const logger = createLogger('users.profile-information-form-modern');
const INPUT_ICON_COLOR = '#1FA89B';

const countryOptions = countries.map((country) => ({
  label: country.name,
  value: country.code,
}));

export function ProfileInformationFormModern() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { updateProfileInformation, isLoading, lastError, clearError } = useProfileInformationUpdate();

  const form = useForm<ProfileInformationSchemaType>({
    resolver: zodResolver(ProfileInformationSchema),
    mode: 'onChange',
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
      birthDate: '',
      phoneNumber: '',
      countryCode: 'GA',
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    form.reset({
      firstname: user.firstname ?? '',
      lastname: user.lastname ?? '',
      email: user.email ?? '',
      birthDate: user.birthDate ?? '',
      phoneNumber: user.phoneNumbers?.[0] ?? '',
      countryCode: user.country?.code ?? 'GA',
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

    const result = await updateProfileInformation({
      uid: user.uid,
      firstname: values.firstname,
      lastname: values.lastname,
      birthDate: values.birthDate,
      phoneNumber: values.phoneNumber,
      countryCode: values.countryCode,
    });

    if (!result.success) {
      return;
    }

    logger.info('Profile information saved from UI', {
      uid: user.uid,
    });

    toast({
      title: 'Informations mises à jour',
      description: 'Votre profil a été mis à jour avec succès.',
      duration: 5000,
      variant: 'success',
    });
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#1FA89B]" />
      </div>
    );
  }

  const createdAt = firebaseTimestampToDate(user?.createdAt?.seconds, user?.createdAt?.nanoseconds);
  const updatedAt = firebaseTimestampToDate(user?.updatedAt?.seconds, user?.updatedAt?.nanoseconds);
  const avatarBackground = generateColorFromName(user?.firstname);

  return (
    <div className="pb-20 md:pb-8 px-4 lg:px-0">
      <div className="bg-white dark:bg-gray-900 sticky top-0 flex gap-4 items-center border-b dark:border-gray-700 py-3 px-1 z-40 md:hidden">
        <Link href={routes.protected.profil}>
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
                {user?.firstname?.at(0) ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {user.firstname} {user.lastname}
              </p>
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
              />

              <div className="pt-2">
                <ButtonApp
                  type="submit"
                  disabled={isLoading}
                  isLoading={isLoading}
                  className="bg-gradient-to-r from-[#146B67] to-[#1FA89B] hover:from-[#125b57] hover:to-[#1a9589]"
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
