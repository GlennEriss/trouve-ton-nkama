import { validatePhoneNumberForSupportedCountries } from '@/lib/phoneValidation';
import { z } from 'zod';

const BirthdateSchema = z.object({
  day: z.string().min(1, { message: 'Le jour est requis' }),
  month: z.string().min(1, { message: 'Le mois est requis' }),
  year: z.string().min(1, { message: "L'année est requise" }),
}).refine((date) => {
  const day = Number.parseInt(date.day, 10);
  const month = Number.parseInt(date.month, 10);
  const year = Number.parseInt(date.year, 10);

  if (
    Number.isNaN(day) ||
    Number.isNaN(month) ||
    Number.isNaN(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return false;
  }

  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  const age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  const dayDiff = today.getDate() - day;
  const realAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  return realAge >= 18;
}, {
  message: 'Vous devez avoir au moins 18 ans pour finaliser votre compte',
});

export const CompleteProfileSchema = z.object({
  accountType: z.enum(['User', 'Announcer']),
  termsOfPrivacyPolicy: z
    .boolean()
    .refine((value) => value === true, 'Vous devez accepter les conditions d\'utilisation'),
  acceptAnnouncerTerms: z.boolean().optional(),
  firstname: z.string().trim().min(1, { message: 'Le prénom est requis' }),
  lastname: z.string().trim().min(1, { message: 'Le nom est requis' }),
  // Mêmes règles que FormRegisterSchema : ce parcours est l'autre porte d'entrée (Google,
  // Facebook, téléphone) et ne doit pas offrir moins que l'inscription par email.
  pseudo: z.string().trim().max(50, { message: 'Le pseudo ne doit pas dépasser 50 caractères' }).optional(),
  phone: z
    .string()
    .min(1, { message: "Le numéro d'appel est obligatoire" })
    .refine((value) => validatePhoneNumberForSupportedCountries(value).isValid, {
      message: 'Le numéro de téléphone est invalide',
    }),
  whatsappPhone: z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) return true;
      return validatePhoneNumberForSupportedCountries(value).isValid;
    }, { message: 'Le numéro WhatsApp est invalide' }),
  birthdate: BirthdateSchema,
}).refine(
  (data) => data.accountType !== 'Announcer' || data.acceptAnnouncerTerms === true,
  {
    path: ['acceptAnnouncerTerms'],
    message: "Vous devez accepter les conditions d'annonceur",
  }
);

export type CompleteProfileSchemaType = z.infer<typeof CompleteProfileSchema>;
