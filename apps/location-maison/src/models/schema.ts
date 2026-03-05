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
  accountType: z.enum(['User', 'Announcer']).optional(),
  acceptAnnouncerTerms: z.boolean().optional(),
  firstname: z.string().min(1, { message: 'Le prénom est requis' }),
  lastname: z.string().min(1, { message: 'Le nom est requis' }),
  email: z.string().email({ message: 'L\'email n\'est pas valide' }),
  password: z
    .string()
    .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
    .regex(/[A-Z]/, { message: 'Le mot de passe doit contenir une majuscule' })
    .regex(/\d/, { message: 'Le mot de passe doit contenir un chiffre' }),
  passwordConfirm: z.string(),
  birthdate: z.object({
    day: z.string().min(1, { message: 'Le jour est requis' }),
    month: z.string().min(1, { message: 'Le mois est requis' }),
    year: z.string().min(1, { message: 'L\'année est requise' })
  }).refine((date) => {
    // Vérifier si au moins un champ est rempli pour déclencher la validation
    if (!date.day && !date.month && !date.year) {
      return true; // Aucun champ rempli, pas d'erreur
    }
    
    // Si au moins un champ est rempli mais pas tous, afficher l'erreur d'âge
    if (!date.day || !date.month || !date.year) {
      return false;
    }
    
    const day = parseInt(date.day);
    const month = parseInt(date.month);
    const year = parseInt(date.year);
    
    // Vérifier que la date est valide
    const birthDate = new Date(year, month - 1, day);
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
      return false;
    }
    
    // Vérifier l'âge (18 ans minimum)
      const today = new Date();
    const age = today.getFullYear() - year;
    const m = today.getMonth() - (month - 1);
    const d = today.getDate() - day;

    const actualAge = m < 0 || (m === 0 && d < 0) ? age - 1 : age;
    return actualAge >= 18;
    }, {
    message: 'Vous devez avoir au moins 18 ans pour créer un compte',
    }),
  country: z.string().min(1, { message: 'Le pays est requis' }),
  phone: z
    .string()
    .min(1, { message: 'Le numéro de téléphone est obligatoire' })
    .refine((value) => {
      const validation = validatePhoneNumberForSupportedCountries(value);
      return validation.isValid;
    }, { message: "Le numéro de téléphone est invalide" }),
  termsOfPrivacyPolicy: z
    .boolean()
    .refine((value) => value === true, 'errors.terms_required'),
})
  .refine((data) => data.password === data.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Les mots de passe ne correspondent pas',
  })
  .refine(
    (data) => data.accountType !== 'Announcer' || data.acceptAnnouncerTerms === true,
    {
      path: ['acceptAnnouncerTerms'],
      message: "Vous devez accepter les conditions d'annonceur",
    }
  );

//Property Schemas
export const LocationSchema = z.object({
  street: z.string().min(1, "Le nom de la rue est obligatoire"),
  city: z.string().min(1, "Le nom de la ville est obligatoire"),
  province: z.string().min(1, "Le nom de la province est obligatoire"),
  additionnalInformation: z.string().optional(),
  longitude: z.number().min(-180).max(180, "Longitude invalide"),
  latitude: z.number().min(-90).max(90, "Latitude invalide"),
  country: z.string().min(1, "Le pays est obligatoire"),
  countryCode: z.string().min(1, "Le code pays est obligatoire"),
});
export const PropertySchemaBase = z.object({
  title: z.string().min(1, "Le titre est obligatoire"),
  description: z.string().min(1, "La description doit contenir au moins 10 caractères"),
  price: z.number().min(0, "Le prix doit être un nombre positif"),
  area: z.number().min(0, "La superficie doit être un nombre positif"),
  images: z.array(z.any()).nonempty("Au moins une image est requise"),
  status: z.enum(["FOR_RENT", "FOR_SALE"]),
  tags: z.array(z.string().min(1, "Chaque tag doit contenir au moins 1 caractère"))
    .nonempty("Vous devez ajouter au moins un tag")
    .max(6, "Vous pouvez ajouter jusqu'à 6 tags seulement"),
  address: z.object({
    district: z.string().min(1, "Le nom du quartier est obligatoire"),
    city: z.string().min(1, "Le nom de la ville est obligatoire"),
    province: z.string().min(1, "Le nom de la province est obligatoire"),
  }),
  contact: z.string().min(1, "Le numéro de téléphone est obligatoire"),
  additionnalInformation: z.string().optional(),
  longitude: z
    .number()
    .refine(val => val >= -180 && val <= 180, "Longitude invalide"),
  latitude: z
    .number()
    .refine(val => val >= -90 && val <= 90, "Latitude invalide"),
  country: z.string().min(1, "Le pays est obligatoire"),
  countryCode: z.string().min(2, "Le code pays est obligatoire"),
  provinceLon: z.number().optional(),
  provinceLat: z.number().optional(),
  cityLon: z.number().optional(),
  cityLat: z.number().optional(),
  streetLon: z.number().optional(),
  streetLat: z.number().optional(),
  isLocExact: z.boolean().default(false),
});

