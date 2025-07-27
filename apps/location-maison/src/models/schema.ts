/**
 * @module schema
 */
import { isValidPhoneNumber } from 'react-phone-number-input';
import { z } from 'zod';
import { validatePhoneNumberForSupportedCountries } from '@/lib/phoneValidation';

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
  firstname: z.string().min(1, { message: 'Veuillez saisir votre prénom' }),
  lastname: z.string().min(1, { message: 'Veuillez saisir votre nom de famille' }),
  email: z.string().email({ message: 'Veuillez saisir une adresse email valide (ex: john@example.com)' }),
  password: z
    .string()
    .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
    .regex(/[A-Z]/, { message: 'Le mot de passe doit contenir au moins une lettre majuscule' })
    .regex(/\d/, { message: 'Le mot de passe doit contenir au moins un chiffre' }),
  passwordConfirm: z.string().min(1, { message: 'Veuillez confirmer votre mot de passe' }),
  birthdate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Veuillez saisir votre date de naissance au format AAAA-MM-JJ (ex: 1990-05-15)')
    .refine((dateString) => {
      const birthDate = new Date(dateString);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      const d = today.getDate() - birthDate.getDate();

      if (m < 0 || (m === 0 && d < 0)) {
        return age - 1 >= 18; // pas encore son anniversaire
      }
      return age >= 18;
    }, {
      message: 'Vous devez avoir au moins 18 ans pour créer un compte',
    }),
  country: z.string().min(1, { message: 'Veuillez sélectionner votre pays' }),
  phone: z
    .string()
    .min(1, { message: 'Veuillez saisir votre numéro de téléphone' })
    .refine((value) => {
      const validation = validatePhoneNumberForSupportedCountries(value);
      return validation.isValid;
    }, { message: "Veuillez saisir un numéro de téléphone valide pour votre pays" }),
  termsOfPrivacyPolicy: z
    .boolean()
    .refine((value) => value === true, 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité'),
}).refine((data) => data.password === data.passwordConfirm, {
  path: ['passwordConfirm'],
  message: 'Les mots de passe ne correspondent pas. Veuillez les saisir à nouveau',
});

