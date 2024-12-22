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
  passwordConfirm: z.string(),
  birthdate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'La date de naissance doit être au format AAAA-MM-JJ'
  ),
  country: z.string().min(1, { message: 'Le pays est requis' }),
  phone: z
    .string()
    .refine(isValidPhoneNumber, { message: "Le numéro de téléphone est invalide" })
    .or(z.literal("")),
  termsOfPrivacyPolicy: z
    .boolean()
    .refine((value) => value === true, 'errors.terms_required'),
}).refine((data) => data.password === data.passwordConfirm, {
  path: ['passwordConfirm'],
  message: 'Les mots de passe ne correspondent pas',
});

//Property Schemas
export const LocationSchema = z.object({
  street: z.string().min(1, "Le nom de la rue est obligatoire"),
  city: z.string().min(1, "Le nom de la ville est obligatoire"),
  province: z.string().min(1, "Le nom de la province est obligatoire"),
  additionalInformation: z.string().optional(),
  longitude: z.number().min(-180).max(180, "Longitude invalide"),
  latitude: z.number().min(-90).max(90, "Latitude invalide"),
  country: z.string().min(1, "Le pays est obligatoire"),
  countryCode: z.string().min(1, "Le code pays est obligatoire"),
});
export const PropertySchema = z.object({
  title: z.string().min(1, "Le titre est obligatoire"),
  description: z.string().min(1, "La description doit contenir au moins 10 caractères"),
  price: z.number().positive("Le prix doit être un nombre positif"),
  area: z.number().positive("La superficie doit être un nombre positif"),
  images: z.array(z.any()).nonempty("Au moins une image est requise"),
  status: z.enum(["FOR_RENT", "FOR_SALE"]),
  tags: z.array(z.string().min(1, "Chaque tag doit contenir au moins 1 caractère")).nonempty("Vous devez ajouter au moins un tag"),
  street: z.string().min(1, "Le nom de la rue est obligatoire"),
  city: z.string().min(1, "Le nom de la ville est obligatoire"),
  province: z.string().min(1, "Le nom de la province est obligatoire"),
  additionalInformation: z.string().optional(),
  longitude: z.string().min(1).transform(val => parseFloat(val)).refine(val => val >= -180 && val <= 180, "Longitude invalide"),
  latitude: z.string().min(1).transform(val => parseFloat(val)).refine(val => val >= -90 && val <= 90, "Latitude invalide"),
  country: z.string().min(1, "Le pays est obligatoire"),
  countryCode: z.string().min(2, "Le code pays est obligatoire"),
});
export const LogementSchema = PropertySchema.extend({
  nbrRooms: z.number().positive("Le nombre de chambres doit être un nombre positif"),
  nbrChickens: z.number().positive("Le nombre de cuisines doit être un nombre positif"),
  nbrBathrooms: z.number().positive("Le nombre de salles de bain doit être un nombre positif"),
  nbrToilets: z.number().positive("Le nombre de toilettes doit être un nombre positif"),
});
export const HomeSchema = LogementSchema.extend({
  nbrGarages: z.number().positive("Le nombre de garages doit être un nombre positif"),
  nbrFloors: z.number().positive("Le nombre d'étages doit être un nombre positif"),
});
export const StudioSchema = LogementSchema.extend({
  nbrFloorStudio: z.number().positive("Le numéro d'étage doit être un nombre positif"),
  numeroStudio: z.string().min(1, "Le numéro du studio est obligatoire"),
});
export const ApartmentSchema = LogementSchema.extend({
  nbrFloorApartment: z.number().positive("Le numéro d'étage de l'appartement doit être un nombre positif"),
  numeroApartment: z.string().min(1, "Le numéro de l'appartement est obligatoire"),
});
export const VillaSchema = LogementSchema.extend({
  nbrFloors: z.number().positive("Le nombre d'étages doit être un nombre positif"),
  nbrPiscine: z.number().positive("Le nombre de piscines doit être un nombre positif"),
  nbrGarages: z.number().positive("Le nombre de garages doit être un nombre positif"),
});
export const DeskSchema = PropertySchema.extend({
  nbrToilets: z.number().positive("Le nombre de toilettes doit être un nombre positif"),
  nbrRooms: z.number().positive("Le nombre de salles doit être un nombre positif"),
});
export const BuildingSchema = PropertySchema.extend({
  nbrAppartement: z.number().positive("Le nombre d'appartements doit être un nombre positif"),
  nbrFloors: z.number().positive("Le nombre d'étages doit être un nombre positif"),
  hasParking: z.number().positive("Le nombre de places de parking doit être un nombre positif"),
});