export const PropertySchema = PropertySchemaBase.transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));
export const LogementSchemaBase = PropertySchemaBase.extend({
  nbrRooms: z.number().min(0, "Le nombre de chambres doit être un nombre positif"),
  nbrChickens: z.number().min(0, "Le nombre de cuisines doit être un nombre positif"),
  nbrBathrooms: z.number().min(0, "Le nombre de salles de bain doit être un nombre positif"),
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif"),
});

export const LogementSchema = LogementSchemaBase.transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));

export const HomeSchema = LogementSchemaBase.extend({
  nbrGarages: z.number().min(0, "Le nombre de garages doit être positif ou nul"),
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif"),
  nbrLivingRoom: z.number().min(0, "Le nombre de salon doit être un nombre positif"),
}).transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));

export const StudioSchema = LogementSchemaBase.extend({
  nbrFloorStudio: z.number().min(0, "Le numéro d'étage doit être un nombre positif"),
  numeroStudio: z.string().min(1, "Le numéro du studio est obligatoire"),
}).transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));

export const ApartmentSchema = LogementSchemaBase.extend({
  nbrFloorApartment: z.number().min(0, "Le numéro d'étage de l'appartement doit être un nombre positif"),
  numeroApartment: z.string().min(1, "Le numéro de l'appartement est obligatoire"),
}).transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));

export const VillaSchema = LogementSchemaBase.extend({
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif"),
  nbrPiscine: z.number().min(0, "Le nombre de piscines doit être un nombre positif"),
  nbrGarages: z.number().min(0, "Le nombre de garages doit être un nombre positif"),
}).transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));
export const DeskSchema = PropertySchemaBase.extend({
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif"),
  nbrRooms: z.number().min(0, "Le nombre de salles doit être un nombre positif"),
}).transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));

export const BuildingSchema = PropertySchemaBase.extend({
  nbrApartments: z.number().min(0, "Le nombre d'appartements doit être un nombre positif"),
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif"),
  hasParking: z.boolean({ required_error: "Le champ parking est requis" }),
}).transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));

export const KioskSchema = PropertySchemaBase.extend({
  kioskType: z.string().min(1, "Le type de kiosque est obligatoire"),
}).transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));

export const RoomSchema = PropertySchemaBase.extend({
  roomType: z.string().min(1, "Le type de chambre est obligatoire"),
}).transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));

