import { type CreditPack } from '@/models/credit-transaction'

/**
 * Deprecated: les packs doivent désormais venir de la collection Firestore `credit_packs`
 * pilotée par le dashboard admin.
 */
export const CREDIT_PACKS: CreditPack[] = []