//Steps schemas
export const Step1Schema = z.object({
  images: z.array(z.any()).nonempty("Au moins une image est requise"),
  title: z.string().min(1, "Le titre est obligatoire"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  area: z.number().positive("La superficie doit être un nombre positif"),
  price: z.number().positive("Le prix doit être un nombre positif"),
  status: z.enum(["FOR_RENT", "FOR_SALE"]),
  tags: z.array(z.string().min(1, "Chaque tag doit contenir au moins 1 caractère")).nonempty("Vous devez ajouter au moins un tag"),
});
export const Step3Schema = z.object({
  street: z.string().min(1, "Le nom de la rue est obligatoire"),
  city: z.string().min(1, "Le nom de la ville est obligatoire"),
  province: z.string().min(1, "Le nom de la province est obligatoire"),
  additionalInformation: z.string().optional(),
  longitude: z.string().min(1).transform(val => parseFloat(val)).refine(val => val >= -180 && val <= 180, "Longitude invalide"),
  latitude: z.string().min(1).transform(val => parseFloat(val)).refine(val => val >= -90 && val <= 90, "Latitude invalide"),
  country: z.string().min(1, "Le pays est obligatoire"),
  countryCode: z.string().min(2, "Le code pays est obligatoire"),
});

export const PropertyTypeEnum = z.enum([
  'home',
  'studio',
  'apartment',
  'villa',
  'desk',
  'building',
]);
export const Step2SchemaBase = z.object({
  propertyType: PropertyTypeEnum,
});
export const HomeStep2Schema = z.object({
  nbrRooms: z.number().positive("Le nombre de chambres doit être un nombre positif"),
  nbrChickens: z.number().positive("Le nombre de cuisines doit être un nombre positif"),
  nbrBathrooms: z.number().positive("Le nombre de salles de bain doit être un nombre positif"),
  nbrToilets: z.number().positive("Le nombre de toilettes doit être un nombre positif"),
  nbrGarages: z.number().positive("Le nombre de garages doit être un nombre positif"),
  nbrFloors: z.number().positive("Le nombre d'étages doit être un nombre positif"),
});
export const StudioStep2Schema = z.object({
  nbrRooms: z.number().positive("Le nombre de chambres doit être un nombre positif"),
  nbrChickens: z.number().positive("Le nombre de cuisines doit être un nombre positif"),
  nbrBathrooms: z.number().positive("Le nombre de salles de bain doit être un nombre positif"),
  nbrToilets: z.number().positive("Le nombre de toilettes doit être un nombre positif"),
  nbrFloorStudio: z.number().positive("Le numéro d'étage doit être un nombre positif"),
  numeroStudio: z.string().min(1, "Le numéro du studio est obligatoire"),
});
export const ApartmentStep2Schema = z.object({
  nbrRooms: z.number().positive("Le nombre de chambres doit être un nombre positif"),
  nbrChickens: z.number().positive("Le nombre de cuisines doit être un nombre positif"),
  nbrBathrooms: z.number().positive("Le nombre de salles de bain doit être un nombre positif"),
  nbrToilets: z.number().positive("Le nombre de toilettes doit être un nombre positif"),
  nbrFloorApartment: z.number().positive("Le numéro d'étage de l'appartement doit être un nombre positif"),
  numeroApartment: z.string().min(1, "Le numéro de l'appartement est obligatoire"),
});
export const VillaStep2Schema = z.object({
  nbrRooms: z.number().positive("Le nombre de chambres doit être un nombre positif"),
  nbrChickens: z.number().positive("Le nombre de cuisines doit être un nombre positif"),
  nbrBathrooms: z.number().positive("Le nombre de salles de bain doit être un nombre positif"),
  nbrToilets: z.number().positive("Le nombre de toilettes doit être un nombre positif"),
  nbrFloors: z.number().positive("Le nombre d'étages doit être un nombre positif"),
  nbrPiscine: z.number().positive("Le nombre de piscines doit être un nombre positif"),
  nbrGarages: z.number().positive("Le nombre de garages doit être un nombre positif"),
});
export const DeskStep2Schema = z.object({
  nbrToilets: z.number().positive("Le nombre de toilettes doit être un nombre positif"),
  nbrRooms: z.number().positive("Le nombre de salles doit être un nombre positif"),
});
export const BuildingStep2Schema = z.object({
  nbrAppartement: z.number().positive("Le nombre d'appartements doit être un nombre positif"),
  nbrFloors: z.number().positive("Le nombre d'étages doit être un nombre positif"),
  hasParking: z.number().positive("Le nombre de places de parking doit être un nombre positif"),
});
export const Step2Schema = Step2SchemaBase.refine((data) => {
  switch (data.propertyType) {
    case 'home':
      return HomeStep2Schema;
    case 'studio':
      return StudioStep2Schema;
    case 'apartment':
      return ApartmentStep2Schema;
    case 'villa':
      return VillaStep2Schema;
    case 'desk':
      return DeskStep2Schema;
    case 'building':
      return BuildingStep2Schema;
    default:
      throw new Error("Type de propriété non pris en charge.");
  }
});
export const FormUserProfilSchema = z.object({
  firstname: z.string().min(1, "Le prénom est requis"),
  lastname: z.string().min(1, "Le nom est requis"),
  email: z.string().email("L'email est invalide"),
  phoneNumbers: z
    .string()
    .refine(isValidPhoneNumber, { message: "Le numéro de téléphone est invalide" })
    .optional(),
  country: z.string().min(1, { message: 'Le pays est requis' }),
  birthDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'La date de naissance doit être au format AAAA-MM-JJ'
  ),
});
//Types
export type DeskSchemaType = z.infer<typeof DeskSchema>;
export type BuildingSchemaType = z.infer<typeof BuildingSchema>;
export type StudioSchemaType = z.infer<typeof StudioSchema>;
export type ApartmentSchemaType = z.infer<typeof ApartmentSchema>;
export type VillaSchemaType = z.infer<typeof VillaSchema>;
export type LogementSchemaType = z.infer<typeof LogementSchema>;
export type PropertySchemaType = z.infer<typeof PropertySchema>;
export type HomeSchemaType = z.infer<typeof HomeSchema>;
export type Step2SchemaType = z.infer<typeof Step2Schema>;
export type Step2SchemaBaseType = z.infer<typeof Step2SchemaBase>;
export type Step1SchemaType = z.infer<typeof Step1Schema>;
export type Step3SchemaType = z.infer<typeof Step3Schema>;
export type FormRegisterSchemaType = z.infer<typeof FormRegisterSchema>;
export type FormLoginSchemaType = z.infer<typeof FormLoginSchema>
export type FormUserProfilSchemaType = z.infer<typeof FormUserProfilSchema>;