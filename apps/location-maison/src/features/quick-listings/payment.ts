import { z } from 'zod';
import { quickListingDraftSchema } from './draft';
import { isPhoneValidForNetwork, sanitizeLocalPhone } from '@/constantes/payment-methods';

export const operationSecretSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const quickPaymentSchema = z.object({
  draft: quickListingDraftSchema,
  operationSecret: operationSecretSchema,
  payerPhone: z.string().max(24).transform(sanitizeLocalPhone),
  network: z.enum(['AM', 'MM']),
}).strict().refine(v => isPhoneValidForNetwork(v.payerPhone, v.network), { message: 'Numéro payeur invalide pour ce réseau.' });
export type QuickPaymentInput = z.infer<typeof quickPaymentSchema>;
