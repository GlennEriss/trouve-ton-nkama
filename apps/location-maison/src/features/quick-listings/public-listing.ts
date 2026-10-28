import { z } from 'zod';
import { quickListingContactSchema, quickListingDescriptionSchema } from './draft';

// Explicit public projection: never spread a Firestore document into a page.
const publicFields = z.object({
  description: quickListingDescriptionSchema,
  province: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  neighborhood: z.string().trim().max(120).nullable().optional(),
  contactPhone: quickListingContactSchema,
});
export type PublicQuickListing = z.infer<typeof publicFields> & { id: string };

export function toPublicQuickListing(id: string, raw: unknown): PublicQuickListing | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (data.paymentStatus !== 'confirmed' || data.moderationStatus !== 'APPROVED' || data.state !== 'IN_PROGRESS') return null;
  const parsed = publicFields.safeParse(data);
  return parsed.success ? { id, ...parsed.data } : null;
}

export const quickListingPath = (id: string) => `/annonces-rapides/${encodeURIComponent(id)}`;
export const quickListingTitle = (item: PublicQuickListing) => `Annonce sans photo à ${item.city}`;
