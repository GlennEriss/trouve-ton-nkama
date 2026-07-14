/**
 * @module constantes
 *
 * Paramètres économiques des cadeaux côté app. La commission sur le don (15 %)
 * n'est appliquée que côté Cloud Functions (functions/src/payments/gifts/constants.ts) ;
 * ici vivent les frais de retrait et les bornes utilisées par l'UX/validation.
 */

export const GIFT_MIN_AMOUNT_XAF = 500
export const GIFT_MAX_AMOUNT_XAF = 100_000
export const GIFT_AMOUNT_PRESETS = [500, 1000, 2000, 5000] as const
export const GIFT_MESSAGE_MAX_LENGTH = 200

// Retraits : frais de 5 % déduits du versement, minimum de solde pour demander.
export const WITHDRAWAL_FEE_RATE = 0.05
export const WITHDRAWAL_MINIMUM_XAF = 10_000

/** Frais de retrait (arrondi au FCFA supérieur, en faveur de la plateforme). */
export function computeWithdrawalFee(montantXaf: number): number {
  return Math.ceil(montantXaf * WITHDRAWAL_FEE_RATE)
}

/** Montant réellement versé à l'annonceur après frais de retrait. */
export function computeWithdrawalNetPayout(montantXaf: number): number {
  return montantXaf - computeWithdrawalFee(montantXaf)
}
