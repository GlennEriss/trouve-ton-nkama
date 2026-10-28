import { z } from 'zod';
import { toGabonWhatsappE164 } from '@/lib/phone/gabon-whatsapp';

export const QUICK_LISTING_PRICE_XAF = 200;
export const QUICK_LISTING_DESCRIPTION_MAX = 3000;
export const quickListingDescriptionSchema = z.string().trim()
  .min(10, 'Décrivez votre bien en au moins 10 caractères.')
  .max(QUICK_LISTING_DESCRIPTION_MAX, 'Le texte ne doit pas dépasser 3 000 caractères.');
export const quickListingContactSchema = z.string().transform(toGabonWhatsappE164)
  .pipe(z.string().regex(/^\+241[67]\d{7}$/, 'Saisissez un numéro mobile gabonais valide.'));
export const quickListingDraftSchema = z.object({
  description: quickListingDescriptionSchema,
  address: z.object({
    province: z.string().trim().min(1, 'Sélectionnez une province.').max(120),
    city: z.string().trim().min(1, 'Sélectionnez une ville.').max(120),
    district: z.string().trim().min(1, 'Sélectionnez un quartier.').max(120),
  }),
  contactPhone: quickListingContactSchema,
});
export type QuickListingDraft = z.infer<typeof quickListingDraftSchema>;