export const ShopSchema = PropertySchemaBase.extend({
  nbrRooms: z.number().min(0, "Le nombre de pièces doit être un nombre positif"),
  nbrToilet: z.number().min(0, "Le nombre de toilettes doit être un nombre positif"),
}).transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));
//Steps schemas
export const Step1Schema = z.object({
  images: z.array(z.any()).nonempty("Au moins une image est requise"),
  title: z.string().min(1, "Le titre est obligatoire"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  area: z.number().min(0, "La superficie doit être un nombre positif"),
  price: z.number().min(1, "Le prix doit être un nombre positif supérieur à 0"),
  status: z.enum(["FOR_RENT", "FOR_SALE"]),
  tags: z.array(z.string().min(1, "Chaque tag doit contenir au moins 1 caractère")).nonempty("Vous devez ajouter au moins un tag"),
});
export const Step3Schema = z.object({
  address: z.object({
    district: z.string().min(1, "Le nom du quartier est obligatoire"),
    city: z.string().min(1, "Le nom de la ville est obligatoire"),
    province: z.string().min(1, "Le nom de la province est obligatoire"),
  }),
  additionnalInformation: z.string().optional(),
  longitude: z.coerce
    .number()
    .refine(val => !Number.isNaN(val) && val >= -180 && val <= 180, "Longitude invalide"),
  latitude: z.coerce
    .number()
    .refine(val => !Number.isNaN(val) && val >= -90 && val <= 90, "Latitude invalide"),
  provinceLon: z.number().optional(),
  provinceLat: z.number().optional(),
  cityLon: z.number().optional(),
  cityLat: z.number().optional(),
  streetLon: z.number().optional(),
  streetLat: z.number().optional(),
  country: z.string().min(1, "Le pays est obligatoire"),
  countryCode: z.string().min(2, "Le code pays est obligatoire"),
}).transform((data) => ({
  ...data,
  // Mapper les champs address vers les champs attendus par le provider
  street: data.address.district,
  city: data.address.city,
  province: data.address.province,
}));

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
  nbrRooms: z.number().min(0, "Le nombre de chambres doit être un nombre positif"),
  nbrChickens: z.number().min(0, "Le nombre de cuisines doit être un nombre positif"),
  nbrBathrooms: z.number().min(0, "Le nombre de salles de bain doit être un nombre positif"),
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif"),
  nbrGarages: z.number().min(0, "Le nombre de garages doit être un nombre positif"),
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif"),
});
export const StudioStep2Schema = z.object({
  nbrRooms: z.number().min(0, "Le nombre de chambres doit être un nombre positif"),
  nbrChickens: z.number().min(0, "Le nombre de cuisines doit être un nombre positif"),
  nbrBathrooms: z.number().min(0, "Le nombre de salles de bain doit être un nombre positif"),
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif"),
  nbrFloorStudio: z.number().min(0, "Le numéro d'étage doit être un nombre positif"),
  numeroStudio: z.string().min(1, "Le numéro du studio est obligatoire"),
});
export const ApartmentStep2Schema = z.object({
  nbrRooms: z.number().min(0, "Le nombre de chambres doit être un nombre positif"),
  nbrChickens: z.number().min(0, "Le nombre de cuisines doit être un nombre positif"),
  nbrBathrooms: z.number().min(0, "Le nombre de salles de bain doit être un nombre positif"),
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif"),
  nbrFloorApartment: z.number().min(0, "Le numéro d'étage de l'appartement doit être un nombre positif"),
  numeroApartment: z.string().min(1, "Le numéro de l'appartement est obligatoire"),
});
export const VillaStep2Schema = z.object({
  nbrRooms: z.number().min(0, "Le nombre de chambres doit être un nombre positif"),
  nbrChickens: z.number().min(0, "Le nombre de cuisines doit être un nombre positif"),
  nbrBathrooms: z.number().min(0, "Le nombre de salles de bain doit être un nombre positif"),
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif"),
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif"),
  nbrPiscine: z.number().min(0, "Le nombre de piscines doit être un nombre positif"),
  nbrGarages: z.number().min(0, "Le nombre de garages doit être un nombre positif"),
});
export const DeskStep2Schema = z.object({
  nbrToilets: z.number().min(0, "Le nombre de toilettes doit être un nombre positif"),
  nbrRooms: z.number().min(0, "Le nombre de salles doit être un nombre positif"),
});
export const BuildingStep2Schema = z.object({
  nbrAppartement: z.number().min(0, "Le nombre d'appartements doit être un nombre positif"),
  nbrFloors: z.number().min(0, "Le nombre d'étages doit être un nombre positif"),
  hasParking: z.number().min(0, "Le nombre de places de parking doit être un nombre positif"),
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
    .refine((value) => {
      if (!value) return true; // Optionnel
      const validation = validatePhoneNumberForSupportedCountries(value);
      return validation.isValid;
    }, { message: "Le numéro de téléphone est invalide" })
    .optional(),
  country: z.string().min(1, { message: 'Le pays est requis' }),
  birthDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'La date de naissance doit être au format AAAA-MM-JJ'
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

// Schéma de validation pour le formulaire de recherche du GoogleMapViewerHeader
export const SearchFormSchema = z.object({
  searchText: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
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
export type SearchFormSchemaType = z.infer<typeof SearchFormSchema>;
