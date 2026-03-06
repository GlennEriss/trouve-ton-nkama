import { validatePhoneNumberForSupportedCountries } from '@/lib/phoneValidation';
import { z } from 'zod';

function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
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
}

export const ProfileInformationSchema = z.object({
  firstname: z.string().trim().min(1, { message: 'Le prénom est requis.' }),
  lastname: z.string().trim().min(1, { message: 'Le nom est requis.' }),
  email: z.string().email({ message: "L'email est invalide." }),
  birthDate: z
    .string()
    .min(1, { message: 'La date de naissance est requise.' })
    .refine(isValidBirthDate, {
      message: 'La date de naissance est invalide ou vous avez moins de 18 ans.',
    }),
  phoneNumber: z
    .string()
    .min(1, { message: 'Le numéro de téléphone est requis.' })
    .refine((value) => validatePhoneNumberForSupportedCountries(value).isValid, {
      message: 'Le numéro de téléphone est invalide.',
    }),
  countryCode: z.string().min(1, { message: 'Le pays est requis.' }),
});

export type ProfileInformationSchemaType = z.infer<typeof ProfileInformationSchema>;

