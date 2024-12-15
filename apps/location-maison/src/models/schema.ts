/**
 * @module schema
 */
import { isValidPhoneNumber } from 'react-phone-number-input';
import { z } from 'zod';

export const FormLoginSchema = z.object({
  email: z
    .string()
    .email({ message: "Veuillez entrer un email valide" })
    .nonempty({ message: "L'email est obligatoire" }),
  password: z
    .string()
    .min(1, { message: "Le mot de passe est obligatoire" }),
});

export const FormRegisterSchema = z.object({
  firstname: z.string().min(1, { message: 'Le prénom est requis' }),
  lastname: z.string().min(1, { message: 'Le nom est requis' }),
  email: z.string().email({ message: 'L\'email n\'est pas valide' }),
  password: z
    .string()
    .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
    .regex(/[A-Z]/, { message: 'Le mot de passe doit contenir une majuscule' })
    .regex(/[0-9]/, { message: 'Le mot de passe doit contenir un chiffre' }),
  birthdate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'La date de naissance doit être au format AAAA-MM-JJ'
  ),
  country: z.string().min(1, { message: 'Le pays est requis' }),
  phone: z
    .string()
    .refine(isValidPhoneNumber, { message: "Invalid phone number" })
    .or(z.literal("")),
  termsOfPrivacyPolicy: z
    .boolean()
    .refine((value) => value === true, 'errors.terms_required'),
});

export type FormRegisterSchemaType = z.infer<typeof FormRegisterSchema>;
export type FormLoginSchemaType = z.infer<typeof FormLoginSchema>