//Property Schemas
export const LocationSchema = z.object({
  street: z.string().min(1, "Veuillez saisir le nom de la rue ou du quartier"),
  city: z.string().min(1, "Veuillez saisir le nom de la ville"),
  province: z.string().min(1, "Veuillez sélectionner la province"),
  additionalInformation: z.string().optional(),
  longitude: z.number().min(-180).max(180, "La longitude doit être comprise entre -180 et 180"),
  latitude: z.number().min(-90).max(90, "La latitude doit être comprise entre -90 et 90"),
  country: z.string().min(1, "Veuillez sélectionner le pays"),
  countryCode: z.string().min(1, "Le code pays est requis"),
});
export const PropertySchema = z.object({
  title: z.string().min(1, "Veuillez saisir un titre pour votre annonce"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères pour être informative"),
  price: z.number().min(0, "Le prix doit être un nombre positif ou égal à zéro"),
  area: z.number().min(0, "La superficie doit être un nombre positif ou égal à zéro"),
  images: z.array(z.any()).nonempty("Veuillez ajouter au moins une photo de votre bien"),
  status: z.enum(["FOR_RENT", "FOR_SALE"]),
  tags: z.array(z.string().min(1, "Chaque mot-clé doit contenir au moins 1 caractère"))
    .nonempty("Veuillez ajouter au moins un mot-clé pour décrire votre bien")
    .max(6, "Vous pouvez ajouter maximum 6 mots-clés"),
  street: z.string().min(1, "Veuillez saisir le nom de la rue ou du quartier"),
  city: z.string().min(1, "Veuillez saisir le nom de la ville"),
  province: z.string().min(1, "Veuillez sélectionner la province"),
  contact: z.string().min(1, "Veuillez saisir un numéro de téléphone de contact"),
  additionalInformation: z.string().optional(),
  longitude: z
    .number()
    .refine(val => val >= -180 && val <= 180, "La longitude doit être comprise entre -180 et 180"),
  latitude: z
    .number()
    .refine(val => val >= -90 && val <= 90, "La latitude doit être comprise entre -90 et 90"),
  country: z.string().min(1, "Veuillez sélectionner le pays"),
  countryCode: z.string().min(2, "Le code pays est requis"),
});
export const LogementSchema = PropertySchema.extend({
  nbrRooms: z.number().min(0, "Le nombre de chambres doit être un nombre positif ou égal à zéro"),
  nbrChickens: z.number().min(0, "Le nombre de cuisines doit être un nombre positif ou égal à zéro"),
  nbrBathrooms: z.number().min(0, "Le nombre de salles de bain doit être un nombre positif ou égal à zéro"),
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif ou égal à zéro"),
});
export const HomeSchema = LogementSchema.extend({
  nbrGarages: z.number().min(0, "Le nombre de garages doit être un nombre positif ou égal à zéro"),
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif ou égal à zéro"),
  nbrLivingRoom: z.number().min(0, "Le nombre de salons doit être un nombre positif ou égal à zéro"),
});
export const StudioSchema = LogementSchema.extend({
  nbrFloorStudio: z.number().min(0, "Le numéro d'étage doit être un nombre positif ou égal à zéro"),
  numeroStudio: z.string().min(1, "Veuillez saisir le numéro du studio"),
});
export const ApartmentSchema = LogementSchema.extend({
  nbrFloorApartment: z.number().min(0, "Le numéro d'étage doit être un nombre positif ou égal à zéro"),
  numeroApartment: z.string().min(1, "Veuillez saisir le numéro de l'appartement"),
});
export const VillaSchema = LogementSchema.extend({
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif ou égal à zéro"),
  nbrPiscine: z.number().min(0, "Le nombre de piscines doit être un nombre positif ou égal à zéro"),
  nbrGarages: z.number().min(0, "Le nombre de garages doit être un nombre positif ou égal à zéro"),
});
export const DeskSchema = PropertySchema.extend({
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif ou égal à zéro"),
  nbrRooms: z.number().min(0, "Le nombre de salles doit être un nombre positif ou égal à zéro"),
});
export const BuildingSchema = PropertySchema.extend({
  nbrApartments: z.number().min(0, "Le nombre d'appartements doit être un nombre positif ou égal à zéro"),
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif ou égal à zéro"),
  hasParking: z.boolean({ required_error: "Veuillez indiquer si le bâtiment dispose d'un parking" }),
});

export const KioskSchema = PropertySchema.extend({
  kioskType: z.string().min(1, "Veuillez sélectionner le type de kiosque"),
});

export const RoomSchema = PropertySchema.extend({
  roomType: z.string().min(1, "Veuillez sélectionner le type de chambre"),
});

export const ShopSchema = PropertySchema.extend({
  nbrRooms: z.number().min(0, "Le nombre de pièces doit être un nombre positif ou égal à zéro"),
  nbrToilet: z.number().min(0, "Le nombre de toilettes doit être un nombre positif ou égal à zéro"),
});
//Steps schemas
export const Step1Schema = z.object({
  images: z.array(z.any()).nonempty("Veuillez ajouter au moins une photo de votre bien"),
  title: z.string().min(1, "Veuillez saisir un titre pour votre annonce"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères pour être informative"),
  area: z.number().min(0, "La superficie doit être un nombre positif ou égal à zéro"),
  price: z.number().min(0, "Le prix doit être un nombre positif ou égal à zéro"),
  status: z.enum(["FOR_RENT", "FOR_SALE"]),
  tags: z.array(z.string().min(1, "Chaque mot-clé doit contenir au moins 1 caractère")).nonempty("Veuillez ajouter au moins un mot-clé pour décrire votre bien"),
});
export const Step3Schema = z.object({
  street: z.string().min(1, "Veuillez saisir le nom de la rue ou du quartier"),
  city: z.string().min(1, "Veuillez saisir le nom de la ville"),
  province: z.string().min(1, "Veuillez sélectionner la province"),
  additionalInformation: z.string().optional(),
  longitude: z.string().min(1, "Veuillez saisir la longitude").transform(val => parseFloat(val)).refine(val => val >= -180 && val <= 180, "La longitude doit être comprise entre -180 et 180"),
  latitude: z.string().min(1, "Veuillez saisir la latitude").transform(val => parseFloat(val)).refine(val => val >= -90 && val <= 90, "La latitude doit être comprise entre -90 et 90"),
  country: z.string().min(1, "Veuillez sélectionner le pays"),
  countryCode: z.string().min(2, "Le code pays est requis"),
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
  nbrRooms: z.number().min(0, "Le nombre de chambres doit être un nombre positif ou égal à zéro"),
  nbrChickens: z.number().min(0, "Le nombre de cuisines doit être un nombre positif ou égal à zéro"),
  nbrBathrooms: z.number().min(0, "Le nombre de salles de bain doit être un nombre positif ou égal à zéro"),
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif ou égal à zéro"),
  nbrGarages: z.number().min(0, "Le nombre de garages doit être un nombre positif ou égal à zéro"),
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif ou égal à zéro"),
});
export const StudioStep2Schema = z.object({
  nbrRooms: z.number().min(0, "Le nombre de chambres doit être un nombre positif ou égal à zéro"),
  nbrChickens: z.number().min(0, "Le nombre de cuisines doit être un nombre positif ou égal à zéro"),
  nbrBathrooms: z.number().min(0, "Le nombre de salles de bain doit être un nombre positif ou égal à zéro"),
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif ou égal à zéro"),
  nbrFloorStudio: z.number().min(0, "Le numéro d'étage doit être un nombre positif ou égal à zéro"),
  numeroStudio: z.string().min(1, "Veuillez saisir le numéro du studio"),
});
export const ApartmentStep2Schema = z.object({
  nbrRooms: z.number().min(0, "Le nombre de chambres doit être un nombre positif ou égal à zéro"),
  nbrChickens: z.number().min(0, "Le nombre de cuisines doit être un nombre positif ou égal à zéro"),
  nbrBathrooms: z.number().min(0, "Le nombre de salles de bain doit être un nombre positif ou égal à zéro"),
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif ou égal à zéro"),
  nbrFloorApartment: z.number().min(0, "Le numéro d'étage doit être un nombre positif ou égal à zéro"),
  numeroApartment: z.string().min(1, "Veuillez saisir le numéro de l'appartement"),
});
export const VillaStep2Schema = z.object({
  nbrRooms: z.number().min(0, "Le nombre de chambres doit être un nombre positif ou égal à zéro"),
  nbrChickens: z.number().min(0, "Le nombre de cuisines doit être un nombre positif ou égal à zéro"),
  nbrBathrooms: z.number().min(0, "Le nombre de salles de bain doit être un nombre positif ou égal à zéro"),
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif ou égal à zéro"),
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif ou égal à zéro"),
  nbrPiscine: z.number().min(0, "Le nombre de piscines doit être un nombre positif ou égal à zéro"),
  nbrGarages: z.number().min(0, "Le nombre de garages doit être un nombre positif ou égal à zéro"),
});
export const DeskStep2Schema = z.object({
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif ou égal à zéro"),
  nbrRooms: z.number().min(0, "Le nombre de salles doit être un nombre positif ou égal à zéro"),
});
export const BuildingStep2Schema = z.object({
  nbrAppartement: z.number().min(0, "Le nombre d'appartements doit être un nombre positif ou égal à zéro"),
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif ou égal à zéro"),
  hasParking: z.number().min(0, "Le nombre de places de parking doit être un nombre positif ou égal à zéro"),
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
  firstname: z.string().min(1, "Veuillez saisir votre prénom"),
  lastname: z.string().min(1, "Veuillez saisir votre nom de famille"),
  email: z.string().email("Veuillez saisir une adresse email valide"),
  phoneNumbers: z
    .string()
    .refine((value) => {
      if (!value) return true; // Optionnel
      const validation = validatePhoneNumberForSupportedCountries(value);
      return validation.isValid;
    }, { message: "Veuillez saisir un numéro de téléphone valide pour votre pays" })
    .optional(),
  country: z.string().min(1, { message: 'Veuillez sélectionner votre pays' }),
  birthDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Veuillez saisir votre date de naissance au format AAAA-MM-JJ (ex: 1990-05-15)'
  ),
});

export const FormFilterSchema = z.object({
  province: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minArea: z.number().optional(),
  maxArea: z.number().optional(),
  minNbrRooms: z.number().optional(),
  maxNbrRooms: z.number().optional(),
  typeProperty: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
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
export type KioskSchemaType = z.infer<typeof KioskSchema>;
export type RoomSchemaType = z.infer<typeof RoomSchema>;
export type ShopSchemaType = z.infer<typeof ShopSchema>;
export type FormFilterSchemaType = z.infer<typeof FormFilterSchema>;